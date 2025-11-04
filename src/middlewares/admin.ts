import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { ResponseUtil } from '../utils/response';
import { AuthRequest } from '../types';

export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as AuthRequest).userId;

    if (!userId) {
      return ResponseUtil.unauthorized(res);
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user || user.role !== 'admin') {
      return ResponseUtil.error(res, '需要管理员权限', 403);
    }

    next();
  } catch (error) {
    ResponseUtil.error(res, '权限验证失败', 500);
  }
};
