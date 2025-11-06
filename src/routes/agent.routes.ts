import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { QuickSessionController } from '../controllers/quickSession.controller';
import { SuggestionController } from '../controllers/suggestion.controller';
import { BatchAnalysisController } from '../controllers/batchAnalysis.controller';
import { SnapshotController } from '../controllers/snapshot.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * 智能体路由
 * 所有路由都需要认证
 */

// ========== 快速会话 (P0) ==========
// 创建快速会话
router.post('/quick-session/create', authMiddleware, QuickSessionController.createQuickSession);

// 快速会话聊天（普通模式）
router.post('/quick-session/chat', authMiddleware, QuickSessionController.quickChat);

// 快速会话聊天（流式模式）
router.post('/quick-session/chat/stream', authMiddleware, QuickSessionController.quickChatStream);

// 合并快速会话到主会话
router.post('/quick-session/merge', authMiddleware, QuickSessionController.mergeQuickSession);

// 获取用户的快速会话列表
router.get('/quick-sessions', authMiddleware, QuickSessionController.getQuickSessions);

// 获取快速会话消息
router.get('/quick-session/:quickSessionId/messages', authMiddleware, QuickSessionController.getQuickSessionMessages);

// ========== 智能建议 (P0) ==========
// 生成智能建议
router.post('/suggestions/generate', authMiddleware, SuggestionController.generateSuggestions);

// 自动补全
router.post('/suggestions/auto-complete', authMiddleware, SuggestionController.autoComplete);

// ========== 批量分析 (P0) ==========
// 批量分析专业组
router.post('/analyze/batch-groups', authMiddleware, BatchAnalysisController.analyzeBatchGroups);

// 优化志愿表
router.post('/optimize/volunteer-table', authMiddleware, BatchAnalysisController.optimizeVolunteerTable);

// ========== 会话快照 (P2) ==========
// 创建会话快照
router.post('/session/:sessionId/snapshot', authMiddleware, SnapshotController.createSnapshot);

// 从快照恢复会话
router.post('/session/restore-from-snapshot', authMiddleware, SnapshotController.restoreFromSnapshot);

// 获取用户的快照列表
router.get('/snapshots', authMiddleware, SnapshotController.getUserSnapshots);

// 获取会话的快照列表
router.get('/session/:sessionId/snapshots', authMiddleware, SnapshotController.getSessionSnapshots);

// 删除快照
router.delete('/snapshot/:snapshotId', authMiddleware, SnapshotController.deleteSnapshot);

// ========== 主会话 ==========
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

// 切换会话模式 (P1)
router.post('/session/:sessionId/switch-mode', authMiddleware, AgentController.switchSessionMode);

// 获取会话能力 (P1)
router.get('/session/:sessionId/capabilities', authMiddleware, AgentController.getSessionCapabilities);

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
