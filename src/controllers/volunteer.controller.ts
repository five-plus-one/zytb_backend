import { Request, Response } from 'express';
import { VolunteerService } from '../services/volunteer.service';
import { ResponseUtil } from '../utils/response';
import { AuthRequest } from '../types';

/**
 * @deprecated 此控制器已废弃，请使用新的志愿表系统
 *
 * 旧系统问题：
 * - 不支持江苏新高考的专业组结构
 * - 缺少批次管理（本科批/专科批）
 * - 不支持多方案对比
 *
 * 新系统控制器：
 * - src/controllers/volunteerCurrent.controller.ts（推荐使用）
 * - src/controllers/volunteerTableManagement.controller.ts
 *
 * 迁移说明：
 * 1. 旧数据需要手动迁移到新表结构
 * 2. 前端需要适配新的API接口
 * 3. 新系统支持完整的4层架构：Table → Batch → Group → Major
 *
 * 计划删除时间：待定
 */

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

  // 加入志愿表（从推荐卡片添加）
  async addToVolunteerList(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;
      const { groupId, collegeCode, collegeName, groupCode, groupName } = req.body;

      if (!groupId || !collegeCode || !collegeName) {
        return ResponseUtil.badRequest(res, '缺少必填参数: groupId, collegeCode, collegeName');
      }

      const result = await volunteerService.addToVolunteerList(userId, {
        groupId,
        collegeCode,
        collegeName,
        groupCode,
        groupName
      });

      ResponseUtil.success(res, result, '已加入志愿表');
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 比对志愿信息
  async compareVolunteer(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;
      const { groupId, userScore, userRank, province, category } = req.body;

      if (!groupId || !userScore || !userRank || !province || !category) {
        return ResponseUtil.badRequest(res, '缺少必填参数: groupId, userScore, userRank, province, category');
      }

      const result = await volunteerService.compareVolunteer(userId, {
        groupId,
        userScore,
        userRank,
        province,
        category
      });

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
