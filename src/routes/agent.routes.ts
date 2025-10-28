import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * 智能体路由
 * 所有路由都需要认证
 */

// 开始新会话
router.post('/start', authMiddleware, AgentController.startSession);

// 发送消息(普通模式)
router.post('/chat', authMiddleware, AgentController.chat);

// 发送消息(流式模式 - SSE)
router.post('/chat/stream', authMiddleware, AgentController.chatStream);

// 生成志愿推荐(异步任务)
router.post('/generate', authMiddleware, AgentController.generateRecommendations);

// 查询推荐生成任务状态
router.get('/generate/status/:taskId', authMiddleware, AgentController.getGenerateStatus);

// 获取当前活跃会话
router.get('/session/current', authMiddleware, AgentController.getCurrentSession);

// 获取会话状态
router.get('/session/:sessionId', authMiddleware, AgentController.getSessionStatus);

// 获取会话的完整对话内容
router.get('/session/:sessionId/messages', authMiddleware, AgentController.getSessionMessages);

// 暂停会话
router.post('/session/:sessionId/pause', authMiddleware, AgentController.pauseSession);

// 恢复会话
router.post('/session/:sessionId/resume', authMiddleware, AgentController.resumeSession);

// 重新开始(重置所有活跃会话)
router.post('/reset', authMiddleware, AgentController.resetSession);

// 搜索信息
router.post('/search', authMiddleware, AgentController.search);

// 清除推荐缓存（调试用）
router.post('/clear-cache', authMiddleware, AgentController.clearCache);

export default router;
