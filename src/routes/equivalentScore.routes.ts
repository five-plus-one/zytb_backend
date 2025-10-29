import { Router } from 'express';
import { EquivalentScoreController } from '../controllers/equivalentScore.controller';

const router = Router();
const equivalentScoreController = new EquivalentScoreController();

// 查询等位分
router.get('/', (req, res) => equivalentScoreController.getEquivalentScores(req, res));

// 批量查询等位分
router.post('/batch', (req, res) => equivalentScoreController.batchGetEquivalentScores(req, res));

export default router;
