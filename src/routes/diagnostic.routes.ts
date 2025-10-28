import { Router } from 'express';
import { DiagnosticController } from '../controllers/diagnostic.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * 诊断路由
 * 用于数据库诊断和自动修复
 */

// 诊断数据库问题
router.get('/database', authMiddleware, DiagnosticController.diagnoseDatabase);

// 自动修复数据库问题
router.post('/fix', authMiddleware, DiagnosticController.fixDatabase);

export default router;
