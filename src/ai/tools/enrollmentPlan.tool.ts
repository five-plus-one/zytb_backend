import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { EnrollmentPlanDetailService } from '../../services/enrollmentPlanDetail.service';

/**
 * 查询招生计划详情工具
 */
export class EnrollmentPlanDetailTool extends Tool {
  name = 'query_enrollment_plan';
  description = '查询招生计划详情：深度调研某个院校的招生计划，包含专业组划分、招生人数、选科要求、往年3年录取分数等。用于"稳一稳"区间的认真调研，了解院校的详细招生情况。适合考生明确想了解某个学校时使用。';

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
    collegeName: {
      type: 'string',
      description: '院校名称，支持模糊搜索',
      required: false
    },
    collegeCode: {
      type: 'string',
      description: '院校代码',
      required: false
    },
    pageSize: {
      type: 'number',
      description: '返回结果数量，默认50',
      required: false
    }
  };

  private service = new EnrollmentPlanDetailService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getEnrollmentPlanDetails({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        collegeName: params.collegeName,
        collegeCode: params.collegeCode,
        includeHistoricalScores: true,
        historicalYears: 3,
        pageNum: 1,
        pageSize: params.pageSize || 50
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans + admission_scores + colleges',
          description: `查询到${result.list.length}个招生计划`
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
 * 按院校分组查询招生计划工具
 */
export class EnrollmentPlanByCollegeTool extends Tool {
  name = 'query_enrollment_by_college';
  description = '按院校查询专业组结构：查询某个院校有哪些专业组，每个专业组包含哪些专业。帮助考生理解江苏"院校+专业组"的志愿结构，判断专业组内是否需要拉开梯度。适用于考生问"XX大学有哪些专业组？"或需要了解专业组内部专业分布。';

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
    collegeName: {
      type: 'string',
      description: '院校名称',
      required: true
    }
  };

  private service = new EnrollmentPlanDetailService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getEnrollmentPlansByCollege(
        params.year,
        params.sourceProvince,
        params.subjectType,
        undefined,
        params.collegeName
      );

      // 检查是否返回空结果
      if (!result || result.length === 0) {
        return {
          success: false,
          error: `未找到"${params.collegeName}"在${params.year}年${params.sourceProvince}${params.subjectType}类的招生计划`,
          data: {
            queriedCollegeName: params.collegeName,
            suggestions: [
              '可能原因：',
              '1. 院校名称拼写有误，请检查院校全称（如"南京大学"而非"南大"）',
              '2. 该院校今年可能不在当前省份招生',
              '3. 数据库中暂未录入该院校的招生计划',
              '',
              '建议：',
              '• 使用 query_suitable_colleges 查看所有可选院校',
              '• 访问江苏省考试院官网查询最新招生计划',
              '• 使用掌上高考、优志愿等平台进行交叉验证',
              `• 尝试搜索院校的其他名称形式（如"中国人民大学(苏州校区)"）`
            ]
          },
          metadata: {
            dataSource: 'enrollment_plans',
            description: '查询结果为空'
          }
        };
      }

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans',
          description: `查询到${result.length}个院校的招生计划`
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
 * 查询院校历史录取统计工具
 */
export class CollegeHistoricalStatsTool extends Tool {
  name = 'query_college_stats';
  description = '查询院校历史录取统计：查询某个院校近几年的录取分数趋势（最高分、最低分、平均分、录取位次）。用于判断院校录取分数的稳定性，辅助冲稳保判断。适用于考生问"XX大学往年分数线？"或需要验证院校是否符合冲/稳/保定位。';

  parameters: Record<string, ToolParameter> = {
    collegeName: {
      type: 'string',
      description: '院校名称',
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
    years: {
      type: 'number',
      description: '查询几年的数据，默认5年',
      required: false
    }
  };

  private service = new EnrollmentPlanDetailService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getCollegeHistoricalScoreStats(
        params.collegeName,
        params.sourceProvince,
        params.subjectType,
        params.years || 5
      );

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'admission_scores',
          description: `查询了${params.collegeName}的历史录取统计`
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
