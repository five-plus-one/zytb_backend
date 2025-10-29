import { AppDataSource } from '../config/database';
import { ScoreRanking } from '../models/ScoreRanking';

export interface EquivalentScoreQueryDto {
  currentYear: number;        // 当前年份（如2025）
  province: string;           // 省份
  subjectType: string;        // 科类
  score: number;              // 当前分数
  compareYears?: number[];    // 对比年份（默认查询往年所有）
}

export interface EquivalentScoreResult {
  currentYear: number;
  currentScore: number;
  currentRank: number | null;
  province: string;
  subjectType: string;
  equivalentScores: Array<{
    year: number;
    score: number;
    rank: number | null;
    scoreDiff: number;        // 与当前分数的差值
  }>;
}

export class EquivalentScoreService {
  private rankingRepository = AppDataSource.getRepository(ScoreRanking);

  /**
   * 查询等位分
   * 原理：根据当前年份的分数查出对应位次，然后查询往年相同位次对应的分数
   */
  async getEquivalentScores(query: EquivalentScoreQueryDto): Promise<EquivalentScoreResult> {
    const { currentYear, province, subjectType, score, compareYears } = query;

    // 1. 查询当前年份的分数对应的位次
    const currentRanking = await this.rankingRepository
      .createQueryBuilder('sr')
      .where('sr.year = :year', { year: currentYear })
      .andWhere('sr.province = :province', { province })
      .andWhere('sr.subjectType = :subjectType', { subjectType })
      .andWhere('sr.score <= :score', { score })
      .orderBy('sr.score', 'DESC')
      .limit(1)
      .getOne();

    if (!currentRanking) {
      throw new Error(`未找到${currentYear}年${province}${subjectType}的分数数据`);
    }

    const currentRank = currentRanking.rank || currentRanking.cumulativeCount;

    // 2. 查询所有可用年份（排除当前年份）
    let targetYears: number[];
    if (compareYears && compareYears.length > 0) {
      targetYears = compareYears;
    } else {
      const yearsResult = await this.rankingRepository
        .createQueryBuilder('sr')
        .select('DISTINCT sr.year', 'year')
        .where('sr.province = :province', { province })
        .andWhere('sr.subjectType = :subjectType', { subjectType })
        .andWhere('sr.year < :currentYear', { currentYear })
        .orderBy('sr.year', 'DESC')
        .getRawMany();

      targetYears = yearsResult.map(r => r.year);
    }

    // 3. 查询往年相同位次对应的分数
    const equivalentScores: Array<{
      year: number;
      score: number;
      rank: number | null;
      scoreDiff: number;
    }> = [];

    for (const year of targetYears) {
      // 查找最接近该位次的分数
      const historicalRanking = await this.rankingRepository
        .createQueryBuilder('sr')
        .where('sr.year = :year', { year })
        .andWhere('sr.province = :province', { province })
        .andWhere('sr.subjectType = :subjectType', { subjectType })
        .andWhere(
          currentRanking.rank
            ? 'sr.rank <= :rank'
            : 'sr.cumulativeCount >= :rank',
          { rank: currentRank }
        )
        .orderBy(
          currentRanking.rank ? 'sr.rank' : 'sr.cumulativeCount',
          'ASC'
        )
        .limit(1)
        .getOne();

      if (historicalRanking) {
        equivalentScores.push({
          year,
          score: historicalRanking.score,
          rank: historicalRanking.rank || historicalRanking.cumulativeCount,
          scoreDiff: historicalRanking.score - score
        });
      }
    }

    // 4. 按年份倒序排序
    equivalentScores.sort((a, b) => b.year - a.year);

    return {
      currentYear,
      currentScore: score,
      currentRank,
      province,
      subjectType,
      equivalentScores
    };
  }

  /**
   * 批量查询等位分（用于查询多个分数）
   */
  async batchGetEquivalentScores(
    queries: EquivalentScoreQueryDto[]
  ): Promise<EquivalentScoreResult[]> {
    return Promise.all(queries.map(query => this.getEquivalentScores(query)));
  }
}
