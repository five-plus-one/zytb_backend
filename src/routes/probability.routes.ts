import { Router } from 'express';
import { ProbabilityCalculationController } from '../controllers/probabilityCalculation.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const controller = new ProbabilityCalculationController();

// 计算录取概率
router.post('/calculate', (req, res) => controller.calculateProbability(req, res));

export default router;
