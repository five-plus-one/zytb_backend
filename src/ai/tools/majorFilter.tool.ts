import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { MajorFilterService } from '../../services/majorFilter.service';

/**
 * 专业筛选工具
 */
export class MajorFilterTool extends Tool {
  name = 'filter_majors';
  description = '筛选专业招生计划：在圈定院校范围后，根据分数、专业方向、院校等条件筛选具体的招生计划。展示往年录取分数用于冲稳保判断。适用于"XXX分能上哪些计算机专业？"或"帮我看看这个分数段有什么好专业"。注意：江苏考生建议分数降5分使用，以确保专业选择权。';

  parameters: Record<string, ToolParameter> = {
    year: {
      type: 'number',
      description: '年份',
      required: true
    },
    sourceProvince: {
      type: 'string',
      description: '生源地省份',
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
    },
    scoreRange: {
      type: 'number',
      description: '分数浮动范围，默认10分',
      required: false
    },
    majorDirection: {
      type: 'string',
      description: '专业方向或类别，如"计算机"、"电子信息"',
      required: false
    },
    majorName: {
      type: 'string',
      description: '专业名称，支持模糊搜索',
      required: false
    },
    collegeName: {
      type: 'string',
      description: '院校名称，支持模糊搜索',
      required: false
    },
    pageSize: {
      type: 'number',
      description: '返回结果数量，默认20',
      required: false
    }
  };

  private service = new MajorFilterService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.filterMajors({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        score: params.score,
        scoreRange: params.scoreRange || 10,
        majorDirection: params.majorDirection,
        majorName: params.majorName,
        collegeName: params.collegeName,
        pageNum: 1,
        pageSize: params.pageSize || 20
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans + admission_scores',
          description: `筛选出${result.list.length}个匹配的专业，用户位次${result.userRank}`
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
 * 获取专业方向工具
 */
export class GetMajorDirectionsTool extends Tool {
  name = 'get_major_directions';
  description = '获取专业方向列表：查询某年某省某科类下所有可用的专业大类/方向。辅助工具，当考生不知道有哪些专业方向可选，或需要了解专业分类时使用。';

  parameters: Record<string, ToolParameter> = {
    year: {
      type: 'number',
      description: '年份',
      required: true
    },
    sourceProvince: {
      type: 'string',
      description: '生源地省份',
      required: true
    },
    subjectType: {
      type: 'string',
      description: '科类',
      required: true
    }
  };

  private service = new MajorFilterService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getAvailableMajorDirections(
        params.year,
        params.sourceProvince,
        params.subjectType
      );

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans',
          description: `查询到${result.length}个专业方向`
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
