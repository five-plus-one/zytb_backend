import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

export default {
  // 应用配置
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: '/api'
  },

  // 数据库配置
  database: {
    type: 'mysql' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'volunteer_system',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    entities: [path.join(__dirname, '../models/**/*.{ts,js}')],
    migrations: [path.join(__dirname, '../migrations/**/*.{ts,js}')],
    charset: 'utf8mb4',
    extra: {
      charset: 'utf8mb4_unicode_ci',
      connectionLimit: 10
    }
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    expiresIn: process.env.JWT_EXPIRE || '7d'
  },

  // 短信配置
  sms: {
    accessKey: process.env.SMS_ACCESS_KEY || '',
    secretKey: process.env.SMS_SECRET_KEY || '',
    signName: process.env.SMS_SIGN_NAME || '',
    templateCode: process.env.SMS_TEMPLATE_CODE || '',
    codeExpire: 300 // 验证码有效期(秒)
  },

  // 文件上传配置
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg']
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs'
  },

  // 志愿填报配置
  volunteer: {
    currentYear: 2024,
    maxVolunteerCount: 96,
    startDate: '2024-06-25',
    endDate: '2024-06-30'
  }
};
