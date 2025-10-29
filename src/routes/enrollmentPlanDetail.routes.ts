import { Router } from 'express';
import { EnrollmentPlanDetailController } from '../controllers/enrollmentPlanDetail.controller';

const router = Router();
const enrollmentPlanDetailController = new EnrollmentPlanDetailController();

// 查询招生计划详情
router.get('/', (req, res) => enrollmentPlanDetailController.getEnrollmentPlanDetails(req, res));

// 按院校分组查询招生计划
router.get('/by-college', (req, res) => enrollmentPlanDetailController.getEnrollmentPlansByCollege(req, res));

// 获取院校历史录取分数统计
router.get('/college-stats', (req, res) => enrollmentPlanDetailController.getCollegeHistoricalScoreStats(req, res));

export default router;
