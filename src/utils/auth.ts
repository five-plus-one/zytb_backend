import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from '../config';

const SALT_ROUNDS = 10;

export class AuthUtil {
  // 加密密码
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // 验证密码
  static async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // 生成 JWT token
  static generateToken(payload: { userId: string; username: string }): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    } as jwt.SignOptions);
  }

  // 验证 JWT token
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      return null;
    }
  }

  // 脱敏手机号
  static maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  // 脱敏身份证号
  static maskIdCard(idCard: string): string {
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }
}
