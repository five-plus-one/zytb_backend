import { Request, Response } from 'express';
import { ScoreRankingService } from '../services/scoreRanking.service';
import { ResponseUtil } from '../utils/response';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const scoreRankingService = new ScoreRankingService();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/score-ranking';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'score-ranking-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 Excel (.xlsx, .xls) 和 CSV 文件'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

export class ScoreRankingController {
  // 获取一分一段列表
  async getScoreRankingList(req: Request, res: Response) {
    try {
      const query = req.query as any;
      const result = await scoreRankingService.getScoreRankingList(query);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 根据分数查询位次
  async getRankByScore(req: Request, res: Response) {
    try {
      const { year, province, subjectType, score } = req.query as any;

      if (!year || !province || !subjectType || score === undefined) {
        return ResponseUtil.badRequest(res, '年份、省份、科类和分数参数必填');
      }

      const result = await scoreRankingService.getRankByScore(
        parseInt(year),
        province,
        subjectType,
        parseInt(score)
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 根据位次查询分数
  async getScoreByRank(req: Request, res: Response) {
    try {
      const { year, province, subjectType, rank } = req.query as any;

      if (!year || !province || !subjectType || !rank) {
        return ResponseUtil.badRequest(res, '年份、省份、科类和位次参数必填');
      }

      const result = await scoreRankingService.getScoreByRank(
        parseInt(year),
        province,
        subjectType,
        parseInt(rank)
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取分数段统计
  async getScoreDistribution(req: Request, res: Response) {
    try {
      const { year, province, subjectType } = req.query as any;

      if (!year || !province || !subjectType) {
        return ResponseUtil.badRequest(res, '年份、省份和科类参数必填');
      }

      const result = await scoreRankingService.getScoreDistribution(
        parseInt(year),
        province,
        subjectType
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取可用的年份列表
  async getAvailableYears(req: Request, res: Response) {
    try {
      const { province } = req.query as any;
      const result = await scoreRankingService.getAvailableYears(province);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取可用的省份列表
  async getAvailableProvinces(req: Request, res: Response) {
    try {
      const { year } = req.query as any;
      const result = await scoreRankingService.getAvailableProvinces(
        year ? parseInt(year) : undefined
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 批量查询多个分数的位次
  async batchGetRankByScores(req: Request, res: Response) {
    try {
      const { year, province, subjectType, scores } = req.body;

      if (!year || !province || !subjectType || !scores || !Array.isArray(scores)) {
        return ResponseUtil.badRequest(res, '年份、省份、科类和分数数组参数必填');
      }

      const result = await scoreRankingService.batchGetRankByScores(
        year,
        province,
        subjectType,
        scores
      );
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // Excel 导入
  async importFromExcel(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ResponseUtil.badRequest(res, '请上传文件');
      }

      const clearExisting = req.body.clearExisting === 'true' || req.body.clearExisting === true;

      const result = await scoreRankingService.importFromExcel(req.file.path, {
        clearExisting
      });

      // 导入完成后删除临时文件
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('删除临时文件失败:', err);
      }

      if (result.success) {
        ResponseUtil.success(res, result);
      } else {
        ResponseUtil.badRequest(res, result.message, result);
      }
    } catch (error: any) {
      // 删除临时文件
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('删除临时文件失败:', err);
        }
      }
      ResponseUtil.error(res, error.message);
    }
  }

  // 清空数据
  async clearData(req: Request, res: Response) {
    try {
      const { year, province, subjectType } = req.body;

      if (!year && !province && !subjectType) {
        return ResponseUtil.badRequest(res, '至少需要提供一个筛选条件（年份、省份或科类）');
      }

      const result = await scoreRankingService.clearData(
        year ? parseInt(year) : undefined,
        province,
        subjectType
      );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
