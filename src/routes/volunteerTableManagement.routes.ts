import { Router } from 'express';
import { VolunteerTableManagementController } from '../controllers/volunteerTableManagement.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const controller = new VolunteerTableManagementController();

// 所有接口都需要认证
router.use(authMiddleware);

// 获取用户所有志愿表列表
router.get('/', (req, res) => controller.getTablesList(req, res));

// 创建新志愿表
router.post('/', (req, res) => controller.createTable(req, res));

// 切换当前志愿表
router.put('/:tableId/activate', (req, res) => controller.activateTable(req, res));

// 更新志愿表信息
router.patch('/:tableId', (req, res) => controller.updateTable(req, res));

// 删除志愿表
router.delete('/:tableId', (req, res) => controller.deleteTable(req, res));

// 复制志愿表
router.post('/:tableId/duplicate', (req, res) => controller.duplicateTable(req, res));

export default router;
