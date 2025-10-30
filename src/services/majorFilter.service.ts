import { AppDataSource } from '../config/database';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { ScoreRanking } from '../models/ScoreRanking';
import { College } from '../models/College';
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
  collegeProvince?: string;        // 院校所在省份（用于筛选省内/省外院校）
  batch?: string;                  // 批次
  pageNum?: number;
  pageSize?: number;
}

export interface MajorFilterResult {
  id: string;  // enrollmentPlanId - 可用于快速添加志愿
  year: number;
  sourceProvince: string;
  subjectType: string;
  batch: string;
  collegeCode: string;
  collegeName: string;
  collegeProvince: string | null;
  collegeCity: string | null;
  collegeIs985: boolean;
  collegeIs211: boolean;
  collegeIsWorldClass: boolean;
  majorGroupCode: string | null;
  majorGroupName: string | null;
  majorCode: string;
  majorName: string;
  planCount: number;
  studyYears: number | null;
  tuition: number | null;
  subjectRequirements: string | null;
  majorRemarks: string | null;

  // 新增：冲稳保判断和匹配度信息
  admitProbability?: string;  // 录取概率: 冲/稳/保/未知
  scoreGap?: number;          // 与历史最低分的差距
  rankGap?: number | null;    // 与历史最低位次的差距

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
  private collegeRepository = AppDataSource.getRepository(College);

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
      collegeProvince,
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

    // 2. 如果有collegeProvince参数，查询该省份的院校名称列表
    let collegeNamesInProvince: string[] | null = null;

    if (collegeProvince) {
      const colleges = await this.collegeRepository
        .createQueryBuilder('c')
        .select('c.name')
        .where('c.province = :province', { province: collegeProvince })
        .getMany();

      collegeNamesInProvince = colleges.map(c => c.name).filter(name => name);

      console.log(`📍 筛选${collegeProvince}省内院校，找到${collegeNamesInProvince.length}所院校`);

      // 如果没有找到任何院校，直接返回空结果
      if (collegeNamesInProvince.length === 0) {
        console.log(`⚠️ 未找到${collegeProvince}省的院校数据`);
        return {
          list: [],
          userRank,
          ...calculatePagination(0, pageNum, pageSize)
        };
      }
    }

    // 3. 查询招生计划
    const queryBuilder = this.enrollmentPlanRepository
      .createQueryBuilder('ep')
      .where('ep.year = :year', { year })
      .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('ep.subjectType = :subjectType', { subjectType });

    // 批次筛选
    if (batch) {
      queryBuilder.andWhere('ep.batch = :batch', { batch });
    }

    // 院校省份筛选（通过院校名称列表）
    if (collegeNamesInProvince && collegeNamesInProvince.length > 0) {
      queryBuilder.andWhere('ep.collegeName IN (:...collegeNames)', {
        collegeNames: collegeNamesInProvince
      });
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

    // 获取总数（未经分数筛选）
    const totalBeforeScoreFilter = await queryBuilder.getCount();
    console.log(`📊 符合条件的招生计划总数（未经分数筛选）: ${totalBeforeScoreFilter}`);

    // 4. 先获取所有符合条件的招生计划（不分页）
    const allPlans = await queryBuilder
      .orderBy('ep.collegeName', 'ASC')
      .addOrderBy('ep.majorName', 'ASC')
      .getMany();

    console.log(`📊 查询到${allPlans.length}条招生计划记录，准备查询历史分数`);

    // 5. 查询往年录取分数并进行分数筛选
    const plansWithHistory: MajorFilterResult[] = await Promise.all(
      allPlans.map(async plan => {
        // 查询往年录取分数（最近3年）
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

        // 计算冲稳保和分数差距
        const latestScore = historicalScores.length > 0 ? historicalScores[0] : null;
        let admitProbability = '未知';
        let scoreGap = 0;
        let rankGap: number | null = null;

        if (latestScore && latestScore.as_minScore) {
          scoreGap = score - latestScore.as_minScore;
          rankGap = (latestScore.as_minRank && userRank) ? userRank - latestScore.as_minRank : null;

          // 判断冲稳保
          if (scoreGap < -10) {
            admitProbability = '冲';
          } else if (scoreGap >= -10 && scoreGap <= 10) {
            admitProbability = '稳';
          } else {
            admitProbability = '保';
          }
        }

        return {
          id: plan.id,
          year: plan.year,
          sourceProvince: plan.sourceProvince,
          subjectType: plan.subjectType,
          batch: plan.batch,
          collegeCode: plan.collegeCode,
          collegeName: plan.collegeName,
          collegeProvince: plan.collegeProvince || null,
          collegeCity: plan.collegeCity || null,
          collegeIs985: plan.collegeIs985 || false,
          collegeIs211: plan.collegeIs211 || false,
          collegeIsWorldClass: plan.collegeIsWorldClass || false,
          majorGroupCode: plan.majorGroupCode || null,
          majorGroupName: plan.majorGroupName || null,
          majorCode: plan.majorCode,
          majorName: plan.majorName,
          planCount: plan.planCount,
          studyYears: plan.studyYears || null,
          tuition: plan.tuition || null,
          subjectRequirements: plan.subjectRequirements || null,
          majorRemarks: plan.majorRemarks || null,
          admitProbability,
          scoreGap,
          rankGap,
          historicalScores: historicalScores.map(hs => ({
            year: hs.as_year,
            minScore: hs.as_minScore,
            minRank: hs.as_minRank
          }))
        };
      })
    );

    // 6. 根据分数范围和往年录取情况筛选
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

    console.log(`✅ 经过分数筛选后，剩余${filteredPlans.length}条结果`);

    // 7. 对结果排序：985/211院校优先，然后按院校名、专业名排序
    const sortedPlans = filteredPlans.sort((a, b) => {
      // 先按985/211排序
      const a985211 = (a.collegeIs985 ? 2 : 0) + (a.collegeIs211 ? 1 : 0);
      const b985211 = (b.collegeIs985 ? 2 : 0) + (b.collegeIs211 ? 1 : 0);

      if (a985211 !== b985211) {
        return b985211 - a985211; // 985/211排在前面
      }

      // 再按院校名排序
      if (a.collegeName !== b.collegeName) {
        return a.collegeName.localeCompare(b.collegeName, 'zh-CN');
      }

      // 最后按专业名排序
      return a.majorName.localeCompare(b.majorName, 'zh-CN');
    });

    // 8. 应用分页
    const total = sortedPlans.length;
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPlans = sortedPlans.slice(startIndex, endIndex);

    console.log(`📄 分页结果：第${pageNum}页，返回${paginatedPlans.length}条记录`);

    return {
      list: paginatedPlans,
      userRank,
      ...calculatePagination(total, pageNum, pageSize)
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
