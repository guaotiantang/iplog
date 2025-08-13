/**
 * This is a API server
 */

import express, { type Request, type Response, type NextFunction }  from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import ipRoutes from './routes/ip';
import { initDatabase, cleanupExpiredIPs } from './database/init';
import { ConfigService } from './services/ipService';

// for esm mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load env
dotenv.config();

// 初始化数据库
initDatabase().catch(console.error);

// 动态定时清理任务
let cleanupTimer: NodeJS.Timeout | null = null;
let nextCleanupTime: number = 0; // 下次清理的时间戳

const startAutoCleanup = async () => {
  try {
    // 获取自动清理配置
    const config = await ConfigService.getAutoCleanup();
    
    // 清除现有定时器
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
    }
    
    if (config.enabled) {
      console.log(`Starting auto cleanup with interval: ${config.interval} seconds`);
      
      // 设置下次清理时间
      nextCleanupTime = Date.now() + config.interval * 1000;
      
      // 设置新的定时器
      cleanupTimer = setInterval(async () => {
        try {
          await cleanupExpiredIPs();
          // 更新下次清理时间
          nextCleanupTime = Date.now() + config.interval * 1000;
        } catch (error) {
          console.error('Scheduled cleanup failed:', error);
        }
      }, config.interval * 1000);
    } else {
      console.log('Auto cleanup is disabled');
    }
  } catch (error) {
    console.error('Failed to start auto cleanup:', error);
    // 如果获取配置失败，使用默认的5分钟间隔
    nextCleanupTime = Date.now() + 300 * 1000;
    cleanupTimer = setInterval(async () => {
      try {
        await cleanupExpiredIPs();
        nextCleanupTime = Date.now() + 300 * 1000;
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, 300 * 1000); // 5分钟
  }
};

// 启动自动清理
startAutoCleanup();

// 导出重启清理任务的函数，供路由使用
export const restartAutoCleanup = startAutoCleanup;

// 导出获取下次清理时间的函数
export const getNextCleanupTime = (): number => nextCleanupTime;

const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Static files (production)
 */
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
}

/**
 * API Routes
 */
app.use('/api/ip', ipRoutes);

/**
 * health
 */
app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({
    success: true,
    message: 'ok'
  });
});

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error'
  });
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  // 在生产环境中，对于非API路由返回index.html（支持Vue Router）
  if (process.env.NODE_ENV === 'production' && !req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      success: false,
      error: 'API not found'
    });
  }
});

export default app;