import { Request, Response } from 'express';
import { MajorFilterService } from '../services/majorFilter.service';
import { ResponseUtil } from '../utils/response';

const majorFilterService = new MajorFilterService();

export class MajorFilterController {
  /**
   * 筛选专业
   * GET /major-filter
   */
  async filterMajors(req: Request, res: Response) {
    try {
      const query = req.query as any;

      // 参数验证
      const { year, sourceProvince, subjectType, score } = query;
      if (!year || !sourceProvince || !subjectType || score === undefined) {
        return ResponseUtil.badRequest(
          res,
          '缺少必填参数：year（年份）、sourceProvince（生源地）、subjectType（科类）、score（分数）'
        );
      }

      const filterQuery = {
        year: parseInt(year),
        sourceProvince,
        subjectType,
        score: parseInt(score),
        scoreRange: query.scoreRange ? parseInt(query.scoreRange) : undefined,
        majorDirection: query.majorDirection,
        majorName: query.majorName,
        collegeName: query.collegeName,
        batch: query.batch,
        pageNum: query.pageNum ? parseInt(query.pageNum) : undefined,
        pageSize: query.pageSize ? parseInt(query.pageSize) : undefined
      };

      const result = await majorFilterService.filterMajors(filterQuery);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取可用的专业方向列表
   * GET /major-filter/directions
   */
  async getAvailableMajorDirections(req: Request, res: Response) {
    try {
      const { year, sourceProvince, subjectType } = req.query as any;

      if (!year || !sourceProvince || !subjectType) {
        return ResponseUtil.badRequest(
          res,
          '缺少必填参数：year（年份）、sourceProvince（生源地）、subjectType（科类）'
        );
      }

      const directions = await majorFilterService.getAvailableMajorDirections(
        parseInt(year),
        sourceProvince,
        subjectType
      );

      ResponseUtil.success(res, directions);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
