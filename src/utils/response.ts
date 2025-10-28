import { Response } from 'express';
import { ApiResponse } from '../types';

export class ResponseUtil {
  static success<T>(res: Response, data?: T, message = 'success'): void {
    const response: ApiResponse<T> = {
      code: 200,
      message,
      data
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(response);
  }

  static error(
    res: Response,
    message: string,
    code = 500,
    data?: any
  ): void {
    const response: ApiResponse = {
      code,
      message,
      data
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(code >= 500 ? 500 : code).json(response);
  }

  static badRequest(res: Response, message: string, data?: any): void {
    this.error(res, message, 400, data);
  }

  static unauthorized(res: Response, message = '未登录或 token 失效'): void {
    this.error(res, message, 401);
  }

  static forbidden(res: Response, message = '无权限访问'): void {
    this.error(res, message, 403);
  }

  static notFound(res: Response, message = '资源不存在'): void {
    this.error(res, message, 404);
  }
}
