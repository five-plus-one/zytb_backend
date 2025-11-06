import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnrollmentPlanGroup } from '../models/EnrollmentPlanGroup';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { College } from '../models/College';
import { Major } from '../models/Major';
import { ResponseUtil } from '../utils/response';
import cacheService from '../services/cache.service';
import { LLMService } from '../services/agent/llm.service';

export class GroupDetailController {
  private groupRepo = AppDataSource.getRepository(EnrollmentPlanGroup);
  private planRepo = AppDataSource.getRepository(EnrollmentPlan);
  private scoreRepo = AppDataSource.getRepository(AdmissionScore);
  private collegeRepo = AppDataSource.getRepository(College);
  private majorRepo = AppDataSource.getRepository(Major);
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  /**
   * 获取专业组详细信息
   * GET /api/enrollment-plan/group/:groupId/detail
   */
  async getGroupDetail(req: Request, res: Response) {
    try {
      const { groupId } = req.params;

      // 尝试从缓存获取
      const cacheKey = `group:detail:${groupId}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return ResponseUtil.success(res, JSON.parse(cached));
      }

      let plans: EnrollmentPlan[] = [];
      let collegeCode: string = '';
      let groupCode: string = '';
      let year: number = 2025;
      let province: string = '';

      // 判断groupId格式
      // 格式1 UUID: 9434f64a-1c90-49e1-94c5-cc0701340471 (包含连字符，长度36)
      // 格式2 完整自定义: collegeCode_groupCode_year_province (如 10384_08_2025_江苏)
      // 格式3 短格式: collegeCode-groupCode (如 2103-01) ← 新增支持
      if (groupId.includes('-') && groupId.length === 36) {
        // UUID格式 - 直接通过group_id查询
        console.log(`📋 使用UUID查询专业组: ${groupId}`);

        plans = await this.planRepo.find({
          where: { groupId },
          relations: ['college']
        });

        if (plans.length === 0) {
          return ResponseUtil.error(res, '专业组不存在', 404);
        }

        // 从第一条记录提取信息
        const firstPlan = plans[0];
        collegeCode = firstPlan.collegeCode;
        groupCode = firstPlan.majorGroupCode || '';
        year = firstPlan.year;
        province = firstPlan.sourceProvince;
      } else if (groupId.includes('-') && !groupId.includes('_')) {
        // 短格式: collegeCode-groupCode (如 2103-01)
        console.log(`📋 使用短格式查询专业组: ${groupId}`);

        const parts = groupId.split('-');
        if (parts.length !== 2) {
          return ResponseUtil.badRequest(res, '无效的groupId短格式，应为 collegeCode-groupCode');
        }

        collegeCode = parts[0];
        groupCode = parts[1];

        // 查询最新年份的数据（假设当前年份或2025）
        const currentYear = new Date().getFullYear();
        const possibleYears = [currentYear, 2025, 2024];

        // 尝试多个年份
        for (const tryYear of possibleYears) {
          plans = await this.planRepo.find({
            where: {
              collegeCode,
              majorGroupCode: groupCode,
              year: tryYear
            },
            relations: ['college'],
            take: 10
          });

          if (plans.length > 0) {
            year = tryYear;
            province = plans[0].sourceProvince;
            console.log(`✅ 找到专业组数据，年份: ${year}, 省份: ${province}`);
            break;
          }
        }

        if (plans.length === 0) {
          return ResponseUtil.error(res, `未找到专业组 ${collegeCode}-${groupCode} 的数据`, 404);
        }
      } else {
        // 完整自定义格式 - 解析并查询
        console.log(`📋 使用完整自定义格式查询专业组: ${groupId}`);

        const parts = groupId.split('_');
        if (parts.length < 4) {
          return ResponseUtil.badRequest(res, '无效的groupId格式，应为 collegeCode_groupCode_year_province 或 UUID格式 或 collegeCode-groupCode短格式');
        }

        collegeCode = parts[0];
        groupCode = parts[1];
        year = parseInt(parts[2]);
        province = parts[3];

        // 查询专业组基本信息
        plans = await this.planRepo.find({
          where: {
            collegeCode,
            majorGroupCode: groupCode,
            year,
            sourceProvince: province
          },
          relations: ['college']
        });

        if (plans.length === 0) {
          return ResponseUtil.error(res, '专业组不存在', 404);
        }
      }

      const firstPlan = plans[0];

      // 2. 查询专业列表（详细信息）
      const majorsWithDetails = await Promise.all(
        plans.map(async (plan) => {
          const major = await this.majorRepo.findOne({
            where: { code: plan.majorCode }
          });

          return {
            majorCode: plan.majorCode,
            majorName: plan.majorName,
            majorDescription: major?.description || '',
            planCount: plan.planCount,
            tuition: plan.tuition?.toString() || '0',
            studyYears: plan.studyYears,
            remarks: plan.majorRemarks || ''
          };
        })
      );

      // 3. 查询历年录取分数（5年）
      const historicalScores = await this.scoreRepo
        .createQueryBuilder('score')
        .where('score.collegeCode = :collegeCode', { collegeCode })
        .andWhere('score.groupCode = :groupCode', { groupCode })
        .andWhere('score.year >= :startYear', { startYear: year - 5 })
        .orderBy('score.year', 'DESC')
        .getMany();

      const scoresData = historicalScores.map(score => ({
        year: score.year,
        minScore: score.minScore,
        avgScore: score.avgScore,
        maxScore: score.maxScore,
        minRank: score.minRank,
        maxRank: score.maxRank, // 使用maxRank字段
        enrollmentCount: score.planCount || 0, // 使用planCount
        applicationCount: 0 // 暂无数据
      }));

      // 4. 查询院校信息
      const college = firstPlan.college || await this.collegeRepo.findOne({
        where: { code: collegeCode }
      });

      const collegeInfo = college ? {
        description: college.description || '',
        advantageSubjects: [],
        keyLaboratories: [],
        employmentRate: 0,
        graduateSchoolRate: college.postgraduateRate || 0,
        website: college.website || '',
        phone: college.admissionPhone || college.phone || '',
        address: college.address || ''
      } : null;

      // 5. 计算总招生人数和平均学费
      const totalPlanCount = plans.reduce((sum, p) => sum + (p.planCount || 0), 0);
      const totalTuition = plans.reduce((sum, p) => sum + (p.tuition || 0), 0);
      const avgTuition = plans.length > 0 ? Math.round(totalTuition / plans.length) : 0;

      // 6. 生成AI洞察 (P1增强功能)
      let aiInsights = null;
      const includeAI = req.query.includeAI === 'true';

      if (includeAI) {
        try {
          aiInsights = await this.generateAIInsights(firstPlan, majorsWithDetails, scoresData, college);
        } catch (error) {
          console.error('AI洞察生成失败:', error);
          // 失败时不影响主流程
        }
      }

      const result = {
        groupInfo: {
          groupId,
          collegeCode,
          collegeName: firstPlan.collegeName,
          collegeProvince: firstPlan.collegeProvince,
          collegeCity: firstPlan.collegeCity,
          groupCode,
          groupName: firstPlan.majorGroupName,
          subjectRequirement: firstPlan.subjectRequirements || '',
          totalPlanCount,
          avgTuition,
          is985: firstPlan.collegeIs985,
          is211: firstPlan.collegeIs211,
          isDoubleFirstClass: firstPlan.collegeIsWorldClass,
          year,
          batch: firstPlan.batch
        },
        majors: majorsWithDetails,
        historicalScores: scoresData,
        collegeInfo,
        aiInsights  // 添加AI洞察
      };

      // 缓存30分钟
      await cacheService.set(cacheKey, JSON.stringify(result), { ttl: 1800 });

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Get group detail error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取专业组历年分数
   * GET /api/admission-scores/group/:groupId
   */
  async getGroupScores(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const { years = 5 } = req.query;

      const cacheKey = `group:scores:${groupId}:${years}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return ResponseUtil.success(res, JSON.parse(cached));
      }

      const parts = groupId.split('_');
      if (parts.length < 4) {
        return ResponseUtil.badRequest(res, '无效的groupId格式');
      }

      const [collegeCode, groupCode, year] = parts;

      const scores = await this.scoreRepo
        .createQueryBuilder('score')
        .where('score.collegeCode = :collegeCode', { collegeCode })
        .andWhere('score.groupCode = :groupCode', { groupCode })
        .andWhere('score.year >= :startYear', {
          startYear: parseInt(year) - parseInt(years as string)
        })
        .orderBy('score.year', 'DESC')
        .getMany();

      const result = {
        groupId,
        collegeCode,
        collegeName: scores[0]?.collegeName || '',
        groupCode,
        groupName: '',
        scores: scores.map(s => ({
          year: s.year,
          minScore: s.minScore,
          avgScore: s.avgScore,
          maxScore: s.maxScore,
          minRank: s.minRank,
          maxRank: s.maxRank,
          enrollmentCount: s.planCount || 0,
          applicationCount: 0
        }))
      };

      await cacheService.set(cacheKey, JSON.stringify(result), { ttl: 86400 }); // 缓存1天
      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Get group scores error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 对比多个专业组
   * POST /api/enrollment-plan/group/compare
   */
  async compareGroups(req: Request, res: Response) {
    try {
      const { groupIds } = req.body;

      // 验证参数
      if (!groupIds || !Array.isArray(groupIds)) {
        return ResponseUtil.badRequest(res, '请提供groupIds数组');
      }

      if (groupIds.length < 2 || groupIds.length > 3) {
        return ResponseUtil.badRequest(res, '只能对比2-3个专业组');
      }

      // 并行获取所有专业组的详细信息
      const groupsData = await Promise.all(
        groupIds.map(async (groupId: string) => {
          // 解析groupId
          const parts = groupId.split('_');
          if (parts.length < 4) {
            throw new Error(`无效的groupId格式: ${groupId}`);
          }

          const [collegeCode, groupCode, year, province] = parts;

          // 查询专业组基本信息
          const plans = await this.planRepo.find({
            where: {
              collegeCode,
              majorGroupCode: groupCode,
              year: parseInt(year),
              sourceProvince: province
            },
            relations: ['college']
          });

          if (plans.length === 0) {
            return null;
          }

          const firstPlan = plans[0];

          // 查询近3年录取分数
          const recentScores = await this.scoreRepo
            .createQueryBuilder('score')
            .where('score.collegeCode = :collegeCode', { collegeCode })
            .andWhere('score.groupCode = :groupCode', { groupCode })
            .andWhere('score.year >= :startYear', { startYear: parseInt(year) - 3 })
            .orderBy('score.year', 'DESC')
            .limit(3)
            .getMany();

          // 计算总招生人数和平均学费
          const totalPlanCount = plans.reduce((sum, p) => sum + (p.planCount || 0), 0);
          const totalTuition = plans.reduce((sum, p) => sum + (p.tuition || 0), 0);
          const avgTuition = plans.length > 0 ? Math.round(totalTuition / plans.length) : 0;

          // 查询院校信息
          const college = firstPlan.college || await this.collegeRepo.findOne({
            where: { code: collegeCode }
          });

          return {
            groupId,
            groupInfo: {
              collegeCode,
              collegeName: firstPlan.collegeName,
              collegeProvince: firstPlan.collegeProvince,
              collegeCity: firstPlan.collegeCity,
              groupCode,
              groupName: firstPlan.majorGroupName,
              subjectRequirement: firstPlan.subjectRequirements || '',
              totalPlanCount,
              avgTuition,
              is985: firstPlan.collegeIs985,
              is211: firstPlan.collegeIs211,
              isDoubleFirstClass: firstPlan.collegeIsWorldClass,
              batch: firstPlan.batch
            },
            majors: plans.map(p => ({
              majorCode: p.majorCode,
              majorName: p.majorName,
              planCount: p.planCount,
              tuition: p.tuition?.toString() || '0'
            })),
            recentScores: recentScores.map(s => ({
              year: s.year,
              minScore: s.minScore,
              minRank: s.minRank,
              avgScore: s.avgScore
            })),
            collegeInfo: college ? {
              type: college.type,
              province: college.province,
              city: college.city,
              website: college.website || '',
              phone: college.admissionPhone || ''
            } : null
          };
        })
      );

      // 过滤掉不存在的专业组
      const validGroups = groupsData.filter(g => g !== null);

      if (validGroups.length < 2) {
        return ResponseUtil.error(res, '至少需要2个有效的专业组进行对比', 400);
      }

      // 生成对比维度分析
      const comparison = {
        groups: validGroups,
        analysis: {
          // 分数对比
          scoreComparison: validGroups.map(g => {
            const latestScore = g!.recentScores[0];
            return {
              groupId: g!.groupId,
              collegeName: g!.groupInfo.collegeName,
              groupName: g!.groupInfo.groupName,
              latestMinScore: latestScore?.minScore || 0,
              latestMinRank: latestScore?.minRank || 0,
              avgMinScore: g!.recentScores.length > 0
                ? Math.round(g!.recentScores.reduce((sum, s) => sum + (s.minScore || 0), 0) / g!.recentScores.length)
                : 0
            };
          }).sort((a, b) => b.latestMinScore - a.latestMinScore),

          // 院校层次对比
          levelComparison: validGroups.map(g => ({
            groupId: g!.groupId,
            collegeName: g!.groupInfo.collegeName,
            is985: g!.groupInfo.is985,
            is211: g!.groupInfo.is211,
            isDoubleFirstClass: g!.groupInfo.isDoubleFirstClass,
            level: g!.groupInfo.is985 ? '985' : g!.groupInfo.is211 ? '211' : g!.groupInfo.isDoubleFirstClass ? '双一流' : '普通'
          })),

          // 招生规模对比
          planComparison: validGroups.map(g => ({
            groupId: g!.groupId,
            collegeName: g!.groupInfo.collegeName,
            groupName: g!.groupInfo.groupName,
            totalPlanCount: g!.groupInfo.totalPlanCount,
            majorsCount: g!.majors.length
          })).sort((a, b) => b.totalPlanCount - a.totalPlanCount),

          // 学费对比
          tuitionComparison: validGroups.map(g => ({
            groupId: g!.groupId,
            collegeName: g!.groupInfo.collegeName,
            groupName: g!.groupInfo.groupName,
            avgTuition: g!.groupInfo.avgTuition
          })).sort((a, b) => a.avgTuition - b.avgTuition)
        }
      };

      ResponseUtil.success(res, comparison);
    } catch (error: any) {
      console.error('Compare groups error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 生成AI洞察 (P1增强功能)
   * @private
   */
  private async generateAIInsights(
    firstPlan: any,
    majors: any[],
    scores: any[],
    college: any
  ): Promise<any> {
    const prompt = `
你是一个高考志愿填报专家。请基于以下信息，为这个专业组生成简洁的AI洞察（不超过200字）：

院校信息:
- 院校名称: ${firstPlan.collegeName}
- 院校层次: ${firstPlan.collegeIs985 ? '985' : firstPlan.collegeIs211 ? '211' : firstPlan.collegeIsWorldClass ? '双一流' : '普通'}
- 所在城市: ${firstPlan.collegeCity}, ${firstPlan.collegeProvince}

专业组信息:
- 专业组代码: ${firstPlan.majorGroupCode}
- 专业组名称: ${firstPlan.majorGroupName || '未知'}
- 选考要求: ${firstPlan.subjectRequirements || '无特殊要求'}
- 包含专业数: ${majors.length}个
- 主要专业: ${majors.slice(0, 3).map(m => m.majorName).join('、')}

历史录取:
${scores.length > 0 ? scores.slice(0, 3).map(s =>
  `- ${s.year}年: 最低分${s.minScore}，最低位次${s.minRank || '未知'}`
).join('\n') : '暂无历史录取数据'}

请从以下维度给出洞察:
1. 院校优势（1-2句话）
2. 专业特点（1-2句话）
3. 录取趋势（1句话）
4. 报考建议（1句话）

请用JSON格式返回:
{
  "collegeAdvantages": "院校优势",
  "majorFeatures": "专业特点",
  "admissionTrend": "录取趋势",
  "suggestion": "报考建议"
}
`;

    try {
      const response = await this.llmService.chat([
        { role: 'system', content: '你是一个专业的高考志愿填报顾问。' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.7,
        maxTokens: 500
      });

      // 尝试解析JSON
      const insights = JSON.parse(response);
      return insights;
    } catch (error) {
      console.error('AI洞察解析失败:', error);
      // 返回默认洞察
      return {
        collegeAdvantages: `${firstPlan.collegeName}是一所${firstPlan.collegeIs985 ? '985' : firstPlan.collegeIs211 ? '211' : '综合性'}院校，具有较强的综合实力。`,
        majorFeatures: `该专业组包含${majors.length}个专业方向，为学生提供多元化选择。`,
        admissionTrend: scores.length > 0 ? `近年录取分数线相对${scores[0].minScore > scores[scores.length - 1]?.minScore ? '上升' : '稳定'}。` : '暂无历史数据。',
        suggestion: '建议结合个人兴趣和职业规划综合考虑。'
      };
    }
  }
}
