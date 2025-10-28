import { Router } from 'express';
import { VolunteerController } from '../controllers/volunteer.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const volunteerController = new VolunteerController();

// 所有志愿相关接口都需要认证
router.use(authMiddleware);

// 获取我的志愿
router.get('/my', (req, res) => volunteerController.getMyVolunteers(req, res));

// 保存志愿(草稿)
router.post('/save', (req, res) => volunteerController.saveVolunteers(req, res));

// 提交志愿
router.post('/submit', (req, res) => volunteerController.submitVolunteers(req, res));

// 删除志愿
router.delete('/:id', (req, res) => volunteerController.deleteVolunteer(req, res));

// 志愿智能推荐
router.post('/recommend', (req, res) => volunteerController.recommendVolunteers(req, res));

// 志愿分析
router.post('/analyze', (req, res) => volunteerController.analyzeVolunteers(req, res));

export default router;
