import { AppDataSource } from '../config/database';
import { CoreEnrollmentPlan } from '../models/core/CoreEnrollmentPlan';
import { CoreAdmissionScore } from '../models/core/CoreAdmissionScore';
import { CoreCollege } from '../models/core/CoreCollege';
import { validatePageParams, calculatePagination } from '../utils/validator';

export interface EnrollmentPlanDetailQueryDto {
  year: number;                    // 年份
  sourceProvince: string;          // 生源地
  subjectType: string;             // 科类
  collegeName?: string;            // 院校名称（支持模糊搜索）
  collegeCode?: string;            // 院校代码
  majorGroupCode?: string;         // 专业组代码
  batch?: string;                  // 批次
  includeHistoricalScores?: boolean; // 是否包含历史录取数据（默认true）
  historicalYears?: number;        // 查询几年的历史数据（默认3年）
  pageNum?: number;
  pageSize?: number;
}

export interface EnrollmentPlanDetailResult {
  // 基本信息
  id: string;
  year: number;
  sourceProvince: string;
  subjectType: string;
  batch: string;

  // 院校信息
  collegeCode: string;
  collegeName: string;
  collegeInfo?: {
    level: string | null;
    category: string | null;
    province: string | null;
    city: string | null;
    isKey985: boolean;
    isKey211: boolean;
    isDoubleFirstClass: boolean;
  };

  // 专业组信息
  majorGroupCode: string | null;
  majorGroupName: string | null;
  subjectRequirements: string | null;

  // 专业信息
  majorCode: string;
  majorName: string;
  majorRemarks: string | null;

  // 招生计划
  planCount: number;
  studyYears: number | null;
  tuition: number | null;

  // 历史录取数据
  historicalScores?: Array<{
    year: number;
    minScore: number | null;
    minRank: number | null;
    majorGroup: string | null;
  }>;
}

export class EnrollmentPlanDetailService {
  private enrollmentPlanRepository = AppDataSource.getRepository(CoreEnrollmentPlan);
  private admissionScoreRepository = AppDataSource.getRepository(CoreAdmissionScore);
  private collegeRepository = AppDataSource.getRepository(CoreCollege);

  /**
   * 查询招生计划详情
   */
  async getEnrollmentPlanDetails(query: EnrollmentPlanDetailQueryDto) {
    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);
    const {
      year,
      sourceProvince,
      subjectType,
      collegeName,
      collegeCode,
      majorGroupCode,
      batch,
      includeHistoricalScores = true,
      historicalYears = 3
    } = query;

    // 构建查询
    const queryBuilder = this.enrollmentPlanRepository
      .createQueryBuilder('ep')
      .leftJoinAndSelect('ep.college', 'college')
      .where('ep.year = :year', { year })
      .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('ep.subjectType = :subjectType', { subjectType });

    if (collegeName) {
      queryBuilder.andWhere('ep.collegeName LIKE :collegeName', {
        collegeName: `%${collegeName}%`
      });
    }

    if (collegeCode) {
      queryBuilder.andWhere('ep.collegeCode = :collegeCode', { collegeCode });
    }

    if (majorGroupCode) {
      queryBuilder.andWhere('ep.majorGroupCode = :majorGroupCode', { majorGroupCode });
    }

    if (batch) {
      queryBuilder.andWhere('ep.batch = :batch', { batch });
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页查询
    const plans = await queryBuilder
      .orderBy('ep.collegeName', 'ASC')
      .addOrderBy('ep.majorGroupCode', 'ASC')
      .addOrderBy('ep.majorName', 'ASC')
      .skip((pageNum - 1) * pageSize)
      .take(pageSize)
      .getMany();

    // 转换为详情格式
    const details: EnrollmentPlanDetailResult[] = await Promise.all(
      plans.map(async plan => {
        const detail: EnrollmentPlanDetailResult = {
          id: plan.id,
          year: plan.year,
          sourceProvince: plan.sourceProvince,
          subjectType: plan.subjectType,
          batch: plan.batch,
          collegeCode: plan.collegeCode || "",
          collegeName: plan.collegeName || "",
          majorGroupCode: plan.majorGroupCode || null,
          majorGroupName: plan.majorGroupName || null,
          subjectRequirements: plan.subjectRequirements || null,
          majorCode: plan.majorCode || "",
          majorName: plan.majorName || "",
          majorRemarks: plan.majorRemarks || null,
          planCount: plan.planCount,
          studyYears: plan.studyYears || null,
          tuition: plan.tuition || null
        };

        // 添加院校详细信息 (Core Layer uses redundant design, no college relation)
        detail.collegeInfo = {
          level: null, // Not available in CoreEnrollmentPlan
          category: null, // Not available in CoreEnrollmentPlan
          province: plan.collegeProvince || null,
          city: plan.collegeCity || null,
          isKey985: plan.collegeIs985 || false,
          isKey211: plan.collegeIs211 || false,
          isDoubleFirstClass: plan.collegeIsWorldClass || false
        };

        // 查询历史录取数据
        if (includeHistoricalScores) {
          const historicalScores = await this.admissionScoreRepository
            .createQueryBuilder('as')
            .select(['as.year', 'as.minScore', 'as.minRank', 'as.majorGroup'])
            .where('as.sourceProvince = :sourceProvince', { sourceProvince })
            .andWhere('as.collegeName = :collegeName', {
              collegeName: plan.collegeName
            })
            .andWhere('as.majorName = :majorName', {
              majorName: plan.majorName
            })
            .andWhere('as.subjectType = :subjectType', { subjectType })
            .andWhere('as.year < :year', { year })
            .andWhere('as.year >= :startYear', {
              startYear: year - historicalYears
            })
            .orderBy('as.year', 'DESC')
            .getRawMany();

          detail.historicalScores = historicalScores.map(hs => ({
            year: hs.as_year,
            minScore: hs.as_minScore,
            minRank: hs.as_minRank,
            majorGroup: hs.as_majorGroup
          }));
        }

        return detail;
      })
    );

    return {
      list: details,
      ...calculatePagination(total, pageNum, pageSize)
    };
  }

  /**
   * 按院校分组查询招生计划
   */
  async getEnrollmentPlansByCollege(
    year: number,
    sourceProvince: string,
    subjectType: string,
    collegeCode?: string,
    collegeName?: string
  ) {
    const queryBuilder = this.enrollmentPlanRepository
      .createQueryBuilder('ep')
      .where('ep.year = :year', { year })
      .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('ep.subjectType = :subjectType', { subjectType });

    if (collegeCode) {
      queryBuilder.andWhere('ep.collegeCode = :collegeCode', { collegeCode });
    }

    if (collegeName) {
      queryBuilder.andWhere('ep.collegeName LIKE :collegeName', {
        collegeName: `%${collegeName}%`
      });
    }

    const plans = await queryBuilder
      .orderBy('ep.collegeName', 'ASC')
      .addOrderBy('ep.majorGroupCode', 'ASC')
      .addOrderBy('ep.majorName', 'ASC')
      .getMany();

    // 按院校分组
    const groupedByCollege = plans.reduce((acc, plan) => {
      const key = `${plan.collegeCode}-${plan.collegeName}`;
      if (!acc[key]) {
        acc[key] = {
          collegeCode: plan.collegeCode,
          collegeName: plan.collegeName || "",
          totalPlanCount: 0,
          majorGroups: {} as any
        };
      }

      acc[key].totalPlanCount += plan.planCount;

      // 按专业组分组
      const groupKey = plan.majorGroupCode || 'default';
      if (!acc[key].majorGroups[groupKey]) {
        acc[key].majorGroups[groupKey] = {
          majorGroupCode: plan.majorGroupCode,
          majorGroupName: plan.majorGroupName,
          subjectRequirements: plan.subjectRequirements,
          majors: []
        };
      }

      acc[key].majorGroups[groupKey].majors.push({
        majorCode: plan.majorCode,
        majorName: plan.majorName,
        planCount: plan.planCount,
        studyYears: plan.studyYears,
        tuition: plan.tuition,
        majorRemarks: plan.majorRemarks
      });

      return acc;
    }, {} as any);

    // 转换为数组格式
    return Object.values(groupedByCollege).map((college: any) => ({
      ...college,
      majorGroups: Object.values(college.majorGroups)
    }));
  }

  /**
   * 获取院校的历史录取分数统计
   */
  async getCollegeHistoricalScoreStats(
    collegeName: string,
    sourceProvince: string,
    subjectType: string,
    years?: number
  ) {
    const historicalYears = years || 5;
    const currentYear = new Date().getFullYear();

    const scores = await this.admissionScoreRepository
      .createQueryBuilder('as')
      .where('as.collegeName = :collegeName', { collegeName })
      .andWhere('as.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('as.subjectType = :subjectType', { subjectType })
      .andWhere('as.year >= :startYear', {
        startYear: currentYear - historicalYears
      })
      .orderBy('as.year', 'DESC')
      .getMany();

    // 按年份分组统计
    const statsByYear = scores.reduce((acc, score) => {
      if (!acc[score.year]) {
        acc[score.year] = {
          year: score.year,
          minScore: score.minScore,
          maxScore: score.minScore,
          avgScore: 0,
          minRank: score.minRank,
          majorCount: 0,
          scores: []
        };
      }

      if (score.minScore) {
        acc[score.year].scores.push(score.minScore);
        if (score.minScore < acc[score.year].minScore!) {
          acc[score.year].minScore = score.minScore;
        }
        if (score.minScore > acc[score.year].maxScore!) {
          acc[score.year].maxScore = score.minScore;
        }
      }

      acc[score.year].majorCount++;

      return acc;
    }, {} as any);

    // 计算平均分
    Object.values(statsByYear).forEach((stat: any) => {
      if (stat.scores.length > 0) {
        stat.avgScore = Math.round(
          stat.scores.reduce((sum: number, s: number) => sum + s, 0) /
            stat.scores.length
        );
      }
      delete stat.scores;
    });

    return Object.values(statsByYear);
  }
}
