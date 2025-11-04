import { Router } from 'express';
import { EnrollmentPlanSearchController } from '../controllers/enrollmentPlanSearch.controller';

const router = Router();
const controller = new EnrollmentPlanSearchController();

// 快速搜索招生计划
router.get('/search', (req, res) => controller.searchPlans(req, res));

// 获取搜索选项
router.get('/search/options', (req, res) => controller.getSearchOptions(req, res));

export default router;
