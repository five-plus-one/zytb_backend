import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../models/SystemConfig';
import { User } from '../models/User';
import emailService from '../services/email.service';
import cacheService from '../services/cache.service';
import { AuthUtil } from '../utils/auth';
import { ResponseUtil } from '../utils/response';
import { randomBytes } from 'crypto';

export class AdminController {
  private configRepo = AppDataSource.getRepository(SystemConfig);
  private userRepo = AppDataSource.getRepository(User);

  // 获取系统配置
  async getConfig(req: Request, res: Response) {
    try {
      const { keys } = req.query;
      const query = this.configRepo.createQueryBuilder('config');

      if (keys) {
        const keyArray = (keys as string).split(',');
        query.where('config.key IN (:...keys)', { keys: keyArray });
      }

      const configs = await query.getMany();
      const result = configs.reduce((map, config) => {
        map[config.key] = config.value;
        return map;
      }, {} as Record<string, string>);

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 批量更新配置
  async batchUpdateConfig(req: Request, res: Response) {
    try {
      const { configs } = req.body;

      if (!configs || typeof configs !== 'object') {
        return ResponseUtil.badRequest(res, '配置格式错误');
      }

      for (const [key, value] of Object.entries(configs)) {
        let config = await this.configRepo.findOne({ where: { key } });

        if (!config) {
          config = this.configRepo.create({ key, value: value as string });
        } else {
          config.value = value as string;
        }

        await this.configRepo.save(config);
      }

      ResponseUtil.success(res, null, '批量更新成功');
    } catch (error: any) {
      ResponseUtil.error(res, error.message);
    }
  }

  // 请求密码重置
  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return ResponseUtil.badRequest(res, '邮箱不能为空');
      }

      const user = await this.userRepo.findOne({ where: { email } });

      if (!user) {
        return ResponseUtil.success(res, null, '如果该邮箱存在，将收到重置链接');
      }

      const token = randomBytes(32).toString('hex');
      await cacheService.set(`reset:${token}`, user.id, { ttl: 1800 });

      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password`;
      await emailService.sendResetPasswordEmail(email, token, resetUrl);

      ResponseUtil.success(res, null, '重置链接已发送到您的邮箱');
    } catch (error: any) {
      console.error('Password reset request error:', error);
      ResponseUtil.error(res, '发送重置邮件失败');
    }
  }

  // 重置密码
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return ResponseUtil.badRequest(res, '缺少必要参数');
      }

      if (newPassword.length < 6 || newPassword.length > 20) {
        return ResponseUtil.badRequest(res, '密码长度为6-20位');
      }

      const userId = await cacheService.get(`reset:${token}`);

      if (!userId) {
        return ResponseUtil.error(res, '重置链接无效或已过期', 400);
      }

      const user = await this.userRepo.findOne({ where: { id: userId } });

      if (!user) {
        return ResponseUtil.error(res, '用户不存在', 404);
      }

      user.password = await AuthUtil.hashPassword(newPassword);
      await this.userRepo.save(user);

      await cacheService.del(`reset:${token}`);

      ResponseUtil.success(res, null, '密码重置成功');
    } catch (error: any) {
      console.error('Password reset error:', error);
      ResponseUtil.error(res, '密码重置失败');
    }
  }
}
