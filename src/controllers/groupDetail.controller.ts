import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnrollmentPlanGroup } from '../models/EnrollmentPlanGroup';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { College } from '../models/College';
import { Major } from '../models/Major';
import { ResponseUtil } from '../utils/response';
import cacheService from '../services/cache.service';

export class GroupDetailController {
  private groupRepo = AppDataSource.getRepository(EnrollmentPlanGroup);
  private planRepo = AppDataSource.getRepository(EnrollmentPlan);
  private scoreRepo = AppDataSource.getRepository(AdmissionScore);
  private collegeRepo = AppDataSource.getRepository(College);
  private majorRepo = AppDataSource.getRepository(Major);

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
      let collegeCode: string;
      let groupCode: string;
      let year: number;
      let province: string;

      // 判断groupId格式
      // UUID格式: 9434f64a-1c90-49e1-94c5-cc0701340471 (包含连字符，长度36)
      // 自定义格式: collegeCode_groupCode_year_province
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
      } else {
        // 自定义格式 - 解析并查询
        console.log(`📋 使用自定义格式查询专业组: ${groupId}`);

        const parts = groupId.split('_');
        if (parts.length < 4) {
          return ResponseUtil.badRequest(res, '无效的groupId格式，应为 collegeCode_groupCode_year_province 或 UUID格式');
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
        collegeInfo
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
}
