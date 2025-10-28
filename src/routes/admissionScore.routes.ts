import { Router } from 'express';
import { AdmissionScoreController } from '../controllers/admissionScore.controller';

const router = Router();
const admissionScoreController = new AdmissionScoreController();

// 获取录取分数线列表
router.get('/list', (req, res) => admissionScoreController.getAdmissionScoreList(req, res));

// 获取录取分数线详情
router.get('/:id', (req, res) => admissionScoreController.getAdmissionScoreDetail(req, res));

// 按院校获取录取分数线
router.get('/college/:collegeName', (req, res) => admissionScoreController.getScoresByCollege(req, res));

// 按专业获取录取分数线
router.get('/major/:majorName', (req, res) => admissionScoreController.getScoresByMajor(req, res));

// 获取历年分数线趋势
router.get('/trend/analysis', (req, res) => admissionScoreController.getScoreTrend(req, res));

// 获取分数线统计信息
router.get('/statistics/overview', (req, res) => admissionScoreController.getScoreStatistics(req, res));

// 根据分数推荐院校和专业
router.get('/recommend/by-score', (req, res) => admissionScoreController.recommendByScore(req, res));

// 获取可用的年份列表
router.get('/options/years', (req, res) => admissionScoreController.getAvailableYears(req, res));

// 获取可用的生源地列表
router.get('/options/provinces', (req, res) => admissionScoreController.getAvailableProvinces(req, res));

export default router;
