import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { VolunteerManagementService } from '../../services/volunteerManagement.service';
import { AppDataSource } from '../../config/database';
import { EnrollmentPlan } from '../../models/EnrollmentPlan';
import { AdmissionScore } from '../../models/AdmissionScore';
import { BatchHelper } from '../utils/batchHelper';

/**
 * 智能添加院校到志愿表工具
 */
export class AddCollegeToVolunteersSmartTool extends Tool {
  name = 'add_college_to_volunteers_smart';
  description = '智能添加院校到志愿表：根据院校代码或名称，自动查询该院校的所有专业组信息并添加到志愿表。可以选择添加全部专业组或指定的专业组。自动查询历年录取分数、判断冲稳保、补全所有必要字段，无需手动传递大量参数。如果用户尚未创建志愿批次,系统会提示需要的信息。适用场景："把苏州大学加入我的志愿表""添加河海大学的04和05专业组""把这个学校加到第10位开始"';

  parameters: Record<string, ToolParameter> = {
    batchId: {
      type: 'string',
      description: '志愿批次ID（可选，如果不提供则使用用户的当前批次或自动创建）',
      required: false
    },
    collegeCode: {
      type: 'string',
      description: '院校代码',
      required: false
    },
    collegeName: {
      type: 'string',
      description: '院校名称',
      required: false
    },
    groupCodes: {
      type: 'array',
      description: '要添加的专业组代码列表(可选,不填则添加所有专业组)',
      required: false,
      items: {
        type: 'string',
        description: '专业组代码'
      }
    },
    startOrder: {
      type: 'number',
      description: '从第几位开始填(1-40),默认从下一个空位开始',
      required: false
    },
    autoFillMajors: {
      type: 'boolean',
      description: '是否自动填充专业组内的专业(默认true,选择招生计划数最多的前6个专业)',
      required: false
    }
  };

  private volunteerService = new VolunteerManagementService();
  private enrollmentPlanRepository = AppDataSource.getRepository(EnrollmentPlan);
  private admissionScoreRepository = AppDataSource.getRepository(AdmissionScore);
  private batchHelper = new BatchHelper();

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

      // 1. 获取或查找批次信息
      let batchId = params.batchId;
      let isNewBatch = false;

      if (!batchId) {
        // 尝试获取用户现有的批次
        try {
          const batchInfo = await this.batchHelper.ensureBatchExists(context);
          batchId = batchInfo.batchId;
          isNewBatch = batchInfo.isNewBatch;
        } catch (error: any) {
          // 如果用户没有批次且无法自动创建,返回友好错误
          return {
            success: false,
            error: error.message,
            data: {
              needBatchCreation: true,
              suggestion: '请先告诉我您的基本信息（年份、省份、科类、分数、位次），或使用 create_volunteer_batch 工具创建批次'
            }
          };
        }
      }

      const batch = await this.volunteerService.getBatchDetail(batchId);

      // 2. 查询该院校的所有招生计划
      let queryBuilder = this.enrollmentPlanRepository
        .createQueryBuilder('ep')
        .where('ep.year = :year', { year: batch.year })
        .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince: batch.province })
        .andWhere('ep.subjectType = :subjectType', { subjectType: batch.subjectType });

      if (params.collegeCode) {
        queryBuilder.andWhere('ep.collegeCode = :collegeCode', { collegeCode: params.collegeCode });
      } else {
        queryBuilder.andWhere('ep.collegeName LIKE :collegeName', { collegeName: `%${params.collegeName}%` });
      }

      const plans = await queryBuilder.getMany();

      if (plans.length === 0) {
        return {
          success: false,
          error: '未找到该院校的招生计划'
        };
      }

      // 3. 按专业组聚合
      const groupMap = new Map<string, any>();

      for (const plan of plans) {
        const groupKey = plan.majorGroupCode || 'default';

        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, {
            collegeCode: plan.collegeCode,
            collegeName: plan.collegeName,
            groupCode: plan.majorGroupCode,
            groupName: plan.majorGroupName,
            subjectRequirement: plan.subjectRequirements,
            majors: []
          });
        }

        const group = groupMap.get(groupKey)!;
        group.majors.push({
          majorCode: plan.majorCode,
          majorName: plan.majorName,
          majorDirection: null,
          planCount: plan.planCount,
          tuitionFee: plan.tuition,
          duration: plan.studyYears,
          remarks: plan.majorRemarks
        });
      }

      // 4. 筛选要添加的专业组
      let groupsToAdd = Array.from(groupMap.values());

      if (params.groupCodes && Array.isArray(params.groupCodes) && params.groupCodes.length > 0) {
        groupsToAdd = groupsToAdd.filter(g => params.groupCodes.includes(g.groupCode));
      }

      if (groupsToAdd.length === 0) {
        return {
          success: false,
          error: '没有符合条件的专业组'
        };
      }

      // 5. 查询历年录取分数并判断冲稳保
      const collegeName = groupsToAdd[0].collegeName;
      const historicalScores = await this.admissionScoreRepository
        .createQueryBuilder('as')
        .where('as.collegeName = :collegeName', { collegeName })
        .andWhere('as.sourceProvince = :sourceProvince', { sourceProvince: batch.province })
        .andWhere('as.subjectType = :subjectType', { subjectType: batch.subjectType })
        .andWhere('as.year < :year', { year: batch.year })
        .orderBy('as.year', 'DESC')
        .limit(1)
        .getOne();

      let admitProbability = '未知';
      let lastYearMinScore: number | undefined;
      let lastYearMinRank: number | undefined;

      if (historicalScores) {
        lastYearMinScore = historicalScores.minScore || undefined;
        lastYearMinRank = historicalScores.minRank || undefined;

        if (historicalScores.minScore) {
          const scoreGap = batch.score - historicalScores.minScore;

          if (scoreGap < -10) {
            admitProbability = '冲';
          } else if (scoreGap >= -10 && scoreGap <= 10) {
            admitProbability = '稳';
          } else {
            admitProbability = '保';
          }
        }
      }

      // 6. 确定起始位置
      let currentOrder = params.startOrder || 1;

      if (!params.startOrder) {
        // 自动找到下一个空位
        const existingGroups = batch.groups || [];
        const maxOrder = existingGroups.length > 0
          ? Math.max(...existingGroups.map((g: any) => g.groupOrder))
          : 0;
        currentOrder = maxOrder + 1;
      }

      // 7. 批量添加专业组
      const addedGroups = [];
      const autoFillMajors = params.autoFillMajors !== false;

      for (const groupData of groupsToAdd) {
        // 添加专业组
        const group = await this.volunteerService.addVolunteerGroup({
          batchId: params.batchId,
          groupOrder: currentOrder,
          collegeCode: groupData.collegeCode,
          collegeName: groupData.collegeName,
          groupCode: groupData.groupCode || '',
          groupName: groupData.groupName || '',
          subjectRequirement: groupData.subjectRequirement,
          isObeyAdjustment: true,  // 默认服从调剂
          admitProbability,
          lastYearMinScore,
          lastYearMinRank
        });

        // 自动填充专业
        if (autoFillMajors && groupData.majors.length > 0) {
          // 按招生计划数排序,选择前6个
          const topMajors = groupData.majors
            .sort((a: any, b: any) => (b.planCount || 0) - (a.planCount || 0))
            .slice(0, 6);

          let majorOrder = 1;
          for (const majorData of topMajors) {
            await this.volunteerService.addVolunteerMajor({
              groupId: group.id,
              majorOrder: majorOrder++,
              majorCode: majorData.majorCode,
              majorName: majorData.majorName,
              majorDirection: majorData.majorDirection,
              planCount: majorData.planCount,
              tuitionFee: majorData.tuitionFee,
              duration: majorData.duration,
              remarks: majorData.remarks
            });
          }
        }

        addedGroups.push({
          ...group,
          majorCount: autoFillMajors ? Math.min(groupData.majors.length, 6) : 0
        });

        currentOrder++;
      }

      return {
        success: true,
        data: {
          collegeName,
          addedCount: addedGroups.length,
          groups: addedGroups,
          admitProbability,
          message: `成功添加${addedGroups.length}个专业组到志愿表`
        },
        metadata: {
          dataSource: 'enrollment_plans + admission_scores + volunteer_groups + volunteer_majors',
          description: `智能添加${collegeName}的${addedGroups.length}个专业组`
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
 * 批量添加专业组工具
 */
export class AddGroupsBatchTool extends Tool {
  name = 'add_groups_batch';
  description = '批量添加多个专业组：一次性添加多个院校的专业组到志愿表。适合用于快速构建志愿表或导入推荐方案。每个专业组需要提供院校代码和专业组代码。适用场景："把这5个专业组都加到志愿表""批量导入推荐的志愿方案"';

  parameters: Record<string, ToolParameter> = {
    batchId: {
      type: 'string',
      description: '志愿批次ID',
      required: true
    },
    groups: {
      type: 'array',
      description: '要添加的专业组列表',
      required: true,
      items: {
        type: 'object',
        description: '专业组信息(collegeCode, groupCode, groupOrder)'
      }
    }
  };

  private volunteerService = new VolunteerManagementService();
  private enrollmentPlanRepository = AppDataSource.getRepository(EnrollmentPlan);
  private admissionScoreRepository = AppDataSource.getRepository(AdmissionScore);

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      if (!Array.isArray(params.groups) || params.groups.length === 0) {
        return {
          success: false,
          error: '请提供至少一个专业组'
        };
      }

      const batch = await this.volunteerService.getBatchDetail(params.batchId);
      const addedGroups = [];
      const errors = [];

      for (const groupInput of params.groups) {
        try {
          // 查询专业组详情
          const plans = await this.enrollmentPlanRepository
            .createQueryBuilder('ep')
            .where('ep.year = :year', { year: batch.year })
            .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince: batch.province })
            .andWhere('ep.subjectType = :subjectType', { subjectType: batch.subjectType })
            .andWhere('ep.collegeCode = :collegeCode', { collegeCode: groupInput.collegeCode })
            .andWhere('ep.majorGroupCode = :groupCode', { groupCode: groupInput.groupCode })
            .getMany();

          if (plans.length === 0) {
            errors.push(`未找到专业组: ${groupInput.collegeCode}-${groupInput.groupCode}`);
            continue;
          }

          const firstPlan = plans[0];

          // 查询历年录取分数
          const historicalScores = await this.admissionScoreRepository
            .createQueryBuilder('as')
            .where('as.collegeName = :collegeName', { collegeName: firstPlan.collegeName })
            .andWhere('as.sourceProvince = :sourceProvince', { sourceProvince: batch.province })
            .andWhere('as.subjectType = :subjectType', { subjectType: batch.subjectType })
            .andWhere('as.year < :year', { year: batch.year })
            .orderBy('as.year', 'DESC')
            .limit(1)
            .getOne();

          let admitProbability = '未知';
          if (historicalScores && historicalScores.minScore) {
            const scoreGap = batch.score - historicalScores.minScore;
            admitProbability = scoreGap < -10 ? '冲' : scoreGap <= 10 ? '稳' : '保';
          }

          // 添加专业组
          const group = await this.volunteerService.addVolunteerGroup({
            batchId: params.batchId,
            groupOrder: groupInput.groupOrder,
            collegeCode: firstPlan.collegeCode,
            collegeName: firstPlan.collegeName,
            groupCode: firstPlan.majorGroupCode || '',
            groupName: firstPlan.majorGroupName || '',
            subjectRequirement: firstPlan.subjectRequirements,
            isObeyAdjustment: groupInput.isObeyAdjustment !== false,
            admitProbability,
            lastYearMinScore: historicalScores?.minScore,
            lastYearMinRank: historicalScores?.minRank
          });

          // 自动填充专业
          const topMajors = plans
            .sort((a, b) => b.planCount - a.planCount)
            .slice(0, 6);

          let majorOrder = 1;
          for (const plan of topMajors) {
            await this.volunteerService.addVolunteerMajor({
              groupId: group.id,
              majorOrder: majorOrder++,
              majorCode: plan.majorCode,
              majorName: plan.majorName,
              planCount: plan.planCount,
              tuitionFee: plan.tuition,
              duration: plan.studyYears
            });
          }

          addedGroups.push(group);
        } catch (error: any) {
          errors.push(`添加失败: ${groupInput.collegeCode}-${groupInput.groupCode}: ${error.message}`);
        }
      }

      return {
        success: true,
        data: {
          addedCount: addedGroups.length,
          totalCount: params.groups.length,
          groups: addedGroups,
          errors: errors.length > 0 ? errors : undefined
        },
        metadata: {
          dataSource: 'enrollment_plans + admission_scores + volunteer_groups + volunteer_majors',
          description: `批量添加了${addedGroups.length}/${params.groups.length}个专业组`
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
