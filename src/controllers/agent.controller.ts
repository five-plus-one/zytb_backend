import { Request, Response } from 'express';
import { AgentService } from '../services/agent/agent.service';
import cacheService from '../services/cache.service';
import { ResponseUtil } from '../utils/response';

/**
 * 智能体API控制器
 */

const agentService = new AgentService();

export class AgentController {
  /**
   * 开始新会话
   * POST /api/agent/start
   */
  static async startSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, province, examScore, subjectType } = req.body;

      // 验证参数
      if (!userId || !province || !examScore || !subjectType) {
        ResponseUtil.badRequest(res, 'Missing required parameters');
        return;
      }

      const result = await agentService.startSession(
        userId,
        province,
        examScore,
        subjectType
      );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Start session error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 发送消息(普通模式)
   * POST /api/agent/chat
   */
  static async chat(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId, message } = req.body;

      if (!userId || !sessionId || !message) {
        ResponseUtil.badRequest(res, 'Missing required parameters');
        return;
      }

      const response = await agentService.chat({
        userId,
        sessionId,
        message
      });

      ResponseUtil.success(res, response);
    } catch (error: any) {
      console.error('Chat error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 发送消息(流式模式)
   * POST /api/agent/chat/stream
   */
  static async chatStream(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId, message } = req.body;

      if (!userId || !sessionId || !message) {
        ResponseUtil.badRequest(res, 'Missing required parameters');
        return;
      }

      // 设置SSE响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // 禁用nginx缓冲

      // 发送初始连接消息
      res.write('data: {"type":"connected"}\n\n');

      // 流式生成响应
      for await (const chunk of agentService.chatStream({
        userId,
        sessionId,
        message
      })) {
        // 发送文本块
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }

      // 发送完成消息
      res.write('data: {"type":"done"}\n\n');
      res.end();
    } catch (error: any) {
      console.error('Chat stream error:', error);

      // 发送错误消息
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * 生成志愿推荐（异步任务）
   * POST /api/agent/generate
   */
  static async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, count } = req.body;
      const userId = (req as any).userId;

      if (!sessionId) {
        ResponseUtil.badRequest(res, 'Session ID is required');
        return;
      }

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      // 启动异步任务，立即返回任务ID
      const taskId = await agentService.startGenerateRecommendationsTask(
        sessionId,
        userId,
        count || 60
      );

      ResponseUtil.success(res, {
        taskId,
        message: 'Recommendation generation started',
        statusUrl: `/api/agent/generate/status/${taskId}`
      });
    } catch (error: any) {
      console.error('Generate recommendations error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 查询推荐生成任务状态
   * GET /api/agent/generate/status/:taskId
   */
  static async getGenerateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = (req as any).userId;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const status = await agentService.getGenerateTaskStatus(taskId, userId);

      if (!status) {
        ResponseUtil.notFound(res, 'Task not found');
        return;
      }

      ResponseUtil.success(res, status);
    } catch (error: any) {
      console.error('Get generate status error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取当前活跃会话
   * GET /api/agent/session/current
   */
  static async getCurrentSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId; // 从 authMiddleware 获取

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const currentSession = await agentService.getCurrentSession(userId);

      if (!currentSession) {
        ResponseUtil.notFound(res, 'No active session found');
        return;
      }

      ResponseUtil.success(res, currentSession);
    } catch (error: any) {
      console.error('Get current session error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取会话状态
   * GET /api/agent/session/:sessionId
   */
  static async getSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const status = await agentService.getSessionStatus(sessionId);

      if (!status) {
        ResponseUtil.notFound(res, 'Session not found');
        return;
      }

      ResponseUtil.success(res, status);
    } catch (error: any) {
      console.error('Get session status error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取会话的完整对话内容
   * GET /api/agent/session/:sessionId/messages
   */
  static async getSessionMessages(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).userId; // 从 authMiddleware 获取

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      // 获取分页参数
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const result = await agentService.getSessionMessages(sessionId, userId, limit, offset);

      if (!result) {
        ResponseUtil.notFound(res, 'Session not found or access denied');
        return;
      }

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Get session messages error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 暂停会话
   * POST /api/agent/session/:sessionId/pause
   */
  static async pauseSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      await agentService.pauseSession(sessionId);

      ResponseUtil.success(res, { message: 'Session paused successfully' });
    } catch (error: any) {
      console.error('Pause session error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 恢复会话
   * POST /api/agent/session/:sessionId/resume
   */
  static async resumeSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      await agentService.resumeSession(sessionId);

      ResponseUtil.success(res, { message: 'Session resumed successfully' });
    } catch (error: any) {
      console.error('Resume session error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 重新开始(重置会话)
   * POST /api/agent/reset
   */
  static async resetSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        ResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      await agentService.resetSession(userId);

      ResponseUtil.success(res, { message: 'Sessions reset successfully' });
    } catch (error: any) {
      console.error('Reset session error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 搜索信息
   * POST /api/agent/search
   */
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, type } = req.body;

      if (!query) {
        ResponseUtil.badRequest(res, 'Query is required');
        return;
      }

      const result = await agentService.search(query, type || 'general');

      ResponseUtil.success(res, { result });
    } catch (error: any) {
      console.error('Search error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 清除推荐缓存
   * POST /api/agent/clear-cache
   */
  static async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.body;

      if (!userId) {
        ResponseUtil.badRequest(res, 'User ID is required');
        return;
      }

      await cacheService.delPattern(`rec:${userId}:${sessionId || '*'}`);
      await cacheService.delPattern(`emb_user:${userId}:${sessionId || '*'}`);
      await cacheService.delPattern(`pref:${userId}:${sessionId || '*'}`);

      console.log(`🗑️  已清除用户 ${userId} 的缓存`);

      ResponseUtil.success(res, { message: 'Cache cleared successfully' });
    } catch (error: any) {
      console.error('Clear cache error:', error);
      ResponseUtil.error(res, error.message);
    }
  }
}
