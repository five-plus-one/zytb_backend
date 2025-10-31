/**
 * AI Agent 工具系统 - 工具定义接口
 *
 * 所有工具必须实现此接口
 */

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  enum?: any[];
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
}

export interface ToolExecutionContext {
  userId?: string;
  sessionId?: string;
  timestamp: number;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    dataSource?: string;
    [key: string]: any;
  };
}

/**
 * 抽象工具类
 */
export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, ToolParameter>;

  /**
   * 获取工具定义（用于传递给LLM）
   */
  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    };
  }

  /**
   * 执行工具
   */
  abstract execute(
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult>;

  /**
   * 验证参数
   */
  protected validateParams(params: Record<string, any>): boolean {
    for (const [key, paramDef] of Object.entries(this.parameters)) {
      if (paramDef.required && !(key in params)) {
        throw new Error(`缺少必填参数: ${key}`);
      }

      if (key in params) {
        const value = params[key];
        const expectedType = paramDef.type;

        // 类型检查
        if (expectedType === 'string' && typeof value !== 'string') {
          throw new Error(`参数 ${key} 类型错误，期望 string`);
        }
        if (expectedType === 'number' && typeof value !== 'number') {
          throw new Error(`参数 ${key} 类型错误，期望 number`);
        }
        if (expectedType === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`参数 ${key} 类型错误，期望 boolean`);
        }

        // 枚举检查
        if (paramDef.enum && !paramDef.enum.includes(value)) {
          throw new Error(
            `参数 ${key} 值无效，必须是: ${paramDef.enum.join(', ')}`
          );
        }
      }
    }
    return true;
  }

  /**
   * 从context中获取userId
   * 如果context中没有userId,抛出友好错误
   */
  protected getUserId(context?: ToolExecutionContext): string {
    if (!context || !context.userId) {
      throw new Error('用户未登录或会话已过期，请重新登录后再试');
    }
    return context.userId;
  }
}

/**
 * 工具注册表
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();

  private constructor() {}

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`工具 ${tool.name} 已存在，将被覆盖`);
    }
    this.tools.set(tool.name, tool);
    console.log(`✅ 工具注册成功: ${tool.name}`);
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具定义
   */
  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.getDefinition());
  }

  /**
   * 获取所有工具名称
   */
  getAllNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 执行工具
   */
  async execute(
    toolName: string,
    params: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const tool = this.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `工具 ${toolName} 不存在`
      };
    }

    try {
      const startTime = Date.now();
      const result = await tool.execute(params, context);
      const executionTime = Date.now() - startTime;

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '工具执行失败'
      };
    }
  }
}
