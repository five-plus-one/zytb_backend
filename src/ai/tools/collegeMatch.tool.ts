import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { CollegeMatchService } from '../../services/collegeMatch.service';

/**
 * 查询适合的院校工具(院校级聚合)
 */
export class QuerySuitableCollegesTool extends Tool {
  name = 'query_suitable_colleges';
  description = '查询适合的院校(院校级聚合)：根据分数范围查询有哪些院校适合，返回院校维度的聚合数据而非专业细节。每个院校显示匹配的专业组数量、招生计划总数、录取概率(冲/稳/保)、历年分数等关键信息。适用场景："江苏省内有哪些学校适合我？""我这个分数能上哪些985/211？""帮我看看有哪些保底的学校"。注意：1)江苏考生建议分数降5分使用；2)返回院校概览，不返回具体专业列表；3)可以按985/211/省内外/冲稳保筛选。';

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
      description: '分数浮动范围，默认50分',
      required: false
    },
    collegeProvince: {
      type: 'string',
      description: '院校所在省份（用于筛选省内/省外院校）',
      required: false
    },
    collegeLevel: {
      type: 'string',
      description: '院校层次：985/211/双一流',
      required: false
    },
    admitProbability: {
      type: 'string',
      description: '录取概率筛选：冲/稳/保',
      required: false
    },
    pageSize: {
      type: 'number',
      description: '返回结果数量，默认20',
      required: false
    }
  };

  private service = new CollegeMatchService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.querySuitableColleges({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        score: params.score,
        scoreRange: params.scoreRange || 50,
        collegeProvince: params.collegeProvince,
        collegeLevel: params.collegeLevel,
        admitProbability: params.admitProbability,
        pageNum: 1,
        pageSize: params.pageSize || 20
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans + admission_scores + colleges',
          description: `查询到${result.colleges.length}所适合的院校，用户位次${result.userRank || '未知'}`
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
 * 获取院校匹配详情工具
 */
export class GetCollegeMatchDetailTool extends Tool {
  name = 'get_college_match_detail';
  description = '获取院校匹配详情：深入了解某个院校的详细匹配情况，包括院校基本信息、所有专业组及其包含的专业、历年录取分数对比、录取概率分析、推荐策略等。用于用户想详细了解某个学校时使用。适用场景："苏州大学怎么样？""帮我详细看看东南大学""这个学校有哪些专业组？"';

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
      description: '用户分数',
      required: true
    },
    collegeCode: {
      type: 'string',
      description: '院校代码',
      required: false
    },
    collegeName: {
      type: 'string',
      description: '院校名称（支持模糊搜索）',
      required: false
    }
  };

  private service = new CollegeMatchService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      if (!params.collegeCode && !params.collegeName) {
        return {
          success: false,
          error: '必须提供collegeCode或collegeName其中之一'
        };
      }

      const result = await this.service.getCollegeMatchDetail({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        score: params.score,
        collegeCode: params.collegeCode,
        collegeName: params.collegeName
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'colleges + enrollment_plans + admission_scores',
          description: `查询了${result.collegeInfo.name}的详细匹配情况，包含${result.majorGroups.length}个专业组`
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
 * 按院校层次查询工具
 */
export class QueryCollegesByLevelTool extends Tool {
  name = 'query_colleges_by_level';
  description = '按院校层次查询：快速查询特定层次的院校(985/211/双一流等)。用于用户明确想查看某个层次的院校时。适用场景："有哪些985院校适合我？""江苏省内的211大学有哪些？"';

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
    collegeLevel: {
      type: 'string',
      description: '院校层次：985/211/双一流',
      required: true
    },
    collegeProvince: {
      type: 'string',
      description: '院校所在省份（可选）',
      required: false
    },
    pageSize: {
      type: 'number',
      description: '返回结果数量，默认30',
      required: false
    }
  };

  private service = new CollegeMatchService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.querySuitableColleges({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        score: params.score,
        scoreRange: 50,
        collegeLevel: params.collegeLevel,
        collegeProvince: params.collegeProvince,
        pageNum: 1,
        pageSize: params.pageSize || 30
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans + admission_scores + colleges',
          description: `查询到${result.colleges.length}所${params.collegeLevel}院校`
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
 * 按录取概率查询工具
 */
export class QueryCollegesByAdmitProbabilityTool extends Tool {
  name = 'query_colleges_by_admit_probability';
  description = '按录取概率查询院校：根据冲/稳/保分类查询院校。用于用户想查看特定概率层次的院校时。适用场景："有哪些保底的学校？""给我推荐一些稳妥的院校""我想冲刺哪些学校？"';

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
    admitProbability: {
      type: 'string',
      description: '录取概率：冲/稳/保',
      required: true
    },
    collegeProvince: {
      type: 'string',
      description: '院校所在省份（可选）',
      required: false
    },
    pageSize: {
      type: 'number',
      description: '返回结果数量，默认20',
      required: false
    }
  };

  private service = new CollegeMatchService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.querySuitableColleges({
        year: params.year,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType,
        score: params.score,
        scoreRange: 50,
        admitProbability: params.admitProbability,
        collegeProvince: params.collegeProvince,
        pageNum: 1,
        pageSize: params.pageSize || 20
      });

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'enrollment_plans + admission_scores + colleges',
          description: `查询到${result.colleges.length}所"${params.admitProbability}"级别的院校`
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
