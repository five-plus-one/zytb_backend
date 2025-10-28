// 短信验证码存储 (生产环境建议使用 Redis)
const verificationCodes = new Map<string, { code: string; expire: number }>();

export class SmsUtil {
  // 生成6位随机验证码
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 发送验证码 (这里是模拟实现,实际应该调用短信服务商 API)
  static async sendCode(phone: string, type: string): Promise<boolean> {
    try {
      const code = this.generateCode();
      const expire = Date.now() + 5 * 60 * 1000; // 5分钟后过期

      // 存储验证码
      verificationCodes.set(`${phone}_${type}`, { code, expire });

      // 在开发环境打印验证码
      console.log(`📱 验证码已发送到 ${phone}: ${code}`);

      // TODO: 调用实际的短信服务 API
      // await smsService.send(phone, code);

      return true;
    } catch (error) {
      console.error('发送验证码失败:', error);
      return false;
    }
  }

  // 验证验证码
  static verifyCode(phone: string, type: string, code: string): boolean {
    const key = `${phone}_${type}`;
    const stored = verificationCodes.get(key);

    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expire) {
      verificationCodes.delete(key);
      return false;
    }

    if (stored.code !== code) {
      return false;
    }

    // 验证成功后删除验证码
    verificationCodes.delete(key);
    return true;
  }

  // 清理过期验证码
  static clearExpiredCodes(): void {
    const now = Date.now();
    for (const [key, value] of verificationCodes.entries()) {
      if (now > value.expire) {
        verificationCodes.delete(key);
      }
    }
  }
}

// 每10分钟清理一次过期验证码
setInterval(() => {
  SmsUtil.clearExpiredCodes();
}, 10 * 60 * 1000);
