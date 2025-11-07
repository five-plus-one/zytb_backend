import { AppDataSource } from '../config/database';
import { CoreAdmissionScore } from '../models/core/CoreAdmissionScore';
import { CoreCollege } from '../models/core/CoreCollege';
import { validatePageParams, calculatePagination } from '../utils/validator';
import { Like, Between } from 'typeorm';

export interface AdmissionScoreQueryDto {
  pageNum?: number;
  pageSize?: number;
  year?: number;
  sourceProvince?: string;
  collegeName?: string;
  majorName?: string;
  subjectType?: string;
  batch?: string;
  minScoreMin?: number;
  minScoreMax?: number;
  minRankMin?: number;
  minRankMax?: number;
  keyword?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AdmissionScoreService {
  private scoreRepository = AppDataSource.getRepository(CoreAdmissionScore);
  private collegeRepository = AppDataSource.getRepository(CoreCollege);

  // 获取录取分数线列表
  async getAdmissionScoreList(query: AdmissionScoreQueryDto) {
    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);

    // 构建查询条件
    const where: any = {};

    if (query.year) {
      where.year = query.year;
    }

    if (query.sourceProvince) {
      where.sourceProvince = query.sourceProvince;
    }

    if (query.collegeName) {
      where.collegeName = Like(`%${query.collegeName}%`);
    }

    if (query.majorName) {
      where.majorName = Like(`%${query.majorName}%`);
    }

    if (query.subjectType) {
      where.subjectType = query.subjectType;
    }

    if (query.batch) {
      where.batch = query.batch;
    }

    // 分数范围筛选
    if (query.minScoreMin !== undefined || query.minScoreMax !== undefined) {
      const min = query.minScoreMin || 0;
      const max = query.minScoreMax || 999;
      where.minScore = Between(min, max);
    }

    // 位次范围筛选
    if (query.minRankMin !== undefined || query.minRankMax !== undefined) {
      const min = query.minRankMin || 0;
      const max = query.minRankMax || 999999;
      where.minRank = Between(min, max);
    }

    // 关键词搜索（搜索院校名称或专业名称）
    if (query.keyword) {
      const queryBuilder = this.scoreRepository.createQueryBuilder('score');

      queryBuilder.where('(score.collegeName LIKE :keyword OR score.majorName LIKE :keyword)', {
        keyword: `%${query.keyword}%`
      });

      // 添加其他条件
      if (query.year) queryBuilder.andWhere('score.year = :year', { year: query.year });
      if (query.sourceProvince) queryBuilder.andWhere('score.sourceProvince = :sourceProvince', { sourceProvince: query.sourceProvince });
      if (query.subjectType) queryBuilder.andWhere('score.subjectType = :subjectType', { subjectType: query.subjectType });
      if (query.batch) queryBuilder.andWhere('score.batch = :batch', { batch: query.batch });

      const orderField = query.sortField || 'minScore';
      const orderDirection = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
      queryBuilder.orderBy(`score.${orderField}`, orderDirection);

      queryBuilder.skip((pageNum - 1) * pageSize);
      queryBuilder.take(pageSize);

      const [list, total] = await queryBuilder.getManyAndCount();

      return {
        list,
        ...calculatePagination(total, pageNum, pageSize)
      };
    }

    // 排序
    const orderField = query.sortField || 'minScore';
    const orderDirection = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const [list, total] = await this.scoreRepository.findAndCount({
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

  // 获取录取分数线详情
  async getAdmissionScoreDetail(id: string) {
    const score = await this.scoreRepository.findOne({
      where: { id },
      relations: ['college']
    });

    if (!score) {
      throw new Error('录取分数线数据不存在');
    }

    return score;
  }

  // 按院校获取录取分数线
  async getScoresByCollege(collegeName: string, year?: number, sourceProvince?: string) {
    const where: any = { collegeName };

    if (year) {
      where.year = year;
    }

    if (sourceProvince) {
      where.sourceProvince = sourceProvince;
    }

    const scores = await this.scoreRepository.find({
      where,
      order: { year: 'DESC', minScore: 'DESC' }
    });

    // 统计信息
    const years = [...new Set(scores.map(s => s.year))].sort((a, b) => b - a);
    const majors = [...new Set(scores.map(s => s.majorName))];
    const avgScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + (s.minScore || 0), 0) / scores.filter(s => s.minScore).length
      : 0;
    const minScore = Math.min(...scores.map(s => s.minScore || Infinity));
    const maxScore = Math.max(...scores.map(s => s.minScore || 0));

    return {
      scores,
      statistics: {
        totalRecords: scores.length,
        years,
        majorCount: majors.length,
        avgScore: Math.round(avgScore),
        minScore: minScore === Infinity ? null : minScore,
        maxScore: maxScore === 0 ? null : maxScore
      }
    };
  }

  // 按专业获取录取分数线
  async getScoresByMajor(majorName: string, year?: number, sourceProvince?: string) {
    const where: any = { majorName: Like(`%${majorName}%`) };

    if (year) {
      where.year = year;
    }

    if (sourceProvince) {
      where.sourceProvince = sourceProvince;
    }

    const scores = await this.scoreRepository.find({
      where,
      order: { year: 'DESC', minScore: 'DESC' }
    });

    // 统计信息
    const colleges = [...new Set(scores.map(s => s.collegeName))];
    const avgScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + (s.minScore || 0), 0) / scores.filter(s => s.minScore).length
      : 0;
    const minScore = Math.min(...scores.map(s => s.minScore || Infinity));
    const maxScore = Math.max(...scores.map(s => s.minScore || 0));

    return {
      scores,
      statistics: {
        totalRecords: scores.length,
        collegeCount: colleges.length,
        avgScore: Math.round(avgScore),
        minScore: minScore === Infinity ? null : minScore,
        maxScore: maxScore === 0 ? null : maxScore
      }
    };
  }

  // 获取历年分数线趋势（按院校和专业）
  async getScoreTrend(collegeName: string, majorName: string, sourceProvince: string, years = 5) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - years;

    const queryBuilder = this.scoreRepository.createQueryBuilder('score');

    queryBuilder
      .where('score.collegeName = :collegeName', { collegeName })
      .andWhere('score.majorName = :majorName', { majorName })
      .andWhere('score.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('score.year >= :startYear', { startYear })
      .orderBy('score.year', 'ASC');

    const scores = await queryBuilder.getMany();

    return {
      collegeName,
      majorName,
      sourceProvince,
      trend: scores.map(s => ({
        year: s.year,
        minScore: s.minScore,
        minRank: s.minRank,
        batch: s.batch
      }))
    };
  }

  // 获取分数线统计信息
  async getScoreStatistics(year: number, sourceProvince: string) {
    const queryBuilder = this.scoreRepository.createQueryBuilder('score');

    queryBuilder.where('score.year = :year AND score.sourceProvince = :sourceProvince', {
      year,
      sourceProvince
    });

    const scores = await queryBuilder.getMany();

    // 按院校统计
    const collegeStats = new Map<string, { count: number; avgScore: number; minScore: number; maxScore: number }>();
    scores.forEach(score => {
      const key = score.collegeName;
      if (!collegeStats.has(key)) {
        collegeStats.set(key, { count: 0, avgScore: 0, minScore: Infinity, maxScore: 0 });
      }
      const stats = collegeStats.get(key)!;
      stats.count++;
      if (score.minScore) {
        stats.avgScore += score.minScore;
        stats.minScore = Math.min(stats.minScore, score.minScore);
        stats.maxScore = Math.max(stats.maxScore, score.minScore);
      }
    });

    // 计算平均分
    collegeStats.forEach(stats => {
      stats.avgScore = Math.round(stats.avgScore / stats.count);
      if (stats.minScore === Infinity) stats.minScore = 0;
    });

    // 按科类统计
    const subjectStats = new Map<string, { count: number; avgScore: number }>();
    scores.forEach(score => {
      const key = score.subjectType;
      if (!subjectStats.has(key)) {
        subjectStats.set(key, { count: 0, avgScore: 0 });
      }
      const stats = subjectStats.get(key)!;
      stats.count++;
      if (score.minScore) {
        stats.avgScore += score.minScore;
      }
    });

    subjectStats.forEach(stats => {
      stats.avgScore = Math.round(stats.avgScore / stats.count);
    });

    // 分数段分布
    const scoreRanges = [
      { range: '700+', min: 700, max: 999, count: 0 },
      { range: '650-699', min: 650, max: 699, count: 0 },
      { range: '600-649', min: 600, max: 649, count: 0 },
      { range: '550-599', min: 550, max: 599, count: 0 },
      { range: '500-549', min: 500, max: 549, count: 0 },
      { range: '500以下', min: 0, max: 499, count: 0 }
    ];

    scores.forEach(score => {
      if (score.minScore) {
        const range = scoreRanges.find(r => score.minScore! >= r.min && score.minScore! <= r.max);
        if (range) range.count++;
      }
    });

    return {
      totalRecords: scores.length,
      byCollege: Array.from(collegeStats.entries()).map(([name, stats]) => ({
        collegeName: name,
        ...stats
      })).sort((a, b) => b.avgScore - a.avgScore).slice(0, 50), // 前50所院校
      bySubject: Array.from(subjectStats.entries()).map(([subjectType, stats]) => ({
        subjectType,
        ...stats
      })),
      scoreDistribution: scoreRanges
    };
  }

  // 获取可用的年份列表
  async getAvailableYears() {
    const queryBuilder = this.scoreRepository.createQueryBuilder('score');
    queryBuilder.select('DISTINCT score.year', 'year');
    queryBuilder.orderBy('score.year', 'DESC');

    const results = await queryBuilder.getRawMany();
    return results.map(r => r.year);
  }

  // 获取可用的生源地列表
  async getAvailableProvinces(year?: number) {
    const queryBuilder = this.scoreRepository.createQueryBuilder('score');
    queryBuilder.select('DISTINCT score.sourceProvince', 'province');

    if (year) {
      queryBuilder.where('score.year = :year', { year });
    }

    queryBuilder.orderBy('score.sourceProvince', 'ASC');

    const results = await queryBuilder.getRawMany();
    return results.map(r => r.province);
  }

  // 根据分数推荐院校和专业
  async recommendByScore(score: number, sourceProvince: string, subjectType: string, year?: number, range = 20) {
    const targetYear = year || new Date().getFullYear() - 1; // 默认使用去年数据

    const queryBuilder = this.scoreRepository.createQueryBuilder('score');

    queryBuilder
      .where('score.year = :year', { year: targetYear })
      .andWhere('score.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('score.subjectType = :subjectType', { subjectType })
      .andWhere('score.minScore BETWEEN :minScore AND :maxScore', {
        minScore: score - range,
        maxScore: score + range
      })
      .orderBy('ABS(score.minScore - :targetScore)', 'ASC')
      .setParameter('targetScore', score)
      .take(50);

    const recommendations = await queryBuilder.getMany();

    // 分类推荐
    const stable = recommendations.filter(r => r.minScore && r.minScore <= score - 5);
    const appropriate = recommendations.filter(r => r.minScore && r.minScore > score - 5 && r.minScore <= score + 5);
    const challenging = recommendations.filter(r => r.minScore && r.minScore > score + 5);

    return {
      score,
      sourceProvince,
      subjectType,
      year: targetYear,
      recommendations: {
        stable: stable.slice(0, 15),
        appropriate: appropriate.slice(0, 15),
        challenging: challenging.slice(0, 10)
      }
    };
  }
}
