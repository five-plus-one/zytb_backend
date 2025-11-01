import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { ResponseUtil } from '../utils/response';
import { SmsUtil } from '../utils/sms';
import { AuthRequest } from '../types';

const userService = new UserService();

export class UserController {
  // 用户注册
  async register(req: Request, res: Response) {
    try {
      const { username, password, nickname, phone, email } = req.body;

      const result = await userService.register({
        username,
        password,
        nickname,
        phone,
        email
      });

      ResponseUtil.success(res, result, '注册成功');
    } catch (error: any) {
      console.error('Register error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  // 用户登录
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      const result = await userService.login({ username, password });

      ResponseUtil.success(res, result, '登录成功');
    } catch (error: any) {
      console.error('Login error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  // 获取用户信息
  async getUserInfo(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;

      const result = await userService.getUserInfo(userId);

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 更新用户信息
  async updateUserInfo(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;
      const data = req.body;

      const result = await userService.updateUserInfo(userId, data);

      ResponseUtil.success(res, result, '更新成功');
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 修改密码
  async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as AuthRequest).userId!;
      const { oldPassword, newPassword } = req.body;

      await userService.changePassword(userId, oldPassword, newPassword);

      ResponseUtil.success(res, null, '密码修改成功');
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 发送验证码
  async sendVerifyCode(req: Request, res: Response) {
    try {
      const { phone, type } = req.body;

      const success = await SmsUtil.sendCode(phone, type);

      if (!success) {
        return ResponseUtil.error(res, '发送失败,请稍后重试');
      }

      ResponseUtil.success(
        res,
        { expire: 300 },
        '验证码已发送'
      );
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }
}
