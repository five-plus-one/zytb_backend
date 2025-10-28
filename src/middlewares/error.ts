import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { ResponseUtil } from '../utils/response';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 记录错误日志
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // 返回错误响应
  const message = err.message || '服务器内部错误';
  const code = err.statusCode || 500;

  ResponseUtil.error(res, message, code);
};

export const notFoundHandler = (req: Request, res: Response) => {
  ResponseUtil.notFound(res, `路由不存在: ${req.method} ${req.url}`);
};
