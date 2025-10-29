import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';

const router = Router();
const aiController = new AIController();

// 聊天接口
router.post('/chat', (req, res) => aiController.chat(req, res));

// 流式聊天接口
router.post('/chat-stream', (req, res) => aiController.chatStream(req, res));

// 会话管理
router.post('/session', (req, res) => aiController.createSession(req, res));
router.get('/session/:sessionId', (req, res) => aiController.getSession(req, res));
router.delete('/session/:sessionId', (req, res) => aiController.deleteSession(req, res));
router.get('/sessions', (req, res) => aiController.getUserSessions(req, res));

// 工具列表
router.get('/tools', (req, res) => aiController.getTools(req, res));

// 系统统计
router.get('/stats', (req, res) => aiController.getStats(req, res));

export default router;
