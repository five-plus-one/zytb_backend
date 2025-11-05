import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import cacheService from '../services/cache.service';
import { ResponseUtil } from '../utils/response';

export class EnrollmentPlanSearchController {
  private planRepo = AppDataSource.getRepository(EnrollmentPlan);

  /**
   * 快速搜索招生计划（带缓存）
   * GET /api/enrollment-plan/search
   */
  async searchPlans(req: Request, res: Response) {
    try {
      const {
        keyword,        // 新增：通用关键词（同时搜索院校和专业）
        collegeName,
        majorName,
        subjectType,
        collegeLevel,
        collegeType,
        province,       // 生源地省份（考生所在省份）
        collegeProvince, // 院校所在省份
        city,
        year = 2025,
        minScore,
        maxScore,
        userScore,
        minTuition,
        maxTuition,
        minPlanCount,
        maxPlanCount,
        subjectRequirement,
        page = 1,
        pageSize = 20
      } = req.query;

      // 构建缓存key
      const cacheKey = `search:plan:${JSON.stringify(req.query)}`;

      // 尝试从缓存获取
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return ResponseUtil.success(res, JSON.parse(cached));
      }

      // 构建查询
      const queryBuilder = this.planRepo
        .createQueryBuilder('ep')
        .where('ep.year = :year', { year });

      // 通用关键词搜索（优先级最高，同时搜索院校名、专业名、专业组名）
      if (keyword) {
        queryBuilder.andWhere(
          '(ep.collegeName LIKE :keyword OR ep.majorName LIKE :keyword OR ep.majorGroupName LIKE :keyword)',
          { keyword: `%${keyword}%` }
        );
      }

      // 生源地省份筛选（考生所在省份，如"江苏"）
      if (province) {
        queryBuilder.andWhere('ep.sourceProvince = :province', { province });
      }

      // 院校所在省份筛选（如"北京"、"上海"）
      if (collegeProvince) {
        queryBuilder.andWhere('ep.collegeProvince = :collegeProvince', { collegeProvince });
      }

      // 院校名称精确搜索（如果没有keyword时使用）
      if (collegeName && !keyword) {
        queryBuilder.andWhere('ep.collegeName LIKE :collegeName', {
          collegeName: `%${collegeName}%`
        });
      }

      // 专业名称精确搜索（如果没有keyword时使用）
      if (majorName && !keyword) {
        queryBuilder.andWhere('ep.majorName LIKE :majorName', {
          majorName: `%${majorName}%`
        });
      }

      // 科类
      if (subjectType) {
        queryBuilder.andWhere('ep.subjectType = :subjectType', { subjectType });
      }

      // 院校层次 - 支持逗号分隔的多个值（如 "985,211"）
      if (collegeLevel) {
        const levels = (collegeLevel as string).split(',').map(l => l.trim());
        const conditions: string[] = [];

        if (levels.includes('985')) {
          conditions.push('ep.collegeIs985 = 1');
        }
        if (levels.includes('211')) {
          conditions.push('ep.collegeIs211 = 1');
        }
        if (levels.includes('double_first_class') || levels.includes('双一流')) {
          conditions.push('ep.collegeIsWorldClass = 1');
        }

        if (conditions.length > 0) {
          // 使用 OR 连接多个条件（满足任一即可）
          queryBuilder.andWhere(`(${conditions.join(' OR ')})`);
        }
      }

      // 院校类型
      if (collegeType) {
        queryBuilder.andWhere('ep.collegeType = :collegeType', { collegeType });
      }

      // 院校所在地区
      if (city) {
        queryBuilder.andWhere('ep.collegeCity = :city', { city });
      }

      // 学费范围
      if (minTuition) {
        queryBuilder.andWhere('ep.tuition >= :minTuition', { minTuition });
      }
      if (maxTuition) {
        queryBuilder.andWhere('ep.tuition <= :maxTuition', { maxTuition });
      }

      // 招生人数范围
      if (minPlanCount) {
        queryBuilder.andWhere('ep.planCount >= :minPlanCount', { minPlanCount });
      }
      if (maxPlanCount) {
        queryBuilder.andWhere('ep.planCount <= :maxPlanCount', { maxPlanCount });
      }

      // 选科要求
      if (subjectRequirement) {
        queryBuilder.andWhere('ep.subjectRequirements LIKE :subjectRequirement', {
          subjectRequirement: `%${subjectRequirement}%`
        });
      }

      // 分数范围（基于历年数据匹配）
      if (minScore || maxScore || userScore) {
        queryBuilder.leftJoinAndSelect('ep.group', 'epg');
        queryBuilder.leftJoin('epg.admissionScores', 'as');

        if (userScore) {
          // 根据用户分数智能筛选（±20分）
          const scoreNum = parseInt(userScore as string);
          queryBuilder.andWhere(
            'as.minScore BETWEEN :minRange AND :maxRange',
            { minRange: scoreNum - 20, maxRange: scoreNum + 20 }
          );
        } else {
          if (minScore) {
            queryBuilder.andWhere('as.minScore >= :minScore', { minScore });
          }
          if (maxScore) {
            queryBuilder.andWhere('as.minScore <= :maxScore', { maxScore });
          }
        }
      }

      // 分页
      const pageNum = parseInt(page as string);
      const limit = parseInt(pageSize as string);
      const offset = (pageNum - 1) * limit;

      // 获取总数
      const total = await queryBuilder.getCount();

      // 获取数据
      const plans = await queryBuilder
        .orderBy('ep.collegeName', 'ASC')
        .addOrderBy('ep.majorGroupCode', 'ASC')
        .skip(offset)
        .take(limit)
        .getMany();

      // 按专业组聚合（包含groupId、统计信息、最近分数）
      const groupedPlans = await this.groupByMajorGroupWithDetails(plans, parseInt(year as string));

      const result = {
        total,
        page: pageNum,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        data: groupedPlans
      };

      // 缓存5分钟
      await cacheService.set(cacheKey, JSON.stringify(result), { ttl: 300 });

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Search plans error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 按专业组聚合招生计划，并添加groupId、统计信息、最近分数
   */
  private async groupByMajorGroupWithDetails(plans: EnrollmentPlan[], year: number) {
    const groupMap = new Map();
    const admissionScoreRepo = AppDataSource.getRepository(require('../models/AdmissionScore').AdmissionScore);

    for (const plan of plans) {
      const key = `${plan.collegeCode}_${plan.majorGroupCode}`;

      if (!groupMap.has(key)) {
        // 生成groupId
        const groupId = plan.groupId || `${plan.collegeCode}_${plan.majorGroupCode}_${year}_${plan.sourceProvince}`;

        groupMap.set(key, {
          groupId,
          collegeCode: plan.collegeCode,
          collegeName: plan.collegeName,
          collegeProvince: plan.collegeProvince,
          collegeCity: plan.collegeCity,
          collegeType: plan.college?.type || '',
          is985: plan.collegeIs985,
          is211: plan.collegeIs211,
          isDoubleFirstClass: plan.collegeIsWorldClass,
          groupCode: plan.majorGroupCode,
          groupName: plan.majorGroupName,
          subjectRequirement: plan.subjectRequirements || '',
          totalPlanCount: 0,
          avgTuition: 0,
          majors: [],
          recentScores: []
        });
      }

      const group = groupMap.get(key);
      group.totalPlanCount += plan.planCount || 0;

      group.majors.push({
        majorCode: plan.majorCode,
        majorName: plan.majorName,
        planCount: plan.planCount,
        tuition: plan.tuition ? plan.tuition.toString() : '0',
        studyYears: plan.studyYears
      });
    }

    // 计算平均学费并查询最近分数
    const groupsArray = Array.from(groupMap.values());

    await Promise.all(groupsArray.map(async (group) => {
      // 计算平均学费
      const totalTuition = group.majors.reduce((sum: number, m: any) =>
        sum + (parseFloat(m.tuition) || 0), 0);
      group.avgTuition = group.majors.length > 0
        ? Math.round(totalTuition / group.majors.length)
        : 0;

      // 查询最近2年分数
      try {
        const recentScores = await admissionScoreRepo
          .createQueryBuilder('as')
          .where('as.collegeCode = :collegeCode', { collegeCode: group.collegeCode })
          .andWhere('as.groupCode = :groupCode', { groupCode: group.groupCode })
          .andWhere('as.year >= :startYear', { startYear: year - 2 })
          .orderBy('as.year', 'DESC')
          .limit(2)
          .getMany();

        group.recentScores = recentScores.map((score: any) => ({
          year: score.year,
          minScore: score.minScore,
          minRank: score.minRank
        }));
      } catch (err) {
        console.error('查询历年分数失败:', err);
        group.recentScores = [];
      }
    }));

    return groupsArray;
  }

  /**
   * 获取筛选选项（带缓存）
   * GET /api/enrollment-plan/search/options
   */
  async getSearchOptions(req: Request, res: Response) {
    try {
      const { year = 2025 } = req.query;
      const cacheKey = `search:options:${year}`;

      // 从缓存获取
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return ResponseUtil.success(res, JSON.parse(cached));
      }

      // 查询所有选项
      const [provinces, cities, types] = await Promise.all([
        this.planRepo
          .createQueryBuilder('ep')
          .select('DISTINCT ep.collegeProvince', 'province')
          .where('ep.year = :year', { year })
          .getRawMany(),

        this.planRepo
          .createQueryBuilder('ep')
          .select('DISTINCT ep.collegeCity', 'city')
          .where('ep.year = :year', { year })
          .getRawMany(),

        this.planRepo
          .createQueryBuilder('ep')
          .select('DISTINCT ep.collegeType', 'type')
          .where('ep.year = :year', { year })
          .getRawMany()
      ]);

      const result = {
        provinces: provinces.map(p => p.province).filter(Boolean),
        cities: cities.map(c => c.city).filter(Boolean),
        collegeTypes: types.map(t => t.type).filter(Boolean),
        collegeLevels: ['985', '211', 'double_first_class', 'regular'],
        subjectTypes: ['物理类', '历史类']
      };

      // 缓存1小时
      await cacheService.set(cacheKey, JSON.stringify(result), { ttl: 3600 });

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Get search options error:', error);
      ResponseUtil.error(res, error.message);
    }
  }
}
