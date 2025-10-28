import { Request, Response } from 'express';
import { MajorService } from '../services/major.service';
import { ResponseUtil } from '../utils/response';

const majorService = new MajorService();

export class MajorController {
  // 获取专业列表
  async getMajorList(req: Request, res: Response) {
    try {
      const query = req.query as any;
      const result = await majorService.getMajorList(query);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取专业详情
  async getMajorDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await majorService.getMajorDetail(id);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取专业开设院校
  async getMajorColleges(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const query = req.query as any;
      const result = await majorService.getMajorColleges(id, query);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 生成专业嵌入向量
  async generateMajorEmbedding(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await majorService.generateMajorEmbedding(id);
      ResponseUtil.success(res, { message: '嵌入向量生成成功' });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 批量生成所有专业嵌入向量
  async generateAllMajorEmbeddings(req: Request, res: Response) {
    try {
      // 异步执行，不阻塞响应
      majorService.generateAllMajorEmbeddings().catch(err => {
        console.error('生成嵌入向量失败:', err);
      });

      ResponseUtil.success(res, { message: '嵌入向量生成任务已启动' });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 计算专业匹配度
  async calculateMajorMatch(req: Request, res: Response) {
    try {
      const { majorId } = req.params;
      const preferences = req.body;

      // 验证必要的偏好数据
      if (!preferences || Object.keys(preferences).length === 0) {
        return ResponseUtil.error(res, '请提供用户偏好数据', 400);
      }

      const result = await majorService.calculateMajorMatch(
        preferences,
        majorId
      );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取所有专业匹配度排名
  async getMajorMatchRanking(req: Request, res: Response) {
    try {
      const preferences = req.body;

      // 验证必要的偏好数据
      if (!preferences || Object.keys(preferences).length === 0) {
        return ResponseUtil.error(res, '请提供用户偏好数据', 400);
      }

      const results = await majorService.calculateMajorMatch(preferences);

      // 分页处理
      const pageNum = parseInt(req.query.pageNum as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;

      ResponseUtil.success(res, {
        list: results.slice(start, end),
        total: results.length,
        pageNum,
        pageSize,
        totalPages: Math.ceil(results.length / pageSize)
      });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 添加专业优势院校
  async addAdvantageColleges(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { collegeIds } = req.body;

      if (!collegeIds || !Array.isArray(collegeIds) || collegeIds.length === 0) {
        return ResponseUtil.error(res, '请提供有效的院校ID数组', 400);
      }

      await majorService.addAdvantageColleges(id, collegeIds);
      ResponseUtil.success(res, { message: '优势院校添加成功' });
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
