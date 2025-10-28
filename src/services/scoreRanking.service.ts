import { AppDataSource } from '../config/database';
import { ScoreRanking } from '../models/ScoreRanking';
import { validatePageParams, calculatePagination } from '../utils/validator';
import { Between } from 'typeorm';

export interface ScoreRankingQueryDto {
  pageNum?: number;
  pageSize?: number;
  year?: number;
  province?: string;
  subjectType?: string;
  scoreMin?: number;
  scoreMax?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ScoreRankingService {
  private rankingRepository = AppDataSource.getRepository(ScoreRanking);

  // 获取一分一段列表
  async getScoreRankingList(query: ScoreRankingQueryDto) {
    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);

    // 构建查询条件
    const where: any = {};

    if (query.year) {
      where.year = query.year;
    }

    if (query.province) {
      where.province = query.province;
    }

    if (query.subjectType) {
      where.subjectType = query.subjectType;
    }

    // 分数范围筛选
    if (query.scoreMin !== undefined || query.scoreMax !== undefined) {
      const min = query.scoreMin || 0;
      const max = query.scoreMax || 999;
      where.score = Between(min, max);
    }

    // 排序
    const orderField = query.sortField || 'score';
    const orderDirection = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const [list, total] = await this.rankingRepository.findAndCount({
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

  // 根据分数查询位次
  async getRankByScore(year: number, province: string, subjectType: string, score: number) {
    const ranking = await this.rankingRepository.findOne({
      where: {
        year,
        province,
        subjectType,
        score
      }
    });

    if (!ranking) {
      // 如果没有精确匹配，查找最接近的分数
      const nearRanking = await this.rankingRepository
        .createQueryBuilder('ranking')
        .where('ranking.year = :year', { year })
        .andWhere('ranking.province = :province', { province })
        .andWhere('ranking.subjectType = :subjectType', { subjectType })
        .andWhere('ranking.score <= :score', { score })
        .orderBy('ranking.score', 'DESC')
        .limit(1)
        .getOne();

      return {
        score,
        exactMatch: false,
        nearestScore: nearRanking?.score,
        rank: nearRanking?.rank,
        cumulativeCount: nearRanking?.cumulativeCount,
        message: '未找到精确匹配，返回最接近的较低分数'
      };
    }

    return {
      score: ranking.score,
      exactMatch: true,
      count: ranking.count,
      cumulativeCount: ranking.cumulativeCount,
      rank: ranking.rank
    };
  }

  // 根据位次查询分数
  async getScoreByRank(year: number, province: string, subjectType: string, rank: number) {
    // 查找累计人数最接近该位次的记录
    const ranking = await this.rankingRepository
      .createQueryBuilder('ranking')
      .where('ranking.year = :year', { year })
      .andWhere('ranking.province = :province', { province })
      .andWhere('ranking.subjectType = :subjectType', { subjectType })
      .andWhere('ranking.cumulativeCount >= :rank', { rank })
      .orderBy('ranking.cumulativeCount', 'ASC')
      .limit(1)
      .getOne();

    if (!ranking) {
      return {
        rank,
        message: '未找到对应的分数数据'
      };
    }

    return {
      rank,
      score: ranking.score,
      count: ranking.count,
      cumulativeCount: ranking.cumulativeCount
    };
  }

  // 获取分数段统计
  async getScoreDistribution(year: number, province: string, subjectType: string) {
    const rankings = await this.rankingRepository.find({
      where: {
        year,
        province,
        subjectType
      },
      order: { score: 'DESC' }
    });

    if (rankings.length === 0) {
      return {
        year,
        province,
        subjectType,
        totalCount: 0,
        distribution: [],
        message: '暂无数据'
      };
    }

    // 分数段统计
    const scoreRanges = [
      { range: '700+', min: 700, max: 999 },
      { range: '690-699', min: 690, max: 699 },
      { range: '680-689', min: 680, max: 689 },
      { range: '670-679', min: 670, max: 679 },
      { range: '660-669', min: 660, max: 669 },
      { range: '650-659', min: 650, max: 659 },
      { range: '640-649', min: 640, max: 649 },
      { range: '630-639', min: 630, max: 639 },
      { range: '620-629', min: 620, max: 629 },
      { range: '610-619', min: 610, max: 619 },
      { range: '600-609', min: 600, max: 609 },
      { range: '590-599', min: 590, max: 599 },
      { range: '580-589', min: 580, max: 589 },
      { range: '570-579', min: 570, max: 579 },
      { range: '560-569', min: 560, max: 569 },
      { range: '550-559', min: 550, max: 559 },
      { range: '540-549', min: 540, max: 549 },
      { range: '530-539', min: 530, max: 539 },
      { range: '520-529', min: 520, max: 529 },
      { range: '510-519', min: 510, max: 519 },
      { range: '500-509', min: 500, max: 509 },
      { range: '500以下', min: 0, max: 499 }
    ];

    const distribution = scoreRanges.map(range => {
      const rangeData = rankings.filter(r => r.score >= range.min && r.score <= range.max);
      const totalCount = rangeData.reduce((sum, r) => sum + r.count, 0);
      return {
        ...range,
        count: totalCount
      };
    }).filter(d => d.count > 0);

    const totalCount = rankings[0].cumulativeCount;

    return {
      year,
      province,
      subjectType,
      totalCount,
      maxScore: rankings[0].score,
      minScore: rankings[rankings.length - 1].score,
      distribution
    };
  }

  // 获取可用的年份列表
  async getAvailableYears(province?: string) {
    const queryBuilder = this.rankingRepository.createQueryBuilder('ranking');
    queryBuilder.select('DISTINCT ranking.year', 'year');

    if (province) {
      queryBuilder.where('ranking.province = :province', { province });
    }

    queryBuilder.orderBy('ranking.year', 'DESC');

    const results = await queryBuilder.getRawMany();
    return results.map(r => r.year);
  }

  // 获取可用的省份列表
  async getAvailableProvinces(year?: number) {
    const queryBuilder = this.rankingRepository.createQueryBuilder('ranking');
    queryBuilder.select('DISTINCT ranking.province', 'province');

    if (year) {
      queryBuilder.where('ranking.year = :year', { year });
    }

    queryBuilder.orderBy('ranking.province', 'ASC');

    const results = await queryBuilder.getRawMany();
    return results.map(r => r.province);
  }

  // 批量查询多个分数的位次
  async batchGetRankByScores(year: number, province: string, subjectType: string, scores: number[]) {
    const results = await Promise.all(
      scores.map(score => this.getRankByScore(year, province, subjectType, score))
    );

    return {
      year,
      province,
      subjectType,
      results
    };
  }
}
