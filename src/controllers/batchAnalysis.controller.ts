import { Request, Response } from 'express';
import { BatchAnalysisService } from '../services/agent/batchAnalysis.service';
import { TableOptimizationService } from '../services/agent/tableOptimization.service';
import { ResponseUtil } from '../utils/response';

/**
 * 批量分析控制器
 */

const batchAnalysisService = new BatchAnalysisService();
const tableOptimizationService = new TableOptimizationService();

export class BatchAnalysisController {
  /**
   * 批量分析专业组
   * POST /api/agent/analyze/batch-groups
   */
  static async analyzeBatchGroups(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { sessionId, groupIds, analysisType } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
        ResponseUtil.badRequest(res, 'Group IDs are required');
        return;
      }

      if (groupIds.length > 10) {
        ResponseUtil.badRequest(res, 'Maximum 10 groups can be analyzed at once');
        return;
      }

      const result = await batchAnalysisService.analyzeBatchGroups({
        userId,
        sessionId,
        groupIds,
        analysisType
      });

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Batch analysis error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 优化志愿表
   * POST /api/agent/optimize/volunteer-table
   */
  static async optimizeVolunteerTable(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { tableId, sessionId } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      if (!tableId) {
        ResponseUtil.badRequest(res, 'Table ID is required');
        return;
      }

      const result = await tableOptimizationService.optimizeTable({
        userId,
        tableId,
        sessionId
      });

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Table optimization error:', error);
      ResponseUtil.error(res, error.message);
    }
  }
}
