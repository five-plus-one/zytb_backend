import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { VolunteerManagementService } from '../../services/volunteerManagement.service';

/**
 * 查询用户志愿表工具
 */
export class QueryUserVolunteersTo extends Tool {
  name = 'query_user_volunteers';
  description = '查询用户的志愿表：查看用户当前填报的志愿情况，包括所有专业组和专业的详细信息。用于了解用户已经填了哪些志愿，或需要基于现有志愿提供建议时使用。适用场景："我现在填了哪些志愿？"或"帮我看看我的志愿表"。';

  parameters: Record<string, ToolParameter> = {
    userId: {
      type: 'string',
      description: '用户ID',
      required: true
    },
    batchId: {
      type: 'string',
      description: '志愿批次ID，不填则返回用户所有批次',
      required: false
    },
    year: {
      type: 'number',
      description: '年份，用于筛选特定年份的志愿',
      required: false
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      if (params.batchId) {
        // 查询特定批次的详细信息
        const batchDetail = await this.service.getBatchDetail(params.batchId);
        return {
          success: true,
          data: batchDetail,
          metadata: {
            dataSource: 'volunteer_batches + volunteer_groups + volunteer_majors',
            description: `查询到志愿批次，包含${batchDetail.groups?.length || 0}个专业组`
          }
        };
      } else {
        // 查询用户的所有批次
        const batches = await this.service.getUserBatches(params.userId, params.year);
        return {
          success: true,
          data: batches,
          metadata: {
            dataSource: 'volunteer_batches',
            description: `查询到${batches.length}个志愿批次`
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * 添加志愿专业组工具
 */
export class AddVolunteerGroupTool extends Tool {
  name = 'add_volunteer_group';
  description = '添加志愿专业组：向用户的志愿表中添加一个专业组。江苏新高考最多可填40个专业组。用于帮助用户构建志愿表，将推荐的院校专业组添加到志愿表中。适用场景："把这个学校加到我的志愿表""我想填报南京大学01专业组"。';

  parameters: Record<string, ToolParameter> = {
    batchId: {
      type: 'string',
      description: '志愿批次ID',
      required: true
    },
    groupOrder: {
      type: 'number',
      description: '专业组排序（1-40）',
      required: true
    },
    collegeCode: {
      type: 'string',
      description: '院校代码',
      required: true
    },
    collegeName: {
      type: 'string',
      description: '院校名称',
      required: true
    },
    groupCode: {
      type: 'string',
      description: '专业组代码',
      required: true
    },
    groupName: {
      type: 'string',
      description: '专业组名称',
      required: true
    },
    isObeyAdjustment: {
      type: 'boolean',
      description: '是否服从调剂，默认true',
      required: false
    },
    admitProbability: {
      type: 'string',
      description: '录取概率：冲、稳、保',
      required: false
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const group = await this.service.addVolunteerGroup({
        batchId: params.batchId,
        groupOrder: params.groupOrder,
        collegeCode: params.collegeCode,
        collegeName: params.collegeName,
        groupCode: params.groupCode,
        groupName: params.groupName,
        isObeyAdjustment: params.isObeyAdjustment !== false,
        admitProbability: params.admitProbability
      });

      return {
        success: true,
        data: group,
        metadata: {
          dataSource: 'volunteer_groups',
          description: `已添加专业组：${params.collegeName} ${params.groupName}到第${params.groupOrder}位`
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
 * 添加志愿专业工具
 */
export class AddVolunteerMajorTool extends Tool {
  name = 'add_volunteer_major';
  description = '添加志愿专业：向专业组中添加一个专业。每个专业组最多可填6个专业。用于完善专业组内的专业选择。适用场景："在这个专业组里加入计算机科学专业""我想在第一个专业组填计算机类"。';

  parameters: Record<string, ToolParameter> = {
    groupId: {
      type: 'string',
      description: '专业组ID',
      required: true
    },
    majorOrder: {
      type: 'number',
      description: '专业排序（1-6）',
      required: true
    },
    majorCode: {
      type: 'string',
      description: '专业代码',
      required: true
    },
    majorName: {
      type: 'string',
      description: '专业名称',
      required: true
    },
    majorDirection: {
      type: 'string',
      description: '专业方向',
      required: false
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const major = await this.service.addVolunteerMajor({
        groupId: params.groupId,
        majorOrder: params.majorOrder,
        majorCode: params.majorCode,
        majorName: params.majorName,
        majorDirection: params.majorDirection
      });

      return {
        success: true,
        data: major,
        metadata: {
          dataSource: 'volunteer_majors',
          description: `已添加专业：${params.majorName}到第${params.majorOrder}位`
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
 * 删除志愿专业组工具
 */
export class DeleteVolunteerGroupTool extends Tool {
  name = 'delete_volunteer_group';
  description = '删除志愿专业组：从志愿表中删除一个专业组及其下所有专业。用于调整志愿表，删除不合适的专业组。适用场景："把第3个专业组删掉""我不想填这个学校了"。注意：删除专业组会同时删除其下所有专业。';

  parameters: Record<string, ToolParameter> = {
    groupId: {
      type: 'string',
      description: '专业组ID',
      required: true
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      await this.service.deleteVolunteerGroup(params.groupId);

      return {
        success: true,
        data: { message: '专业组已删除' },
        metadata: {
          dataSource: 'volunteer_groups',
          description: '已删除专业组及其下所有专业'
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
 * 调整志愿顺序工具
 */
export class ReorderVolunteerGroupTool extends Tool {
  name = 'reorder_volunteer_group';
  description = '调整专业组顺序：调整专业组在志愿表中的位置。志愿填报遵循顺序原则，调整顺序很重要。用于优化志愿表的冲稳保排列。适用场景："把第5个专业组调到第2位""这个学校应该往前放"。';

  parameters: Record<string, ToolParameter> = {
    groupId: {
      type: 'string',
      description: '专业组ID',
      required: true
    },
    newOrder: {
      type: 'number',
      description: '新的排序位置（1-40）',
      required: true
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const group = await this.service.reorderVolunteerGroup(params.groupId, params.newOrder);

      return {
        success: true,
        data: group,
        metadata: {
          dataSource: 'volunteer_groups',
          description: `已将专业组调整到第${params.newOrder}位`
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
 * 清空志愿表工具
 */
export class ClearVolunteerBatchTool extends Tool {
  name = 'clear_volunteer_batch';
  description = '清空志愿表：删除志愿批次中的所有专业组和专业，重新开始填报。用于用户想要重新规划志愿时。适用场景："清空我的志愿表""我想重新填"。注意：此操作不可恢复，使用前需确认。';

  parameters: Record<string, ToolParameter> = {
    batchId: {
      type: 'string',
      description: '志愿批次ID',
      required: true
    }
  };

  private service = new VolunteerManagementService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      const result = await this.service.clearBatch(params.batchId);

      return {
        success: true,
        data: result,
        metadata: {
          dataSource: 'volunteer_batches',
          description: '志愿表已清空'
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
