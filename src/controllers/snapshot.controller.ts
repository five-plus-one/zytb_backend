import { Request, Response } from 'express';
import { SnapshotService } from '../services/agent/snapshot.service';
import { ResponseUtil } from '../utils/response';

/**
 * 会话快照控制器
 */

const snapshotService = new SnapshotService();

export class SnapshotController {
  /**
   * 创建会话快照
   * POST /api/agent/session/:sessionId/snapshot
   */
  static async createSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { sessionId } = req.params;
      const { snapshotName, metadata } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      if (!snapshotName) {
        ResponseUtil.badRequest(res, 'Snapshot name is required');
        return;
      }

      const snapshot = await snapshotService.createSnapshot({
        userId,
        sessionId,
        snapshotName,
        metadata
      });

      ResponseUtil.success(res, {
        snapshotId: snapshot.id,
        snapshotName: snapshot.snapshotName,
        messagesCount: snapshot.messagesCount,
        createdAt: snapshot.createdAt
      });
    } catch (error: any) {
      console.error('Create snapshot error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 从快照恢复会话
   * POST /api/agent/session/restore-from-snapshot
   */
  static async restoreFromSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { snapshotId, createNewSession } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      if (!snapshotId) {
        ResponseUtil.badRequest(res, 'Snapshot ID is required');
        return;
      }

      const result = await snapshotService.restoreFromSnapshot(
        userId,
        snapshotId,
        createNewSession !== false // 默认创建新会话
      );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Restore from snapshot error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取用户的快照列表
   * GET /api/agent/snapshots
   */
  static async getUserSnapshots(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const { snapshots, total } = await snapshotService.getUserSnapshots(
        userId,
        limit,
        offset
      );

      ResponseUtil.success(res, {
        snapshots: snapshots.map(s => ({
          snapshotId: s.id,
          sessionId: s.sessionId,
          snapshotName: s.snapshotName,
          messagesCount: s.messagesCount,
          metadata: s.metadata,
          createdAt: s.createdAt
        })),
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + snapshots.length < total
        }
      });
    } catch (error: any) {
      console.error('Get user snapshots error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取会话的快照列表
   * GET /api/agent/session/:sessionId/snapshots
   */
  static async getSessionSnapshots(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { sessionId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const snapshots = await snapshotService.getSessionSnapshots(userId, sessionId);

      ResponseUtil.success(res, {
        snapshots: snapshots.map(s => ({
          snapshotId: s.id,
          snapshotName: s.snapshotName,
          messagesCount: s.messagesCount,
          metadata: s.metadata,
          createdAt: s.createdAt
        }))
      });
    } catch (error: any) {
      console.error('Get session snapshots error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 删除快照
   * DELETE /api/agent/snapshot/:snapshotId
   */
  static async deleteSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { snapshotId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      await snapshotService.deleteSnapshot(userId, snapshotId);

      ResponseUtil.success(res, { message: 'Snapshot deleted successfully' });
    } catch (error: any) {
      console.error('Delete snapshot error:', error);
      ResponseUtil.error(res, error.message);
    }
  }
}
