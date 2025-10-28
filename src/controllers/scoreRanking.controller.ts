import { Request, Response } from 'express';
import { ScoreRankingService } from '../services/scoreRanking.service';
import { ResponseUtil } from '../utils/response';

const scoreRankingService = new ScoreRankingService();

export class ScoreRankingController {
  // 获取一分一段列表
  async getScoreRankingList(req: Request, res: Response) {
    try {
      const query = req.query as any;
      const result = await scoreRankingService.getScoreRankingList(query);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 根据分数查询位次
  async getRankByScore(req: Request, res: Response) {
    try {
      const { year, province, subjectType, score } = req.query as any;

      if (!year || !province || !subjectType || score === undefined) {
        return ResponseUtil.badRequest(res, '年份、省份、科类和分数参数必填');
      }

      const result = await scoreRankingService.getRankByScore(
        parseInt(year),
        province,
        subjectType,
        parseInt(score)
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 根据位次查询分数
  async getScoreByRank(req: Request, res: Response) {
    try {
      const { year, province, subjectType, rank } = req.query as any;

      if (!year || !province || !subjectType || !rank) {
        return ResponseUtil.badRequest(res, '年份、省份、科类和位次参数必填');
      }

      const result = await scoreRankingService.getScoreByRank(
        parseInt(year),
        province,
        subjectType,
        parseInt(rank)
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取分数段统计
  async getScoreDistribution(req: Request, res: Response) {
    try {
      const { year, province, subjectType } = req.query as any;

      if (!year || !province || !subjectType) {
        return ResponseUtil.badRequest(res, '年份、省份和科类参数必填');
      }

      const result = await scoreRankingService.getScoreDistribution(
        parseInt(year),
        province,
        subjectType
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取可用的年份列表
  async getAvailableYears(req: Request, res: Response) {
    try {
      const { province } = req.query as any;
      const result = await scoreRankingService.getAvailableYears(province);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取可用的省份列表
  async getAvailableProvinces(req: Request, res: Response) {
    try {
      const { year } = req.query as any;
      const result = await scoreRankingService.getAvailableProvinces(
        year ? parseInt(year) : undefined
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 批量查询多个分数的位次
  async batchGetRankByScores(req: Request, res: Response) {
    try {
      const { year, province, subjectType, scores } = req.body;

      if (!year || !province || !subjectType || !scores || !Array.isArray(scores)) {
        return ResponseUtil.badRequest(res, '年份、省份、科类和分数数组参数必填');
      }

      const result = await scoreRankingService.batchGetRankByScores(
        year,
        province,
        subjectType,
        scores
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
