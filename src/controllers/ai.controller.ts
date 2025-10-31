import { Request, Response } from 'express';
import { AIAgentService } from '../ai/agent.service';
import { ConversationManager } from '../ai/conversation.manager';
import { ResponseUtil } from '../utils/response';

const agentService = new AIAgentService();
const conversationManager = ConversationManager.getInstance();

export class AIController {
  /**
   * 聊天接口（普通模式）
   * POST /ai/chat
   */
  async chat(req: Request, res: Response) {
    try {
      const { message, sessionId, userId } = req.body;

      if (!message) {
        return ResponseUtil.badRequest(res, '消息内容不能为空');
      }

      // 获取或创建会话
      let session = sessionId ? conversationManager.getSession(sessionId) : null;

      if (!session) {
        const newSessionId = conversationManager.createSession(userId);
        session = conversationManager.getSession(newSessionId)!;
      }

      // 调用AI Agent
      const response = await agentService.chat(
        message,
        session.messages,
        userId || session.userId,
        session.sessionId
      );

      // 更新会话历史
      if (response.conversationHistory) {
        conversationManager.updateSession(
          session.sessionId,
          response.conversationHistory
        );
      }

      ResponseUtil.success(res, {
        message: response.message,
        sessionId: session.sessionId,
        success: response.success,
        metadata: response.metadata
      });
    } catch (error: any) {
      console.error('聊天错误:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 聊天接口（流式模式）
   * POST /ai/chat-stream
   */
  async chatStream(req: Request, res: Response) {
    try {
      const { message, sessionId, userId } = req.body;

      if (!message) {
        return ResponseUtil.badRequest(res, '消息内容不能为空');
      }

      // 获取或创建会话
      let session = sessionId ? conversationManager.getSession(sessionId) : null;

      if (!session) {
        const newSessionId = conversationManager.createSession(userId);
        session = conversationManager.getSession(newSessionId)!;
      }

      // 设置SSE响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 发送会话ID
      res.write(`data: ${JSON.stringify({ type: 'session', sessionId: session.sessionId })}\n\n`);

      // 调用流式API
      const stream = agentService.chatStream(
        message,
        session.messages,
        userId || session.userId,
        session.sessionId
      );

      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          // 文本块
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
        } else {
          // 最终响应
          if (chunk.conversationHistory) {
            conversationManager.updateSession(
              session.sessionId,
              chunk.conversationHistory
            );
          }
          res.write(`data: ${JSON.stringify({ type: 'done', ...chunk })}\n\n`);
        }
      }

      res.end();
    } catch (error: any) {
      console.error('流式聊天错误:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * 创建新会话
   * POST /ai/session
   */
  async createSession(req: Request, res: Response) {
    try {
      const { userId } = req.body;

      const sessionId = conversationManager.createSession(userId);
      const session = conversationManager.getSession(sessionId);

      ResponseUtil.success(res, {
        sessionId,
        createdAt: session?.createdAt
      });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取会话历史
   * GET /ai/session/:sessionId
   */
  async getSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const session = conversationManager.getSession(sessionId);

      if (!session) {
        return ResponseUtil.notFound(res, '会话不存在或已过期');
      }

      ResponseUtil.success(res, {
        sessionId: session.sessionId,
        messages: session.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 删除会话
   * DELETE /ai/session/:sessionId
   */
  async deleteSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;

      const success = conversationManager.deleteSession(sessionId);

      if (!success) {
        return ResponseUtil.notFound(res, '会话不存在');
      }

      ResponseUtil.success(res, { message: '会话已删除' });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取用户的所有会话
   * GET /ai/sessions
   */
  async getUserSessions(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return ResponseUtil.badRequest(res, '缺少userId参数');
      }

      const sessions = conversationManager.getUserSessions(userId as string);

      ResponseUtil.success(res, {
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          messageCount: s.messages.length
        }))
      });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取可用工具列表
   * GET /ai/tools
   */
  async getTools(req: Request, res: Response) {
    try {
      const tools = agentService.getAvailableTools();

      ResponseUtil.success(res, {
        tools,
        count: tools.length
      });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取系统统计
   * GET /ai/stats
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = conversationManager.getStats();

      ResponseUtil.success(res, stats);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
