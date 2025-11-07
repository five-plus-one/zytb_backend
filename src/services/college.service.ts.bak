import { AppDataSource } from '../config/database';
import { College } from '../models/College';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { CollegeQueryDto } from '../types';
import { validatePageParams, calculatePagination } from '../utils/validator';
import { Like, Between, In } from 'typeorm';

export class CollegeService {
  private collegeRepository = AppDataSource.getRepository(College);
  private planRepository = AppDataSource.getRepository(EnrollmentPlan);
  private scoreRepository = AppDataSource.getRepository(AdmissionScore);

  // 获取院校列表
  async getCollegeList(query: CollegeQueryDto) {
    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);

    // 排序
    const orderField = query.sortField || 'rank';
    const orderDirection = query.sortOrder === 'desc' ? 'DESC' : 'ASC';

    // 查询数据（分两批：有排名的和无排名的）
    const queryBuilder = this.collegeRepository.createQueryBuilder('college');

    // 应用筛选条件
    if (query.keyword) {
      queryBuilder.andWhere('college.name LIKE :keyword', { keyword: `%${query.keyword}%` });
    }
    if (query.province) {
      queryBuilder.andWhere('college.province = :province', { province: query.province });
    }
    if (query.city) {
      queryBuilder.andWhere('college.city = :city', { city: query.city });
    }
    if (query.type) {
      queryBuilder.andWhere('college.type = :type', { type: query.type });
    }
    if (query.nature) {
      queryBuilder.andWhere('college.nature = :nature', { nature: query.nature });
    }
    if (query.minScore !== undefined || query.maxScore !== undefined) {
      const min = query.minScore || 0;
      const max = query.maxScore || 999;
      queryBuilder.andWhere('college.min_score BETWEEN :min AND :max', { min, max });
    }

    // 特殊处理：如果按rank排序，确保无排名的院校排在最后
    if (orderField === 'rank') {
      queryBuilder.addOrderBy(
        `CASE WHEN college.rank IS NULL OR college.rank = 0 THEN 1 ELSE 0 END`,
        'ASC'
      );
      queryBuilder.addOrderBy('college.rank', orderDirection);
    } else {
      queryBuilder.orderBy(`college.${orderField}`, orderDirection);
    }

    // 分页
    const [list, total] = await queryBuilder
      .skip((pageNum - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      list,
      ...calculatePagination(total, pageNum, pageSize)
    };
  }

  // 获取院校详情
  async getCollegeDetail(id: string) {
    const college = await this.collegeRepository.findOne({
      where: { id }
    });

    if (!college) {
      throw new Error('院校不存在');
    }

    return college;
  }

  // 获取院校招生计划（包含历年分数）
  async getCollegePlan(id: string, year?: number, province?: string, subjectType?: string) {
    const college = await this.getCollegeDetail(id);

    // 查询实际的招生计划数据
    const where: any = {};

    // 通过院校代码或ID查询
    if (college.code) {
      where.collegeCode = college.code;
    } else {
      where.collegeId = college.id;
    }

    if (year) {
      where.year = year;
    }

    if (province) {
      where.sourceProvince = province;
    }

    if (subjectType) {
      where.subjectType = subjectType;
    }

    const plans = await this.planRepository.find({
      where,
      order: {
        year: 'DESC',
        batch: 'ASC',
        majorName: 'ASC'
      }
    });

    // 如果没有找到招生计划，返回空数组
    if (plans.length === 0) {
      return {
        collegeId: college.id,
        collegeName: college.name,
        year: year || new Date().getFullYear(),
        province: province || '',
        plans: [],
        statistics: {
          totalPlans: 0,
          totalPlanCount: 0,
          years: [],
          batches: []
        }
      };
    }

    // 查询历年分数（如果提供了省份和科类）
    let historicalScores: AdmissionScore[] = [];
    if (province && subjectType) {
      historicalScores = await this.scoreRepository.find({
        where: {
          collegeName: college.name,
          sourceProvince: province,
          subjectType: subjectType
        },
        order: {
          year: 'DESC',
          minScore: 'DESC'
        }
      });
    }

    // 为每个招生计划匹配历年分数
    const plansWithScores = await Promise.all(plans.map(async plan => {
      // 查找匹配的历年分数（精确匹配专业组或专业名称）
      let matchedScores = historicalScores.filter(score => {
        // 策略1：匹配专业组代码
        if (plan.majorGroupCode && score.majorGroup === plan.majorGroupCode) {
          return true;
        }
        // 策略2：模糊匹配专业名称
        if (plan.majorName && score.majorName) {
          const cleanPlanMajor = plan.majorName.replace(/[（(].*?[)）]/g, '').trim();
          const cleanScoreMajor = score.majorName.replace(/[（(].*?[)）]/g, '').trim();
          if (cleanScoreMajor.includes(cleanPlanMajor) || cleanPlanMajor.includes(cleanScoreMajor)) {
            return true;
          }
        }
        // 策略3：模糊匹配专业组名称
        if (plan.majorGroupName && score.majorGroup) {
          const cleanGroupName = plan.majorGroupName.replace(/[（(].*?[)）]/g, '').trim();
          if (score.majorGroup.includes(cleanGroupName) || cleanGroupName.includes(score.majorGroup)) {
            return true;
          }
        }
        return false;
      });

      // 按年份分组
      const scoresByYear: Record<number, any> = {};
      matchedScores.forEach(score => {
        if (!scoresByYear[score.year]) {
          scoresByYear[score.year] = {
            year: score.year,
            minScore: score.minScore,
            minRank: score.minRank,
            batch: score.batch
          };
        } else {
          // 如果同一年有多条记录，取最低分
          if (score.minScore && (!scoresByYear[score.year].minScore || score.minScore < scoresByYear[score.year].minScore)) {
            scoresByYear[score.year].minScore = score.minScore;
            scoresByYear[score.year].minRank = score.minRank;
          }
        }
      });

      return {
        id: plan.id,
        year: plan.year,
        sourceProvince: plan.sourceProvince,
        subjectType: plan.subjectType,
        batch: plan.batch,
        majorGroupCode: plan.majorGroupCode,
        majorGroupName: plan.majorGroupName,
        subjectRequirements: plan.subjectRequirements,
        majorCode: plan.majorCode,
        majorName: plan.majorName,
        majorRemarks: plan.majorRemarks,
        planCount: plan.planCount,
        studyYears: plan.studyYears,
        tuition: plan.tuition,
        // 历年分数（按年份降序）
        historicalScores: Object.values(scoresByYear).sort((a: any, b: any) => b.year - a.year)
      };
    }));

    // 统计信息
    const totalPlanCount = plans.reduce((sum, plan) => sum + plan.planCount, 0);
    const years = [...new Set(plans.map(p => p.year))].sort((a, b) => b - a);
    const batches = [...new Set(plans.map(p => p.batch))];

    return {
      collegeId: college.id,
      collegeName: college.name,
      year: year || years[0],
      province: province || '',
      plans: plansWithScores,
      statistics: {
        totalPlans: plans.length,
        totalPlanCount,
        years,
        batches
      }
    };
  }

  // 获取院校历年分数线
  async getCollegeScores(
    id: string,
    province: string,
    subjectType: string,
    years = 3
  ) {
    const college = await this.getCollegeDetail(id);

    // 查询真实的录取分数线数据
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years;

    const scores = await this.scoreRepository.find({
      where: {
        collegeName: college.name,
        sourceProvince: province,
        subjectType: subjectType,
      },
      order: {
        year: 'DESC',
        minScore: 'DESC'
      }
    });

    // 按年份筛选并组织数据
    const filteredScores = scores.filter(s => s.year >= startYear && s.year < currentYear);

    // 按年份分组统计
    const scoresByYear = new Map<number, any>();

    filteredScores.forEach(score => {
      if (!scoresByYear.has(score.year)) {
        scoresByYear.set(score.year, {
          year: score.year,
          scores: [],
          minScore: Infinity,
          maxScore: 0,
          avgScore: 0,
          count: 0
        });
      }

      const yearData = scoresByYear.get(score.year)!;
      yearData.scores.push({
        majorName: score.majorName,
        minScore: score.minScore,
        minRank: score.minRank,
        batch: score.batch
      });

      if (score.minScore) {
        yearData.minScore = Math.min(yearData.minScore, score.minScore);
        yearData.maxScore = Math.max(yearData.maxScore, score.minScore);
        yearData.avgScore += score.minScore;
        yearData.count++;
      }
    });

    // 计算平均分
    const result = Array.from(scoresByYear.values()).map(yearData => {
      yearData.avgScore = yearData.count > 0
        ? Math.round(yearData.avgScore / yearData.count)
        : 0;
      if (yearData.minScore === Infinity) yearData.minScore = null;
      if (yearData.maxScore === 0) yearData.maxScore = null;
      return yearData;
    }).sort((a, b) => b.year - a.year);

    return {
      collegeId: college.id,
      collegeName: college.name,
      province,
      subjectType,
      scores: result,
      hasData: result.length > 0
    };
  }

  // 院校对比
  async compareColleges(collegeIds: string[]) {
    if (collegeIds.length > 5) {
      throw new Error('最多对比5个院校');
    }

    const colleges = await this.collegeRepository.findBy({
      id: In(collegeIds)
    });

    return colleges.map(college => ({
      id: college.id,
      name: college.name,
      level: college.level,
      rank: college.rank,
      minScore: college.minScore,
      avgScore: college.avgScore,
      keyDisciplineCount: college.keyDisciplineCount,
      features: college.features
    }));
  }
}
