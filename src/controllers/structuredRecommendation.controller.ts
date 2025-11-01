import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response';
import { SmartRecommendationService } from '../services/smartRecommendation.service';
import { StructuredDataTransformer } from '../services/structuredDataTransformer.service';
import { GroupDetailService } from '../services/groupDetail.service';
import { GroupComparisonService } from '../services/groupComparison.service';
import { UserPreferences } from '../interfaces/recommendation.interface';
import { ApiResponse, StructuredRecommendationResult } from '../types/structuredRecommendation';
import * as ExcelJS from 'exceljs';

/**
 * 结构化推荐 API 控制器
 *
 * 提供前端友好的结构化数据接口
 */
export class StructuredRecommendationController {
  private recommendationService = new SmartRecommendationService();
  private transformer = new StructuredDataTransformer();
  private detailService = new GroupDetailService();
  private comparisonService = new GroupComparisonService();

  /**
   * 获取结构化推荐
   * POST /api/recommendations/structured
   *
   * Body:
   * {
   *   "userProfile": {
   *     "score": 620,
   *     "rank": 8500,
   *     "province": "江苏",
   *     "category": "物理类",
   *     "year": 2025
   *   },
   *   "preferences": {
   *     "majors": ["计算机科学与技术", "软件工程"],
   *     "locations": ["江苏", "上海"],
   *     "collegeTypes": ["985", "211"]
   *   }
   * }
   */
  async getStructuredRecommendations(req: Request, res: Response) {
    try {
      const { userProfile, preferences } = req.body;

      // 参数验证
      if (!userProfile || !userProfile.score || !userProfile.rank || !userProfile.province || !userProfile.category) {
        return ResponseUtil.badRequest(res, '用户信息不完整，需要提供：score, rank, province, category');
      }

      console.log('[StructuredRecommendationController] 接收到请求:', {
        userProfile,
        preferences
      });

      // 构建偏好配置
      const userPreferences: UserPreferences = {
        majors: preferences?.majors,
        majorCategories: preferences?.majorCategories,
        locations: preferences?.locations,
        collegeTypes: preferences?.collegeTypes,
        maxTuition: preferences?.maxTuition,
        acceptCooperation: preferences?.acceptCooperation !== false,
        rushCount: preferences?.rushCount || 12,
        stableCount: preferences?.stableCount || 20,
        safeCount: preferences?.safeCount || 8
      };

      // 调用推荐服务
      const rawResult = await this.recommendationService.getSmartRecommendations(
        {
          score: userProfile.score,
          rank: userProfile.rank,
          province: userProfile.province,
          category: userProfile.category,
          year: userProfile.year || new Date().getFullYear()
        },
        userPreferences
      );

      // 计算过滤数量（这里简化处理，实际可以从服务中获取）
      const totalBeforeFilter = rawResult.rush.length + rawResult.stable.length + rawResult.safe.length;
      const filteredCount = 0; // TODO: 从服务中获取实际过滤数量

      // 转换为结构化格式
      const structuredResult = this.transformer.transformRecommendationResult(rawResult, filteredCount);

      console.log('[StructuredRecommendationController] 推荐生成成功:', {
        totalCount: structuredResult.summary.totalCount,
        rushCount: structuredResult.summary.rushCount,
        stableCount: structuredResult.summary.stableCount,
        safeCount: structuredResult.summary.safeCount
      });

      // 返回结构化响应
      const apiResponse: ApiResponse<StructuredRecommendationResult> = {
        success: true,
        data: structuredResult,
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };

      return res.status(200).json(apiResponse);

    } catch (error: any) {
      console.error('[StructuredRecommendationController] 错误:', error);

      const apiResponse: ApiResponse<any> = {
        success: false,
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: error.message || '推荐生成失败',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: Date.now()
      };

      return res.status(500).json(apiResponse);
    }
  }

  /**
   * 获取图表数据
   * POST /api/recommendations/charts
   */
  async getChartData(req: Request, res: Response) {
    try {
      const { userProfile, preferences } = req.body;

      if (!userProfile || !userProfile.score || !userProfile.rank || !userProfile.province || !userProfile.category) {
        return ResponseUtil.badRequest(res, '用户信息不完整');
      }

      // 获取推荐数据
      const rawResult = await this.recommendationService.getSmartRecommendations(
        {
          score: userProfile.score,
          rank: userProfile.rank,
          province: userProfile.province,
          category: userProfile.category,
          year: userProfile.year || new Date().getFullYear()
        },
        preferences || {}
      );

      // 转换为结构化格式
      const structuredResult = this.transformer.transformRecommendationResult(rawResult, 0);

      // 生成图表数据
      const chartData = this.transformer.generateChartData(structuredResult);

      const apiResponse: ApiResponse<any> = {
        success: true,
        data: chartData,
        timestamp: Date.now()
      };

      return res.status(200).json(apiResponse);

    } catch (error: any) {
      console.error('[StructuredRecommendationController] 图表数据错误:', error);
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 导出推荐结果为 Excel
   * POST /api/recommendations/export/excel
   */
  async exportToExcel(req: Request, res: Response) {
    try {
      const { userProfile, preferences } = req.body;

      if (!userProfile || !userProfile.score || !userProfile.rank || !userProfile.province || !userProfile.category) {
        return ResponseUtil.badRequest(res, '用户信息不完整');
      }

      // 获取推荐数据
      const rawResult = await this.recommendationService.getSmartRecommendations(
        {
          score: userProfile.score,
          rank: userProfile.rank,
          province: userProfile.province,
          category: userProfile.category,
          year: userProfile.year || new Date().getFullYear()
        },
        preferences || {}
      );

      // 转换为结构化格式
      const structuredResult = this.transformer.transformRecommendationResult(rawResult, 0);

      // 生成导出数据
      const exportData = this.transformer.generateExportData(structuredResult);

      // 创建 Excel 工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('志愿推荐表');

      // 添加表头
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        worksheet.addRow(headers);

        // 设置表头样式
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9D9D9' }
        };

        // 添加数据行
        exportData.forEach(row => {
          worksheet.addRow(Object.values(row));
        });

        // 自动调整列宽
        worksheet.columns.forEach((column: any) => {
          let maxLength = 0;
          column.eachCell!({ includeEmpty: true }, (cell: any) => {
            const length = cell.value ? cell.value.toString().length : 0;
            maxLength = Math.max(maxLength, length);
          });
          column.width = Math.min(maxLength + 2, 50);
        });
      }

      // 生成文件名
      const filename = `志愿推荐_${userProfile.province}_${userProfile.score}分_${Date.now()}.xlsx`;

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      // 写入响应
      await workbook.xlsx.write(res);
      res.end();

    } catch (error: any) {
      console.error('[StructuredRecommendationController] 导出错误:', error);
      return ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 获取专业组详情
   * GET /api/recommendations/group/:groupId
   * Query: ?score=620&rank=8500 (可选，用于计算录取概率)
   */
  async getGroupDetail(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const { score, rank } = req.query;

      console.log('[StructuredRecommendationController] 获取专业组详情:', {
        groupId,
        score,
        rank
      });

      // 构建用户信息（可选）
      const userProfile = score && rank ? {
        score: Number(score),
        rank: Number(rank)
      } : undefined;

      // 获取详情
      const detail = await this.detailService.getGroupDetail(groupId, userProfile);

      const apiResponse: ApiResponse<any> = {
        success: true,
        data: detail,
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };

      return res.status(200).json(apiResponse);

    } catch (error: any) {
      console.error('[StructuredRecommendationController] 获取详情错误:', error);

      const apiResponse: ApiResponse<any> = {
        success: false,
        error: {
          code: 'GROUP_DETAIL_ERROR',
          message: error.message || '获取专业组详情失败',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: Date.now()
      };

      return res.status(500).json(apiResponse);
    }
  }

  /**
   * 对比多个专业组
   * POST /api/recommendations/compare
   * Body: {
   *   groupIds: string[],
   *   userProfile?: { score: number, rank: number }
   * }
   */
  async compareGroups(req: Request, res: Response) {
    try {
      const { groupIds, userProfile } = req.body;

      if (!groupIds || !Array.isArray(groupIds) || groupIds.length < 2) {
        return ResponseUtil.badRequest(res, '需要提供至少2个专业组ID进行对比');
      }

      if (groupIds.length > 5) {
        return ResponseUtil.badRequest(res, '最多支持对比5个专业组');
      }

      console.log('[StructuredRecommendationController] 对比专业组:', {
        groupIds,
        hasUserProfile: !!userProfile
      });

      // 执行对比
      const comparisonResult = await this.comparisonService.compareGroups(
        groupIds,
        userProfile
      );

      const apiResponse: ApiResponse<any> = {
        success: true,
        data: comparisonResult,
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };

      return res.status(200).json(apiResponse);

    } catch (error: any) {
      console.error('[StructuredRecommendationController] 对比错误:', error);

      const apiResponse: ApiResponse<any> = {
        success: false,
        error: {
          code: 'GROUP_COMPARISON_ERROR',
          message: error.message || '专业组对比失败',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        timestamp: Date.now()
      };

      return res.status(500).json(apiResponse);
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
