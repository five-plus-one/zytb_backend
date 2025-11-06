import { LLMClient, LLMMessage, createLLMClient } from '../../utils/llm-client';

/**
 * LLM服务
 * 封装LLM API调用,提供高级功能
 */

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export class LLMService {
  private client: LLMClient;

  constructor(apiKey?: string, baseURL?: string, model?: string) {
    this.client = createLLMClient(apiKey, baseURL, model);
  }

  /**
   * 普通对话
   */
  async chat(messages: LLMMessage[], options?: ChatOptions): Promise<string> {
    const response = await this.client.createCompletion(messages, {
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000
    });

    const content = response.choices[0]?.message?.content;
    // ✅ 处理content可能是string或LLMContentBlock[]
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      return content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
    }
    return '';
  }

  /**
   * 流式对话
   * 返回异步生成器
   */
  async *chatStream(
    messages: LLMMessage[],
    options?: ChatOptions
  ): AsyncGenerator<string, void, unknown> {
    for await (const chunk of this.client.createCompletionStream(messages, {
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000
    })) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * 结构化数据提取
   * 要求LLM返回JSON格式
   */
  async extractStructuredData<T = any>(
    messages: LLMMessage[],
    schema?: string
  ): Promise<T | null> {
    const systemPrompt = schema
      ? `You must respond with valid JSON that matches this schema: ${schema}`
      : 'You must respond with valid JSON only, no additional text.';

    const enhancedMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages
    ];

    const response = await this.chat(enhancedMessages, {
      temperature: 0.3 // 降低温度以获得更确定的输出
    });

    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果整个响应就是JSON
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse LLM response as JSON:', response);
      return null;
    }
  }

  /**
   * 批量处理
   */
  async batchChat(
    conversationsList: LLMMessage[][]
  ): Promise<string[]> {
    const requests = conversationsList.map(messages => ({
      messages,
      options: {}
    }));

    const responses = await this.client.batchCompletions(requests);

    // ✅ 处理content可能是string或LLMContentBlock[]
    return responses.map(res => {
      const content = res.choices[0]?.message?.content;
      if (typeof content === 'string') {
        return content;
      } else if (Array.isArray(content)) {
        return content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');
      }
      return '';
    });
  }

  /**
   * 获取嵌入向量(如果API支持)
   */
  async getEmbedding(text: string): Promise<number[]> {
    // TODO: 实现embedding API调用
    throw new Error('Embedding not implemented yet');
  }

  /**
   * 获取队列状态
   */
  getQueueStatus() {
    return this.client.getQueueStatus();
  }
}
