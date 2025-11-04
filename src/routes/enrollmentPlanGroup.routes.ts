import { Router } from 'express';
import { EnrollmentPlanGroupController } from '../controllers/enrollmentPlanGroup.controller';

const router = Router();
const controller = new EnrollmentPlanGroupController();

// 查询专业组详细信息（包含历年分数）
router.get('/detail', (req, res) => controller.getGroupDetail(req, res));

// 查询某个学校的所有专业组招生计划
router.get('/college/:collegeCode', (req, res) => controller.getCollegeGroups(req, res));

// 根据group_id查询专业组详情
router.get('/:groupId', (req, res) => controller.getGroupById(req, res));

export default router;
