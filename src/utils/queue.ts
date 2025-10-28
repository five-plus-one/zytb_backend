/**
 * 并发队列管理工具
 * 用于控制LLM API请求的并发数量和频率
 */

interface QueueTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

export class RequestQueue {
  private queue: QueueTask<any>[] = [];
  private running: number = 0;
  private lastRequestTime: number = 0;

  constructor(
    private maxConcurrency: number = 3,      // 最大并发数
    private minInterval: number = 200,       // 最小请求间隔(毫秒)
    private maxRequestsPerMinute: number = 20 // 每分钟最大请求数
  ) {}

  private requestTimestamps: number[] = [];

  /**
   * 添加任务到队列
   */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrency) {
      return; // 已达到最大并发
    }

    if (this.queue.length === 0) {
      return; // 队列为空
    }

    // 检查频率限制
    if (!this.canMakeRequest()) {
      // 等待一段时间后重试
      setTimeout(() => this.processQueue(), 100);
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.running++;
    this.recordRequest();

    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } finally {
      this.running--;
      this.processQueue(); // 继续处理队列
    }
  }

  /**
   * 检查是否可以发起请求
   */
  private canMakeRequest(): boolean {
    const now = Date.now();

    // 检查最小间隔
    if (now - this.lastRequestTime < this.minInterval) {
      return false;
    }

    // 检查每分钟请求数
    const oneMinuteAgo = now - 60000;
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneMinuteAgo);

    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      return false;
    }

    return true;
  }

  /**
   * 记录请求时间
   */
  private recordRequest(): void {
    const now = Date.now();
    this.lastRequestTime = now;
    this.requestTimestamps.push(now);
  }

  /**
   * 获取队列状态
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      running: this.running,
      maxConcurrency: this.maxConcurrency
    };
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue.forEach(task => {
      task.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

/**
 * 重试工具
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果是最后一次重试,直接抛出错误
      if (i === maxRetries - 1) {
        break;
      }

      // 指数退避
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 延迟工具
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 超时包装器
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutError));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}
