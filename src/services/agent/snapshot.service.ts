import { AppDataSource } from '../../config/database';
import { SessionSnapshot } from '../../models/SessionSnapshot';
import { AgentSession } from '../../models/AgentSession';
import { AgentMessage } from '../../models/AgentMessage';
import { AgentPreference } from '../../models/AgentPreference';
import { AgentRecommendation } from '../../models/AgentRecommendation';
import { v4 as uuidv4 } from 'uuid';

/**
 * 会话快照服务
 * 保存和恢复会话状态
 */

export interface CreateSnapshotRequest {
  userId: string;
  sessionId: string;
  snapshotName: string;
  metadata?: {
    tags?: string[];
    note?: string;
    [key: string]: any;
  };
}

export class SnapshotService {
  private snapshotRepo = AppDataSource.getRepository(SessionSnapshot);
  private sessionRepo = AppDataSource.getRepository(AgentSession);
  private messageRepo = AppDataSource.getRepository(AgentMessage);
  private preferenceRepo = AppDataSource.getRepository(AgentPreference);
  private recommendationRepo = AppDataSource.getRepository(AgentRecommendation);

  /**
   * 创建会话快照
   */
  async createSnapshot(request: CreateSnapshotRequest): Promise<SessionSnapshot> {
    const { userId, sessionId, snapshotName, metadata } = request;

    // 1. 验证会话
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      throw new Error('Session not found or access denied');
    }

    // 2. 收集会话数据
    const messages = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' }
    });

    const preferences = await this.preferenceRepo.find({
      where: { sessionId, isLatest: true }
    });

    const recommendations = await this.recommendationRepo.find({
      where: { sessionId }
    });

    // 3. 创建快照
    const snapshot = this.snapshotRepo.create({
      id: uuidv4(),
      userId,
      sessionId,
      snapshotName,
      messagesCount: messages.length,
      snapshotData: {
        session: {
          ...session,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          lastActiveAt: session.lastActiveAt.toISOString()
        },
        messages: messages.map(m => ({
          ...m,
          createdAt: m.createdAt.toISOString()
        })),
        preferences: preferences.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString()
        })),
        recommendations: recommendations?.map(r => ({
          ...r,
          createdAt: r.createdAt?.toISOString()
        })) || []
      },
      metadata
    });

    return await this.snapshotRepo.save(snapshot);
  }

  /**
   * 从快照恢复会话
   */
  async restoreFromSnapshot(
    userId: string,
    snapshotId: string,
    createNewSession: boolean = true
  ): Promise<{ sessionId: string; message: string }> {
    // 1. 获取快照
    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId, userId }
    });

    if (!snapshot) {
      throw new Error('Snapshot not found or access denied');
    }

    const { session: sessionData, messages, preferences, recommendations } = snapshot.snapshotData;

    if (createNewSession) {
      // 2a. 创建新会话
      const newSession = this.sessionRepo.create({
        id: uuidv4(),
        userId,
        province: sessionData.province,
        examScore: sessionData.examScore,
        scoreRank: sessionData.scoreRank,
        subjectType: sessionData.subjectType,
        stage: sessionData.stage,
        mode: sessionData.mode || 'deep',
        status: 'active',
        corePreferencesCount: sessionData.corePreferencesCount,
        secondaryPreferencesCount: sessionData.secondaryPreferencesCount,
        totalMessages: 0,
        initialRecommendations: sessionData.initialRecommendations,
        finalVolunteers: sessionData.finalVolunteers,
        decisionWeights: sessionData.decisionWeights,
        lastActiveAt: new Date()
      });

      await this.sessionRepo.save(newSession);

      // 3a. 恢复消息
      for (const msgData of messages) {
        const message = this.messageRepo.create({
          sessionId: newSession.id,
          role: msgData.role,
          content: msgData.content,
          contentBlocks: msgData.contentBlocks,
          messageType: msgData.messageType,
          extractedData: msgData.extractedData,
          metadata: {
            ...msgData.metadata,
            restoredFrom: snapshotId,
            restoredAt: new Date()
          }
        });

        await this.messageRepo.save(message);
      }

      // 更新消息计数
      await this.sessionRepo.update(
        { id: newSession.id },
        { totalMessages: messages.length }
      );

      // 4a. 恢复偏好
      for (const prefData of preferences) {
        const preference = this.preferenceRepo.create({
          sessionId: newSession.id,
          userId,
          indicatorId: prefData.indicatorId,
          indicatorName: prefData.indicatorName,
          indicatorType: prefData.indicatorType,
          category: prefData.category,
          value: prefData.value,
          confidence: prefData.confidence,
          extractionMethod: prefData.extractionMethod,
          extractionContext: prefData.extractionContext,
          version: 1,
          isLatest: true
        });

        await this.preferenceRepo.save(preference);
      }

      // 5a. 恢复推荐（简化版，只保存基本信息）
      if (recommendations && recommendations.length > 0) {
        for (const recData of recommendations) {
          // 由于AgentRecommendation字段较多且复杂，暂时跳过推荐的恢复
          // 用户可以重新生成推荐
          console.log('跳过推荐恢复：', recData.collegeName);
        }
      }

      return {
        sessionId: newSession.id,
        message: `Successfully restored session from snapshot "${snapshot.snapshotName}"`
      };

    } else {
      // 2b. 恢复到原会话（覆盖模式）
      const originalSession = await this.sessionRepo.findOne({
        where: { id: snapshot.sessionId, userId }
      });

      if (!originalSession) {
        throw new Error('Original session not found');
      }

      // 删除原会话的数据
      await this.messageRepo.delete({ sessionId: snapshot.sessionId });
      await this.preferenceRepo.delete({ sessionId: snapshot.sessionId });
      await this.recommendationRepo.delete({ sessionId: snapshot.sessionId });

      // 更新会话状态
      await this.sessionRepo.update(
        { id: snapshot.sessionId },
        {
          stage: sessionData.stage,
          mode: sessionData.mode || originalSession.mode,
          status: 'active',
          corePreferencesCount: sessionData.corePreferencesCount,
          secondaryPreferencesCount: sessionData.secondaryPreferencesCount,
          totalMessages: 0,
          lastActiveAt: new Date()
        }
      );

      // 恢复数据（同上）
      for (const msgData of messages) {
        const message = this.messageRepo.create({
          sessionId: snapshot.sessionId,
          role: msgData.role,
          content: msgData.content,
          contentBlocks: msgData.contentBlocks,
          messageType: msgData.messageType,
          extractedData: msgData.extractedData,
          metadata: msgData.metadata
        });
        await this.messageRepo.save(message);
      }

      await this.sessionRepo.update(
        { id: snapshot.sessionId },
        { totalMessages: messages.length }
      );

      for (const prefData of preferences) {
        const preference = this.preferenceRepo.create({
          sessionId: snapshot.sessionId,
          userId,
          indicatorId: prefData.indicatorId,
          indicatorName: prefData.indicatorName,
          indicatorType: prefData.indicatorType,
          category: prefData.category,
          value: prefData.value,
          confidence: prefData.confidence,
          extractionMethod: prefData.extractionMethod,
          extractionContext: prefData.extractionContext,
          version: 1,
          isLatest: true
        });
        await this.preferenceRepo.save(preference);
      }

      if (recommendations && recommendations.length > 0) {
        for (const recData of recommendations) {
          // 由于AgentRecommendation字段较多且复杂，暂时跳过推荐的恢复
          // 用户可以重新生成推荐
          console.log('跳过推荐恢复：', recData.collegeName);
        }
      }

      return {
        sessionId: snapshot.sessionId,
        message: `Successfully restored session to snapshot "${snapshot.snapshotName}"`
      };
    }
  }

  /**
   * 获取用户的快照列表
   */
  async getUserSnapshots(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ snapshots: SessionSnapshot[]; total: number }> {
    const [snapshots, total] = await this.snapshotRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset
    });

    return { snapshots, total };
  }

  /**
   * 获取会话的快照列表
   */
  async getSessionSnapshots(
    userId: string,
    sessionId: string
  ): Promise<SessionSnapshot[]> {
    return await this.snapshotRepo.find({
      where: { userId, sessionId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(userId: string, snapshotId: string): Promise<void> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId, userId }
    });

    if (!snapshot) {
      throw new Error('Snapshot not found or access denied');
    }

    await this.snapshotRepo.delete({ id: snapshotId });
  }
}
