import { Router } from 'express';
import userRoutes from './user.routes';
import collegeRoutes from './college.routes';
import majorRoutes from './major.routes';
import volunteerRoutes from './volunteer.routes';
import systemRoutes from './system.routes';
import enrollmentPlanRoutes from './enrollmentPlan.routes';
import admissionScoreRoutes from './admissionScore.routes';
import scoreRankingRoutes from './scoreRanking.routes';
import agentRoutes from './agent.routes';
import diagnosticRoutes from './diagnostic.routes';
import toolsRoutes from './tools.routes';
import equivalentScoreRoutes from './equivalentScore.routes';
import majorFilterRoutes from './majorFilter.routes';
import enrollmentPlanDetailRoutes from './enrollmentPlanDetail.routes';
import aiRoutes from './ai.routes';

const router = Router();

// 挂载各模块路由
router.use('/user', userRoutes);
router.use('/college', collegeRoutes);
router.use('/major', majorRoutes);
router.use('/volunteer', volunteerRoutes);
router.use('/system', systemRoutes);
router.use('/enrollment-plan', enrollmentPlanRoutes);
router.use('/admission-score', admissionScoreRoutes);
router.use('/score-ranking', scoreRankingRoutes);
router.use('/agent', agentRoutes);
router.use('/agent/tools', toolsRoutes); // AI 工具路由
router.use('/diagnostic', diagnosticRoutes);

// 新增路由
router.use('/equivalent-score', equivalentScoreRoutes);  // 等位分查询
router.use('/major-filter', majorFilterRoutes);          // 专业筛选
router.use('/enrollment-plan-detail', enrollmentPlanDetailRoutes); // 招生计划详情

// AI Agent 路由
router.use('/ai', aiRoutes);  // 智能AI助手

// 健康检查接口
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default router;
