import { Request, Response } from 'express';
import { EnrollmentPlanDetailService } from '../services/enrollmentPlanDetail.service';
import { ResponseUtil } from '../utils/response';

const enrollmentPlanDetailService = new EnrollmentPlanDetailService();

export class EnrollmentPlanDetailController {
  /**
   * 查询招生计划详情
   * GET /enrollment-plan-detail
   */
  async getEnrollmentPlanDetails(req: Request, res: Response) {
    try {
      const query = req.query as any;

      const { year, sourceProvince, subjectType } = query;
      if (!year || !sourceProvince || !subjectType) {
        return ResponseUtil.badRequest(
          res,
          '缺少必填参数：year（年份）、sourceProvince（生源地）、subjectType（科类）'
        );
      }

      const detailQuery = {
        year: parseInt(year),
        sourceProvince,
        subjectType,
        collegeName: query.collegeName,
        collegeCode: query.collegeCode,
        majorGroupCode: query.majorGroupCode,
        batch: query.batch,
        includeHistoricalScores: query.includeHistoricalScores !== 'false',
        historicalYears: query.historicalYears
          ? parseInt(query.historicalYears)
          : undefined,
        pageNum: query.pageNum ? parseInt(query.pageNum) : undefined,
        pageSize: query.pageSize ? parseInt(query.pageSize) : undefined
      };

      const result = await enrollmentPlanDetailService.getEnrollmentPlanDetails(
        detailQuery
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 按院校分组查询招生计划
   * GET /enrollment-plan-detail/by-college
   */
  async getEnrollmentPlansByCollege(req: Request, res: Response) {
    try {
      const { year, sourceProvince, subjectType, collegeCode, collegeName } =
        req.query as any;

      if (!year || !sourceProvince || !subjectType) {
        return ResponseUtil.badRequest(
          res,
          '缺少必填参数：year（年份）、sourceProvince（生源地）、subjectType（科类）'
        );
      }

      const result =
        await enrollmentPlanDetailService.getEnrollmentPlansByCollege(
          parseInt(year),
          sourceProvince,
          subjectType,
          collegeCode,
          collegeName
        );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取院校历史录取分数统计
   * GET /enrollment-plan-detail/college-stats
   */
  async getCollegeHistoricalScoreStats(req: Request, res: Response) {
    try {
      const { collegeName, sourceProvince, subjectType, years } =
        req.query as any;

      if (!collegeName || !sourceProvince || !subjectType) {
        return ResponseUtil.badRequest(
          res,
          '缺少必填参数：collegeName（院校名称）、sourceProvince（生源地）、subjectType（科类）'
        );
      }

      const result =
        await enrollmentPlanDetailService.getCollegeHistoricalScoreStats(
          collegeName,
          sourceProvince,
          subjectType,
          years ? parseInt(years) : undefined
        );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
