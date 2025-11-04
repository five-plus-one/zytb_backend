import { Request, Response } from 'express';
import { EnrollmentPlanGroupService } from '../services/enrollmentPlanGroup.service';

export class EnrollmentPlanGroupController {
  private service = new EnrollmentPlanGroupService();

  /**
   * GET /api/groups/detail
   * 查询专业组详细信息（包含历年分数）
   * Query params: collegeCode, groupCode, sourceProvince, subjectType
   */
  async getGroupDetail(req: Request, res: Response) {
    try {
      const { collegeCode, groupCode, sourceProvince, subjectType } = req.query;

      if (!collegeCode || !groupCode || !sourceProvince || !subjectType) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: collegeCode, groupCode, sourceProvince, subjectType'
        });
      }

      const result = await this.service.getGroupDetail(
        collegeCode as string,
        groupCode as string,
        sourceProvince as string,
        subjectType as string
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: '未找到该专业组'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[EnrollmentPlanGroupController] 查询专业组详情失败:', error);
      res.status(500).json({
        success: false,
        message: '查询失败',
        error: error.message
      });
    }
  }

  /**
   * GET /api/groups/college/:collegeCode
   * 查询某个学校的所有专业组招生计划
   * Path params: collegeCode
   * Query params: sourceProvince, subjectType, year (optional)
   */
  async getCollegeGroups(req: Request, res: Response) {
    try {
      const { collegeCode } = req.params;
      const { sourceProvince, subjectType, year } = req.query;

      if (!sourceProvince || !subjectType) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数: sourceProvince, subjectType'
        });
      }

      const result = await this.service.getCollegeGroups(
        collegeCode,
        sourceProvince as string,
        subjectType as string,
        year ? parseInt(year as string) : 2025
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[EnrollmentPlanGroupController] 查询学校专业组失败:', error);
      res.status(500).json({
        success: false,
        message: '查询失败',
        error: error.message
      });
    }
  }

  /**
   * GET /api/groups/:groupId
   * 根据group_id查询专业组详情
   * Path params: groupId
   */
  async getGroupById(req: Request, res: Response) {
    try {
      const { groupId } = req.params;

      const result = await this.service.getGroupById(groupId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: '未找到该专业组'
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[EnrollmentPlanGroupController] 查询专业组失败:', error);
      res.status(500).json({
        success: false,
        message: '查询失败',
        error: error.message
      });
    }
  }
}
