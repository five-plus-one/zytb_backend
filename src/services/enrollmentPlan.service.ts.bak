import { AppDataSource } from '../config/database';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { College } from '../models/College';
import { validatePageParams, calculatePagination } from '../utils/validator';
import { Like, In } from 'typeorm';

export interface EnrollmentPlanQueryDto {
  pageNum?: number;
  pageSize?: number;
  year?: number;
  sourceProvince?: string;
  subjectType?: string;
  batch?: string;
  collegeCode?: string;
  collegeName?: string;
  majorCode?: string;
  majorName?: string;
  keyword?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export class EnrollmentPlanService {
  private planRepository = AppDataSource.getRepository(EnrollmentPlan);
  private collegeRepository = AppDataSource.getRepository(College);

  // 获取招生计划列表
  async getEnrollmentPlanList(query: EnrollmentPlanQueryDto) {
    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);

    // 构建查询条件
    const where: any = {};

    if (query.year) {
      where.year = query.year;
    }

    if (query.sourceProvince) {
      where.sourceProvince = query.sourceProvince;
    }

    if (query.subjectType) {
      where.subjectType = query.subjectType;
    }

    if (query.batch) {
      where.batch = query.batch;
    }

    if (query.collegeCode) {
      where.collegeCode = query.collegeCode;
    }

    if (query.collegeName) {
      where.collegeName = Like(`%${query.collegeName}%`);
    }

    if (query.majorCode) {
      where.majorCode = query.majorCode;
    }

    if (query.majorName) {
      where.majorName = Like(`%${query.majorName}%`);
    }

    // 关键词搜索（搜索院校名称或专业名称）
    if (query.keyword) {
      // 需要使用查询构建器来实现 OR 条件
      const queryBuilder = this.planRepository.createQueryBuilder('plan');

      queryBuilder.where('(plan.collegeName LIKE :keyword OR plan.majorName LIKE :keyword)', {
        keyword: `%${query.keyword}%`
      });

      // 添加其他条件
      if (query.year) queryBuilder.andWhere('plan.year = :year', { year: query.year });
      if (query.sourceProvince) queryBuilder.andWhere('plan.sourceProvince = :sourceProvince', { sourceProvince: query.sourceProvince });
      if (query.subjectType) queryBuilder.andWhere('plan.subjectType = :subjectType', { subjectType: query.subjectType });
      if (query.batch) queryBuilder.andWhere('plan.batch = :batch', { batch: query.batch });

      const orderField = query.sortField || 'year';
      const orderDirection = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(`plan.${orderField}`, orderDirection);

      queryBuilder.skip((pageNum - 1) * pageSize);
      queryBuilder.take(pageSize);

      const [list, total] = await queryBuilder.getManyAndCount();

      return {
        list,
        ...calculatePagination(total, pageNum, pageSize)
      };
    }

    // 排序
    const orderField = query.sortField || 'year';
    const orderDirection = query.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const [list, total] = await this.planRepository.findAndCount({
      where,
      order: { [orderField]: orderDirection },
      skip: (pageNum - 1) * pageSize,
      take: pageSize
    });

    return {
      list,
      ...calculatePagination(total, pageNum, pageSize)
    };
  }

  // 获取招生计划详情
  async getEnrollmentPlanDetail(id: string) {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['college']
    });

    if (!plan) {
      throw new Error('招生计划不存在');
    }

    return plan;
  }

  // 按院校获取招生计划
  async getPlansByCollege(collegeCode: string, year?: number, sourceProvince?: string) {
    const where: any = { collegeCode };

    if (year) {
      where.year = year;
    }

    if (sourceProvince) {
      where.sourceProvince = sourceProvince;
    }

    const plans = await this.planRepository.find({
      where,
      order: { year: 'DESC', batch: 'ASC', majorName: 'ASC' }
    });

    // 统计信息
    const totalPlanCount = plans.reduce((sum, plan) => sum + plan.planCount, 0);
    const years = [...new Set(plans.map(p => p.year))].sort((a, b) => b - a);
    const majors = [...new Set(plans.map(p => p.majorName))];

    return {
      plans,
      statistics: {
        totalPlans: plans.length,
        totalPlanCount,
        years,
        majorCount: majors.length
      }
    };
  }

  // 按专业获取招生计划
  async getPlansByMajor(majorCode: string, year?: number, sourceProvince?: string) {
    const where: any = { majorCode };

    if (year) {
      where.year = year;
    }

    if (sourceProvince) {
      where.sourceProvince = sourceProvince;
    }

    const plans = await this.planRepository.find({
      where,
      order: { year: 'DESC', collegeName: 'ASC' }
    });

    // 统计信息
    const totalPlanCount = plans.reduce((sum, plan) => sum + plan.planCount, 0);
    const colleges = [...new Set(plans.map(p => p.collegeName))];

    return {
      plans,
      statistics: {
        totalPlans: plans.length,
        totalPlanCount,
        collegeCount: colleges.length
      }
    };
  }

  // 获取招生计划统计信息
  async getEnrollmentStatistics(year: number, sourceProvince: string) {
    const queryBuilder = this.planRepository.createQueryBuilder('plan');

    queryBuilder.where('plan.year = :year AND plan.sourceProvince = :sourceProvince', {
      year,
      sourceProvince
    });

    const plans = await queryBuilder.getMany();

    // 按院校统计
    const collegeStats = new Map<string, { count: number; planCount: number }>();
    plans.forEach(plan => {
      const key = plan.collegeName;
      if (!collegeStats.has(key)) {
        collegeStats.set(key, { count: 0, planCount: 0 });
      }
      const stats = collegeStats.get(key)!;
      stats.count++;
      stats.planCount += plan.planCount;
    });

    // 按批次统计
    const batchStats = new Map<string, { count: number; planCount: number }>();
    plans.forEach(plan => {
      const key = plan.batch;
      if (!batchStats.has(key)) {
        batchStats.set(key, { count: 0, planCount: 0 });
      }
      const stats = batchStats.get(key)!;
      stats.count++;
      stats.planCount += plan.planCount;
    });

    // 按科类统计
    const subjectStats = new Map<string, { count: number; planCount: number }>();
    plans.forEach(plan => {
      const key = plan.subjectType;
      if (!subjectStats.has(key)) {
        subjectStats.set(key, { count: 0, planCount: 0 });
      }
      const stats = subjectStats.get(key)!;
      stats.count++;
      stats.planCount += plan.planCount;
    });

    return {
      totalPlans: plans.length,
      totalPlanCount: plans.reduce((sum, p) => sum + p.planCount, 0),
      collegeCount: collegeStats.size,
      byCollege: Array.from(collegeStats.entries()).map(([name, stats]) => ({
        collegeName: name,
        ...stats
      })).sort((a, b) => b.planCount - a.planCount).slice(0, 20), // 前20所院校
      byBatch: Array.from(batchStats.entries()).map(([batch, stats]) => ({
        batch,
        ...stats
      })),
      bySubject: Array.from(subjectStats.entries()).map(([subjectType, stats]) => ({
        subjectType,
        ...stats
      }))
    };
  }

  // 获取可用的年份列表
  async getAvailableYears() {
    const queryBuilder = this.planRepository.createQueryBuilder('plan');
    queryBuilder.select('DISTINCT plan.year', 'year');
    queryBuilder.orderBy('plan.year', 'DESC');

    const results = await queryBuilder.getRawMany();
    return results.map(r => r.year);
  }

  // 获取可用的生源地列表
  async getAvailableProvinces(year?: number) {
    const queryBuilder = this.planRepository.createQueryBuilder('plan');
    queryBuilder.select('DISTINCT plan.sourceProvince', 'province');

    if (year) {
      queryBuilder.where('plan.year = :year', { year });
    }

    queryBuilder.orderBy('plan.sourceProvince', 'ASC');

    const results = await queryBuilder.getRawMany();
    return results.map(r => r.province);
  }
}
