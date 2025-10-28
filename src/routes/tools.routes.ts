import { Router } from 'express';
import { ToolsController } from '../controllers/tools.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

/**
 * AI 工具路由
 * 所有路由都需要认证
 */

// ========== 查询工具 ==========

// 1. 搜索院校
router.get('/search-college', authMiddleware, ToolsController.searchCollege);

// 2. 搜索专业
router.get('/search-major', authMiddleware, ToolsController.searchMajor);

// 3. 根据分数推荐院校
router.get('/recommend-colleges', authMiddleware, ToolsController.recommendColleges);

// 4. 查询历年录取分数线
router.get('/admission-scores', authMiddleware, ToolsController.getAdmissionScores);

// 5. 查询分数对应排名
router.get('/score-rank', authMiddleware, ToolsController.getScoreRank);

// 6. 查询城市信息
router.get('/city-info', authMiddleware, ToolsController.getCityInfo);

// 7. 查询院校详细信息
router.get('/college-detail/:collegeId', authMiddleware, ToolsController.getCollegeDetail);

// 8. 查询专业详细信息
router.get('/major-detail/:majorId', authMiddleware, ToolsController.getMajorDetail);

// ========== 志愿表操作工具 ==========

// 9. 获取用户志愿表
router.get('/volunteers', authMiddleware, ToolsController.getUserVolunteers);

// 10. 添加志愿
router.post('/volunteers', authMiddleware, ToolsController.addVolunteer);

// 11. 删除志愿
router.delete('/volunteers/:volunteerId', authMiddleware, ToolsController.deleteVolunteer);

// 12. 调整志愿顺序
router.put('/volunteers/:volunteerId/order', authMiddleware, ToolsController.reorderVolunteer);

export default router;
