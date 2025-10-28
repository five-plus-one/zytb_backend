import { Router } from 'express';
import { CollegeController } from '../controllers/college.controller';

const router = Router();
const collegeController = new CollegeController();

// 获取院校列表
router.get('/list', (req, res) => collegeController.getCollegeList(req, res));

// 获取院校详情
router.get('/:id', (req, res) => collegeController.getCollegeDetail(req, res));

// 获取院校招生计划
router.get('/:id/plan', (req, res) => collegeController.getCollegePlan(req, res));

// 获取院校历年分数线
router.get('/:id/scores', (req, res) => collegeController.getCollegeScores(req, res));

// 院校对比
router.post('/compare', (req, res) => collegeController.compareColleges(req, res));

export default router;
