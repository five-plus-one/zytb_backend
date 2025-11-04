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
        collegeName,
        majorName,
        subjectType,
        collegeLevel,
        collegeType,
        province,
        city,
        year = 2025,
        minScore,
        maxScore,
        userScore,
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

      // 院校名称
      if (collegeName) {
        queryBuilder.andWhere('ep.collegeName LIKE :collegeName', {
          collegeName: `%${collegeName}%`
        });
      }

      // 专业名称
      if (majorName) {
        queryBuilder.andWhere('ep.majorName LIKE :majorName', {
          majorName: `%${majorName}%`
        });
      }

      // 科类
      if (subjectType) {
        queryBuilder.andWhere('ep.subjectType = :subjectType', { subjectType });
      }

      // 院校层次
      if (collegeLevel) {
        if (collegeLevel === '985') {
          queryBuilder.andWhere('ep.collegeIs985 = 1');
        } else if (collegeLevel === '211') {
          queryBuilder.andWhere('ep.collegeIs211 = 1');
        } else if (collegeLevel === 'double_first_class') {
          queryBuilder.andWhere('ep.collegeIsWorldClass = 1');
        }
      }

      // 院校类型
      if (collegeType) {
        queryBuilder.andWhere('ep.collegeType = :collegeType', { collegeType });
      }

      // 地区
      if (province) {
        queryBuilder.andWhere('ep.collegeProvince = :province', { province });
      }
      if (city) {
        queryBuilder.andWhere('ep.collegeCity = :city', { city });
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

      // 按专业组聚合
      const groupedPlans = this.groupByMajorGroup(plans);

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
   * 按专业组聚合招生计划
   */
  private groupByMajorGroup(plans: EnrollmentPlan[]) {
    const groupMap = new Map();

    for (const plan of plans) {
      const key = `${plan.collegeCode}_${plan.majorGroupCode}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          collegeCode: plan.collegeCode,
          collegeName: plan.collegeName,
          collegeProvince: plan.collegeProvince,
          collegeCity: plan.collegeCity,
          is985: plan.collegeIs985,
          is211: plan.collegeIs211,
          isDoubleFirstClass: plan.collegeIsWorldClass,
          groupCode: plan.majorGroupCode,
          groupName: plan.majorGroupName,
          majors: []
        });
      }

      const group = groupMap.get(key);
      group.majors.push({
        majorCode: plan.majorCode,
        majorName: plan.majorName,
        planCount: plan.planCount,
        tuition: plan.tuition,
        studyYears: plan.studyYears
      });
    }

    return Array.from(groupMap.values());
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
