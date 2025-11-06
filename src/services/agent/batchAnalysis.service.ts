import { AppDataSource } from '../../config/database';
import { EnrollmentPlanGroup } from '../../models/EnrollmentPlanGroup';
import { AgentSession } from '../../models/AgentSession';
import { AgentPreference } from '../../models/AgentPreference';
import { LLMService } from './llm.service';
import { In } from 'typeorm';

/**
 * 批量分析服务
 * 批量分析多个专业组，生成对比报告
 */

export interface BatchAnalysisRequest {
  userId: string;
  sessionId?: string;
  groupIds: string[];
  analysisType?: 'compare' | 'recommend' | 'risk_assess';
}

export interface GroupAnalysis {
  groupId: string;
  collegeName: string;
  groupName: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high';
  matchScore: number; // 与用户偏好的匹配度 0-100
}

export interface BatchAnalysisResult {
  summary: string;
  groupAnalyses: GroupAnalysis[];
  topRecommendations: string[];
  comparisonMatrix?: any;
}

export class BatchAnalysisService {
  private groupRepo = AppDataSource.getRepository(EnrollmentPlanGroup);
  private sessionRepo = AppDataSource.getRepository(AgentSession);
  private preferenceRepo = AppDataSource.getRepository(AgentPreference);
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  /**
   * 批量分析专业组
   */
  async analyzeBatchGroups(request: BatchAnalysisRequest): Promise<BatchAnalysisResult> {
    const startTime = Date.now();

    // 1. 获取专业组数据
    const groups = await this.groupRepo.find({
      where: { id: In(request.groupIds) }
    });

    if (groups.length === 0) {
      throw new Error('No groups found');
    }

    if (groups.length > 10) {
      throw new Error('Maximum 10 groups can be analyzed at once');
    }

    // 2. 获取用户偏好和会话信息
    const userContext = await this.getUserContext(request.userId, request.sessionId);

    // 3. 分析每个专业组
    const groupAnalyses = await Promise.all(
      groups.map(group => this.analyzeGroup(group, userContext))
    );

    // 4. 生成综合分析报告
    const summary = await this.generateSummary(groupAnalyses, userContext);

    // 5. 生成top推荐
    const topRecommendations = this.generateTopRecommendations(groupAnalyses);

    // 6. 如果是对比类型，生成对比矩阵
    const comparisonMatrix = request.analysisType === 'compare' ?
      this.generateComparisonMatrix(groupAnalyses) : undefined;

    const duration = Date.now() - startTime;
    console.log(`✅ 批量分析完成，耗时: ${duration}ms`);

    return {
      summary,
      groupAnalyses,
      topRecommendations,
      comparisonMatrix
    };
  }

  /**
   * 获取用户上下文
   */
  private async getUserContext(
    userId: string,
    sessionId?: string
  ): Promise<any> {
    const context: any = { userId };

    if (sessionId) {
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (session) {
        context.session = session;
        context.examScore = session.examScore;
        context.province = session.province;
        context.subjectType = session.subjectType;

        // 获取偏好
        const preferences = await this.preferenceRepo.find({
          where: { sessionId, isLatest: true }
        });
        context.preferences = preferences;
      }
    }

    return context;
  }

  /**
   * 分析单个专业组
   */
  private async analyzeGroup(
    group: EnrollmentPlanGroup,
    userContext: any
  ): Promise<GroupAnalysis> {
    // 基础信息
    const analysis: GroupAnalysis = {
      groupId: group.id,
      collegeName: group.collegeName,
      groupName: group.groupName || group.groupCode,
      score: 0,
      strengths: [],
      weaknesses: [],
      recommendation: '',
      riskLevel: 'medium',
      matchScore: 0
    };

    // 1. 计算匹配度
    analysis.matchScore = this.calculateMatchScore(group, userContext);

    // 2. 识别优势
    analysis.strengths = this.identifyStrengths(group, userContext);

    // 3. 识别劣势
    analysis.weaknesses = this.identifyWeaknesses(group, userContext);

    // 4. 评估风险
    analysis.riskLevel = this.assessRisk(group, userContext);

    // 5. 生成推荐语
    analysis.recommendation = await this.generateRecommendation(group, analysis, userContext);

    return analysis;
  }

  /**
   * 计算匹配分数（简化版）
   */
  private calculateMatchScore(group: EnrollmentPlanGroup, userContext: any): number {
    let score = 60; // 基础分

    // 根据偏好调整（简化版）
    if (userContext.preferences && userContext.preferences.length > 0) {
      score += Math.min(20, userContext.preferences.length * 2);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 识别优势（简化版，使用实际存在的字段）
   */
  private identifyStrengths(group: EnrollmentPlanGroup, userContext: any): string[] {
    const strengths: string[] = [];

    // 院校基本信息
    strengths.push(`院校: ${group.collegeName}`);

    // 专业组信息
    if (group.groupName) {
      strengths.push(`专业组: ${group.groupName}`);
    }

    return strengths;
  }

  /**
   * 识别劣势（简化版）
   */
  private identifyWeaknesses(group: EnrollmentPlanGroup, userContext: any): string[] {
    const weaknesses: string[] = [];

    // 暂时返回空数组，后续可以根据实际数据完善
    return weaknesses;
  }

  /**
   * 评估风险等级（简化版）
   */
  private assessRisk(group: EnrollmentPlanGroup, userContext: any): 'low' | 'medium' | 'high' {
    // 默认返回中等风险
    return 'medium';
  }

  /**
   * 生成推荐语
   */
  private async generateRecommendation(
    group: EnrollmentPlanGroup,
    analysis: GroupAnalysis,
    userContext: any
  ): Promise<string> {
    // 简化版：根据分析结果生成推荐语
    if (analysis.riskLevel === 'low' && analysis.matchScore > 70) {
      return '强烈推荐：该专业组与你的情况匹配度高，录取概率大';
    } else if (analysis.riskLevel === 'medium' && analysis.matchScore > 60) {
      return '可以考虑：该专业组比较适合，但需要注意风险';
    } else if (analysis.riskLevel === 'high') {
      return '谨慎选择：该专业组录取风险较高，建议作为冲刺志愿';
    } else {
      return '供参考：该专业组可以了解，但可能不是最佳选择';
    }
  }

  /**
   * 生成综合分析摘要
   */
  private async generateSummary(
    groupAnalyses: GroupAnalysis[],
    userContext: any
  ): Promise<string> {
    const prompt = `
你是一个高考志愿填报专家。基于以下专业组分析结果，生成一个简洁的综合分析摘要（150字以内）：

用户信息:
- 考分: ${userContext.examScore || '未知'}
- 省份: ${userContext.province || '未知'}
- 科目: ${userContext.subjectType || '未知'}

专业组分析:
${groupAnalyses.map((g, i) => `
${i + 1}. ${g.collegeName} - ${g.groupName}
   匹配度: ${g.matchScore}/100
   风险: ${g.riskLevel}
   优势: ${g.strengths.join('; ')}
   劣势: ${g.weaknesses.join('; ')}
`).join('\n')}

请生成综合分析摘要，包括:
1. 整体评价
2. 主要特点
3. 报考建议
`;

    try {
      const summary = await this.llmService.chat([
        { role: 'system', content: '你是一个专业的高考志愿填报顾问。' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.7,
        maxTokens: 500
      });

      return summary;
    } catch (error) {
      console.error('Summary generation error:', error);
      return '综合分析：这些专业组各有特色，建议根据个人兴趣和职业规划进行选择。';
    }
  }

  /**
   * 生成top推荐
   */
  private generateTopRecommendations(groupAnalyses: GroupAnalysis[]): string[] {
    // 按匹配度排序
    const sorted = [...groupAnalyses].sort((a, b) => b.matchScore - a.matchScore);

    return sorted.slice(0, 3).map(g =>
      `${g.collegeName} - ${g.groupName}（匹配度: ${g.matchScore}/100）`
    );
  }

  /**
   * 生成对比矩阵
   */
  private generateComparisonMatrix(groupAnalyses: GroupAnalysis[]): any {
    return {
      dimensions: ['院校层次', '专业特色', '地理位置', '就业前景', '深造机会'],
      groups: groupAnalyses.map(g => ({
        groupId: g.groupId,
        name: `${g.collegeName}-${g.groupName}`,
        scores: {
          '院校层次': this.scoreInstitutionLevel(g),
          '专业特色': this.scoreMajorFeature(g),
          '地理位置': this.scoreLocation(g),
          '就业前景': this.scoreEmployment(g),
          '深造机会': this.scoreFurtherStudy(g)
        }
      }))
    };
  }

  private scoreInstitutionLevel(analysis: GroupAnalysis): number {
    if (analysis.strengths.some(s => s.includes('985'))) return 95;
    if (analysis.strengths.some(s => s.includes('211'))) return 85;
    if (analysis.strengths.some(s => s.includes('双一流'))) return 80;
    return 70;
  }

  private scoreMajorFeature(analysis: GroupAnalysis): number {
    return analysis.matchScore > 70 ? 85 : 70;
  }

  private scoreLocation(analysis: GroupAnalysis): number {
    if (analysis.strengths.some(s => s.includes('北京') || s.includes('上海'))) return 90;
    if (analysis.strengths.some(s => s.includes('广州') || s.includes('深圳'))) return 85;
    return 70;
  }

  private scoreEmployment(analysis: GroupAnalysis): number {
    return analysis.riskLevel === 'low' ? 80 : 70;
  }

  private scoreFurtherStudy(analysis: GroupAnalysis): number {
    return this.scoreInstitutionLevel(analysis);
  }
}
