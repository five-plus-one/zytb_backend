import { AppDataSource } from '../config/database';
import { ScoreRanking } from '../models/ScoreRanking';
import { validatePageParams, calculatePagination } from '../utils/validator';
import { Between } from 'typeorm';
import * as XLSX from 'xlsx';

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

  // Excel 导入功能
  async importFromExcel(filePath: string, options?: { clearExisting?: boolean }) {
    try {
      // 读取 Excel 文件
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 转换为 JSON 数据
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (rawData.length === 0) {
        throw new Error('Excel 文件中没有数据');
      }

      // 数据验证和转换
      const validData: Partial<ScoreRanking>[] = [];
      const errors: Array<{ row: number; error: string }> = [];

      rawData.forEach((row, index) => {
        const rowNum = index + 2; // Excel 行号（从2开始，1是表头）

        try {
          // 字段映射（支持中文列名和英文列名）
          let year = row['年份'] || row['year'];
          let province = row['省份'] || row['province'];
          let subjectType = row['科类'] || row['科目类型'] || row['科目'] || row['subjectType'];
          let score = row['分数'] || row['score'];
          const count = row['人数'] || row['count'];
          const cumulativeCount = row['累计人数'] || row['cumulativeCount'];
          const rank = row['位次'] || row['rank'];

          // 清理年份格式（去除"年"字）
          if (year && typeof year === 'string') {
            year = String(year).replace(/年/g, '').trim();
          }

          // 清理省份格式（去除"省"字，标准化）
          if (province && typeof province === 'string') {
            province = String(province).replace(/省/g, '').trim();
          }

          // 清理科目格式（标准化为科类）
          if (subjectType && typeof subjectType === 'string') {
            subjectType = String(subjectType).trim();
            // 标准化科目名称
            const subjectMap: Record<string, string> = {
              '物理': '物理类',
              '历史': '历史类',
              '理科': '理科',
              '文科': '文科',
              '综合': '综合'
            };
            subjectType = subjectMap[subjectType] || subjectType;
          }

          // 清理分数格式（处理"及以上"等文字）
          if (score && typeof score === 'string') {
            // 提取数字，去除"及以上"、"以下"等文字
            const scoreMatch = String(score).match(/\d+/);
            if (scoreMatch) {
              score = scoreMatch[0];
            }
          }

          // 验证必填字段
          if (!year || !province || !subjectType || score === undefined || count === undefined) {
            errors.push({
              row: rowNum,
              error: '缺少必填字段（年份、省份、科类、分数、人数）'
            });
            return;
          }

          // 数据类型转换和验证
          const yearNum = parseInt(year);
          const scoreNum = parseInt(score);
          const countNum = parseInt(count);
          const cumulativeCountNum = cumulativeCount ? parseInt(cumulativeCount) : 0;
          const rankNum = rank ? parseInt(rank) : undefined;

          if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
            errors.push({ row: rowNum, error: '年份格式错误或超出范围' });
            return;
          }

          if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 999) {
            errors.push({ row: rowNum, error: '分数格式错误或超出范围' });
            return;
          }

          if (isNaN(countNum) || countNum < 0) {
            errors.push({ row: rowNum, error: '人数格式错误' });
            return;
          }

          // 构建有效数据
          validData.push({
            year: yearNum,
            province: String(province).trim(),
            subjectType: String(subjectType).trim(),
            score: scoreNum,
            count: countNum,
            cumulativeCount: cumulativeCountNum,
            rank: rankNum
          });
        } catch (error: any) {
          errors.push({
            row: rowNum,
            error: `数据解析错误: ${error.message}`
          });
        }
      });

      // 如果有验证错误，返回错误信息
      if (errors.length > 0) {
        return {
          success: false,
          message: `数据验证失败，共 ${errors.length} 条错误`,
          totalRows: rawData.length,
          validRows: validData.length,
          errorRows: errors.length,
          errors: errors.slice(0, 100) // 最多返回前100个错误
        };
      }

      // 如果选择清空已有数据
      if (options?.clearExisting && validData.length > 0) {
        const firstRecord = validData[0];
        await this.rankingRepository.delete({
          year: firstRecord.year,
          province: firstRecord.province,
          subjectType: firstRecord.subjectType
        });
      }

      // 批量插入数据
      const result = await this.batchCreate(validData);

      return {
        success: true,
        message: '导入成功',
        totalRows: rawData.length,
        validRows: validData.length,
        insertedRows: result.insertedCount,
        errorRows: 0,
        errors: []
      };
    } catch (error: any) {
      throw new Error(`Excel 导入失败: ${error.message}`);
    }
  }

  // 批量创建记录
  async batchCreate(data: Partial<ScoreRanking>[]) {
    if (data.length === 0) {
      return { insertedCount: 0 };
    }

    // 使用事务批量插入
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 分批插入（每次1000条）
      const batchSize = 1000;
      let insertedCount = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await queryRunner.manager.save(ScoreRanking, batch);
        insertedCount += batch.length;
      }

      await queryRunner.commitTransaction();

      return { insertedCount };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 清空指定条件的数据
  async clearData(year?: number, province?: string, subjectType?: string) {
    const where: any = {};

    if (year) where.year = year;
    if (province) where.province = province;
    if (subjectType) where.subjectType = subjectType;

    const result = await this.rankingRepository.delete(where);

    return {
      success: true,
      deletedCount: result.affected || 0,
      message: `已删除 ${result.affected || 0} 条记录`
    };
  }
}
