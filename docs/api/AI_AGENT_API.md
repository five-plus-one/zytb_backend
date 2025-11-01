# AI Agent 智能助手接口文档

本文档详细介绍智能 AI Agent 系统的前端接口，包括聊天、工具调用、会话管理等功能。

---

## 📋 目录

- [系统架构](#系统架构)
- [核心功能](#核心功能)
- [API 接口](#api-接口)
  - [1. 聊天接口](#1-聊天接口)
  - [2. 流式聊天接口](#2-流式聊天接口)
  - [3. 会话管理](#3-会话管理)
  - [4. 工具列表](#4-工具列表)
  - [5. 系统统计](#5-系统统计)
- [可用工具](#可用工具)
- [前端集成示例](#前端集成示例)
- [错误处理](#错误处理)

---

## 系统架构

AI Agent 采用智能中枢架构：

```
用户输入 → AI Agent
           ↓
    ┌──────┴──────┐
    ↓             ↓
自主推理      工具调用
    ↓             ↓
 分析判断    API 执行
    ↓             ↓
    └──────┬──────┘
           ↓
       结果反馈
```

**核心特性**：
- 🤖 **自主推理**：AI 根据用户问题自行判断需要调用的工具
- 🔧 **工具调用**：9+ 种专业工具覆盖志愿填报全流程
- 🔄 **迭代执行**：可多次调用工具，逐步完善答案
- 💬 **上下文记忆**：会话管理支持多轮对话
- ⚡ **流式响应**：实时输出思考过程和结果

---

## 核心功能

### 1. 智能推理
AI Agent 能够理解自然语言查询，自动选择合适的工具：

**示例**：
- 用户："我江苏物理类考了650分，往年大概什么分数？"
- AI 推理：需要调用 `query_equivalent_score` 工具
- 自动填充参数并执行

### 2. 多工具协作
AI 可在一次对话中调用多个工具：

**示例**：
- 用户："帮我查650分能上哪些计算机专业？"
- AI 执行：
  1. 调用 `score_to_rank` 获取位次
  2. 调用 `filter_majors` 筛选专业
  3. 调用 `get_college_historical_stats` 查询录取统计
  4. 综合分析并给出建议

### 3. 上下文对话
支持多轮对话，AI 记住之前的查询结果：

**示例**：
- 用户："我江苏物理类650分"
- AI："好的，您的分数是650分"
- 用户："帮我查等位分"（AI 记住省份、科类、分数）

---

## API 接口

### 1. 聊天接口

#### 1.1 普通聊天

**接口**: `POST /ai/chat`

**请求体**:
```json
{
  "message": "我江苏物理类考了650分，往年大概什么分数？",
  "sessionId": "session-uuid-123",
  "userId": "user-123"
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | ✅ | 用户消息 |
| sessionId | string | ❌ | 会话 ID（不传则创建新会话） |
| userId | string | ❌ | 用户 ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "reply": "根据您提供的信息，2025年江苏物理类650分对应位次约为5234名。\n\n往年同位次对应的分数如下：\n- 2024年：648分（位次5241）\n- 2023年：645分（位次5198）\n- 2022年：642分（位次5256）\n\n可以看出，650分在往年大概对应640-650分之间。",
    "conversationHistory": [
      {
        "role": "user",
        "content": "我江苏物理类考了650分，往年大概什么分数？"
      },
      {
        "role": "assistant",
        "content": "根据您提供的信息..."
      }
    ],
    "toolCalls": [
      {
        "toolName": "query_equivalent_score",
        "parameters": {
          "currentYear": 2025,
          "province": "江苏",
          "subjectType": "物理类",
          "score": 650
        },
        "result": {
          "success": true,
          "data": {
            "currentYear": 2025,
            "currentScore": 650,
            "currentRank": 5234,
            "equivalentScores": [...]
          }
        }
      }
    ],
    "sessionId": "session-uuid-123"
  }
}
```

---

### 2. 流式聊天接口

#### 2.1 流式聊天（推荐）

**接口**: `POST /ai/chat-stream`

**请求体**: 同普通聊天

**响应格式**: Server-Sent Events (SSE)

**事件流示例**:
```
data: {"type":"thinking","content":"正在分析您的问题..."}

data: {"type":"tool_call","toolName":"query_equivalent_score","parameters":{"currentYear":2025,"province":"江苏","subjectType":"物理类","score":650}}

data: {"type":"tool_result","toolName":"query_equivalent_score","success":true,"data":{...}}

data: {"type":"chunk","content":"根据您提供"}

data: {"type":"chunk","content":"的信息，2025年"}

data: {"type":"chunk","content":"江苏物理类650分"}

data: {"type":"done","reply":"根据您提供的信息...","sessionId":"session-uuid-123","toolCalls":[...]}
```

**事件类型说明**:
| 事件类型 | 说明 | 数据结构 |
|---------|------|---------|
| thinking | AI 思考中 | `{type, content}` |
| tool_call | 工具调用开始 | `{type, toolName, parameters}` |
| tool_result | 工具执行结果 | `{type, toolName, success, data/error}` |
| chunk | 回复内容片段 | `{type, content}` |
| done | 对话完成 | `{type, reply, sessionId, toolCalls, conversationHistory}` |

---

### 3. 会话管理

#### 3.1 创建会话

**接口**: `POST /ai/session`

**请求体**:
```json
{
  "userId": "user-123"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "session-uuid-456",
    "userId": "user-123",
    "createdAt": "2025-10-29T10:30:00.000Z"
  }
}
```

#### 3.2 获取会话

**接口**: `GET /ai/session/:sessionId`

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "session-uuid-456",
    "userId": "user-123",
    "conversationHistory": [
      {
        "role": "user",
        "content": "我江苏物理类650分"
      },
      {
        "role": "assistant",
        "content": "好的，我记住了您的分数信息..."
      }
    ],
    "createdAt": "2025-10-29T10:30:00.000Z",
    "lastAccessedAt": "2025-10-29T10:35:00.000Z"
  }
}
```

#### 3.3 删除会话

**接口**: `DELETE /ai/session/:sessionId`

**响应示例**:
```json
{
  "code": 200,
  "message": "会话已删除"
}
```

#### 3.4 获取用户所有会话

**接口**: `GET /ai/sessions?userId=user-123`

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "sessionId": "session-uuid-456",
      "userId": "user-123",
      "messageCount": 8,
      "createdAt": "2025-10-29T10:30:00.000Z",
      "lastAccessedAt": "2025-10-29T10:35:00.000Z"
    }
  ]
}
```

---

### 4. 工具列表

#### 4.1 获取可用工具

**接口**: `GET /ai/tools`

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "name": "query_equivalent_score",
      "description": "查询等位分：根据当前年份的分数，查询往年同位次对应的分数",
      "parameters": {
        "currentYear": {
          "type": "number",
          "description": "当前年份",
          "required": true
        },
        "province": {
          "type": "string",
          "description": "省份",
          "required": true
        },
        "subjectType": {
          "type": "string",
          "description": "科类（如物理类、历史类）",
          "required": true
        },
        "score": {
          "type": "number",
          "description": "当前分数",
          "required": true
        }
      }
    },
    {
      "name": "filter_majors",
      "description": "筛选专业：根据分数范围、专业方向等条件筛选招生计划",
      "parameters": {...}
    }
  ]
}
```

---

### 5. 系统统计

#### 5.1 获取系统统计

**接口**: `GET /ai/stats`

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "totalSessions": 156,
    "totalMessages": 2340,
    "totalToolCalls": 890,
    "toolUsageStats": {
      "query_equivalent_score": 234,
      "filter_majors": 189,
      "score_to_rank": 156
    }
  }
}
```

---

## 可用工具

AI Agent 提供以下 9 种专业工具：

### 1. 等位分查询工具
**工具名**: `query_equivalent_score`

**功能**: 查询往年同位次对应的分数

**参数**:
- `currentYear` (number, 必填): 当前年份
- `province` (string, 必填): 省份
- `subjectType` (string, 必填): 科类
- `score` (number, 必填): 当前分数
- `compareYears` (string, 可选): 对比年份（逗号分隔）

**示例问法**:
- "我江苏物理类650分，往年大概什么分数？"
- "帮我查一下2025年江苏历史类620分的等位分"

---

### 2. 专业筛选工具
**工具名**: `filter_majors`

**功能**: 根据分数和专业方向筛选招生计划

**参数**:
- `year` (number, 必填): 年份
- `sourceProvince` (string, 必填): 生源地
- `subjectType` (string, 必填): 科类
- `score` (number, 必填): 分数
- `scoreRange` (number, 可选): 分数浮动范围（默认±10）
- `majorDirection` (string, 可选): 专业方向
- `collegeName` (string, 可选): 院校名称
- `batch` (string, 可选): 批次

**示例问法**:
- "650分能上哪些计算机专业？"
- "江苏物理类640-660分的电子信息类专业有哪些？"

---

### 3. 专业方向列表工具
**工具名**: `get_major_directions`

**功能**: 获取可用的专业方向列表

**参数**:
- `year` (number, 必填): 年份
- `sourceProvince` (string, 必填): 生源地
- `subjectType` (string, 必填): 科类

**示例问法**:
- "有哪些专业方向可以选择？"
- "江苏物理类有哪些专业大类？"

---

### 4. 招生计划详情工具
**工具名**: `query_enrollment_plan_detail`

**功能**: 查询院校的招生计划详情

**参数**:
- `year` (number, 必填): 年份
- `sourceProvince` (string, 必填): 生源地
- `subjectType` (string, 必填): 科类
- `collegeName` (string, 可选): 院校名称
- `includeHistoricalScores` (boolean, 可选): 是否包含历史分数

**示例问法**:
- "南京大学在江苏招多少人？"
- "查一下东南大学的招生计划"

---

### 5. 按院校分组查询工具
**工具名**: `query_enrollment_plan_by_college`

**功能**: 按专业组分组查询院校招生计划

**参数**:
- `year` (number, 必填): 年份
- `sourceProvince` (string, 必填): 生源地
- `subjectType` (string, 必填): 科类
- `collegeCode` (string, 可选): 院校代码
- `collegeName` (string, 可选): 院校名称

**示例问法**:
- "南京大学有哪些专业组？"
- "查看复旦大学的详细招生计划"

---

### 6. 院校历史统计工具
**工具名**: `get_college_historical_stats`

**功能**: 获取院校历史录取分数统计

**参数**:
- `collegeName` (string, 必填): 院校名称
- `sourceProvince` (string, 必填): 生源地
- `subjectType` (string, 必填): 科类
- `years` (number, 可选): 查询年数（默认5）

**示例问法**:
- "南京大学往年录取分数线是多少？"
- "查一下浙江大学近三年的录取情况"

---

### 7. 分数转位次工具
**工具名**: `score_to_rank`

**功能**: 根据分数查询对应位次

**参数**:
- `year` (number, 必填): 年份
- `province` (string, 必填): 省份
- `subjectType` (string, 必填): 科类
- `score` (number, 必填): 分数

**示例问法**:
- "650分在江苏是什么位次？"
- "我这个分数能排第几名？"

---

### 8. 位次转分数工具
**工具名**: `rank_to_score`

**功能**: 根据位次查询对应分数

**参数**:
- `year` (number, 必填): 年份
- `province` (string, 必填): 省份
- `subjectType` (string, 必填): 科类
- `rank` (number, 必填): 位次

**示例问法**:
- "江苏物理类5000名是多少分？"
- "位次3000对应什么分数？"

---

### 9. 分数段分布工具
**工具名**: `get_score_distribution`

**功能**: 查询分数段的人数分布

**参数**:
- `year` (number, 必填): 年份
- `province` (string, 必填): 省份
- `subjectType` (string, 必填): 科类
- `minScore` (number, 必填): 最低分数
- `maxScore` (number, 必填): 最高分数

**示例问法**:
- "640-660分有多少人？"
- "查一下650分附近的人数分布"

---

## 前端集成示例

### 示例 1: 普通聊天（React + Axios）

```typescript
import axios from 'axios';

interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
}

interface ChatResponse {
  reply: string;
  sessionId: string;
  toolCalls: any[];
  conversationHistory: any[];
}

async function sendMessage(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await axios.post('/api/ai/chat', request);
    return response.data.data;
  } catch (error) {
    console.error('聊天失败:', error);
    throw error;
  }
}

// 使用示例
const result = await sendMessage({
  message: '我江苏物理类650分，往年大概什么分数？',
  sessionId: 'session-123',
  userId: 'user-456'
});

console.log(result.reply);
```

---

### 示例 2: 流式聊天（React + EventSource）

```typescript
import { useState } from 'react';

interface StreamEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'chunk' | 'done';
  content?: string;
  toolName?: string;
  parameters?: any;
  data?: any;
  reply?: string;
}

function useStreamChat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<any[]>([]);

  const sendStreamMessage = async (message: string, sessionId?: string) => {
    setIsLoading(true);
    setMessages([]);
    setToolCalls([]);

    try {
      const response = await fetch('/api/ai/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, sessionId }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData: StreamEvent = JSON.parse(line.slice(6));

            switch (eventData.type) {
              case 'thinking':
                console.log('AI 思考中:', eventData.content);
                break;

              case 'tool_call':
                console.log('调用工具:', eventData.toolName, eventData.parameters);
                setToolCalls(prev => [...prev, {
                  name: eventData.toolName,
                  params: eventData.parameters
                }]);
                break;

              case 'tool_result':
                console.log('工具结果:', eventData.data);
                break;

              case 'chunk':
                setMessages(prev => [...prev, eventData.content!]);
                break;

              case 'done':
                console.log('对话完成:', eventData.reply);
                setIsLoading(false);
                return eventData;
            }
          }
        }
      }
    } catch (error) {
      console.error('流式聊天失败:', error);
      setIsLoading(false);
    }
  };

  return { sendStreamMessage, messages, isLoading, toolCalls };
}

// 组件中使用
function ChatComponent() {
  const { sendStreamMessage, messages, isLoading, toolCalls } = useStreamChat();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    await sendStreamMessage(input);
    setInput('');
  };

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>

      {isLoading && <div>AI 思考中...</div>}

      {toolCalls.length > 0 && (
        <div className="tool-calls">
          <h4>使用的工具:</h4>
          {toolCalls.map((call, i) => (
            <div key={i}>{call.name}</div>
          ))}
        </div>
      )}

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend}>发送</button>
    </div>
  );
}
```

---

### 示例 3: 会话管理（Vue 3 + Composition API）

```typescript
import { ref, onMounted } from 'vue';
import axios from 'axios';

export function useSession(userId: string) {
  const sessionId = ref<string | null>(null);
  const sessions = ref<any[]>([]);

  // 创建新会话
  const createSession = async () => {
    try {
      const response = await axios.post('/api/ai/session', { userId });
      sessionId.value = response.data.data.sessionId;
      return sessionId.value;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw error;
    }
  };

  // 加载用户所有会话
  const loadSessions = async () => {
    try {
      const response = await axios.get(`/api/ai/sessions?userId=${userId}`);
      sessions.value = response.data.data;
    } catch (error) {
      console.error('加载会话失败:', error);
    }
  };

  // 删除会话
  const deleteSession = async (sid: string) => {
    try {
      await axios.delete(`/api/ai/session/${sid}`);
      sessions.value = sessions.value.filter(s => s.sessionId !== sid);
      if (sessionId.value === sid) {
        sessionId.value = null;
      }
    } catch (error) {
      console.error('删除会话失败:', error);
    }
  };

  // 获取会话详情
  const getSessionDetail = async (sid: string) => {
    try {
      const response = await axios.get(`/api/ai/session/${sid}`);
      return response.data.data;
    } catch (error) {
      console.error('获取会话详情失败:', error);
      throw error;
    }
  };

  onMounted(() => {
    loadSessions();
  });

  return {
    sessionId,
    sessions,
    createSession,
    loadSessions,
    deleteSession,
    getSessionDetail
  };
}
```

---

### 示例 4: 完整聊天组件（React + TypeScript）

```typescript
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
}

interface ChatProps {
  userId: string;
}

export const ChatComponent: React.FC<ChatProps> = ({ userId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初始化会话
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await axios.post('/api/ai/session', { userId });
        setSessionId(response.data.data.sessionId);
      } catch (error) {
        console.error('初始化会话失败:', error);
      }
    };
    initSession();
  }, [userId]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', {
        message: input,
        sessionId,
        userId
      });

      const data = response.data.data;
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        toolCalls: data.toolCalls
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>志愿填报 AI 助手</h2>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message message-${msg.role}`}>
            <div className="message-content">{msg.content}</div>

            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="message-tools">
                <details>
                  <summary>使用的工具 ({msg.toolCalls.length})</summary>
                  {msg.toolCalls.map((tool, i) => (
                    <div key={i} className="tool-item">
                      <strong>{tool.toolName}</strong>
                      <pre>{JSON.stringify(tool.parameters, null, 2)}</pre>
                    </div>
                  ))}
                </details>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message message-assistant">
            <div className="message-content typing">AI 正在思考...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="输入您的问题..."
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
};
```

---

## 错误处理

### 错误响应格式

所有接口在发生错误时返回统一格式：

```json
{
  "code": 400,
  "message": "错误描述信息"
}
```

### 常见错误代码

| 错误码 | 说明 | 解决方案 |
|-------|------|---------|
| 400 | 请求参数错误 | 检查请求参数是否完整和正确 |
| 404 | 会话不存在 | 创建新会话或使用正确的 sessionId |
| 500 | 服务器内部错误 | 联系技术支持 |

### 前端错误处理示例

```typescript
async function sendMessage(request: ChatRequest) {
  try {
    const response = await axios.post('/api/ai/chat', request);
    return response.data.data;
  } catch (error: any) {
    if (error.response) {
      // 服务器返回错误
      const { code, message } = error.response.data;

      switch (code) {
        case 400:
          alert(`参数错误: ${message}`);
          break;
        case 404:
          // 会话不存在，创建新会话
          const newSessionId = await createNewSession();
          return sendMessage({ ...request, sessionId: newSessionId });
        case 500:
          alert('服务器错误，请稍后重试');
          break;
        default:
          alert(`未知错误: ${message}`);
      }
    } else if (error.request) {
      // 网络错误
      alert('网络连接失败，请检查网络');
    } else {
      // 其他错误
      alert('发生未知错误');
    }
    throw error;
  }
}
```

---

## 最佳实践

### 1. 会话管理
- 为每个用户创建独立会话
- 定期清理过期会话
- 在用户刷新页面时保持会话 ID

### 2. 用户体验
- 优先使用流式聊天接口，提供实时反馈
- 显示 AI 正在使用的工具，增加透明度
- 提供会话历史记录功能

### 3. 性能优化
- 使用防抖处理用户输入
- 缓存常见查询结果
- 限制并发请求数量

### 4. 错误处理
- 提供友好的错误提示
- 自动重试临时性错误
- 记录错误日志用于分析

---

## 更新日志

**v1.0.0** - 2025-10-29
- 初始版本发布
- 提供 9 种专业工具
- 支持普通聊天和流式聊天
- 完整的会话管理功能

---

**技术支持**: 如有问题，请参考项目文档或联系开发团队。
