import { validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ResponseUtil } from './response';

// 验证结果处理中间件
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return ResponseUtil.badRequest(res, errorMessages[0], errors.array());
  }
  next();
};

// 分页参数验证
export const validatePageParams = (pageNum: any, pageSize: any) => {
  const num = parseInt(pageNum) || 1;
  const size = parseInt(pageSize) || 10;

  return {
    pageNum: num < 1 ? 1 : num,
    pageSize: size < 1 ? 10 : size > 100 ? 100 : size
  };
};

// 计算分页数据
export const calculatePagination = (total: number, pageNum: number, pageSize: number) => {
  return {
    total,
    pageNum,
    pageSize,
    pages: Math.ceil(total / pageSize)
  };
};
