import { AppDataSource } from '../../config/database';
import { VolunteerTable } from '../../models/VolunteerTable';
import { VolunteerBatch } from '../../models/VolunteerNew';
import { EnrollmentPlanGroup } from '../../models/EnrollmentPlanGroup';
import { AgentSession } from '../../models/AgentSession';
import { LLMService } from './llm.service';

/**
 * 志愿表优化服务
 * 分析志愿表并提供优化建议
 */

export interface TableOptimizationRequest {
  userId: string;
  tableId: string;
  sessionId?: string;
}

export interface OptimizationSuggestion {
  type: 'structure' | 'risk' | 'waste' | 'diversity' | 'order';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion: string;
  affectedBatches?: string[];
  affectedGroups?: string[];
}

export interface TableOptimizationResult {
  overallScore: number; // 0-100
  riskAnalysis: {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    riskDistribution: string;
  };
  suggestions: OptimizationSuggestion[];
  summary: string;
}

export class TableOptimizationService {
  private tableRepo = AppDataSource.getRepository(VolunteerTable);
  private batchRepo = AppDataSource.getRepository(VolunteerBatch);
  private groupRepo = AppDataSource.getRepository(EnrollmentPlanGroup);
  private sessionRepo = AppDataSource.getRepository(AgentSession);
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  /**
   * 优化志愿表
   */
  async optimizeTable(request: TableOptimizationRequest): Promise<TableOptimizationResult> {
    const startTime = Date.now();

    // 1. 获取志愿表
    const table = await this.tableRepo.findOne({
      where: { id: request.tableId, userId: request.userId }
    });

    if (!table) {
      throw new Error('Table not found');
    }

    // 2. 获取所有批次
    const batches = await this.batchRepo.find({
      where: { tableId: request.tableId },
      relations: ['groups', 'groups.majors'],
      order: { createdAt: 'ASC' }  // 按创建时间排序
    });

    if (batches.length === 0) {
      throw new Error('No batches found in this table');
    }

    // 3. 获取用户会话信息
    const userContext = await this.getUserContext(request.userId, request.sessionId);

    // 4. 分析志愿表结构
    const suggestions: OptimizationSuggestion[] = [];

    // 检查结构合理性
    suggestions.push(...this.checkStructure(batches));

    // 检查风险分布
    const riskAnalysis = this.analyzeRiskDistribution(batches, userContext);
    suggestions.push(...this.checkRiskBalance(riskAnalysis, batches));

    // 检查分数浪费
    suggestions.push(...this.checkScoreWaste(batches, userContext));

    // 检查多样性
    suggestions.push(...this.checkDiversity(batches));

    // 检查顺序合理性
    suggestions.push(...this.checkOrder(batches, userContext));

    // 5. 计算整体评分
    const overallScore = this.calculateOverallScore(suggestions, riskAnalysis);

    // 6. 生成优化摘要
    const summary = await this.generateOptimizationSummary(
      overallScore,
      riskAnalysis,
      suggestions,
      userContext
    );

    const duration = Date.now() - startTime;
    console.log(`✅ 志愿表优化完成，耗时: ${duration}ms`);

    return {
      overallScore,
      riskAnalysis,
      suggestions,
      summary
    };
  }

  /**
   * 获取用户上下文
   */
  private async getUserContext(userId: string, sessionId?: string): Promise<any> {
    const context: any = { userId };

    if (sessionId) {
      const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
      if (session) {
        context.session = session;
        context.examScore = session.examScore;
        context.province = session.province;
      }
    }

    return context;
  }

  /**
   * 检查志愿表结构
   */
  private checkStructure(batches: any[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 检查批次数量
    if (batches.length < 2) {
      suggestions.push({
        type: 'structure',
        severity: 'medium',
        title: '批次数量不足',
        description: '当前只有1个批次，建议增加保底批次',
        suggestion: '建议创建"保底批次"，选择录取概率更高的院校专业',
        affectedBatches: batches.map(b => b.id)
      });
    }

    // 检查每个批次的专业组数量
    batches.forEach(batch => {
      const groupCount = batch.groups?.length || 0;

      if (groupCount < 5) {
        suggestions.push({
          type: 'structure',
          severity: 'low',
          title: `${batch.batchType}专业组数量偏少`,
          description: `当前只有${groupCount}个专业组，建议增加到8-12个`,
          suggestion: '增加专业组数量可以提高录取机会，建议补充更多选项',
          affectedBatches: [batch.id]
        });
      } else if (groupCount > 20) {
        suggestions.push({
          type: 'structure',
          severity: 'low',
          title: `${batch.batchType}专业组数量过多`,
          description: `当前有${groupCount}个专业组，可能管理困难`,
          suggestion: '建议精简到12-15个最优选项，提高志愿质量',
          affectedBatches: [batch.id]
        });
      }
    });

    return suggestions;
  }

  /**
   * 分析风险分布
   */
  private analyzeRiskDistribution(batches: any[], userContext: any): any {
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;

    batches.forEach(batch => {
      if (batch.batchType === '冲刺批次') {
        highRiskCount += batch.groups?.length || 0;
      } else if (batch.batchType === '稳妥批次') {
        mediumRiskCount += batch.groups?.length || 0;
      } else if (batch.batchType === '保底批次') {
        lowRiskCount += batch.groups?.length || 0;
      }
    });

    const total = highRiskCount + mediumRiskCount + lowRiskCount;
    const riskDistribution = `冲刺${highRiskCount}个 / 稳妥${mediumRiskCount}个 / 保底${lowRiskCount}个`;

    return {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      total,
      riskDistribution
    };
  }

  /**
   * 检查风险平衡
   */
  private checkRiskBalance(riskAnalysis: any, batches: any[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const { highRiskCount, mediumRiskCount, lowRiskCount, total } = riskAnalysis;

    // 推荐比例：冲刺30% / 稳妥50% / 保底20%
    const highRatio = highRiskCount / total;
    const mediumRatio = mediumRiskCount / total;
    const lowRatio = lowRiskCount / total;

    if (highRatio > 0.5) {
      suggestions.push({
        type: 'risk',
        severity: 'high',
        title: '冲刺志愿过多，风险较高',
        description: `冲刺志愿占比${(highRatio * 100).toFixed(1)}%，建议控制在30%以内`,
        suggestion: '增加稳妥和保底志愿，降低落榜风险'
      });
    }

    if (lowRatio < 0.1 && total > 10) {
      suggestions.push({
        type: 'risk',
        severity: 'high',
        title: '保底志愿不足',
        description: `保底志愿仅占${(lowRatio * 100).toFixed(1)}%，存在较大风险`,
        suggestion: '建议增加保底志愿至20%以上，确保有学可上'
      });
    }

    if (mediumRatio < 0.3 && total > 10) {
      suggestions.push({
        type: 'risk',
        severity: 'medium',
        title: '稳妥志愿占比偏低',
        description: `稳妥志愿占比${(mediumRatio * 100).toFixed(1)}%，建议提高到50%左右`,
        suggestion: '增加稳妥志愿可以平衡风险和机会'
      });
    }

    return suggestions;
  }

  /**
   * 检查分数浪费
   */
  private checkScoreWaste(batches: any[], userContext: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 这里需要结合专业组的录取分数进行分析
    // 简化版：检查是否有明显的分数冗余

    return suggestions;
  }

  /**
   * 检查多样性
   */
  private checkDiversity(batches: any[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 收集所有专业和城市
    const allColleges = new Set<string>();
    const allCities = new Set<string>();
    const allMajors = new Set<string>();

    batches.forEach(batch => {
      batch.groups?.forEach((group: any) => {
        allColleges.add(group.collegeCode);
        if (group.collegeCity) allCities.add(group.collegeCity);
        allMajors.add(group.majorCode);
      });
    });

    // 检查地域多样性
    if (allCities.size < 3) {
      suggestions.push({
        type: 'diversity',
        severity: 'low',
        title: '地域集中度较高',
        description: `志愿仅涉及${allCities.size}个城市`,
        suggestion: '建议考虑更多城市的院校，增加选择灵活性'
      });
    }

    // 检查专业多样性
    if (allMajors.size < 5 && batches.reduce((sum, b) => sum + (b.groups?.length || 0), 0) > 10) {
      suggestions.push({
        type: 'diversity',
        severity: 'medium',
        title: '专业选择范围较窄',
        description: `志愿仅涉及${allMajors.size}个专业`,
        suggestion: '建议适当扩展专业范围，避免过于集中在单一领域'
      });
    }

    return suggestions;
  }

  /**
   * 检查顺序合理性
   */
  private checkOrder(batches: any[], userContext: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 检查批次顺序是否符合"冲-稳-保"原则
    let lastType = '';
    const typeOrder = ['冲刺批次', '稳妥批次', '保底批次'];

    for (let i = 0; i < batches.length; i++) {
      const currentType = batches[i].batchType;
      if (lastType && typeOrder.indexOf(currentType) < typeOrder.indexOf(lastType)) {
        suggestions.push({
          type: 'order',
          severity: 'medium',
          title: '批次顺序不合理',
          description: `批次"${currentType}"排在"${lastType}"之后`,
          suggestion: '建议调整批次顺序为：冲刺 → 稳妥 → 保底',
          affectedBatches: [batches[i].id]
        });
      }
      lastType = currentType;
    }

    return suggestions;
  }

  /**
   * 计算整体评分
   */
  private calculateOverallScore(
    suggestions: OptimizationSuggestion[],
    riskAnalysis: any
  ): number {
    let score = 100;

    // 根据建议数量和严重程度扣分
    suggestions.forEach(s => {
      if (s.severity === 'high') score -= 15;
      else if (s.severity === 'medium') score -= 10;
      else score -= 5;
    });

    // 根据风险分布调整
    const { highRiskCount, mediumRiskCount, lowRiskCount, total } = riskAnalysis;
    if (total > 0) {
      const idealDistribution = Math.abs(highRiskCount / total - 0.3) +
        Math.abs(mediumRiskCount / total - 0.5) +
        Math.abs(lowRiskCount / total - 0.2);

      score -= idealDistribution * 20;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 生成优化摘要
   */
  private async generateOptimizationSummary(
    overallScore: number,
    riskAnalysis: any,
    suggestions: OptimizationSuggestion[],
    userContext: any
  ): Promise<string> {
    const highSeveritySuggestions = suggestions.filter(s => s.severity === 'high');

    if (overallScore >= 90) {
      return `优秀！你的志愿表整体质量很高（${overallScore}分），${riskAnalysis.riskDistribution}。建议按照当前方案填报。`;
    } else if (overallScore >= 75) {
      return `良好！你的志愿表基本合理（${overallScore}分），${riskAnalysis.riskDistribution}。有${suggestions.length}条优化建议供参考。`;
    } else if (overallScore >= 60) {
      return `一般。你的志愿表存在一些问题（${overallScore}分），${riskAnalysis.riskDistribution}。建议重点关注${highSeveritySuggestions.length}条重要建议。`;
    } else {
      return `需要优化！你的志愿表存在较多问题（${overallScore}分），${riskAnalysis.riskDistribution}。强烈建议根据${highSeveritySuggestions.length}条重要建议进行调整。`;
    }
  }
}
