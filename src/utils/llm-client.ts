import axios, { AxiosInstance } from 'axios';
import { RequestQueue, retryWithBackoff, withTimeout } from './queue';

/**
 * LLM API客户端
 * 支持OpenAI兼容的API接口
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface LLMCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: LLMMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export class LLMClient {
  private client: AxiosInstance;
  private requestQueue: RequestQueue;

  constructor(
    private apiKey: string,
    private baseURL: string = 'https://api.openai.com/v1',
    private defaultModel: string = 'gpt-3.5-turbo'
  ) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60秒超时
    });

    // 初始化请求队列
    this.requestQueue = new RequestQueue(
      3,    // 最大并发3个请求
      200,  // 请求间隔200ms
      20    // 每分钟最多20个请求
    );
  }

  /**
   * 普通对话完成(非流式)
   */
  async createCompletion(
    messages: LLMMessage[],
    options?: Partial<LLMCompletionRequest>
  ): Promise<LLMCompletionResponse> {
    const request: LLMCompletionRequest = {
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      stream: false,
      ...options
    };

    // 使用队列控制并发
    return this.requestQueue.add(async () => {
      // 带重试的请求
      return retryWithBackoff(async () => {
        const response = await this.client.post<LLMCompletionResponse>(
          '/chat/completions',
          request
        );
        return response.data;
      }, 3, 1000);
    });
  }

  /**
   * 流式对话完成
   * 返回一个异步迭代器
   */
  async *createCompletionStream(
    messages: LLMMessage[],
    options?: Partial<LLMCompletionRequest>
  ): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const request: LLMCompletionRequest = {
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
      stream: true,
      ...options
    };

    // 使用队列控制并发
    const response = await this.requestQueue.add(async () => {
      return this.client.post('/chat/completions', request, {
        responseType: 'stream',
        timeout: 120000 // 流式请求超时时间更长
      });
    });

    const stream = response.data;

    let buffer = '';

    // 处理流式响应
    for await (const chunk of stream) {
      buffer += chunk.toString();

      // 按行分割
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的行

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine === '') continue;
        if (trimmedLine === 'data: [DONE]') return;
        if (!trimmedLine.startsWith('data: ')) continue;

        try {
          const jsonStr = trimmedLine.substring(6); // 移除 "data: " 前缀
          const data: LLMStreamChunk = JSON.parse(jsonStr);
          yield data;
        } catch (error) {
          console.error('Failed to parse SSE data:', trimmedLine, error);
        }
      }
    }
  }

  /**
   * 提取流式响应的文本内容
   */
  async getStreamedText(
    messages: LLMMessage[],
    options?: Partial<LLMCompletionRequest>
  ): Promise<string> {
    let fullText = '';

    for await (const chunk of this.createCompletionStream(messages, options)) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullText += content;
      }
    }

    return fullText;
  }

  /**
   * 批量请求
   */
  async batchCompletions(
    requests: Array<{ messages: LLMMessage[]; options?: Partial<LLMCompletionRequest> }>
  ): Promise<LLMCompletionResponse[]> {
    const promises = requests.map(req =>
      this.createCompletion(req.messages, req.options)
    );

    return Promise.all(promises);
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return this.requestQueue.getStatus();
  }

  /**
   * 清空队列
   */
  clearQueue() {
    this.requestQueue.clear();
  }
}

/**
 * 创建默认的LLM客户端实例
 */
export function createLLMClient(
  apiKey?: string,
  baseURL?: string,
  model?: string
): LLMClient {
  const key = apiKey || process.env.LLM_API_KEY || '';
  const url = baseURL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const defaultModel = model || process.env.LLM_MODEL || 'gpt-3.5-turbo';

  if (!key) {
    throw new Error('LLM API key is required. Set LLM_API_KEY environment variable.');
  }

  return new LLMClient(key, url, defaultModel);
}
