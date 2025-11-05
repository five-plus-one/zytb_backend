import { Router } from 'express';
import { VolunteerCurrentController } from '../controllers/volunteerCurrent.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const controller = new VolunteerCurrentController();

// 所有接口都需要认证
router.use(authMiddleware);

// ==================== 当前志愿表基础操作 ====================

// 获取当前志愿表的完整内容
router.get('/', (req, res) => controller.getCurrent(req, res));

// 更新批次信息
router.put('/batch', (req, res) => controller.updateBatch(req, res));

// ==================== 专业组操作 ====================

// 添加专业组到当前表
router.post('/groups', (req, res) => controller.addGroup(req, res));

// 批量调整专业组顺序
router.put('/groups/reorder', (req, res) => controller.reorderGroups(req, res));

// 修改专业组设置
router.patch('/groups/:volunteerId', (req, res) => controller.updateGroup(req, res));

// 删除专业组
router.delete('/groups/:volunteerId', (req, res) => controller.deleteGroup(req, res));

// ==================== 专业操作 ====================

// 向专业组添加专业
router.post('/groups/:volunteerId/majors', (req, res) => controller.addMajor(req, res));

// 批量设置专业组的专业（覆盖）
router.put('/groups/:volunteerId/majors', (req, res) => controller.setMajors(req, res));

// 调整专业顺序
router.put('/groups/:volunteerId/majors/reorder', (req, res) => controller.reorderMajors(req, res));

// 删除专业
router.delete('/groups/:volunteerId/majors/:majorId', (req, res) => controller.deleteMajor(req, res));

export default router;
