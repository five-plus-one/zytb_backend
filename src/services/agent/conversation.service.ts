import { AppDataSource } from '../../config/database';
import { AgentSession } from '../../models/AgentSession';
import { AgentMessage } from '../../models/AgentMessage';
import { User } from '../../models/User';
import { ScoreRanking } from '../../models/ScoreRanking';

/**
 * 会话管理服务
 * 负责智能体对话会话的创建、恢复、状态管理
 */

export interface CreateSessionParams {
  userId: string;
  province: string;
  examScore: number;
  scoreRank?: number;
  subjectType: string;
}

export class ConversationService {
  private sessionRepo = AppDataSource.getRepository(AgentSession);
  private messageRepo = AppDataSource.getRepository(AgentMessage);
  private userRepo = AppDataSource.getRepository(User);
  private scoreRankingRepo = AppDataSource.getRepository(ScoreRanking);

  /**
   * 创建新会话
   */
  async createSession(params: CreateSessionParams): Promise<AgentSession> {
    // 获取用户信息
    const user = await this.userRepo.findOne({
      where: { id: params.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 如果没有提供rank,尝试从ScoreRanking表查询
    let scoreRank = params.scoreRank;
    if (!scoreRank) {
      const ranking = await this.scoreRankingRepo.findOne({
        where: {
          year: new Date().getFullYear(),
          province: params.province,
          subjectType: params.subjectType,
          score: params.examScore
        }
      });

      if (ranking) {
        scoreRank = ranking.rank;
      }
    }

    // 创建会话
    const session = this.sessionRepo.create({
      userId: params.userId,
      province: params.province,
      examScore: params.examScore,
      scoreRank,
      subjectType: params.subjectType,
      stage: 'init',
      status: 'active',
      corePreferencesCount: 0,
      secondaryPreferencesCount: 0,
      totalMessages: 0,
      lastActiveAt: new Date(),
      decisionWeights: {
        college: 33,
        major: 34,
        city: 33,
        employment: 50,
        furtherStudy: 50,
        interest: 50,
        prospect: 50
      }
    });

    return await this.sessionRepo.save(session);
  }

  /**
   * 获取用户的活跃会话
   */
  async getActiveSession(userId: string): Promise<AgentSession | null> {
    return await this.sessionRepo.findOne({
      where: {
        userId,
        status: 'active'
      },
      order: {
        lastActiveAt: 'DESC'
      }
    });
  }

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string): Promise<AgentSession | null> {
    return await this.sessionRepo.findOne({
      where: { id: sessionId }
    });
  }

  /**
   * 获取用户的所有会话
   */
  async getUserSessions(userId: string): Promise<AgentSession[]> {
    return await this.sessionRepo.find({
      where: { userId },
      order: {
        lastActiveAt: 'DESC'
      }
    });
  }

  /**
   * 添加消息到会话
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    messageType: 'chat' | 'preference_update' | 'recommendation' | 'system_notification' = 'chat',
    extractedData?: any,
    metadata?: any,
    contentBlocks?: any[]  // ✅ 新增参数：支持Claude API的content blocks
  ): Promise<AgentMessage> {
    const message = this.messageRepo.create({
      sessionId,
      role,
      content,
      contentBlocks,  // ✅ 保存结构化内容
      messageType,
      extractedData,
      metadata
    });

    const savedMessage = await this.messageRepo.save(message);

    // 更新会话的消息计数和最后活跃时间
    await this.sessionRepo.increment(
      { id: sessionId },
      'totalMessages',
      1
    );

    await this.sessionRepo.update(
      { id: sessionId },
      { lastActiveAt: new Date() }
    );

    return savedMessage;
  }

  /**
   * 获取会话的消息历史（带过滤）
   */
  async getMessagesWithFilters(
    sessionId: string,
    filters: {
      roleFilter?: 'user' | 'assistant' | 'system';
      messageTypeFilter?: string;
      searchKeyword?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<AgentMessage[]> {
    const queryBuilder = this.messageRepo.createQueryBuilder('message');

    queryBuilder.where('message.sessionId = :sessionId', { sessionId });

    if (filters.roleFilter) {
      queryBuilder.andWhere('message.role = :role', { role: filters.roleFilter });
    }

    if (filters.messageTypeFilter) {
      queryBuilder.andWhere('message.messageType = :messageType', { messageType: filters.messageTypeFilter });
    }

    if (filters.searchKeyword) {
      queryBuilder.andWhere('message.content LIKE :keyword', { keyword: `%${filters.searchKeyword}%` });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('message.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('message.createdAt <= :endDate', { endDate: filters.endDate });
    }

    queryBuilder
      .orderBy('message.createdAt', 'ASC')
      .skip(offset)
      .take(limit);

    return await queryBuilder.getMany();
  }

  /**
   * 获取会话的消息历史
   */
  async getMessages(
    sessionId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AgentMessage[]> {
    return await this.messageRepo.find({
      where: { sessionId },
      order: {
        createdAt: 'ASC'
      },
      skip: offset,
      take: limit
    });
  }

  /**
   * 获取最近的N条消息
   */
  async getRecentMessages(
    sessionId: string,
    count: number = 10
  ): Promise<AgentMessage[]> {
    const messages = await this.messageRepo.find({
      where: { sessionId },
      order: {
        createdAt: 'DESC'
      },
      take: count
    });

    // 反转顺序,使其按时间正序排列
    return messages.reverse();
  }

  /**
   * 更新会话阶段
   */
  async updateStage(
    sessionId: string,
    newStage: string
  ): Promise<void> {
    await this.sessionRepo.update(
      { id: sessionId },
      { stage: newStage }
    );
  }

  /**
   * 更新会话状态
   */
  async updateStatus(
    sessionId: string,
    newStatus: 'active' | 'paused' | 'completed'
  ): Promise<void> {
    await this.sessionRepo.update(
      { id: sessionId },
      { status: newStatus }
    );
  }

  /**
   * 暂停会话
   */
  async pauseSession(sessionId: string): Promise<void> {
    await this.updateStatus(sessionId, 'paused');
  }

  /**
   * 恢复会话
   */
  async resumeSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(
      { id: sessionId },
      {
        status: 'active',
        lastActiveAt: new Date()
      }
    );
  }

  /**
   * 完成会话
   */
  async completeSession(sessionId: string): Promise<void> {
    await this.updateStatus(sessionId, 'completed');
    await this.updateStage(sessionId, 'completed');
  }

  /**
   * 保存推荐结果到会话
   */
  async saveRecommendations(
    sessionId: string,
    recommendations: any[],
    isInitial: boolean = true
  ): Promise<void> {
    const field = isInitial ? 'initialRecommendations' : 'finalVolunteers';

    await this.sessionRepo.update(
      { id: sessionId },
      { [field]: recommendations }
    );
  }

  /**
   * 更新决策权重
   */
  async updateDecisionWeights(
    sessionId: string,
    weights: any
  ): Promise<void> {
    await this.sessionRepo.update(
      { id: sessionId },
      { decisionWeights: weights }
    );
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    // 删除相关消息
    await this.messageRepo.delete({ sessionId });

    // 删除会话
    const result = await this.sessionRepo.delete({ id: sessionId });

    return (result.affected ?? 0) > 0;
  }

  /**
   * 检查用户是否可以创建新会话
   */
  async canCreateNewSession(userId: string): Promise<boolean> {
    // 检查是否有未完成的活跃会话
    const activeSession = await this.getActiveSession(userId);

    // 如果有活跃会话,不允许创建新会话(需要先完成或暂停)
    return !activeSession;
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats(sessionId: string): Promise<any> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const messageCount = await this.messageRepo.count({
      where: { sessionId }
    });

    return {
      sessionId: session.id,
      stage: session.stage,
      status: session.status,
      corePreferencesCount: session.corePreferencesCount,
      secondaryPreferencesCount: session.secondaryPreferencesCount,
      totalMessages: messageCount,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      hasRecommendations: !!session.initialRecommendations,
      hasFinalVolunteers: !!session.finalVolunteers
    };
  }

  /**
   * 获取会话完整上下文(用于恢复对话)
   */
  async getSessionContext(sessionId: string): Promise<any> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const recentMessages = await this.getRecentMessages(sessionId, 10);

    return {
      session,
      recentMessages,
      stats: await this.getSessionStats(sessionId)
    };
  }
}
