import { Request, Response } from 'express';
import { EquivalentScoreService } from '../services/equivalentScore.service';
import { ResponseUtil } from '../utils/response';

const equivalentScoreService = new EquivalentScoreService();

export class EquivalentScoreController {
  /**
   * 查询等位分
   * GET /equivalent-score
   */
  async getEquivalentScores(req: Request, res: Response) {
    try {
      const { currentYear, province, subjectType, score, compareYears } = req.query as any;

      // 参数验证
      if (!currentYear || !province || !subjectType || !score) {
        return ResponseUtil.badRequest(
          res,
          '缺少必填参数：currentYear（当前年份）、province（省份）、subjectType（科类）、score（分数）'
        );
      }

      const query = {
        currentYear: parseInt(currentYear),
        province,
        subjectType,
        score: parseInt(score),
        compareYears: compareYears
          ? compareYears.split(',').map((y: string) => parseInt(y))
          : undefined
      };

      const result = await equivalentScoreService.getEquivalentScores(query);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 批量查询等位分
   * POST /equivalent-score/batch
   */
  async batchGetEquivalentScores(req: Request, res: Response) {
    try {
      const { queries } = req.body;

      if (!queries || !Array.isArray(queries) || queries.length === 0) {
        return ResponseUtil.badRequest(res, 'queries 参数必须是非空数组');
      }

      const results = await equivalentScoreService.batchGetEquivalentScores(queries);
      ResponseUtil.success(res, results);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
