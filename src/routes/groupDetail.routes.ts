import { Router } from 'express';
import { GroupDetailController } from '../controllers/groupDetail.controller';

const router = Router();
const controller = new GroupDetailController();

// 获取专业组详细信息
router.get('/group/:groupId/detail', (req, res) => controller.getGroupDetail(req, res));

// 对比多个专业组
router.post('/group/compare', (req, res) => controller.compareGroups(req, res));

export default router;
