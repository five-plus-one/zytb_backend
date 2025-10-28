import { Request, Response } from 'express';
import { AdmissionScoreService } from '../services/admissionScore.service';
import { ResponseUtil } from '../utils/response';

const admissionScoreService = new AdmissionScoreService();

export class AdmissionScoreController {
  // 获取录取分数线列表
  async getAdmissionScoreList(req: Request, res: Response) {
    try {
      const query = req.query as any;
      const result = await admissionScoreService.getAdmissionScoreList(query);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取录取分数线详情
  async getAdmissionScoreDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await admissionScoreService.getAdmissionScoreDetail(id);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 按院校获取录取分数线
  async getScoresByCollege(req: Request, res: Response) {
    try {
      const { collegeName } = req.params;
      const { year, sourceProvince } = req.query as any;

      const result = await admissionScoreService.getScoresByCollege(
        decodeURIComponent(collegeName),
        year ? parseInt(year) : undefined,
        sourceProvince
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 按专业获取录取分数线
  async getScoresByMajor(req: Request, res: Response) {
    try {
      const { majorName } = req.params;
      const { year, sourceProvince } = req.query as any;

      const result = await admissionScoreService.getScoresByMajor(
        decodeURIComponent(majorName),
        year ? parseInt(year) : undefined,
        sourceProvince
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取历年分数线趋势
  async getScoreTrend(req: Request, res: Response) {
    try {
      const { collegeName, majorName, sourceProvince, years } = req.query as any;

      if (!collegeName || !majorName || !sourceProvince) {
        return ResponseUtil.badRequest(res, '院校名称、专业名称和生源地参数必填');
      }

      const result = await admissionScoreService.getScoreTrend(
        collegeName,
        majorName,
        sourceProvince,
        years ? parseInt(years) : undefined
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取分数线统计信息
  async getScoreStatistics(req: Request, res: Response) {
    try {
      const { year, sourceProvince } = req.query as any;

      if (!year || !sourceProvince) {
        return ResponseUtil.badRequest(res, '年份和生源地参数必填');
      }

      const result = await admissionScoreService.getScoreStatistics(
        parseInt(year),
        sourceProvince
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取可用的年份列表
  async getAvailableYears(req: Request, res: Response) {
    try {
      const result = await admissionScoreService.getAvailableYears();
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取可用的生源地列表
  async getAvailableProvinces(req: Request, res: Response) {
    try {
      const { year } = req.query as any;
      const result = await admissionScoreService.getAvailableProvinces(
        year ? parseInt(year) : undefined
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 根据分数推荐院校和专业
  async recommendByScore(req: Request, res: Response) {
    try {
      const { score, sourceProvince, subjectType, year, range } = req.query as any;

      if (!score || !sourceProvince || !subjectType) {
        return ResponseUtil.badRequest(res, '分数、生源地和科类参数必填');
      }

      const result = await admissionScoreService.recommendByScore(
        parseInt(score),
        sourceProvince,
        subjectType,
        year ? parseInt(year) : undefined,
        range ? parseInt(range) : undefined
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
