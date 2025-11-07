import { Request, Response } from 'express';
import { QuickSessionService } from '../services/agent/quickSession.service';
import { AIAgentService } from '../ai/agent.service';
import { LLMService } from '../services/agent/llm.service';
import { ResponseUtil } from '../utils/response';

/**
 * 快速会话控制器
 */

const quickSessionService = new QuickSessionService();
const aiAgentService = new AIAgentService();
const llmService = new LLMService();

export class QuickSessionController {
  /**
   * 创建快速会话
   * POST /api/agent/quick-session/create
   */
  static async createQuickSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { mainSessionId, sessionType, context } = req.body;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      if (!sessionType) {
        ResponseUtil.badRequest(res, 'Session type is required');
        return;
      }

      const quickSession = await quickSessionService.createQuickSession({
        userId,
        mainSessionId,
        sessionType,
        context
      });

      ResponseUtil.success(res, {
        quickSessionId: quickSession.id,
        sessionType: quickSession.sessionType,
        context: quickSession.context,
        canMergeToMain: quickSession.canMergeToMain,
        createdAt: quickSession.createdAt
      });
    } catch (error: any) {
      console.error('Create quick session error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 快速会话聊天（普通模式）
   * POST /api/agent/quick-session/chat
   */
  static async quickChat(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { quickSessionId, message } = req.body;

      if (!userId || !quickSessionId || !message) {
        ResponseUtil.badRequest(res, 'Missing required parameters');
        return;
      }

      // 验证快速会话
      const quickSession = await quickSessionService.getQuickSession(quickSessionId);
      if (!quickSession || quickSession.userId !== userId) {
        ResponseUtil.notFound(res, 'Quick session not found or access denied');
        return;
      }

      // 保存用户消息
      await quickSessionService.addMessage(quickSessionId, 'user', message);

      // 获取历史消息
      const messages = await quickSessionService.getMessages(quickSessionId, 10, 0);
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      // 构建系统提示（根据会话类型）
      const systemPrompt = QuickSessionController.buildSystemPrompt(
        quickSession.sessionType,
        quickSession.context
      );

      // 调用LLM
      const llmMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: message }
      ];

      const response = await llmService.chat(llmMessages, {
        temperature: 0.7,
        maxTokens: 1500
      });

      // 保存助手响应
      await quickSessionService.addMessage(quickSessionId, 'assistant', response);

      ResponseUtil.success(res, {
        quickSessionId,
        message: response,
        totalMessages: quickSession.totalMessages + 2
      });
    } catch (error: any) {
      console.error('Quick chat error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 快速会话聊天（流式模式）
   * POST /api/agent/quick-session/chat/stream
   */
  static async quickChatStream(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { quickSessionId, message } = req.body;

      if (!userId || !quickSessionId || !message) {
        ResponseUtil.badRequest(res, 'Missing required parameters');
        return;
      }

      // 验证快速会话
      const quickSession = await quickSessionService.getQuickSession(quickSessionId);
      if (!quickSession || quickSession.userId !== userId) {
        ResponseUtil.notFound(res, 'Quick session not found or access denied');
        return;
      }

      // 设置SSE响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      res.write('data: {"type":"connected"}\n\n');

      // 保存用户消息
      await quickSessionService.addMessage(quickSessionId, 'user', message);

      // 获取历史消息
      const messages = await quickSessionService.getMessages(quickSessionId, 10, 0);
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      // 使用AI Agent Service处理（带工具调用）
      let fullResponse = '';
      let responseMetadata: any = null;
      let contentBlocks: any[] | null = null;

      for await (const chunk of aiAgentService.chatStream(message, conversationHistory, userId, quickSessionId)) {
        if (typeof chunk === 'string') {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        } else {
          responseMetadata = chunk.metadata;
          if (chunk.message && !fullResponse) {
            fullResponse = chunk.message;
          }

          // 提取推荐卡片数据并转换为contentBlocks格式
          if (responseMetadata?.extractedData) {
            contentBlocks = [{
              type: 'recommendation_cards',
              data: responseMetadata.extractedData
            }];
          }
        }
      }

      // 保存助手响应（包含contentBlocks）
      if (fullResponse) {
        await quickSessionService.addMessage(
          quickSessionId,
          'assistant',
          fullResponse,
          contentBlocks || undefined,
          responseMetadata
        );
      }

      res.write('data: {"type":"done"}\n\n');
      res.end();
    } catch (error: any) {
      console.error('Quick chat stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }

  /**
   * 合并快速会话到主会话
   * POST /api/agent/quick-session/merge
   */
  static async mergeQuickSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { quickSessionId } = req.body;

      if (!userId || !quickSessionId) {
        ResponseUtil.badRequest(res, 'Missing required parameters');
        return;
      }

      // 验证快速会话
      const quickSession = await quickSessionService.getQuickSession(quickSessionId);
      if (!quickSession || quickSession.userId !== userId) {
        ResponseUtil.notFound(res, 'Quick session not found or access denied');
        return;
      }

      const result = await quickSessionService.mergeToMainSession(quickSessionId);

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Merge quick session error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取用户的快速会话列表
   * GET /api/agent/quick-sessions
   */
  static async getQuickSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const { sessions, total } = await quickSessionService.getUserQuickSessions(
        userId,
        limit,
        offset
      );

      ResponseUtil.success(res, {
        sessions: sessions.map(s => ({
          quickSessionId: s.id,
          sessionType: s.sessionType,
          context: s.context,
          totalMessages: s.totalMessages,
          isMerged: s.isMerged,
          canMergeToMain: s.canMergeToMain,
          createdAt: s.createdAt
        })),
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + sessions.length < total
        }
      });
    } catch (error: any) {
      console.error('Get quick sessions error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取快速会话消息
   * GET /api/agent/quick-session/:quickSessionId/messages
   */
  static async getQuickSessionMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { quickSessionId } = req.params;

      if (!userId) {
        ResponseUtil.unauthorized(res);
        return;
      }

      // 验证快速会话
      const quickSession = await quickSessionService.getQuickSession(quickSessionId);
      if (!quickSession || quickSession.userId !== userId) {
        ResponseUtil.notFound(res, 'Quick session not found or access denied');
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const messages = await quickSessionService.getMessages(quickSessionId, limit, offset);

      ResponseUtil.success(res, {
        quickSessionId,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          contentBlocks: msg.contentBlocks,
          metadata: msg.metadata,
          createdAt: msg.createdAt
        })),
        total: quickSession.totalMessages,
        pagination: {
          limit,
          offset,
          hasMore: offset + messages.length < quickSession.totalMessages
        }
      });
    } catch (error: any) {
      console.error('Get quick session messages error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 构建系统提示词（根据会话类型）
   */
  private static buildSystemPrompt(
    sessionType: string,
    context?: any
  ): string {
    const basePrompt = '你是一个专业的高考志愿填报助手。';

    switch (sessionType) {
      case 'group_inquiry':
        return `${basePrompt}当前用户正在快速查询专业组信息。请提供简洁、准确的专业组详情，包括院校、专业、选考要求等信息。`;

      case 'group_compare':
        return `${basePrompt}当前用户正在对比多个专业组。请帮助用户分析各专业组的优劣势，包括院校层次、专业特色、就业前景、地理位置等维度。`;

      case 'major_inquiry':
        return `${basePrompt}当前用户正在查询专业信息。请提供专业的详细介绍，包括培养目标、课程设置、就业方向、深造机会等。`;

      case 'general':
      default:
        return `${basePrompt}请简洁、专业地回答用户的问题。`;
    }
  }
}
