import { AppDataSource } from '../config/database';
import { CoreEnrollmentPlan } from '../models/core/CoreEnrollmentPlan';
import { CoreAdmissionScore } from '../models/core/CoreAdmissionScore';
import { ScoreRanking } from '../models/ScoreRanking';
import { CoreCollege } from '../models/core/CoreCollege';
import { validatePageParams, calculatePagination } from '../utils/validator';

/**
 * 院校匹配查询参数
 */
export interface CollegeMatchQueryDto {
  year: number;
  sourceProvince: string;
  subjectType: string;
  score: number;
  scoreRange?: number;
  collegeProvince?: string;  // 省内/省外筛选
  collegeLevel?: string;     // 985/211/双一流
  admitProbability?: string; // 冲/稳/保
  pageNum?: number;
  pageSize?: number;
}

/**
 * 院校匹配结果
 */
export interface CollegeMatchResult {
  collegeCode: string;
  collegeName: string;
  collegeProvince: string | null;
  collegeCity: string | null;
  collegeIs985: boolean;
  collegeIs211: boolean;
  collegeIsWorldClass: boolean;

  // 匹配信息
  matchInfo: {
    totalMajorGroups: number;      // 符合条件的专业组数量
    totalMajors: number;            // 符合条件的专业数量
    totalPlanCount: number;         // 总招生计划数
    admitProbability: string;       // 录取概率: 冲/稳/保
    minHistoricalScore: number | null; // 最近一年最低分
    maxHistoricalScore: number | null; // 最近一年最高分
    avgHistoricalScore: number | null; // 最近一年平均分
    minHistoricalRank: number | null;  // 最近一年最低位次
    scoreGap: number;               // 用户分数与历史最低分的差距
    rankGap: number | null;         // 用户位次与历史最低位次的差距
  };

  // 前3个专业组简要信息
  topMajorGroups: Array<{
    groupCode: string | null;
    groupName: string | null;
    majorCount: number;
    planCount: number;
  }>;
}

/**
 * 院校匹配详情
 */
export interface CollegeMatchDetail {
  // 基本信息
  collegeInfo: {
    code: string;
    name: string;
    province: string | null;
    city: string | null;
    is985: boolean;
    is211: boolean;
    isWorldClass: boolean;
    type: string | null;
    level: string | null;
    rank: number | null;
    description: string | null;
    website: string | null;
    phone: string | null;
  };

  // 匹配分析
  matchAnalysis: {
    admitProbability: string;
    confidence: number;  // 置信度 0-1
    recommendedStrategy: string;
    scoreComparison: {
      userScore: number;
      userRank: number | null;
      historicalData: Array<{
        year: number;
        minScore: number | null;
        avgScore: number | null;
        maxScore: number | null;
        minRank: number | null;
        scoreGap: number | null;
        rankGap: number | null;
      }>;
    };
  };

  // 专业组信息
  majorGroups: Array<{
    groupCode: string | null;
    groupName: string | null;
    totalMajors: number;
    totalPlanCount: number;
    subjectRequirements: string | null;
    historicalScores: Array<{
      year: number;
      minScore: number | null;
      minRank: number | null;
    }>;
    majors: Array<{
      majorCode: string;
      majorName: string;
      planCount: number;
      tuition: number | null;
      studyYears: number | null;
      subjectRequirements: string | null;
    }>;
  }>;
}

/**
 * 院校匹配服务
 */
export class CollegeMatchService {
  private enrollmentPlanRepository = AppDataSource.getRepository(CoreEnrollmentPlan);
  private admissionScoreRepository = AppDataSource.getRepository(CoreAdmissionScore);
  private scoreRankingRepository = AppDataSource.getRepository(ScoreRanking);
  private collegeRepository = AppDataSource.getRepository(CoreCollege);

  /**
   * 查询适合的院校(院校级聚合)
   */
  async querySuitableColleges(query: CollegeMatchQueryDto) {
    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);
    const {
      year,
      sourceProvince,
      subjectType,
      score,
      scoreRange = 50,
      collegeProvince,
      collegeLevel,
      admitProbability
    } = query;

    // 1. 获取用户位次
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

    // 2. 查询符合条件的院校
    let collegeNamesInProvince: string[] | null = null;
    if (collegeProvince) {
      const colleges = await this.collegeRepository
        .createQueryBuilder('c')
        .select('c.name')
        .where('c.province = :province', { province: collegeProvince })
        .getMany();
      collegeNamesInProvince = colleges.map(c => c.name);
    }

    // 3. 构建查询:获取符合分数范围的所有招生计划
    const queryBuilder = this.enrollmentPlanRepository
      .createQueryBuilder('ep')
      .where('ep.year = :year', { year })
      .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('ep.subjectType = :subjectType', { subjectType });

    if (collegeNamesInProvince) {
      queryBuilder.andWhere('ep.collegeName IN (:...collegeNames)', { collegeNames: collegeNamesInProvince });
    }

    // 按院校层次筛选
    if (collegeLevel) {
      if (collegeLevel === '985') {
        queryBuilder.andWhere('ep.collegeIs985 = true');
      } else if (collegeLevel === '211') {
        queryBuilder.andWhere('ep.collegeIs211 = true');
      } else if (collegeLevel === '双一流') {
        queryBuilder.andWhere('ep.collegeIsWorldClass = true');
      }
    }

    const allPlans = await queryBuilder.getMany();

    // 4. 获取所有院校的历史录取分数
    const collegeScoreMap = new Map<string, any[]>();
    const uniqueColleges = [...new Set(allPlans.map(p => p.collegeName))];

    for (const collegeName of uniqueColleges) {
      const scores = await this.admissionScoreRepository
        .createQueryBuilder('as')
        .where('as.collegeName = :collegeName', { collegeName })
        .andWhere('as.sourceProvince = :sourceProvince', { sourceProvince })
        .andWhere('as.subjectType = :subjectType', { subjectType })
        .andWhere('as.year < :year', { year })
        .orderBy('as.year', 'DESC')
        .limit(3)
        .getMany();

      collegeScoreMap.set(collegeName, scores);
    }

    // 5. 按院校聚合数据
    const collegeMap = new Map<string, CollegeMatchResult>();

    for (const plan of allPlans) {
      const key = plan.collegeCode || "";

      if (!collegeMap.has(key)) {
        const historicalScores = collegeScoreMap.get(plan.collegeName) || [];
        const latestScore = historicalScores[0];

        // 计算录取概率
        let probability = '未知';
        let scoreGap = 0;
        let rankGap: number | null = null;

        if (latestScore) {
          scoreGap = latestScore.minScore ? score - latestScore.minScore : 0;
          rankGap = (latestScore.minRank && userRank) ? userRank - latestScore.minRank : null;

          // 判断冲稳保
          if (scoreGap < -10) {
            probability = '冲';
          } else if (scoreGap >= -10 && scoreGap <= 10) {
            probability = '稳';
          } else {
            probability = '保';
          }
        }

        collegeMap.set(key, {
          collegeCode: plan.collegeCode || "",
          collegeName: plan.collegeName,
          collegeProvince: plan.collegeProvince || null,
          collegeCity: plan.collegeCity || null,
          collegeIs985: plan.collegeIs985,
          collegeIs211: plan.collegeIs211,
          collegeIsWorldClass: plan.collegeIsWorldClass,
          matchInfo: {
            totalMajorGroups: 0,
            totalMajors: 0,
            totalPlanCount: 0,
            admitProbability: probability,
            minHistoricalScore: latestScore?.minScore || null,
            maxHistoricalScore: null,  // AdmissionScore没有maxScore字段
            avgHistoricalScore: null,  // AdmissionScore没有avgScore字段
            minHistoricalRank: latestScore?.minRank || null,
            scoreGap,
            rankGap
          },
          topMajorGroups: []
        });
      }

      const college = collegeMap.get(key)!;
      college.matchInfo.totalMajors++;
      college.matchInfo.totalPlanCount += plan.planCount;
    }

    // 6. 统计专业组数量和获取前3个专业组
    for (const [collegeCode, college] of collegeMap.entries()) {
      const groups = allPlans
        .filter(p => p.collegeCode === collegeCode)
        .reduce((acc, plan) => {
          const groupKey = plan.majorGroupCode || 'default';
          if (!acc.has(groupKey)) {
            acc.set(groupKey, {
              groupCode: plan.majorGroupCode,
              groupName: plan.majorGroupName,
              majorCount: 0,
              planCount: 0
            });
          }
          const group = acc.get(groupKey)!;
          group.majorCount++;
          group.planCount += plan.planCount;
          return acc;
        }, new Map());

      college.matchInfo.totalMajorGroups = groups.size;
      college.topMajorGroups = Array.from(groups.values()).slice(0, 3);
    }

    // 7. 转换为数组并按冲稳保筛选
    let colleges = Array.from(collegeMap.values());

    if (admitProbability) {
      colleges = colleges.filter(c => c.matchInfo.admitProbability === admitProbability);
    }

    // 8. 排序: 985/211优先,然后按scoreGap排序
    colleges.sort((a, b) => {
      const aPriority = (a.collegeIs985 ? 4 : 0) + (a.collegeIs211 ? 2 : 0) + (a.collegeIsWorldClass ? 1 : 0);
      const bPriority = (b.collegeIs985 ? 4 : 0) + (b.collegeIs211 ? 2 : 0) + (b.collegeIsWorldClass ? 1 : 0);

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return Math.abs(a.matchInfo.scoreGap) - Math.abs(b.matchInfo.scoreGap);
    });

    // 9. 计算汇总统计
    const summary = {
      total: colleges.length,
      by985211: {
        冲: colleges.filter(c => c.matchInfo.admitProbability === '冲' && (c.collegeIs985 || c.collegeIs211)).length,
        稳: colleges.filter(c => c.matchInfo.admitProbability === '稳' && (c.collegeIs985 || c.collegeIs211)).length,
        保: colleges.filter(c => c.matchInfo.admitProbability === '保' && (c.collegeIs985 || c.collegeIs211)).length
      },
      byProvince: {
        省内: colleges.filter(c => c.collegeProvince === sourceProvince).length,
        省外: colleges.filter(c => c.collegeProvince !== sourceProvince).length
      },
      byProbability: {
        冲: colleges.filter(c => c.matchInfo.admitProbability === '冲').length,
        稳: colleges.filter(c => c.matchInfo.admitProbability === '稳').length,
        保: colleges.filter(c => c.matchInfo.admitProbability === '保').length
      }
    };

    // 10. 分页
    const total = colleges.length;
    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedColleges = colleges.slice(startIndex, endIndex);

    return {
      colleges: paginatedColleges,
      summary,
      userRank,
      ...calculatePagination(total, pageNum, pageSize)
    };
  }

  /**
   * 获取院校匹配详情
   */
  async getCollegeMatchDetail(params: {
    year: number;
    sourceProvince: string;
    subjectType: string;
    score: number;
    collegeCode?: string;
    collegeName?: string;
  }): Promise<CollegeMatchDetail> {
    const { year, sourceProvince, subjectType, score, collegeCode, collegeName } = params;

    if (!collegeCode && !collegeName) {
      throw new Error('必须提供collegeCode或collegeName');
    }

    // 1. 获取用户位次
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

    // 2. 查询院校信息
    let college: CoreCollege | null;
    if (collegeCode) {
      college = await this.collegeRepository.findOne({ where: { code: collegeCode } });
    } else {
      college = await this.collegeRepository
        .createQueryBuilder('c')
        .where('c.name LIKE :name', { name: `%${collegeName}%` })
        .getOne();
    }

    if (!college) {
      throw new Error('院校不存在');
    }

    // 3. 查询该院校的所有招生计划
    const plans = await this.enrollmentPlanRepository
      .createQueryBuilder('ep')
      .where('ep.year = :year', { year })
      .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('ep.subjectType = :subjectType', { subjectType })
      .andWhere('ep.collegeName = :collegeName', { collegeName: college.name })
      .getMany();

    // 4. 查询历史录取分数
    const historicalScores = await this.admissionScoreRepository
      .createQueryBuilder('as')
      .where('as.collegeName = :collegeName', { collegeName: college.name })
      .andWhere('as.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('as.subjectType = :subjectType', { subjectType })
      .andWhere('as.year < :year', { year })
      .orderBy('as.year', 'DESC')
      .limit(5)
      .getMany();

    // 5. 计算匹配分析
    const latestScore = historicalScores[0];
    let admitProbability = '未知';
    let confidence = 0;
    let recommendedStrategy = '';

    if (latestScore && latestScore.minScore) {
      const scoreGap = score - latestScore.minScore;

      if (scoreGap < -15) {
        admitProbability = '冲';
        confidence = 0.2;
        recommendedStrategy = '该校录取分数较高,建议作为冲刺院校,注意专业选择权可能有限';
      } else if (scoreGap >= -15 && scoreGap < -5) {
        admitProbability = '冲';
        confidence = 0.4;
        recommendedStrategy = '有一定录取可能性,可作为冲刺院校考虑';
      } else if (scoreGap >= -5 && scoreGap <= 10) {
        admitProbability = '稳';
        confidence = 0.75;
        recommendedStrategy = '录取概率较高,建议作为稳妥选择,注意专业组内梯度';
      } else {
        admitProbability = '保';
        confidence = 0.9;
        recommendedStrategy = '录取把握很大,可作为保底选择,可以大胆选择心仪专业';
      }
    }

    // 6. 按专业组聚合
    const groupMap = new Map<string, any>();

    for (const plan of plans) {
      const groupKey = plan.majorGroupCode || 'default';

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupCode: plan.majorGroupCode,
          groupName: plan.majorGroupName,
          totalMajors: 0,
          totalPlanCount: 0,
          subjectRequirements: plan.subjectRequirements,
          historicalScores: [], // 暂时为空,可以后续添加专业组级别的历史分数
          majors: []
        });
      }

      const group = groupMap.get(groupKey)!;
      group.totalMajors++;
      group.totalPlanCount += plan.planCount;
      group.majors.push({
        majorCode: plan.majorCode,
        majorName: plan.majorName,
        planCount: plan.planCount,
        tuition: plan.tuition,
        studyYears: plan.studyYears,
        subjectRequirements: plan.subjectRequirements
      });
    }

    return {
      collegeInfo: {
        code: college.code || '',
        name: college.name,
        province: college.province || null,
        city: college.city || null,
        is985: college.is985,
        is211: college.is211,
        isWorldClass: college.isWorldClass,
        type: college.type || null,
        level: college.level || null,
        rank: college.rank || null,
        description: college.description || null,
        website: college.website || null,
        phone: college.admissionPhone || college.phone || null
      },
      matchAnalysis: {
        admitProbability,
        confidence,
        recommendedStrategy,
        scoreComparison: {
          userScore: score,
          userRank,
          historicalData: historicalScores.map(hs => ({
            year: hs.year,
            minScore: hs.minScore || null,
            avgScore: null,  // AdmissionScore没有avgScore字段
            maxScore: null,  // AdmissionScore没有maxScore字段
            minRank: hs.minRank || null,
            scoreGap: hs.minScore ? score - hs.minScore : null,
            rankGap: (hs.minRank && userRank) ? userRank - hs.minRank : null
          }))
        }
      },
      majorGroups: Array.from(groupMap.values())
    };
  }
}
