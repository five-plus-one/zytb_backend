import { Request, Response } from 'express';
import { VolunteerService } from '../services/volunteer.service';
import { ResponseUtil } from '../utils/response';
import { AuthRequest } from '../types';

const volunteerService = new VolunteerService();

export class VolunteerController {
  // 获取我的志愿
  async getMyVolunteers(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;
      const result = await volunteerService.getMyVolunteers(userId);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 保存志愿(草稿)
  async saveVolunteers(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;
      const { volunteers } = req.body;

      if (!Array.isArray(volunteers)) {
        return ResponseUtil.badRequest(res, '志愿列表格式错误');
      }

      const result = await volunteerService.saveVolunteers(userId, volunteers);
      ResponseUtil.success(res, result, '保存成功');
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 提交志愿
  async submitVolunteers(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;
      const { volunteers } = req.body;

      if (!Array.isArray(volunteers)) {
        return ResponseUtil.badRequest(res, '志愿列表格式错误');
      }

      const result = await volunteerService.submitVolunteers(userId, volunteers);
      ResponseUtil.success(res, result, '提交成功');
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 删除志愿
  async deleteVolunteer(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;
      const { id } = req.params;

      await volunteerService.deleteVolunteer(userId, id);
      ResponseUtil.success(res, null, '删除成功');
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 志愿智能推荐
  async recommendVolunteers(req: Request, res: Response) {
    try {
      const data = req.body;

      if (!data.score || !data.province || !data.subjectType || !data.rank) {
        return ResponseUtil.badRequest(res, '缺少必填参数');
      }

      const result = await volunteerService.recommendVolunteers(data);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 志愿分析
  async analyzeVolunteers(req: Request, res: Response) {
    try {
      const data = req.body;

      if (
        !Array.isArray(data.volunteers) ||
        !data.userScore ||
        !data.userRank ||
        !data.province ||
        !data.subjectType
      ) {
        return ResponseUtil.badRequest(res, '缺少必填参数');
      }

      const result = await volunteerService.analyzeVolunteers(data);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
