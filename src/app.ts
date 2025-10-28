import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import config from './config';
import { initDatabase } from './config/database';
import logger from './config/logger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error';

const app: Application = express();

// 中间件配置
app.use(helmet()); // 安全头
app.use(cors()); // 跨域
app.use(express.json()); // JSON 解析
app.use(express.urlencoded({ extended: true })); // URL 编码解析

// 设置默认响应字符集为 UTF-8
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 日志中间件
if (config.app.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    })
  );
}

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API 路由
app.use(config.app.apiPrefix, routes);

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库
    await initDatabase();

    // 启动 HTTP 服务
    const port = config.app.port;
    app.listen(port, () => {
      console.log('=================================');
      console.log(`🚀 服务器启动成功!`);
      console.log(`📝 环境: ${config.app.env}`);
      console.log(`🌐 地址: http://localhost:${port}`);
      console.log(`📡 API: http://localhost:${port}${config.app.apiPrefix}`);
      console.log('=================================');
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号,正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号,正在关闭服务器...');
  process.exit(0);
});

// 启动
startServer();

export default app;

