import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { MajorInfoService } from '../../services/majorInfo.service';

/**
 * 查询专业组详细信息工具
 */
export class QueryGroupInfoTool extends Tool {
  name = 'query_group_info';
  description = '查询专业组详细信息：查询某个院校的某个专业组包含哪些专业、招生人数、选科要求、往年录取分数等详细信息。用于深入了解某个专业组的情况。适用场景："南京大学01专业组有哪些专业？""这个专业组往年录取分多少？"。';

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
    groupCode: {
      type: 'string',
      description: '专业组代码',
      required: true
    },
    collegeName: {
      type: 'string',
      description: '院校名称（支持模糊搜索）',
      required: false
    },
    collegeCode: {
      type: 'string',
      description: '院校代码',
      required: false
    }
  };

  private service = new MajorInfoService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.getGroupInfo({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        groupCode: params.groupCode,
        collegeName: params.collegeName,
        collegeCode: params.collegeCode
      });

      if (!result.found) {
        return {
          success: false,
          error: result.message
        };
      }

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans + admission_scores',
          description: `查询到专业组信息，包含${result.majors?.length || 0}个专业`
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
 * 查询专业在不同院校的开设情况工具
 */
export class QueryMajorInCollegesTool extends Tool {
  name = 'query_major_in_colleges';
  description = '查询专业在不同院校的开设情况：查询某个专业在哪些院校有开设，以及各院校的往年录取分数。用于专业优先的选择策略，了解某个专业的院校选择范围。适用场景："哪些学校有计算机专业？""我想学临床医学，有哪些选择？"';

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
    majorName: {
      type: 'string',
      description: '专业名称（支持模糊搜索）',
      required: true
    },
    minScore: {
      type: 'number',
      description: '最低分数范围',
      required: false
    },
    maxScore: {
      type: 'number',
      description: '最高分数范围',
      required: false
    }
  };

  private service = new MajorInfoService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const scoreRange = (params.minScore && params.maxScore) ? {
        min: params.minScore,
        max: params.maxScore
      } : undefined;

      const result = await this.service.getMajorInColleges({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        majorName: params.majorName,
        scoreRange
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans + admission_scores',
          description: `查询到${result.totalCount}个院校开设${params.majorName}专业`
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
 * 对比专业组工具
 */
export class CompareGroupsTool extends Tool {
  name = 'compare_groups';
  description = '对比多个专业组：并排对比多个专业组的信息，包括包含的专业、往年录取分数、招生人数等，帮助用户做出选择。用于在多个相似的专业组之间做对比。适用场景："对比一下南京大学和东南大学的计算机专业组""帮我比较这几个专业组"。';

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
    groups: {
      type: 'array',
      description: '要对比的专业组列表。每个元素需包含：collegeName（院校名称，支持模糊搜索）或 collegeCode（院校代码）+ groupCode（专业组代码）',
      required: true,
      items: {
        type: 'object',
        description: '专业组信息，格式：{collegeName: "南京大学", groupCode: "01"} 或 {collegeCode: "1101", groupCode: "01"}'
      }
    }
  };

  private service = new MajorInfoService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      if (!Array.isArray(params.groups) || params.groups.length === 0) {
        return {
          success: false,
          error: '请提供至少一个专业组进行对比'
        };
      }

      if (params.groups.length > 5) {
        return {
          success: false,
          error: '一次最多对比5个专业组'
        };
      }

      const result = await this.service.compareGroups({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        groups: params.groups
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans + admission_scores',
          description: `对比了${result.compareCount}个专业组`
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
