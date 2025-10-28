import { Router } from 'express';
import { SystemController, uploadMiddleware } from '../controllers/system.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const systemController = new SystemController();

// 获取省份列表
router.get('/provinces', (req, res) => systemController.getProvinces(req, res));

// 获取数据字典
router.get('/dict', (req, res) => systemController.getDict(req, res));

// 获取系统配置
router.get('/config', (req, res) => systemController.getConfig(req, res));

// 数据统计
router.get('/statistics', (req, res) => systemController.getStatistics(req, res));

// 文件上传(需要认证)
router.post('/upload', authMiddleware, uploadMiddleware, (req, res) =>
  systemController.uploadFile(req, res)
);

export default router;
