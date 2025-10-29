import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { ScoreRankingService } from '../../services/scoreRanking.service';

/**
 * 根据分数查询位次工具
 */
export class ScoreToRankTool extends Tool {
  name = 'score_to_rank';
  description = '分数转位次：查询某个分数对应的位次排名。位次是最可靠的定位指标，尤其适用于高分段（批次前15%）考生。用于了解"我这个分数能排第几名？"，是使用位次法和同位分法的基础数据。';

  parameters: Record<string, ToolParameter> = {
    year: {
      type: 'number',
      description: '年份',
      required: true
    },
    province: {
      type: 'string',
      description: '省份',
      required: true
    },
    subjectType: {
      type: 'string',
      description: '科类',
      required: true
    },
    score: {
      type: 'number',
      description: '分数',
      required: true
    }
  };

  private service = new ScoreRankingService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getRankByScore(
        params.year,
        params.province,
        params.subjectType,
        params.score
      );

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'score_rankings',
          description: `${params.score}分对应位次${result.rank || result.cumulativeCount}`
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

/**
 * 根据位次查询分数工具
 */
export class RankToScoreTool extends Tool {
  name = 'rank_to_score';
  description = '位次转分数：根据位次排名查询对应的分数。用于位次法定位时，将位次百分比（如+10%、-20%）换算成具体分数区间，或帮助考生理解"位次5000名是多少分？"';

  parameters: Record<string, ToolParameter> = {
    year: {
      type: 'number',
      description: '年份',
      required: true
    },
    province: {
      type: 'string',
      description: '省份',
      required: true
    },
    subjectType: {
      type: 'string',
      description: '科类',
      required: true
    },
    rank: {
      type: 'number',
      description: '位次',
      required: true
    }
  };

  private service = new ScoreRankingService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getScoreByRank(
        params.year,
        params.province,
        params.subjectType,
        params.rank
      );

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'score_rankings',
          description: `位次${params.rank}对应分数${result.score}`
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

/**
 * 获取分数段分布工具
 */
export class ScoreDistributionTool extends Tool {
  name = 'get_score_distribution';
  description = '获取分数段分布：查询某个分数区间（如640-660分）有多少人，用于了解考生在整体中的竞争情况。辅助工具，通常在需要了解分数段密集程度时使用。';

  parameters: Record<string, ToolParameter> = {
    year: {
      type: 'number',
      description: '年份',
      required: true
    },
    province: {
      type: 'string',
      description: '省份',
      required: true
    },
    subjectType: {
      type: 'string',
      description: '科类',
      required: true
    }
  };

  private service = new ScoreRankingService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getScoreDistribution(
        params.year,
        params.province,
        params.subjectType
      );

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'score_rankings',
          description: `查询了分数段分布，总人数${result.totalCount}`
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
