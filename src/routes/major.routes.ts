import { Router } from 'express';
import { MajorController } from '../controllers/major.controller';

const router = Router();
const majorController = new MajorController();

// 获取专业列表
router.get('/list', (req, res) => majorController.getMajorList(req, res));

// 获取专业详情
router.get('/:id', (req, res) => majorController.getMajorDetail(req, res));

// 获取专业开设院校
router.get('/:id/colleges', (req, res) => majorController.getMajorColleges(req, res));

// 生成单个专业的嵌入向量
router.post('/:id/embedding', (req, res) => majorController.generateMajorEmbedding(req, res));

// 批量生成所有专业的嵌入向量
router.post('/embeddings/generate-all', (req, res) => majorController.generateAllMajorEmbeddings(req, res));

// 计算指定专业与用户的匹配度
router.post('/match/:majorId', (req, res) => majorController.calculateMajorMatch(req, res));

// 获取所有专业匹配度排名
router.post('/match/ranking', (req, res) => majorController.getMajorMatchRanking(req, res));

// 添加专业优势院校
router.post('/:id/advantage-colleges', (req, res) => majorController.addAdvantageColleges(req, res));

export default router;
