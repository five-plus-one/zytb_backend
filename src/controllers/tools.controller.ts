import { Request, Response } from 'express';
import { ToolsService } from '../services/agent/tools.service';
import { ResponseUtil } from '../utils/response';

/**
 * AI 工具 API 控制器
 * 提供各种查询工具供 AI 调用
 */

const toolsService = new ToolsService();

export class ToolsController {
  /**
   * 工具1: 搜索院校
   * GET /api/agent/tools/search-college
   */
  static async searchCollege(req: Request, res: Response): Promise<void> {
    try {
      const {
        keyword,
        province,
        type,
        is985,
        is211,
        isDoubleFirstClass,
        minRank,
        maxRank,
        limit
      } = req.query;

      const results = await toolsService.searchCollege({
        keyword: keyword as string,
        province: province as string,
        type: type as string,
        is985: is985 === 'true',
        is211: is211 === 'true',
        isDoubleFirstClass: isDoubleFirstClass === 'true',
        minRank: minRank ? parseInt(minRank as string) : undefined,
        maxRank: maxRank ? parseInt(maxRank as string) : undefined,
        limit: limit ? parseInt(limit as string) : 10
      });

      ResponseUtil.success(res, results);
    } catch (error: any) {
      console.error('Search college error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具2: 搜索专业
   * GET /api/agent/tools/search-major
   */
  static async searchMajor(req: Request, res: Response): Promise<void> {
    try {
      const { keyword, category, subCategory, degree, limit } = req.query;

      const results = await toolsService.searchMajor({
        keyword: keyword as string,
        category: category as string,
        subCategory: subCategory as string,
        degree: degree as string,
        limit: limit ? parseInt(limit as string) : 10
      });

      ResponseUtil.success(res, results);
    } catch (error: any) {
      console.error('Search major error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具3: 根据分数推荐院校
   * GET /api/agent/tools/recommend-colleges
   */
  static async recommendColleges(req: Request, res: Response): Promise<void> {
    try {
      const { score, province, subjectType, rank, limit } = req.query;

      if (!score || !province || !subjectType) {
        ResponseUtil.badRequest(res, 'score, province, subjectType are required');
        return;
      }

      const results = await toolsService.recommendCollegesByScore({
        score: parseInt(score as string),
        province: province as string,
        subjectType: subjectType as string,
        rank: rank ? parseInt(rank as string) : undefined,
        limit: limit ? parseInt(limit as string) : 20
      });

      ResponseUtil.success(res, results);
    } catch (error: any) {
      console.error('Recommend colleges error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具4: 查询历年录取分数线
   * GET /api/agent/tools/admission-scores
   */
  static async getAdmissionScores(req: Request, res: Response): Promise<void> {
    try {
      const { collegeId, collegeName, province, subjectType, years } = req.query;

      if (!province || !subjectType) {
        ResponseUtil.badRequest(res, 'province and subjectType are required');
        return;
      }

      if (!collegeId && !collegeName) {
        ResponseUtil.badRequest(res, 'collegeId or collegeName is required');
        return;
      }

      const results = await toolsService.getAdmissionScores({
        collegeId: collegeId as string,
        collegeName: collegeName as string,
        province: province as string,
        subjectType: subjectType as string,
        years: years ? parseInt(years as string) : 3
      });

      ResponseUtil.success(res, results);
    } catch (error: any) {
      console.error('Get admission scores error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具5: 查询分数对应排名
   * GET /api/agent/tools/score-rank
   */
  static async getScoreRank(req: Request, res: Response): Promise<void> {
    try {
      const { score, province, subjectType } = req.query;

      if (!score || !province || !subjectType) {
        ResponseUtil.badRequest(res, 'score, province, subjectType are required');
        return;
      }

      const result = await toolsService.getScoreRank(
        parseInt(score as string),
        province as string,
        subjectType as string
      );

      if (!result) {
        ResponseUtil.notFound(res, 'Score rank not found');
        return;
      }

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Get score rank error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具6: 查询城市信息
   * GET /api/agent/tools/city-info
   */
  static async getCityInfo(req: Request, res: Response): Promise<void> {
    try {
      const { city } = req.query;

      if (!city) {
        ResponseUtil.badRequest(res, 'city is required');
        return;
      }

      const result = await toolsService.getCityInfo(city as string);

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Get city info error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具7: 查询院校详细信息
   * GET /api/agent/tools/college-detail/:collegeId
   */
  static async getCollegeDetail(req: Request, res: Response): Promise<void> {
    try {
      const { collegeId } = req.params;

      const result = await toolsService.getCollegeDetail(collegeId);

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Get college detail error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具8: 查询专业详细信息
   * GET /api/agent/tools/major-detail/:majorId
   */
  static async getMajorDetail(req: Request, res: Response): Promise<void> {
    try {
      const { majorId } = req.params;

      const result = await toolsService.getMajorDetail(majorId);

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Get major detail error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具9: 获取用户志愿表
   * GET /api/agent/tools/volunteers
   */
  static async getUserVolunteers(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const results = await toolsService.getUserVolunteers(userId);

      ResponseUtil.success(res, results);
    } catch (error: any) {
      console.error('Get user volunteers error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具10: 删除志愿
   * DELETE /api/agent/tools/volunteers/:volunteerId
   */
  static async deleteVolunteer(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { volunteerId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      await toolsService.deleteVolunteer(userId, volunteerId);

      ResponseUtil.success(res, { message: 'Volunteer deleted successfully' });
    } catch (error: any) {
      console.error('Delete volunteer error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具11: 调整志愿顺序
   * PUT /api/agent/tools/volunteers/:volunteerId/order
   */
  static async reorderVolunteer(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { volunteerId } = req.params;
      const { newPriority } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      if (!newPriority || newPriority < 1) {
        ResponseUtil.badRequest(res, 'newPriority must be a positive integer');
        return;
      }

      const results = await toolsService.reorderVolunteer(
        userId,
        volunteerId,
        newPriority
      );

      ResponseUtil.success(res, results);
    } catch (error: any) {
      console.error('Reorder volunteer error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 工具12: 添加志愿
   * POST /api/agent/tools/volunteers
   */
  static async addVolunteer(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { collegeId, majorId, priority, isObeyAdjustment } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      if (!collegeId || !majorId) {
        ResponseUtil.badRequest(res, 'collegeId and majorId are required');
        return;
      }

      const result = await toolsService.addVolunteer(
        userId,
        collegeId,
        majorId,
        priority,
        isObeyAdjustment ?? true
      );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Add volunteer error:', error);
      ResponseUtil.error(res, error.message);
    }
  }
}
