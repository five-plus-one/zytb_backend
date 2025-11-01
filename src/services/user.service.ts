import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { AuthUtil } from '../utils/auth';
import { UserRegisterDto, UserLoginDto, UserUpdateDto } from '../types';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  // 用户注册
  async register(data: UserRegisterDto) {
    console.log('Register data:', JSON.stringify(data, null, 2));

    // 检查必填字段
    if (!data.username || !data.password || !data.phone) {
      throw new Error('用户名、密码和手机号为必填项');
    }

    // 检查用户名是否存在
    const existingUser = await this.userRepository.findOne({
      where: { username: data.username }
    });
    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 检查手机号是否已注册
    if (data.phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone: data.phone }
      });
      if (existingPhone) {
        throw new Error('手机号已注册');
      }
    }

    // 加密密码
    const hashedPassword = await AuthUtil.hashPassword(data.password);

    // 创建用户
    const user = this.userRepository.create({
      username: data.username,
      password: hashedPassword,
      nickname: data.nickname || data.username,
      phone: data.phone,
      email: data.email
    });

    console.log('Saving user:', JSON.stringify(user, null, 2));
    await this.userRepository.save(user);
    console.log('User saved successfully, id:', user.id);

    // 生成 token
    const token = AuthUtil.generateToken({
      userId: user.id,
      username: user.username
    });

    return {
      userId: user.id,
      username: user.username,
      token
    };
  }

  // 用户登录
  async login(data: UserLoginDto) {
    console.log('Login data:', JSON.stringify(data, null, 2));

    // 查找用户(支持用户名或手机号登录)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username OR user.phone = :username', {
        username: data.username
      })
      .getOne();

    console.log('Found user:', user ? user.id : 'null');

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await AuthUtil.comparePassword(
      data.password,
      user.password
    );
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    // 生成 token
    const token = AuthUtil.generateToken({
      userId: user.id,
      username: user.username
    });

    console.log('Generating response...');
    const response = {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: AuthUtil.maskPhone(user.phone),
      email: user.email,
      token,
      tokenExpire: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    console.log('Response generated successfully');

    return response;
  }

  // 获取用户信息
  async getUserInfo(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: AuthUtil.maskPhone(user.phone),
      email: user.email,
      realName: user.realName,
      idCard: user.idCard ? AuthUtil.maskIdCard(user.idCard) : undefined,
      province: user.province,
      city: user.city,
      school: user.school,
      examYear: user.examYear,
      examScore: user.examScore,
      subjectType: user.subjectType,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  // 更新用户信息
  async updateUserInfo(userId: string, data: UserUpdateDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 更新字段
    Object.assign(user, data);
    await this.userRepository.save(user);

    return {
      userId: user.id,
      nickname: user.nickname
    };
  }

  // 修改密码
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证旧密码
    const isPasswordValid = await AuthUtil.comparePassword(
      oldPassword,
      user.password
    );
    if (!isPasswordValid) {
      throw new Error('旧密码错误');
    }

    // 更新密码
    user.password = await AuthUtil.hashPassword(newPassword);
    await this.userRepository.save(user);
  }
}
