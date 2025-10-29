import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { EquivalentScoreService } from '../../services/equivalentScore.service';

/**
 * 等位分查询工具
 */
export class EquivalentScoreTool extends Tool {
  name = 'query_equivalent_score';
  description = '查询等位分（同位分）：这是中分段（批次15%-80%）最重要的定位工具。根据今年的分数和位次，查询往年相同位次对应的分数，用于框定院校初始范围。位次比分数更稳定可靠。适用场景：考生问"我今年XXX分，往年大概什么分？"或需要进行冲稳保院校定位时。';

  parameters: Record<string, ToolParameter> = {
    currentYear: {
      type: 'number',
      description: '当前年份，如2025',
      required: true
    },
    province: {
      type: 'string',
      description: '省份名称，如"江苏"',
      required: true
    },
    subjectType: {
      type: 'string',
      description: '科类，如"物理类"或"历史类"',
      required: true
    },
    score: {
      type: 'number',
      description: '分数',
      required: true
    },
    compareYears: {
      type: 'array',
      description: '要对比的年份列表，如[2024,2023]。不填则查询所有可用年份',
      required: false,
      items: {
        type: 'number',
        description: '年份'
      }
    }
  };

  private service = new EquivalentScoreService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getEquivalentScores({
        currentYear: params.currentYear,
        province: params.province,
        subjectType: params.subjectType,
        score: params.score,
        compareYears: params.compareYears
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'score_rankings',
          description: `查询了${params.currentYear}年${params.province}${params.subjectType} ${params.score}分的等位分`
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
