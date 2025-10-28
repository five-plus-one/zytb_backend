import { Request, Response } from 'express';
import { SystemService } from '../services/system.service';
import { ResponseUtil } from '../utils/response';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config';

const systemService = new SystemService();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = config.upload.path;
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

export class SystemController {
  // 获取省份列表
  getProvinces(req: Request, res: Response) {
    try {
      const result = systemService.getProvinces();
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取数据字典
  getDict(req: Request, res: Response) {
    try {
      const { type } = req.query;
      if (!type) {
        return ResponseUtil.badRequest(res, '字典类型参数必填');
      }

      const result = systemService.getDict(type as string);
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取系统配置
  getConfig(req: Request, res: Response) {
    try {
      const result = systemService.getConfig();
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 数据统计
  async getStatistics(req: Request, res: Response) {
    try {
      const result = await systemService.getStatistics();
      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 文件上传
  uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return ResponseUtil.badRequest(res, '请选择要上传的文件');
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      ResponseUtil.success(
        res,
        {
          url: fileUrl,
          filename: req.file.originalname,
          size: req.file.size
        },
        '上传成功'
      );
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}

export const uploadMiddleware = upload.single('file');
