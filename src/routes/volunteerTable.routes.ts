import { Router } from 'express';
import { VolunteerTableController } from '../controllers/volunteerTable.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const controller = new VolunteerTableController();

// 所有志愿表接口都需要认证
router.use(authMiddleware);

// 获取志愿表
router.get('/table', (req, res) => controller.getVolunteerTable(req, res));

// 添加志愿
router.post('/table/add', (req, res) => controller.addVolunteer(req, res));

// 批量调整顺序
router.put('/table/reorder', (req, res) => controller.reorderVolunteers(req, res));

// 删除志愿
router.delete('/table/:volunteerId', (req, res) => controller.deleteVolunteer(req, res));

// 导出志愿表
router.get('/table/export', (req, res) => controller.exportVolunteerTable(req, res));

// 智能优化志愿顺序
router.post('/table/optimize', (req, res) => controller.optimizeVolunteerOrder(req, res));

export default router;
