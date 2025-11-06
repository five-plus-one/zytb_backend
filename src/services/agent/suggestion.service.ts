import { AppDataSource } from '../../config/database';
import { SessionSuggestion } from '../../models/SessionSuggestion';
import { AgentSession } from '../../models/AgentSession';
import { AgentPreference } from '../../models/AgentPreference';
import { EnrollmentPlanGroup } from '../../models/EnrollmentPlanGroup';
import { LLMService } from './llm.service';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { LessThan } from 'typeorm';

/**
 * 智能建议服务
 * 基于上下文生成智能问题建议
 */

export interface GenerateSuggestionsRequest {
  userId: string;
  sessionId?: string;
  groupIds?: string[];
  currentStage?: string;
  recentTopics?: string[];
  maxSuggestions?: number;
}

export interface Suggestion {
  question: string;
  reasoning: string;
  priority: number;
  category: string;
}

export class SuggestionService {
  private suggestionRepo = AppDataSource.getRepository(SessionSuggestion);
  private sessionRepo = AppDataSource.getRepository(AgentSession);
  private preferenceRepo = AppDataSource.getRepository(AgentPreference);
  private groupRepo = AppDataSource.getRepository(EnrollmentPlanGroup);
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  /**
   * 生成智能建议
   */
  async generateSuggestions(request: GenerateSuggestionsRequest): Promise<Suggestion[]> {
    const {
      userId,
      sessionId,
      groupIds = [],
      currentStage,
      recentTopics = [],
      maxSuggestions = 5
    } = request;

    // 生成上下文hash用于缓存
    const contextHash = this.generateContextHash(groupIds, currentStage, recentTopics);

    // 检查缓存
    const cached = await this.getCachedSuggestions(contextHash);
    if (cached) {
      return cached.suggestions;
    }

    // 构建上下文
    const context = await this.buildSuggestionContext(
      userId,
      sessionId,
      groupIds,
      currentStage,
      recentTopics
    );

    // 调用LLM生成建议
    const suggestions = await this.generateSuggestionsFromLLM(context, maxSuggestions);

    // 缓存结果（5分钟）
    await this.cacheSuggestions(
      userId,
      sessionId,
      contextHash,
      suggestions,
      context.summary,
      5
    );

    return suggestions;
  }

  /**
   * 自动补全建议
   */
  async autoComplete(
    userId: string,
    partialInput: string,
    sessionId?: string
  ): Promise<string[]> {
    // 获取用户偏好和历史
    const context = await this.buildAutoCompleteContext(userId, sessionId, partialInput);

    // 调用LLM生成补全建议
    const prompt = `
基于以下上下文，为用户的输入提供3-5个自动补全建议：

用户输入: "${partialInput}"

上下文信息:
${context}

请生成简洁、相关的补全建议，以JSON数组格式返回，例如:
["完整问题1", "完整问题2", "完整问题3"]
`;

    const response = await this.llmService.chat([
      { role: 'system', content: '你是一个智能问题补全助手。' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.5,
      maxTokens: 500
    });

    try {
      // 尝试解析JSON
      const completions = JSON.parse(response);
      return Array.isArray(completions) ? completions.slice(0, 5) : [];
    } catch (error) {
      console.error('Auto-complete parsing error:', error);
      return [];
    }
  }

  /**
   * 构建建议生成上下文
   */
  private async buildSuggestionContext(
    userId: string,
    sessionId: string | undefined,
    groupIds: string[],
    currentStage: string | undefined,
    recentTopics: string[]
  ): Promise<{ summary: string; data: any }> {
    const contextParts: string[] = [];
    const data: any = {};

    // 1. 会话信息
    if (sessionId) {
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (session) {
        contextParts.push(`当前阶段: ${session.stage}`);
        contextParts.push(`已收集核心指标: ${session.corePreferencesCount}/30`);
        contextParts.push(`考生信息: ${session.province} | 分数:${session.examScore} | ${session.subjectType}`);
        data.session = session;
      }
    }

    // 2. 用户偏好
    if (sessionId) {
      const preferences = await this.preferenceRepo.find({
        where: { sessionId, isLatest: true },
        take: 10
      });
      if (preferences.length > 0) {
        contextParts.push(`已收集的偏好: ${preferences.map(p => p.indicatorId).join(', ')}`);
        data.preferences = preferences;
      }
    }

    // 3. 专业组信息
    if (groupIds.length > 0) {
      const groups = await this.groupRepo.findByIds(groupIds);
      if (groups.length > 0) {
        const groupSummary = groups.map(g =>
          `${g.collegeCode}-${g.collegeName} | ${g.groupName || g.groupCode}`
        ).join('; ');
        contextParts.push(`关注的专业组: ${groupSummary}`);
        data.groups = groups;
      }
    }

    // 4. 最近讨论话题
    if (recentTopics.length > 0) {
      contextParts.push(`最近讨论: ${recentTopics.join(', ')}`);
      data.recentTopics = recentTopics;
    }

    return {
      summary: contextParts.join('\n'),
      data
    };
  }

  /**
   * 从LLM生成建议
   */
  private async generateSuggestionsFromLLM(
    context: { summary: string; data: any },
    maxSuggestions: number
  ): Promise<Suggestion[]> {
    const prompt = `
你是一个高考志愿填报咨询助手。基于以下上下文信息，生成${maxSuggestions}个智能问题建议，帮助用户更好地探索志愿填报选项。

上下文信息:
${context.summary}

要求:
1. 问题要针对用户当前情况，具有引导性
2. 问题应该帮助用户深入思考或获取更多信息
3. 优先级从高到低排序
4. 分类包括: 偏好探索、专业了解、院校对比、就业前景、地域选择、深造机会

请以JSON格式返回建议列表:
[
  {
    "question": "具体问题内容",
    "reasoning": "为什么建议这个问题（1-2句话）",
    "priority": 1-10的数字（10最高）,
    "category": "分类名称"
  }
]
`;

    const response = await this.llmService.chat([
      { role: 'system', content: '你是一个专业的高考志愿填报助手，擅长提出引导性问题。' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.7,
      maxTokens: 1500
    });

    try {
      // 尝试解析JSON
      const suggestions = JSON.parse(response);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      console.error('Suggestion parsing error:', error);
      // 如果解析失败，返回默认建议
      return this.getDefaultSuggestions(context.data);
    }
  }

  /**
   * 构建自动补全上下文
   */
  private async buildAutoCompleteContext(
    userId: string,
    sessionId: string | undefined,
    partialInput: string
  ): Promise<string> {
    const contextParts: string[] = [];

    if (sessionId) {
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (session) {
        contextParts.push(`阶段: ${session.stage}`);
        contextParts.push(`省份: ${session.province}`);
      }
    }

    return contextParts.join(' | ');
  }

  /**
   * 生成上下文hash
   */
  private generateContextHash(
    groupIds: string[],
    currentStage: string | undefined,
    recentTopics: string[]
  ): string {
    const content = JSON.stringify({
      groupIds: groupIds.sort(),
      currentStage,
      recentTopics: recentTopics.sort()
    });

    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * 获取缓存的建议
   */
  private async getCachedSuggestions(
    contextHash: string
  ): Promise<SessionSuggestion | null> {
    return await this.suggestionRepo.findOne({
      where: {
        contextHash,
        expiresAt: LessThan(new Date())
      }
    });
  }

  /**
   * 缓存建议
   */
  private async cacheSuggestions(
    userId: string,
    sessionId: string | undefined,
    contextHash: string,
    suggestions: Suggestion[],
    contextSummary: string,
    expiresInMinutes: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const suggestionEntity = this.suggestionRepo.create({
      id: uuidv4(),
      userId,
      sessionId,
      contextHash,
      suggestions,
      contextSummary,
      expiresAt
    });

    await this.suggestionRepo.save(suggestionEntity);
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredSuggestions(): Promise<number> {
    const result = await this.suggestionRepo.delete({
      expiresAt: LessThan(new Date())
    });

    return result.affected || 0;
  }

  /**
   * 默认建议（当LLM解析失败时）
   */
  private getDefaultSuggestions(data: any): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 根据会话阶段提供默认建议
    if (data.session) {
      if (data.session.stage === 'init' || data.session.stage === 'core_preferences') {
        suggestions.push({
          question: '你更看重院校的综合排名还是专业的特色优势？',
          reasoning: '了解你的核心决策权重',
          priority: 9,
          category: '偏好探索'
        });

        suggestions.push({
          question: '你对未来的就业地点有什么偏好吗？',
          reasoning: '地域选择会影响院校和专业的选择',
          priority: 8,
          category: '地域选择'
        });
      }
    }

    if (data.groups && data.groups.length > 0) {
      suggestions.push({
        question: '想了解这些专业组的就业前景和薪资水平吗？',
        reasoning: '就业信息有助于做出决策',
        priority: 7,
        category: '就业前景'
      });
    }

    // 至少返回3个默认建议
    if (suggestions.length < 3) {
      suggestions.push({
        question: '你计划本科毕业后直接工作还是继续深造？',
        reasoning: '深造计划影响院校和专业的选择',
        priority: 6,
        category: '深造机会'
      });
    }

    return suggestions;
  }
}
