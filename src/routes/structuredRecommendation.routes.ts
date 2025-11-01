import { Router } from 'express';
import { StructuredRecommendationController } from '../controllers/structuredRecommendation.controller';

const router = Router();
const controller = new StructuredRecommendationController();

/**
 * 结构化推荐 API 路由
 *
 * 所有路由前缀: /api/recommendations
 */

/**
 * @route   POST /api/recommendations/structured
 * @desc    获取结构化推荐（前端友好格式）
 * @access  Public
 * @body    { userProfile: {...}, preferences: {...} }
 * @returns { success, data: StructuredRecommendationResult, timestamp, requestId }
 */
router.post('/structured', (req, res) => controller.getStructuredRecommendations(req, res));

/**
 * @route   POST /api/recommendations/charts
 * @desc    获取图表数据（饼图、趋势图等）
 * @access  Public
 * @body    { userProfile: {...}, preferences: {...} }
 * @returns { success, data: ChartData, timestamp }
 */
router.post('/charts', (req, res) => controller.getChartData(req, res));

/**
 * @route   POST /api/recommendations/export/excel
 * @desc    导出推荐结果为 Excel 文件
 * @access  Public
 * @body    { userProfile: {...}, preferences: {...} }
 * @returns Excel file download
 */
router.post('/export/excel', (req, res) => controller.exportToExcel(req, res));

/**
 * @route   GET /api/recommendations/group/:groupId
 * @desc    获取单个专业组详情
 * @access  Public
 * @param   groupId - 专业组ID
 * @returns { success, data: StructuredGroupRecommendation }
 */
router.get('/group/:groupId', (req, res) => controller.getGroupDetail(req, res));

/**
 * @route   POST /api/recommendations/compare
 * @desc    对比多个专业组
 * @access  Public
 * @body    { groupIds: string[] }
 * @returns { success, data: { groups: [...], comparison: [...] } }
 */
router.post('/compare', (req, res) => controller.compareGroups(req, res));

export default router;
