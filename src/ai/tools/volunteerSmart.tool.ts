import { Tool, ToolParameter, ToolExecutionContext, ToolExecutionResult } from './base';
import { VolunteerManagementService } from '../../services/volunteerManagement.service';
import { AppDataSource } from '../../config/database';
import { EnrollmentPlan } from '../../models/EnrollmentPlan';
import { AdmissionScore } from '../../models/AdmissionScore';
import { BatchHelper } from '../utils/batchHelper';
import { ConversationContextManager } from '../utils/conversationContext.manager';
import { AdmissionProbabilityService, GroupHistoricalData } from '../../services/admissionProbability.service';

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
  private contextManager = ConversationContextManager.getInstance();
  private probabilityService = new AdmissionProbabilityService();

  async execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    try {
      this.validateParams(params);

      // ===== 新增: 参数校验和自动补全 =====
      const sessionId = context?.sessionId || 'default';

      // 1. 校验参数一致性
      const validation = this.contextManager.validateToolParams(sessionId, this.name, params);
      if (!validation.valid && validation.correctedParams) {
        // 自动纠正参数
        params = validation.correctedParams;
        console.warn(`[ConversationContext] ${validation.error}`);
      }

      // 2. 自动补全参数
      params = this.contextManager.enrichToolParams(sessionId, this.name, params);

      // 3. 记录查询信息到上下文
      if (params.collegeName || params.collegeCode) {
        this.contextManager.recordQueriedColleges(sessionId, [{
          collegeCode: params.collegeCode || '',
          collegeName: params.collegeName || ''
        }]);
      }

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

          // 记录批次ID到上下文
          this.contextManager.recordCurrentBatch(sessionId, batchId);
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

      // 更新用户档案
      this.contextManager.updateUserProfile(sessionId, {
        score: batch.score,
        rank: batch.rank,
        province: batch.province,
        category: batch.subjectType,
        year: batch.year
      });

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

      // 5. 查询历年录取分数并判断冲稳保（使用统一的AdmissionProbabilityService）
      const collegeName = groupsToAdd[0].collegeName;
      const collegeCode = groupsToAdd[0].collegeCode;

      // 查询近3年历史分数（用于概率计算）
      const historicalScoresData = await this.admissionScoreRepository
        .createQueryBuilder('as')
        .where('as.collegeCode = :collegeCode', { collegeCode })
        .andWhere('as.sourceProvince = :sourceProvince', { sourceProvince: batch.province })
        .andWhere('as.subjectType = :subjectType', { subjectType: batch.subjectType })
        .andWhere('as.year < :year', { year: batch.year })
        .orderBy('as.year', 'DESC')
        .limit(3)
        .getMany();

      // 为每个专业组计算概率和冲稳保
      const groupsWithProbability: any[] = [];

      for (const groupData of groupsToAdd) {
        // 查询该专业组的历史分数
        const groupHistoricalScores = await this.admissionScoreRepository
          .createQueryBuilder('as')
          .where('as.collegeCode = :collegeCode', { collegeCode })
          .andWhere('as.groupCode = :groupCode', { groupCode: groupData.groupCode })
          .andWhere('as.sourceProvince = :sourceProvince', { sourceProvince: batch.province })
          .andWhere('as.subjectType = :subjectType', { subjectType: batch.subjectType })
          .andWhere('as.year < :year', { year: batch.year })
          .orderBy('as.year', 'DESC')
          .limit(3)
          .getMany();

        let admitProbability = '未知';
        let probability: number | null = null;
        let lastYearMinScore: number | undefined;
        let lastYearMinRank: number | undefined;

        // 如果有历史数据且用户有分数和位次，使用完整的概率计算
        if (groupHistoricalScores.length > 0 && batch.score > 0 && batch.rank && batch.rank > 0) {
          const groupHistory: GroupHistoricalData[] = groupHistoricalScores.map(score => ({
            year: score.year,
            minScore: score.minScore || 0,
            avgScore: score.avgScore,
            maxScore: score.maxScore,
            minRank: score.minRank || 0,
            maxRank: score.maxRank,
            planCount: score.planCount || 0
          }));

          const result = this.probabilityService.calculateForGroup(
            batch.score,
            batch.rank,
            groupHistory
          );

          probability = result.probability;

          // 使用统一的冲稳保标准
          if (result.riskLevel === '冲') {
            admitProbability = '冲';
          } else if (result.riskLevel === '保') {
            admitProbability = '保';
          } else {
            admitProbability = '稳';
          }

          lastYearMinScore = groupHistoricalScores[0].minScore || undefined;
          lastYearMinRank = groupHistoricalScores[0].minRank || undefined;

          console.log(`[AI Tool - 添加志愿] ${collegeName} ${groupData.groupCode}: probability=${probability}%, riskLevel=${result.riskLevel}, scoreGap=${result.scoreGap}`);
        } else if (groupHistoricalScores.length > 0 && batch.score > 0) {
          // 如果没有位次，使用简化算法
          const avgMinScore = groupHistoricalScores.reduce((sum, s) => sum + (s.minScore || 0), 0) / groupHistoricalScores.length;
          const scoreGap = batch.score - avgMinScore;

          if (scoreGap < -10) {
            admitProbability = '冲';
          } else if (scoreGap > 15) {
            admitProbability = '保';
          } else {
            admitProbability = '稳';
          }

          lastYearMinScore = groupHistoricalScores[0].minScore || undefined;
          lastYearMinRank = groupHistoricalScores[0].minRank || undefined;

          console.log(`[AI Tool - 添加志愿 - 简化算法] ${collegeName} ${groupData.groupCode}: scoreGap=${scoreGap.toFixed(1)}, category=${admitProbability}`);
        }

        groupsWithProbability.push({
          ...groupData,
          admitProbability: admitProbability || '未知', // 确保不是undefined
          probability,
          lastYearMinScore,
          lastYearMinRank
        });
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

      for (const groupWithProb of groupsWithProbability) {
        // 添加专业组（使用已计算好的冲稳保和概率）
        const group = await this.volunteerService.addVolunteerGroup({
          batchId: params.batchId,
          groupOrder: currentOrder,
          collegeCode: groupWithProb.collegeCode,
          collegeName: groupWithProb.collegeName,
          groupCode: groupWithProb.groupCode || '',
          groupName: groupWithProb.groupName || '',
          subjectRequirement: groupWithProb.subjectRequirement,
          isObeyAdjustment: true,  // 默认服从调剂
          admitProbability: groupWithProb.admitProbability,
          lastYearMinScore: groupWithProb.lastYearMinScore,
          lastYearMinRank: groupWithProb.lastYearMinRank
        });

        // 自动填充专业
        if (autoFillMajors && groupWithProb.majors.length > 0) {
          // 按招生计划数排序,选择前6个
          const topMajors = groupWithProb.majors
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
          majorCount: autoFillMajors ? Math.min(groupWithProb.majors.length, 6) : 0,
          probability: groupWithProb.probability
        });

        currentOrder++;
      }

      return {
        success: true,
        data: {
          collegeName,
          addedCount: addedGroups.length,
          groups: addedGroups,
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
  description = '批量添加多个专业组：一次性添加多个专业组到志愿表。自动处理批次、自动计算排序位置、自动查询补全信息。适用场景："把河海大学的04和05专业组加入志愿表""添加这几个专业组"。注意：如果只知道院校名称，建议使用add_college_to_volunteers_smart工具。';

  parameters: Record<string, ToolParameter> = {
    batchId: {
      type: 'string',
      description: '志愿批次ID（可选，不提供则使用当前批次或自动创建）',
      required: false  // ← 改为可选
    },
    groups: {
      type: 'array',
      description: '要添加的专业组列表',
      required: true,
      items: {
        type: 'object',
        description: '专业组信息：必须包含collegeCode和groupCode，其他字段可选（collegeName、groupOrder等）'
      }
    }
  };

  private volunteerService = new VolunteerManagementService();
  private enrollmentPlanRepository = AppDataSource.getRepository(EnrollmentPlan);
  private admissionScoreRepository = AppDataSource.getRepository(AdmissionScore);
  private batchHelper = new BatchHelper();
  private probabilityService = new AdmissionProbabilityService();

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

      // 1. 获取或创建批次
      let batchId = params.batchId;
      let isNewBatch = false;

      if (!batchId) {
        try {
          const batchInfo = await this.batchHelper.ensureBatchExists(context);
          batchId = batchInfo.batchId;
          isNewBatch = batchInfo.isNewBatch;
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            data: {
              needBatchCreation: true,
              suggestion: '请先告诉我您的基本信息（年份、省份、科类、分数、位次），我会自动为您创建志愿批次'
            }
          };
        }
      }

      const batch = await this.volunteerService.getBatchDetail(batchId);

      // 2. 计算起始排序位置
      const existingGroups = batch.groups || [];
      let currentOrder = 0;

      if (existingGroups.length > 0) {
        const maxOrder = Math.max(...existingGroups.map((g: any) => g.groupOrder));
        currentOrder = maxOrder + 1;
      } else {
        currentOrder = 1;  // 从1开始
      }

      const addedGroups = [];
      const errors = [];

      for (let i = 0; i < params.groups.length; i++) {
        const groupInput = params.groups[i];

        try {
          // 验证必填字段
          if (!groupInput.collegeCode && !groupInput.collegeName) {
            errors.push(`第${i + 1}个专业组: 缺少院校代码或院校名称`);
            continue;
          }

          if (!groupInput.groupCode) {
            errors.push(`第${i + 1}个专业组: 缺少专业组代码`);
            continue;
          }

          // 3. 查询专业组详情
          let queryBuilder = this.enrollmentPlanRepository
            .createQueryBuilder('ep')
            .where('ep.year = :year', { year: batch.year })
            .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince: batch.province })
            .andWhere('ep.subjectType = :subjectType', { subjectType: batch.subjectType })
            .andWhere('ep.majorGroupCode = :groupCode', { groupCode: groupInput.groupCode });

          if (groupInput.collegeCode) {
            queryBuilder.andWhere('ep.collegeCode = :collegeCode', { collegeCode: groupInput.collegeCode });
          } else if (groupInput.collegeName) {
            queryBuilder.andWhere('ep.collegeName LIKE :collegeName', { collegeName: `%${groupInput.collegeName}%` });
          }

          const plans = await queryBuilder.getMany();

          if (plans.length === 0) {
            errors.push(`第${i + 1}个专业组: 未找到 ${groupInput.collegeName || groupInput.collegeCode} 的 ${groupInput.groupCode} 专业组`);
            continue;
          }

          const firstPlan = plans[0];

          // 4. 查询历年录取分数并使用统一的AdmissionProbabilityService计算冲稳保
          const groupHistoricalScores = await this.admissionScoreRepository
            .createQueryBuilder('as')
            .where('as.collegeCode = :collegeCode', { collegeCode: firstPlan.collegeCode })
            .andWhere('as.groupCode = :groupCode', { groupCode: groupInput.groupCode })
            .andWhere('as.sourceProvince = :sourceProvince', { sourceProvince: batch.province })
            .andWhere('as.subjectType = :subjectType', { subjectType: batch.subjectType })
            .andWhere('as.year < :year', { year: batch.year })
            .orderBy('as.year', 'DESC')
            .limit(3)
            .getMany();

          let admitProbability = '未知';
          let probability: number | null = null;
          let lastYearMinScore: number | undefined;
          let lastYearMinRank: number | undefined;

          // 如果有历史数据且用户有分数和位次，使用完整的概率计算
          if (groupHistoricalScores.length > 0 && batch.score > 0 && batch.rank && batch.rank > 0) {
            const groupHistory: GroupHistoricalData[] = groupHistoricalScores.map(score => ({
              year: score.year,
              minScore: score.minScore || 0,
              avgScore: score.avgScore,
              maxScore: score.maxScore,
              minRank: score.minRank || 0,
              maxRank: score.maxRank,
              planCount: score.planCount || 0
            }));

            const result = this.probabilityService.calculateForGroup(
              batch.score,
              batch.rank,
              groupHistory
            );

            probability = result.probability;

            // 使用统一的冲稳保标准
            if (result.riskLevel === '冲') {
              admitProbability = '冲';
            } else if (result.riskLevel === '保') {
              admitProbability = '保';
            } else {
              admitProbability = '稳';
            }

            lastYearMinScore = groupHistoricalScores[0].minScore || undefined;
            lastYearMinRank = groupHistoricalScores[0].minRank || undefined;

            console.log(`[AI Tool - 批量添加] ${firstPlan.collegeName} ${groupInput.groupCode}: probability=${probability}%, riskLevel=${result.riskLevel}, scoreGap=${result.scoreGap}`);
          } else if (groupHistoricalScores.length > 0 && batch.score > 0) {
            // 如果没有位次，使用简化算法
            const avgMinScore = groupHistoricalScores.reduce((sum, s) => sum + (s.minScore || 0), 0) / groupHistoricalScores.length;
            const scoreGap = batch.score - avgMinScore;

            if (scoreGap < -10) {
              admitProbability = '冲';
            } else if (scoreGap > 15) {
              admitProbability = '保';
            } else {
              admitProbability = '稳';
            }

            lastYearMinScore = groupHistoricalScores[0].minScore || undefined;
            lastYearMinRank = groupHistoricalScores[0].minRank || undefined;

            console.log(`[AI Tool - 批量添加 - 简化算法] ${firstPlan.collegeName} ${groupInput.groupCode}: scoreGap=${scoreGap.toFixed(1)}, category=${admitProbability}`);
          }

          // 5. 确定groupOrder（用户提供的优先，否则自动递增）
          const finalGroupOrder = groupInput.groupOrder || currentOrder;

          // 6. 添加专业组（使用已计算好的冲稳保）
          const group = await this.volunteerService.addVolunteerGroup({
            batchId,
            groupOrder: finalGroupOrder,
            collegeCode: firstPlan.collegeCode,
            collegeName: firstPlan.collegeName,
            groupCode: firstPlan.majorGroupCode || '',
            groupName: firstPlan.majorGroupName || '',
            subjectRequirement: firstPlan.subjectRequirements,
            isObeyAdjustment: groupInput.isObeyAdjustment !== false,
            admitProbability,
            lastYearMinScore,
            lastYearMinRank
          });

          // 7. 自动填充专业（按招生计划数排序，取前6个）
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
              duration: plan.studyYears,
              majorDirection: undefined,
              remarks: plan.majorRemarks
            });
          }

          addedGroups.push({
            ...group,
            majorCount: topMajors.length,
            admitProbability: admitProbability || '未知', // 确保不是undefined
            probability
          });

          // 只有在使用自动order时才递增
          if (!groupInput.groupOrder) {
            currentOrder++;
          }

        } catch (error: any) {
          errors.push(`第${i + 1}个专业组添加失败: ${error.message}`);
        }
      }

      // 构建返回消息
      let message = `成功添加${addedGroups.length}个专业组到志愿表`;
      if (isNewBatch) {
        message = `已自动创建志愿批次，并${message}`;
      }
      if (addedGroups.length > 0) {
        const positions = addedGroups.map(g => `第${g.groupOrder}位`).join('、');
        message += `（${positions}）`;
      }

      return {
        success: addedGroups.length > 0,
        data: {
          addedCount: addedGroups.length,
          totalCount: params.groups.length,
          groups: addedGroups,
          errors: errors.length > 0 ? errors : undefined,
          message,
          isNewBatch
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
