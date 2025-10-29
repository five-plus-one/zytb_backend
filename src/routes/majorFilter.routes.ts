import { Router } from 'express';
import { MajorFilterController } from '../controllers/majorFilter.controller';

const router = Router();
const majorFilterController = new MajorFilterController();

// 筛选专业
router.get('/', (req, res) => majorFilterController.filterMajors(req, res));

// 获取可用的专业方向列表
router.get('/directions', (req, res) => majorFilterController.getAvailableMajorDirections(req, res));

export default router;
