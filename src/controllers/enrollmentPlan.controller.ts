import { Request, Response } from 'express';
import { EnrollmentPlanService } from '../services/enrollmentPlan.service';
import { ResponseUtil } from '../utils/response';

const enrollmentPlanService = new EnrollmentPlanService();

export class EnrollmentPlanController {
  // 获取招生计划列表
  async getEnrollmentPlanList(req: Request, res: Response) {
    try {
      const query = req.query as any;
      const result = await enrollmentPlanService.getEnrollmentPlanList(query);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取招生计划详情
  async getEnrollmentPlanDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await enrollmentPlanService.getEnrollmentPlanDetail(id);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 按院校获取招生计划
  async getPlansByCollege(req: Request, res: Response) {
    try {
      const { collegeCode } = req.params;
      const { year, sourceProvince } = req.query as any;

      const result = await enrollmentPlanService.getPlansByCollege(
        collegeCode,
        year ? parseInt(year) : undefined,
        sourceProvince
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 按专业获取招生计划
  async getPlansByMajor(req: Request, res: Response) {
    try {
      const { majorCode } = req.params;
      const { year, sourceProvince } = req.query as any;

      const result = await enrollmentPlanService.getPlansByMajor(
        majorCode,
        year ? parseInt(year) : undefined,
        sourceProvince
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取招生计划统计信息
  async getEnrollmentStatistics(req: Request, res: Response) {
    try {
      const { year, sourceProvince } = req.query as any;

      if (!year || !sourceProvince) {
        return ResponseUtil.badRequest(res, '年份和生源地参数必填');
      }

      const result = await enrollmentPlanService.getEnrollmentStatistics(
        parseInt(year),
        sourceProvince
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取可用的年份列表
  async getAvailableYears(req: Request, res: Response) {
    try {
      const result = await enrollmentPlanService.getAvailableYears();
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取可用的生源地列表
  async getAvailableProvinces(req: Request, res: Response) {
    try {
      const { year } = req.query as any;
      const result = await enrollmentPlanService.getAvailableProvinces(
        year ? parseInt(year) : undefined
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
