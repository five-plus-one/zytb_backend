import { Request, Response, NextFunction } from 'express';
import { AuthUtil } from '../utils/auth';
import { ResponseUtil } from '../utils/response';
import { AuthRequest } from '../types';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.unauthorized(res);
    }

    const token = authHeader.substring(7);

    // 验证 token
    const decoded = AuthUtil.verifyToken(token);
    if (!decoded) {
      return ResponseUtil.unauthorized(res, 'token 已失效');
    }

    // 将用户信息附加到请求对象
    (req as AuthRequest).userId = decoded.userId;
    (req as AuthRequest).user = {
      userId: decoded.userId,
      username: decoded.username
    };

    next();
  } catch (error) {
    return ResponseUtil.unauthorized(res);
  }
};
