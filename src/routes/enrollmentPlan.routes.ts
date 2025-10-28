import { Router } from 'express';
import { EnrollmentPlanController } from '../controllers/enrollmentPlan.controller';

const router = Router();
const enrollmentPlanController = new EnrollmentPlanController();

// 获取招生计划列表
router.get('/list', (req, res) => enrollmentPlanController.getEnrollmentPlanList(req, res));

// 获取招生计划详情
router.get('/:id', (req, res) => enrollmentPlanController.getEnrollmentPlanDetail(req, res));

// 按院校获取招生计划
router.get('/college/:collegeCode', (req, res) => enrollmentPlanController.getPlansByCollege(req, res));

// 按专业获取招生计划
router.get('/major/:majorCode', (req, res) => enrollmentPlanController.getPlansByMajor(req, res));

// 获取招生计划统计信息
router.get('/statistics/overview', (req, res) => enrollmentPlanController.getEnrollmentStatistics(req, res));

// 获取可用的年份列表
router.get('/options/years', (req, res) => enrollmentPlanController.getAvailableYears(req, res));

// 获取可用的生源地列表
router.get('/options/provinces', (req, res) => enrollmentPlanController.getAvailableProvinces(req, res));

export default router;
