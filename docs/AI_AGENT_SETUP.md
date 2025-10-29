# AI Agent 系统配置与启动指南

## 快速开始

### 1. 环境配置

确保 `.env` 文件中包含以下 LLM 配置：

```env
# LLM 大模型配置
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
LLM_MAX_ITERATIONS=5
```

### 2. 安装依赖

```bash
npm install
```

### 3. 编译代码

```bash
npm run build
```

### 4. 启动服务器

```bash
npm run dev
```

### 5. 验证启动

服务器启动后，您应该看到以下输出：

```
=================================
🚀 服务器启动成功!
📝 环境: development
🌐 地址: http://localhost:11452
📡 API: http://localhost:11452/api
🤖 AI Agent: http://localhost:11452/api/ai
=================================
✅ AI 工具初始化成功
```

## 系统架构

### 核心组件

1. **AI Agent Service** (`src/ai/agent.service.ts`)
   - 负责与 LLM 交互
   - 管理工具调用流程
   - 处理多轮对话

2. **Tool Registry** (`src/ai/tools/base.ts`)
   - 工具注册和管理
   - 工具执行和参数验证

3. **Conversation Manager** (`src/ai/conversation.manager.ts`)
   - 会话管理
   - 对话历史存储

4. **AI Controller** (`src/controllers/ai.controller.ts`)
   - REST API 端点
   - 请求处理和响应

### 可用工具 (9种)

| 工具名称 | 功能 | 文件 |
|---------|------|------|
| query_equivalent_score | 查询等位分 | equivalentScore.tool.ts |
| filter_majors | 筛选专业 | majorFilter.tool.ts |
| get_major_directions | 获取专业方向列表 | majorFilter.tool.ts |
| query_enrollment_plan_detail | 查询招生计划详情 | enrollmentPlan.tool.ts |
| query_enrollment_plan_by_college | 按院校查询招生计划 | enrollmentPlan.tool.ts |
| get_college_historical_stats | 获取院校历史统计 | enrollmentPlan.tool.ts |
| score_to_rank | 分数转位次 | scoreRanking.tool.ts |
| rank_to_score | 位次转分数 | scoreRanking.tool.ts |
| get_score_distribution | 获取分数段分布 | scoreRanking.tool.ts |

## API 端点

### 聊天接口

#### 普通聊天
```
POST /api/ai/chat
Content-Type: application/json

{
  "message": "我江苏物理类650分，往年大概什么分数？",
  "sessionId": "optional-session-id",
  "userId": "optional-user-id"
}
```

#### 流式聊天 (推荐)
```
POST /api/ai/chat-stream
Content-Type: application/json

{
  "message": "帮我查650分能上哪些计算机专业？",
  "sessionId": "optional-session-id",
  "userId": "optional-user-id"
}
```

### 会话管理

```
POST   /api/ai/session              # 创建会话
GET    /api/ai/session/:sessionId   # 获取会话
DELETE /api/ai/session/:sessionId   # 删除会话
GET    /api/ai/sessions?userId=xxx  # 获取用户所有会话
```

### 系统信息

```
GET /api/ai/tools                   # 获取所有可用工具
GET /api/ai/stats                   # 获取系统统计信息
```

## 测试 AI Agent

### 使用 curl 测试

#### 1. 创建会话
```bash
curl -X POST http://localhost:11452/api/ai/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'
```

#### 2. 发送聊天消息
```bash
curl -X POST http://localhost:11452/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我江苏物理类650分，往年大概什么分数？",
    "sessionId": "your-session-id",
    "userId": "test-user"
  }'
```

#### 3. 流式聊天
```bash
curl -N -X POST http://localhost:11452/api/ai/chat-stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "帮我查650分能上哪些计算机专业？",
    "userId": "test-user"
  }'
```

#### 4. 获取可用工具列表
```bash
curl http://localhost:11452/api/ai/tools
```

### 使用 Postman 测试

1. 导入以下 URL 作为新请求：`POST http://localhost:11452/api/ai/chat`
2. 设置 Headers：`Content-Type: application/json`
3. 设置 Body (raw JSON)：
```json
{
  "message": "我江苏物理类650分，往年大概什么分数？"
}
```
4. 点击 Send

## 前端集成

详细的前端集成文档请参考：[AI_AGENT_API.md](./AI_AGENT_API.md)

包含：
- React 集成示例
- Vue 集成示例
- 流式聊天实现
- 会话管理
- 错误处理

## 工作流程示例

### 示例 1: 查询等位分

**用户输入**：
```
我江苏物理类650分，往年大概什么分数？
```

**AI Agent 执行流程**：
1. 理解用户意图：查询等位分
2. 调用工具：`query_equivalent_score`
3. 参数：
   - currentYear: 2025
   - province: 江苏
   - subjectType: 物理类
   - score: 650
4. 获取结果并分析
5. 返回友好的回答

### 示例 2: 专业筛选

**用户输入**：
```
帮我查650分能上哪些计算机专业？
```

**AI Agent 执行流程**：
1. 分析：需要用户提供省份和科类信息
2. 如果会话中有上下文，使用之前的省份/科类
3. 调用工具：`filter_majors`
4. 参数：
   - year: 2025
   - sourceProvince: 江苏 (从上下文获取)
   - subjectType: 物理类 (从上下文获取)
   - score: 650
   - majorDirection: 计算机类
5. 返回符合条件的专业列表

### 示例 3: 多工具协作

**用户输入**：
```
我640-660分想学人工智能，有什么好的学校推荐？
```

**AI Agent 执行流程**：
1. 调用 `score_to_rank` - 获取分数段对应的位次范围
2. 调用 `filter_majors` - 筛选人工智能相关专业
3. 调用 `get_college_historical_stats` - 获取推荐院校的历史录取情况
4. 综合分析：
   - 分数匹配度
   - 院校层次（985/211）
   - 历史录取稳定性
   - 专业实力
5. 返回详细的推荐报告

## 添加新工具

如果需要添加新的工具，请按以下步骤操作：

### 1. 创建工具类

在 `src/ai/tools/` 目录下创建新的工具文件：

```typescript
import { Tool, ToolParameter, ToolExecutionResult } from './base';

export class MyNewTool extends Tool {
  name = 'my_new_tool';
  description = '工具描述，AI 会根据这个描述决定是否调用此工具';

  parameters: Record<string, ToolParameter> = {
    param1: {
      type: 'string',
      description: '参数1的描述',
      required: true
    },
    param2: {
      type: 'number',
      description: '参数2的描述',
      required: false
    }
  };

  async execute(params: Record<string, any>): Promise<ToolExecutionResult> {
    try {
      // 参数验证
      if (!this.validateParams(params)) {
        return {
          success: false,
          error: '参数验证失败'
        };
      }

      // 执行具体逻辑
      const result = await this.performAction(params);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async performAction(params: any) {
    // 实现具体功能
    return {};
  }
}
```

### 2. 注册工具

在 `src/ai/tools/index.ts` 中注册新工具：

```typescript
import { MyNewTool } from './myNewTool.tool';

export function initializeTools(): void {
  const registry = ToolRegistry.getInstance();

  // ... 现有工具注册 ...

  registry.register(new MyNewTool());

  console.log('✅ AI 工具注册完成');
}
```

### 3. 重启服务器

```bash
npm run build
npm run dev
```

## 故障排除

### 问题 1: 编译错误

**错误信息**：`Cannot find module 'openai'`

**解决方案**：
```bash
npm install openai
```

### 问题 2: AI 不调用工具

**可能原因**：
1. 工具描述不够清晰
2. LLM 温度设置过高
3. 系统提示词不够明确

**解决方案**：
- 优化工具的 `description` 字段
- 调整 `.env` 中的 `LLM_TEMPERATURE` (建议 0.3-0.7)
- 修改 `src/ai/agent.service.ts` 中的 `systemPrompt`

### 问题 3: 工具执行失败

**排查步骤**：
1. 检查日志输出：`console.log` 会显示工具调用详情
2. 验证数据库数据是否完整
3. 检查工具参数验证逻辑
4. 确认相关 Service 正常工作

### 问题 4: 会话管理问题

**说明**：
- 当前使用内存存储会话
- 服务器重启会丢失所有会话
- 生产环境建议使用 Redis 或数据库存储

**生产环境优化**：
在 `src/ai/conversation.manager.ts` 中实现持久化存储

## 性能优化建议

### 1. 添加缓存层
```typescript
// 在工具执行前检查缓存
const cacheKey = `${toolName}:${JSON.stringify(params)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

### 2. 并行工具调用
当前实现已支持并行调用多个工具，无需额外配置。

### 3. 限流保护
```typescript
// 在 controller 中添加限流中间件
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100 // 最多 100 次请求
});

router.post('/chat', limiter, aiController.chat);
```

## 监控与日志

### 查看日志
```bash
tail -f logs/app.log
```

### 关键日志信息
- `🔧 调用工具: xxx` - 工具调用
- `✅ 工具执行成功` - 工具执行成功
- `❌ 工具执行失败` - 工具执行失败
- `🤖 AI Agent: xxx` - Agent 响应

## 下一步

- ✅ AI Agent 核心系统已完成
- ✅ 9 种专业工具已实现
- ✅ REST API 已就绪
- 📋 待实现：前端聊天界面
- 📋 待实现：用户认证集成
- 📋 待实现：会话持久化 (Redis)
- 📋 待实现：工具执行缓存
- 📋 待实现：更多专业工具

## 相关文档

- [AI Agent API 文档](./AI_AGENT_API.md) - 前端集成指南
- [Excel 导入文档](./EXCEL_IMPORT_GUIDE.md) - 数据导入指南
- [新接口文档](./NEW_APIS_SUMMARY.md) - 其他 API 接口

---

**技术支持**: 如有问题，请查看日志或联系开发团队。
