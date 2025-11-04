import { Router, Request, Response } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth';
import { adminMiddleware } from '../middlewares/admin';

const router = Router();
const controller = new AdminController();

router.get('/config', (req: Request, res: Response) => controller.getConfig(req, res));
router.post('/config', [authMiddleware, adminMiddleware], (req: Request, res: Response) => controller.batchUpdateConfig(req, res));
router.post('/password/reset-request', (req: Request, res: Response) => controller.requestPasswordReset(req, res));
router.post('/password/reset', (req: Request, res: Response) => controller.resetPassword(req, res));

export default router;
