import { ConversationService } from './conversation.service';
import { PreferenceService, PreferenceUpdate } from './preference.service';
import { LLMService } from './llm.service';
import { PromptService, ConversationContext } from './prompt.service';
import { NewRecommendationEngine } from './recommendation_new.service';
import embeddingRecommendationService from './embedding-recommendation.service';
import scoreRankingRecommendationService from './score-ranking-recommendation.service';
import { WeightedRecommendationEngine } from './weighted-recommendation-v2.service';
import { SearchService } from './search.service';
import { AgentSession } from '../../models/AgentSession';
import { AgentMessage } from '../../models/AgentMessage';
import { AgentPreference } from '../../models/AgentPreference';
import { v4 as uuidv4 } from 'uuid';

/**
 * 智能体主服务
 * 整合所有子服务,提供统一的对外接口
 */

// 任务状态接口
interface GenerateTask {
  taskId: string;
  sessionId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  result?: any[];
  error?: string;
}

export interface ChatRequest {
  userId: string;
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  sessionId: string;
  message: string;
  stage: string;
  progress: {
    coreCount: number;
    secondaryCount: number;
    totalMessages: number;
  };
  suggestions?: string[];
}

export class AgentService {
  private conversationService: ConversationService;
  private preferenceService: PreferenceService;
  private llmService: LLMService;
  private promptService: PromptService;
  private recommendationEngine: NewRecommendationEngine;
  private weightedRecommendationEngine: WeightedRecommendationEngine;
  private searchService: SearchService;

  // 内存任务存储 (生产环境应使用Redis)
  private static generateTasks: Map<string, GenerateTask> = new Map();

  constructor() {
    this.conversationService = new ConversationService();
    this.preferenceService = new PreferenceService();
    this.llmService = new LLMService();
    this.promptService = new PromptService();
    this.recommendationEngine = new NewRecommendationEngine();
    this.weightedRecommendationEngine = new WeightedRecommendationEngine();
    this.searchService = new SearchService();
  }

  /**
   * 处理用户消息(主入口)
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 1. 获取或创建会话
    let session: AgentSession;
    if (request.sessionId) {
      const existingSession = await this.conversationService.getSession(request.sessionId);
      if (!existingSession) {
        throw new Error('Session not found');
      }
      session = existingSession;
    } else {
      // 创建新会话
      throw new Error('Session ID is required. Please start a new session first.');
    }

    // 2. 保存用户消息
    await this.conversationService.addMessage(
      session.id,
      'user',
      request.message,
      'chat'
    );

    // 3. 构建对话上下文
    const context = await this.buildContext(session);

    // 4. 调用LLM生成响应
    const llmResponse = await this.generateLLMResponse(context, request.message);

    // 5. 解析LLM响应
    const parsed = this.promptService.parseLLMResponse(llmResponse);

    if (!parsed) {
      throw new Error('Failed to parse LLM response');
    }

    // 6. 更新偏好指标
    if (parsed.extractedPreferences && parsed.extractedPreferences.length > 0) {
      await this.preferenceService.batchUpdatePreferences(
        session.id,
        session.userId,
        parsed.extractedPreferences.map(pref => ({
          indicatorId: pref.indicatorId,
          value: pref.value,
          confidence: pref.confidence || 0.8,
          extractionMethod: pref.extractionMethod || 'inference',
          extractionContext: pref.context
        }))
      );
    }

    // 7. 保存助手消息
    await this.conversationService.addMessage(
      session.id,
      'assistant',
      parsed.message,
      'chat',
      { extractedPreferences: parsed.extractedPreferences }
    );

    // 8. 检查是否需要阶段转换
    await this.checkStageTransition(session);

    // 9. 获取最新统计
    const stats = await this.conversationService.getSessionStats(session.id);

    return {
      sessionId: session.id,
      message: parsed.message,
      stage: session.stage,
      progress: {
        coreCount: stats.corePreferencesCount,
        secondaryCount: stats.secondaryPreferencesCount,
        totalMessages: stats.totalMessages
      }
    };
  }

  /**
   * 流式对话(SSE)
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    // 1. 获取会话
    const session = await this.conversationService.getSession(request.sessionId!);
    if (!session) {
      throw new Error('Session not found');
    }

    // 2. 保存用户消息
    await this.conversationService.addMessage(
      session.id,
      'user',
      request.message,
      'chat'
    );

    // 3. 构建对话上下文
    const context = await this.buildContext(session);

    // 4. 构建消息
    const systemPrompt = this.promptService.buildSystemPrompt(context);
    const recentMessages = await this.conversationService.getRecentMessages(session.id, 10);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: request.message }
    ];

    // 5. 流式生成响应
    let fullResponse = '';

    for await (const chunk of this.llmService.chatStream(messages)) {
      fullResponse += chunk;
      yield chunk;
    }

    // 6. 保存完整响应并处理
    const parsed = this.promptService.parseLLMResponse(fullResponse);

    if (parsed && parsed.extractedPreferences && parsed.extractedPreferences.length > 0) {
      await this.preferenceService.batchUpdatePreferences(
        session.id,
        session.userId,
        parsed.extractedPreferences.map(pref => ({
          indicatorId: pref.indicatorId,
          value: pref.value,
          confidence: pref.confidence || 0.8,
          extractionMethod: pref.extractionMethod || 'inference',
          extractionContext: pref.context
        }))
      );
    }

    await this.conversationService.addMessage(
      session.id,
      'assistant',
      parsed?.message || fullResponse,
      'chat',
      { extractedPreferences: parsed?.extractedPreferences }
    );

    await this.checkStageTransition(session);
  }

  /**
   * 开始新会话
   */
  async startSession(
    userId: string,
    province: string,
    examScore: number,
    subjectType: string
  ): Promise<{ sessionId: string; greeting: string }> {
    // 检查是否可以创建新会话
    const canCreate = await this.conversationService.canCreateNewSession(userId);
    if (!canCreate) {
      throw new Error('You already have an active session. Please complete or pause it first.');
    }

    // 创建会话
    const session = await this.conversationService.createSession({
      userId,
      province,
      examScore,
      subjectType
    });

    // 生成问候语
    const context = await this.buildContext(session);
    const greeting = this.promptService.generateGreeting(context);

    // 保存系统消息
    await this.conversationService.addMessage(
      session.id,
      'assistant',
      greeting,
      'system_notification'
    );

    return {
      sessionId: session.id,
      greeting
    };
  }

  /**
   * 生成志愿推荐（原同步方法保留）
   */
  async generateRecommendations(
    sessionId: string,
    targetCount: number = 60
  ): Promise<any[]> {
    const session = await this.conversationService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // 获取用户偏好
    const preferences = await this.preferenceService.getSessionPreferences(sessionId);

    console.log('📊 使用新版加权推荐引擎 V2 生成志愿推荐...');

    // 调用加权推荐引擎 V2（多维度加权 + 动态排名范围）
    const recommendations = await this.weightedRecommendationEngine.generateRecommendations(
      {
        userId: session.userId,
        sessionId,
        examScore: session.examScore,
        province: session.province,
        subjectType: session.subjectType,
        scoreRank: session.scoreRank,
        preferences
      },
      targetCount
    );

    console.log(`✅ 生成了 ${recommendations.length} 条推荐`);

    // 保存推荐结果
    await this.conversationService.saveRecommendations(session.id, recommendations, true);

    // 更新阶段
    await this.conversationService.updateStage(session.id, 'refining');

    return recommendations;
  }

  /**
   * 启动异步推荐生成任务
   */
  async startGenerateRecommendationsTask(
    sessionId: string,
    userId: string,
    targetCount: number = 60
  ): Promise<string> {
    // 创建任务ID
    const taskId = uuidv4();

    // 创建任务记录
    const task: GenerateTask = {
      taskId,
      sessionId,
      userId,
      status: 'pending',
      progress: 0,
      startedAt: new Date()
    };

    AgentService.generateTasks.set(taskId, task);

    // 异步执行推荐生成
    this.executeGenerateTask(taskId, sessionId, targetCount).catch(error => {
      console.error(`任务 ${taskId} 执行失败:`, error);
      const task = AgentService.generateTasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = error.message;
        task.completedAt = new Date();
      }
    });

    return taskId;
  }

  /**
   * 执行推荐生成任务
   */
  private async executeGenerateTask(
    taskId: string,
    sessionId: string,
    targetCount: number
  ): Promise<void> {
    const task = AgentService.generateTasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    try {
      // 更新状态为处理中
      task.status = 'processing';
      task.progress = 10;

      console.log(`🚀 开始执行推荐生成任务 ${taskId}`);

      // 执行推荐生成
      const recommendations = await this.generateRecommendations(sessionId, targetCount);

      // 更新任务状态
      task.status = 'completed';
      task.progress = 100;
      task.result = recommendations;
      task.completedAt = new Date();

      console.log(`✅ 任务 ${taskId} 完成，生成了 ${recommendations.length} 条推荐`);

      // 30分钟后清理任务
      setTimeout(() => {
        AgentService.generateTasks.delete(taskId);
        console.log(`🗑️  清理任务 ${taskId}`);
      }, 30 * 60 * 1000);

    } catch (error: any) {
      console.error(`❌ 任务 ${taskId} 执行失败:`, error);
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();
      throw error;
    }
  }

  /**
   * 获取任务状态
   */
  async getGenerateTaskStatus(taskId: string, userId: string): Promise<any> {
    const task = AgentService.generateTasks.get(taskId);

    if (!task) {
      return null;
    }

    // 验证用户权限
    if (task.userId !== userId) {
      throw new Error('Access denied');
    }

    // 返回任务状态
    return {
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      result: task.status === 'completed' ? {
        count: task.result?.length || 0,
        recommendations: task.result
      } : undefined,
      error: task.error
    };
  }

  /**
   * 搜索信息
   */
  async search(query: string, type: 'college' | 'major' | 'city' | 'general' = 'general'): Promise<string> {
    switch (type) {
      case 'college':
        return await this.searchService.searchCollegeInfo(query, '');
      case 'major':
        return await this.searchService.searchMajorEmployment(query);
      case 'city':
        return await this.searchService.searchCityLivingCost(query);
      default:
        const results = await this.searchService.search(query);
        return results.map(r => `${r.title}: ${r.snippet}`).join('\n\n');
    }
  }

  /**
   * 获取会话状态
   */
  async getSessionStatus(sessionId: string): Promise<any> {
    return await this.conversationService.getSessionStats(sessionId);
  }

  /**
   * 获取当前用户的活跃会话
   */
  async getCurrentSession(userId: string): Promise<any> {
    const session = await this.conversationService.getActiveSession(userId);

    if (!session) {
      return null;
    }

    // 获取会话统计信息
    const stats = await this.conversationService.getSessionStats(session.id);

    return stats;
  }

  /**
   * 获取会话的完整对话内容（增强版，支持过滤和搜索 - P1）
   */
  async getSessionMessages(
    sessionId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      roleFilter?: 'user' | 'assistant' | 'system';
      messageTypeFilter?: string;
      searchKeyword?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any> {
    const {
      limit = 100,
      offset = 0,
      roleFilter,
      messageTypeFilter,
      searchKeyword,
      startDate,
      endDate
    } = options;

    // 首先验证会话是否存在并且属于该用户
    const session = await this.conversationService.getSession(sessionId);

    if (!session) {
      return null;
    }

    if (session.userId !== userId) {
      throw new Error('Access denied');
    }

    // 构建查询条件
    const whereConditions: any = { sessionId };

    if (roleFilter) {
      whereConditions.role = roleFilter;
    }

    if (messageTypeFilter) {
      whereConditions.messageType = messageTypeFilter;
    }

    // 获取消息
    const messages = await this.conversationService.getMessagesWithFilters(
      sessionId,
      {
        roleFilter,
        messageTypeFilter,
        searchKeyword,
        startDate,
        endDate
      },
      limit,
      offset
    );

    const filteredTotal = messages.length; // 简化版：使用返回的消息数量

    // 获取总消息数（不考虑过滤）
    const totalMessages = session.totalMessages;

    return {
      sessionId: session.id,
      totalMessages,
      filteredTotal, // 过滤后的总数
      filters: {
        roleFilter,
        messageTypeFilter,
        searchKeyword,
        startDate,
        endDate
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        contentBlocks: msg.contentBlocks,
        messageType: msg.messageType,
        extractedData: msg.extractedData,
        metadata: msg.metadata,
        createdAt: msg.createdAt
      })),
      pagination: {
        limit,
        offset,
        hasMore: offset + messages.length < filteredTotal
      }
    };
  }

  /**
   * 暂停会话
   */
  async pauseSession(sessionId: string): Promise<void> {
    await this.conversationService.pauseSession(sessionId);
  }

  /**
   * 恢复会话
   */
  async resumeSession(sessionId: string): Promise<void> {
    await this.conversationService.resumeSession(sessionId);
  }

  /**
   * 重新开始(创建新会话)
   */
  async resetSession(userId: string): Promise<void> {
    // 暂停所有活跃会话
    const activeSessions = await this.conversationService.getUserSessions(userId);
    for (const session of activeSessions) {
      if (session.status === 'active') {
        await this.conversationService.pauseSession(session.id);
      }
    }
  }

  // ========== 私有辅助方法 ==========

  /**
   * 构建对话上下文
   */
  private async buildContext(session: AgentSession): Promise<ConversationContext> {
    const preferences = await this.preferenceService.getSessionPreferences(session.id);
    const coreCount = await this.preferenceService.getCorePreferencesCount(session.id);
    const secondaryCount = await this.preferenceService.getSecondaryPreferencesCount(session.id);

    return {
      sessionId: session.id,
      userId: session.userId,
      province: session.province,
      examScore: session.examScore,
      subjectType: session.subjectType,
      stage: session.stage,
      collectedCoreCount: coreCount,
      collectedSecondaryCount: secondaryCount,
      collectedPreferences: preferences
    };
  }

  /**
   * 生成LLM响应
   */
  private async generateLLMResponse(
    context: ConversationContext,
    userMessage: string
  ): Promise<string> {
    // 构建系统提示词
    const systemPrompt = this.promptService.buildSystemPrompt(context);

    // 获取历史消息
    const recentMessages = await this.conversationService.getRecentMessages(context.sessionId, 10);

    // 构建完整消息列表
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...recentMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: userMessage }
    ];

    // 调用LLM
    return await this.llmService.chat(messages, {
      temperature: 0.7,
      maxTokens: 1500
    });
  }

  /**
   * 检查阶段转换
   */
  private async checkStageTransition(session: AgentSession): Promise<void> {
    const coreCount = await this.preferenceService.getCorePreferencesCount(session.id);

    // 如果核心指标收集完成,且当前还在core_preferences阶段
    if (coreCount >= 30 && session.stage === 'core_preferences') {
      // 询问用户是否继续或生成志愿表
      const transitionMessage = this.promptService.generateStageTransition(
        'core_preferences',
        'generating',
        await this.buildContext(session)
      );

      if (transitionMessage) {
        await this.conversationService.addMessage(
          session.id,
          'assistant',
          transitionMessage,
          'system_notification'
        );
      }
    }

    // 如果在init阶段且已有消息,转到core_preferences
    if (session.stage === 'init' && session.totalMessages > 2) {
      await this.conversationService.updateStage(session.id, 'core_preferences');
    }
  }

  /**
   * ✅ 从content blocks中提取纯文本内容
   * 用于向后兼容和搜索功能
   */
  private extractTextFromContentBlocks(content: any): string {
    // 如果已经是字符串，直接返回
    if (typeof content === 'string') {
      return content;
    }

    // 如果是content blocks数组
    if (Array.isArray(content)) {
      return content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
    }

    return '';
  }
}
