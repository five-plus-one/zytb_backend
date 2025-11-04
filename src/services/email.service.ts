import nodemailer from 'nodemailer';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../models/SystemConfig';

class EmailService {
  private configRepo = AppDataSource.getRepository(SystemConfig);

  async getTransporter() {
    const configs = await this.configRepo.find({
      where: [
        { key: 'smtp_host' },
        { key: 'smtp_port' },
        { key: 'smtp_user' },
        { key: 'smtp_password' },
        { key: 'smtp_from' }
      ]
    });

    const configMap = configs.reduce((map, config) => {
      map[config.key] = config.value;
      return map;
    }, {} as Record<string, string>);

    return nodemailer.createTransport({
      host: configMap.smtp_host,
      port: parseInt(configMap.smtp_port),
      secure: false,
      auth: {
        user: configMap.smtp_user,
        pass: configMap.smtp_password
      }
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    const configs = await this.configRepo.findOne({ where: { key: 'smtp_from' } });
    const from = configs?.value || 'noreply@example.com';

    const transporter = await this.getTransporter();

    await transporter.sendMail({
      from,
      to,
      subject,
      html
    });
  }

  async sendResetPasswordEmail(email: string, token: string, resetUrl: string) {
    const html = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>密码重置</h2>
        <p>您收到此邮件是因为您（或其他人）请求重置账户密码。</p>
        <p>请点击下面的链接重置密码：</p>
        <p><a href="${resetUrl}?token=${token}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px;">重置密码</a></p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
        <p>此链接将在30分钟后过期。</p>
      </div>
    `;

    await this.sendMail(email, '密码重置 - 志愿填报系统', html);
  }
}

export default new EmailService();
