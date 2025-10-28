import { Router } from 'express';
import { ScoreRankingController } from '../controllers/scoreRanking.controller';

const router = Router();
const scoreRankingController = new ScoreRankingController();

// 获取一分一段列表
router.get('/list', (req, res) => scoreRankingController.getScoreRankingList(req, res));

// 根据分数查询位次
router.get('/rank-by-score', (req, res) => scoreRankingController.getRankByScore(req, res));

// 根据位次查询分数
router.get('/score-by-rank', (req, res) => scoreRankingController.getScoreByRank(req, res));

// 获取分数段统计
router.get('/distribution', (req, res) => scoreRankingController.getScoreDistribution(req, res));

// 批量查询多个分数的位次
router.post('/batch-rank-by-scores', (req, res) => scoreRankingController.batchGetRankByScores(req, res));

// 获取可用的年份列表
router.get('/options/years', (req, res) => scoreRankingController.getAvailableYears(req, res));

// 获取可用的省份列表
router.get('/options/provinces', (req, res) => scoreRankingController.getAvailableProvinces(req, res));

export default router;
