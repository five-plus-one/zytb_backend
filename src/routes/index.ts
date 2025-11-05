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
import structuredRecommendationRoutes from './structuredRecommendation.routes';
import enrollmentPlanGroupRoutes from './enrollmentPlanGroup.routes';
import enrollmentPlanSearchRoutes from './enrollmentPlanSearch.routes';
import adminRoutes from './admin.routes';
import groupDetailRoutes from './groupDetail.routes';
import probabilityRoutes from './probability.routes';
import volunteerTableRoutes from './volunteerTable.routes';
import favoriteRoutes from './favorite.routes';

const router = Router();

// 挂载各模块路由
router.use('/user', userRoutes);
router.use('/college', collegeRoutes);
router.use('/major', majorRoutes);
router.use('/volunteer', volunteerRoutes);
router.use('/volunteer', volunteerTableRoutes); // 新增志愿表管理路由
router.use('/system', systemRoutes);
router.use('/enrollment-plan', enrollmentPlanSearchRoutes); // 搜索路由（必须在前面，避免被/:id拦截）
router.use('/enrollment-plan', groupDetailRoutes); // 专业组详情路由
router.use('/enrollment-plan', enrollmentPlanRoutes);
router.use('/admission-score', admissionScoreRoutes);
router.use('/admission-probability', probabilityRoutes); // 录取概率计算
router.use('/score-ranking', scoreRankingRoutes);
router.use('/agent', agentRoutes);
router.use('/agent/tools', toolsRoutes); // AI 工具路由
router.use('/diagnostic', diagnosticRoutes);

// 新增路由
router.use('/equivalent-score', equivalentScoreRoutes);  // 等位分查询
router.use('/major-filter', majorFilterRoutes);          // 专业筛选
router.use('/enrollment-plan-detail', enrollmentPlanDetailRoutes); // 招生计划详情
router.use('/groups', enrollmentPlanGroupRoutes);        // 专业组查询（包含历年分数）

// AI Agent 路由
router.use('/ai', aiRoutes);  // 智能AI助手

// 结构化推荐 API
router.use('/recommendations', structuredRecommendationRoutes);  // 结构化推荐接口

// 管理员路由
router.use('/admin', adminRoutes);

// 收藏路由
router.use('/favorites', favoriteRoutes);

// 健康检查接口
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default router;
