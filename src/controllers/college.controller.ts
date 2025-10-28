import { Request, Response } from 'express';
import { CollegeService } from '../services/college.service';
import { ResponseUtil } from '../utils/response';

const collegeService = new CollegeService();

export class CollegeController {
  // 获取院校列表
  async getCollegeList(req: Request, res: Response) {
    try {
      const query = req.query as any;
      const result = await collegeService.getCollegeList(query);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取院校详情
  async getCollegeDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await collegeService.getCollegeDetail(id);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取院校招生计划
  async getCollegePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { year, province, subjectType } = req.query as any;
      const result = await collegeService.getCollegePlan(
        id,
        year ? parseInt(year) : undefined,
        province,
        subjectType
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取院校历年分数线
  async getCollegeScores(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { province, subjectType, years } = req.query as any;

      if (!province) {
        return ResponseUtil.badRequest(res, '省份参数必填');
      }

      const result = await collegeService.getCollegeScores(
        id,
        province,
        subjectType || 'physics',
        years ? parseInt(years) : 3
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 院校对比
  async compareColleges(req: Request, res: Response) {
    try {
      const { collegeIds } = req.body;

      if (!collegeIds || !Array.isArray(collegeIds)) {
        return ResponseUtil.badRequest(res, '请提供院校ID列表');
      }

      const result = await collegeService.compareColleges(collegeIds);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
