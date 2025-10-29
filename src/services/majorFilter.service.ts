import { AppDataSource } from '../config/database';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { ScoreRanking } from '../models/ScoreRanking';
import { validatePageParams, calculatePagination } from '../utils/validator';
import { Brackets } from 'typeorm';

export interface MajorFilterQueryDto {
  year: number;                    // 年份
  sourceProvince: string;          // 生源地
  subjectType: string;             // 科类
  score: number;                   // 分数
  scoreRange?: number;             // 分数浮动范围（默认±10分）
  majorDirection?: string;         // 专业方向/类别（支持模糊搜索）
  majorName?: string;              // 专业名称（支持模糊搜索）
  collegeName?: string;            // 院校名称（支持模糊搜索）
  batch?: string;                  // 批次
  pageNum?: number;
  pageSize?: number;
}

export interface MajorFilterResult {
  id: string;
  year: number;
  sourceProvince: string;
  subjectType: string;
  batch: string;
  collegeCode: string;
  collegeName: string;
  majorGroupCode: string | null;
  majorGroupName: string | null;
  majorCode: string;
  majorName: string;
  planCount: number;
  studyYears: number | null;
  tuition: number | null;
  subjectRequirements: string | null;
  majorRemarks: string | null;
  // 往年录取数据
  historicalScores?: Array<{
    year: number;
    minScore: number | null;
    minRank: number | null;
  }>;
}

export class MajorFilterService {
  private enrollmentPlanRepository = AppDataSource.getRepository(EnrollmentPlan);
  private admissionScoreRepository = AppDataSource.getRepository(AdmissionScore);
  private scoreRankingRepository = AppDataSource.getRepository(ScoreRanking);

  /**
   * 按分数范围和专业方向筛选招生计划
   */
  async filterMajors(query: MajorFilterQueryDto) {
    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);
    const {
      year,
      sourceProvince,
      subjectType,
      score,
      scoreRange = 10,
      majorDirection,
      majorName,
      collegeName,
      batch
    } = query;

    // 1. 根据分数计算位次
    const userRanking = await this.scoreRankingRepository
      .createQueryBuilder('sr')
      .where('sr.year = :year', { year })
      .andWhere('sr.province = :province', { province: sourceProvince })
      .andWhere('sr.subjectType = :subjectType', { subjectType })
      .andWhere('sr.score <= :score', { score })
      .orderBy('sr.score', 'DESC')
      .limit(1)
      .getOne();

    const userRank = userRanking?.rank || userRanking?.cumulativeCount || null;

    // 2. 查询招生计划
    const queryBuilder = this.enrollmentPlanRepository
      .createQueryBuilder('ep')
      .where('ep.year = :year', { year })
      .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('ep.subjectType = :subjectType', { subjectType });

    // 批次筛选
    if (batch) {
      queryBuilder.andWhere('ep.batch = :batch', { batch });
    }

    // 专业方向/类别筛选（模糊搜索）
    if (majorDirection) {
      queryBuilder.andWhere(
        new Brackets(qb => {
          qb.where('ep.majorName LIKE :majorDirection', {
            majorDirection: `%${majorDirection}%`
          }).orWhere('ep.majorGroupName LIKE :majorDirection', {
            majorDirection: `%${majorDirection}%`
          });
        })
      );
    }

    // 专业名称筛选
    if (majorName) {
      queryBuilder.andWhere('ep.majorName LIKE :majorName', {
        majorName: `%${majorName}%`
      });
    }

    // 院校名称筛选
    if (collegeName) {
      queryBuilder.andWhere('ep.collegeName LIKE :collegeName', {
        collegeName: `%${collegeName}%`
      });
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页查询
    const plans = await queryBuilder
      .orderBy('ep.collegeName', 'ASC')
      .addOrderBy('ep.majorName', 'ASC')
      .skip((pageNum - 1) * pageSize)
      .take(pageSize)
      .getMany();

    // 3. 查询往年录取分数（最近3年）
    const plansWithHistory: MajorFilterResult[] = await Promise.all(
      plans.map(async plan => {
        // 查询往年录取分数
        const historicalScores = await this.admissionScoreRepository
          .createQueryBuilder('as')
          .select(['as.year', 'as.minScore', 'as.minRank'])
          .where('as.sourceProvince = :sourceProvince', { sourceProvince })
          .andWhere('as.collegeName = :collegeName', {
            collegeName: plan.collegeName
          })
          .andWhere('as.majorName = :majorName', {
            majorName: plan.majorName
          })
          .andWhere('as.subjectType = :subjectType', { subjectType })
          .andWhere('as.year < :year', { year })
          .orderBy('as.year', 'DESC')
          .limit(3)
          .getRawMany();

        return {
          id: plan.id,
          year: plan.year,
          sourceProvince: plan.sourceProvince,
          subjectType: plan.subjectType,
          batch: plan.batch,
          collegeCode: plan.collegeCode,
          collegeName: plan.collegeName,
          majorGroupCode: plan.majorGroupCode || null,
          majorGroupName: plan.majorGroupName || null,
          majorCode: plan.majorCode,
          majorName: plan.majorName,
          planCount: plan.planCount,
          studyYears: plan.studyYears || null,
          tuition: plan.tuition || null,
          subjectRequirements: plan.subjectRequirements || null,
          majorRemarks: plan.majorRemarks || null,
          historicalScores: historicalScores.map(hs => ({
            year: hs.as_year,
            minScore: hs.as_minScore,
            minRank: hs.as_minRank
          }))
        };
      })
    );

    // 4. 根据分数范围和往年录取情况筛选
    const filteredPlans = plansWithHistory.filter(plan => {
      // 如果没有历史录取数据，保留（可能是新专业）
      if (!plan.historicalScores || plan.historicalScores.length === 0) {
        return true;
      }

      // 检查最近一年的录取分数
      const latestScore = plan.historicalScores[0];
      if (!latestScore.minScore) {
        return true;
      }

      // 分数在范围内
      const scoreDiff = Math.abs(latestScore.minScore - score);
      return scoreDiff <= scoreRange;
    });

    return {
      list: filteredPlans,
      userRank,
      ...calculatePagination(filteredPlans.length, pageNum, pageSize)
    };
  }

  /**
   * 获取可用的专业方向列表
   */
  async getAvailableMajorDirections(
    year: number,
    sourceProvince: string,
    subjectType: string
  ) {
    const directions = await this.enrollmentPlanRepository
      .createQueryBuilder('ep')
      .select('DISTINCT ep.majorGroupName', 'direction')
      .where('ep.year = :year', { year })
      .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('ep.subjectType = :subjectType', { subjectType })
      .andWhere('ep.majorGroupName IS NOT NULL')
      .orderBy('ep.majorGroupName', 'ASC')
      .getRawMany();

    return directions.map(d => d.direction).filter(d => d);
  }
}
