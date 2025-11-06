import { AppDataSource } from '../../config/database';
import { QuickSession } from '../../models/QuickSession';
import { AgentMessage } from '../../models/AgentMessage';
import { AgentSession } from '../../models/AgentSession';
import { v4 as uuidv4 } from 'uuid';

/**
 * 快速会话服务
 * 处理独立的、临时性的对话
 */

export interface CreateQuickSessionDto {
  userId: string;
  mainSessionId?: string;
  sessionType: 'group_inquiry' | 'group_compare' | 'major_inquiry' | 'general';
  context?: {
    groupIds?: string[];
    majorCodes?: string[];
    metadata?: Record<string, any>;
  };
}

export class QuickSessionService {
  private quickSessionRepo = AppDataSource.getRepository(QuickSession);
  private messageRepo = AppDataSource.getRepository(AgentMessage);
  private sessionRepo = AppDataSource.getRepository(AgentSession);

  /**
   * 创建快速会话
   */
  async createQuickSession(data: CreateQuickSessionDto): Promise<QuickSession> {
    const quickSession = this.quickSessionRepo.create({
      id: uuidv4(),
      userId: data.userId,
      mainSessionId: data.mainSessionId,
      sessionType: data.sessionType,
      context: data.context,
      totalMessages: 0,
      isMerged: false,
      canMergeToMain: !!data.mainSessionId
    });

    return await this.quickSessionRepo.save(quickSession);
  }

  /**
   * 获取快速会话
   */
  async getQuickSession(quickSessionId: string): Promise<QuickSession | null> {
    return await this.quickSessionRepo.findOne({
      where: { id: quickSessionId }
    });
  }

  /**
   * 获取用户的快速会话列表
   */
  async getUserQuickSessions(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ sessions: QuickSession[]; total: number }> {
    const [sessions, total] = await this.quickSessionRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset
    });

    return { sessions, total };
  }

  /**
   * 添加消息到快速会话
   */
  async addMessage(
    quickSessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    contentBlocks?: any[],
    metadata?: any
  ): Promise<AgentMessage> {
    // 注意：快速会话的消息使用quickSessionId作为sessionId
    const message = this.messageRepo.create({
      sessionId: quickSessionId,
      role,
      content,
      contentBlocks,
      messageType: 'chat',
      metadata
    });

    await this.messageRepo.save(message);

    // 更新快速会话的消息计数
    await this.quickSessionRepo.increment(
      { id: quickSessionId },
      'totalMessages',
      1
    );

    return message;
  }

  /**
   * 获取快速会话的消息
   */
  async getMessages(
    quickSessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AgentMessage[]> {
    return await this.messageRepo.find({
      where: { sessionId: quickSessionId },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset
    });
  }

  /**
   * 合并快速会话到主会话
   */
  async mergeToMainSession(quickSessionId: string): Promise<{
    success: boolean;
    mergedMessageCount: number;
    mainSessionId?: string;
  }> {
    const quickSession = await this.getQuickSession(quickSessionId);

    if (!quickSession) {
      throw new Error('Quick session not found');
    }

    if (quickSession.isMerged) {
      throw new Error('Quick session already merged');
    }

    if (!quickSession.canMergeToMain || !quickSession.mainSessionId) {
      throw new Error('Quick session cannot be merged to main session');
    }

    // 获取快速会话的所有消息
    const messages = await this.getMessages(quickSessionId, 1000, 0);

    // 将消息复制到主会话
    let mergedCount = 0;
    for (const msg of messages) {
      // 创建新消息关联到主会话
      const newMessage = this.messageRepo.create({
        sessionId: quickSession.mainSessionId,
        role: msg.role,
        content: msg.content,
        contentBlocks: msg.contentBlocks,
        messageType: msg.messageType,
        extractedData: msg.extractedData,
        metadata: {
          ...msg.metadata,
          mergedFrom: quickSessionId,
          originalMessageId: msg.id,
          mergedAt: new Date()
        }
      });

      await this.messageRepo.save(newMessage);
      mergedCount++;
    }

    // 更新主会话的消息计数
    await this.sessionRepo.increment(
      { id: quickSession.mainSessionId },
      'totalMessages',
      mergedCount
    );

    // 标记快速会话为已合并
    await this.quickSessionRepo.update(
      { id: quickSessionId },
      { isMerged: true }
    );

    return {
      success: true,
      mergedMessageCount: mergedCount,
      mainSessionId: quickSession.mainSessionId
    };
  }

  /**
   * 删除快速会话
   */
  async deleteQuickSession(quickSessionId: string): Promise<void> {
    // 先删除相关消息
    await this.messageRepo.delete({ sessionId: quickSessionId });

    // 再删除快速会话
    await this.quickSessionRepo.delete({ id: quickSessionId });
  }
}
