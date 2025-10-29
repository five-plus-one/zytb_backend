# 前端 AI Agent 适配指南

## 文档目标
本文档旨在帮助前端工程师快速实现与 AI Agent 智能助手的集成，打造流畅的用户交互体验。

---

## 目录
- [系统架构](#系统架构)
- [核心功能](#核心功能)
- [数据库结构说明](#数据库结构说明)
- [API 接口详解](#api-接口详解)
- [前端实现方案](#前端实现方案)
- [UI/UX 设计建议](#uiux-设计建议)
- [完整示例代码](#完整示例代码)
- [常见问题](#常见问题)

---

## 系统架构

### 整体架构图
```
┌──────────────────────────────────────────────────────┐
│                    前端应用                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ 聊天界面    │  │ 志愿表      │  │ 推荐结果    │    │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘    │
│         │                │                │          │
│         └────────────────┴────────────────┘          │
│                         │                            │
└─────────────────────────┼────────────────────────────┘
                          │ HTTP/SSE
┌─────────────────────────┼────────────────────────────┐
│                    AI Agent API                       │
│         ┌────────────────┴─────────────┐             │
│         │    Agent Service (推理中枢)  │             │
│         └────────────────┬─────────────┘             │
│                          │                            │
│    ┌─────────────────────┴──────────────────┐       │
│    │           Tool Registry (18种工具)      │       │
│    ├──────────────────────────────────────────┤     │
│    │ 数据查询工具    │  志愿表管理工具          │     │
│    │ - 等位分查询    │  - 查询志愿表            │     │
│    │ - 专业筛选      │  - 添加/删除专业组       │     │
│    │ - 院校统计      │  - 调整顺序              │     │
│    │ - 分数位次转换  │  - 清空志愿表            │     │
│    │ 信息查询工具    │  - 专业组对比            │     │
│    │ - 专业组信息    │  - 批量导入              │     │
│    │ - 专业开设情况  │                          │     │
│    └──────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────────┐
│                    数据库层                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ 志愿表数据  │  │ 招生数据    │  │ 历史数据    │    │
│  └────────────┘  └────────────┘  └────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 核心特性
1. **智能推理**：AI 自主判断用户意图，选择合适的工具
2. **工具调用**：18种专业工具覆盖志愿填报全流程
3. **上下文记忆**：多轮对话，理解上下文
4. **流式响应**：实时显示AI思考过程和结果
5. **志愿表管理**：完整的志愿表CRUD操作

---

## 核心功能

### 1. AI 智能对话
用户可以通过自然语言与 AI 交流：
- "我江苏物理类650分，往年大概什么分数？"
- "帮我查650分能上哪些计算机专业"
- "把南京大学01专业组加到我的志愿表"
- "调整一下我的志愿顺序，把稳的放前面"

### 2. 志愿表管理
- **40个专业组**：江苏新高考本科批可填40个专业组
- **每组6个专业**：每个专业组最多填6个专业
- **排序机制**：支持调整专业组和专业的顺序
- **批次管理**：支持多个批次（本科批、专科批）

### 3. 数据查询分析
- 等位分查询（中分段核心工具）
- 分数位次转换（高分段核心工具）
- 专业筛选（分数+方向+院校）
- 院校历史统计（往年录取情况）
- 专业组详情（包含专业、历史分数）
- 专业对比（多个专业组横向对比）

---

## 数据库结构说明

### 志愿表三层结构

#### 1. VolunteerBatch (志愿批次表)
用户可以有多个批次的志愿（本科批、专科批）

```typescript
interface VolunteerBatch {
  id: string;              // UUID
  userId: string;          // 用户ID
  year: number;            // 年份 2025
  batchType: string;       // 批次类型：本科批、专科批
  province: string;        // 省份：江苏
  subjectType: string;     // 科类：物理类、历史类
  score: number;           // 考生分数
  rank?: number;           // 考生位次
  status: string;          // 状态：draft草稿、submitted已提交、locked锁定
  submittedAt?: Date;      // 提交时间
  remarks?: string;        // 备注
  groups: VolunteerGroup[]; // 专业组列表（最多40个）
}
```

#### 2. VolunteerGroup (专业组表)
每个批次最多40个专业组

```typescript
interface VolunteerGroup {
  id: string;              // UUID
  batchId: string;         // 所属批次ID
  groupOrder: number;      // 排序：1-40
  collegeCode: string;     // 院校代码
  collegeName: string;     // 院校名称
  groupCode: string;       // 专业组代码（如：01、02）
  groupName: string;       // 专业组名称
  subjectRequirement?: string; // 选科要求
  isObeyAdjustment: boolean;   // 是否服从调剂
  admitProbability?: string;   // 录取概率：冲、稳、保
  lastYearMinScore?: number;   // 去年最低分
  lastYearMinRank?: number;    // 去年最低位次
  remarks?: string;        // 备注
  majors: VolunteerMajor[]; // 专业列表（最多6个）
}
```

#### 3. VolunteerMajor (专业表)
每个专业组最多6个专业

```typescript
interface VolunteerMajor {
  id: string;              // UUID
  groupId: string;         // 所属专业组ID
  majorOrder: number;      // 排序：1-6
  majorCode: string;       // 专业代码
  majorName: string;       // 专业名称
  majorDirection?: string; // 专业方向
  planCount?: number;      // 计划招生人数
  tuitionFee?: number;     // 学费（元/年）
  duration?: number;       // 学制（年）
  remarks?: string;        // 备注
}
```

---

## API 接口详解

### 基础URL
```
http://localhost:11452/api
```

### 1. AI 聊天接口

#### 1.1 普通聊天
```http
POST /ai/chat
Content-Type: application/json

{
  "message": "我江苏物理类650分，往年大概什么分数？",
  "sessionId": "optional-session-uuid",  // 可选：会话ID
  "userId": "user-123"                    // 可选：用户ID
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "reply": "根据您的分数...",
    "sessionId": "session-uuid",
    "toolCalls": [
      {
        "toolName": "query_equivalent_score",
        "parameters": {...},
        "result": {...}
      }
    ],
    "conversationHistory": [...]
  }
}
```

#### 1.2 流式聊天（推荐）
```http
POST /ai/chat-stream
Content-Type: application/json

{
  "message": "帮我查650分能上哪些计算机专业",
  "sessionId": "optional-session-uuid",
  "userId": "user-123"
}
```

**SSE 事件流**：
```
data: {"type":"thinking","content":"正在分析您的问题..."}

data: {"type":"tool_call","toolName":"filter_majors","parameters":{...}}

data: {"type":"tool_result","toolName":"filter_majors","success":true,"data":{...}}

data: {"type":"chunk","content":"根据您"}

data: {"type":"chunk","content":"的分数"}

data: {"type":"done","reply":"完整回复...","sessionId":"..."}
```

**事件类型**：
| 类型 | 说明 | 数据 |
|-----|------|-----|
| thinking | AI思考中 | `{type, content}` |
| tool_call | 开始调用工具 | `{type, toolName, parameters}` |
| tool_result | 工具执行完成 | `{type, toolName, success, data/error}` |
| chunk | 回复内容片段 | `{type, content}` |
| done | 对话完成 | `{type, reply, sessionId, toolCalls}` |

### 2. 志愿表管理接口

#### 2.1 查询用户志愿批次列表
```http
GET /api/volunteers/batches?userId=user-123&year=2025
```

**响应**：
```json
{
  "code": 200,
  "data": [
    {
      "id": "batch-uuid",
      "userId": "user-123",
      "year": 2025,
      "batchType": "本科批",
      "province": "江苏",
      "subjectType": "物理类",
      "score": 650,
      "rank": 5234,
      "status": "draft"
    }
  ]
}
```

#### 2.2 查询志愿批次详情（含所有专业组和专业）
```http
GET /api/volunteers/batches/:batchId
```

**响应**：
```json
{
  "code": 200,
  "data": {
    "id": "batch-uuid",
    "year": 2025,
    "score": 650,
    "groups": [
      {
        "id": "group-uuid-1",
        "groupOrder": 1,
        "collegeName": "南京大学",
        "groupCode": "01",
        "groupName": "计算机类",
        "isObeyAdjustment": true,
        "admitProbability": "稳",
        "lastYearMinScore": 648,
        "majors": [
          {
            "id": "major-uuid-1",
            "majorOrder": 1,
            "majorName": "计算机科学与技术",
            "planCount": 30
          },
          {
            "id": "major-uuid-2",
            "majorOrder": 2,
            "majorName": "软件工程",
            "planCount": 25
          }
        ]
      },
      {
        "id": "group-uuid-2",
        "groupOrder": 2,
        "collegeName": "东南大学",
        "groupCode": "03",
        "groupName": "电子信息类",
        "isObeyAdjustment": true,
        "admitProbability": "稳",
        "majors": [...]
      }
    ]
  }
}
```

#### 2.3 创建志愿批次
```http
POST /api/volunteers/batches
Content-Type: application/json

{
  "userId": "user-123",
  "year": 2025,
  "batchType": "本科批",
  "province": "江苏",
  "subjectType": "物理类",
  "score": 650,
  "rank": 5234
}
```

#### 2.4 添加专业组
```http
POST /api/volunteers/groups
Content-Type: application/json

{
  "batchId": "batch-uuid",
  "groupOrder": 1,
  "collegeCode": "10284",
  "collegeName": "南京大学",
  "groupCode": "01",
  "groupName": "计算机类",
  "isObeyAdjustment": true,
  "admitProbability": "稳"
}
```

#### 2.5 添加专业
```http
POST /api/volunteers/majors
Content-Type: application/json

{
  "groupId": "group-uuid",
  "majorOrder": 1,
  "majorCode": "080901",
  "majorName": "计算机科学与技术"
}
```

#### 2.6 调整专业组顺序
```http
PATCH /api/volunteers/groups/:groupId/reorder
Content-Type: application/json

{
  "newOrder": 5  // 调整到第5位
}
```

#### 2.7 删除专业组
```http
DELETE /api/volunteers/groups/:groupId
```

#### 2.8 清空志愿表
```http
DELETE /api/volunteers/batches/:batchId/clear
```

#### 2.9 提交志愿表
```http
POST /api/volunteers/batches/:batchId/submit
```

### 3. 会话管理接口

#### 3.1 创建会话
```http
POST /ai/session
Content-Type: application/json

{
  "userId": "user-123"
}
```

#### 3.2 获取会话
```http
GET /ai/session/:sessionId
```

#### 3.3 删除会话
```http
DELETE /ai/session/:sessionId
```

#### 3.4 获取用户所有会话
```http
GET /ai/sessions?userId=user-123
```

### 4. 系统信息接口

#### 4.1 获取所有可用工具
```http
GET /ai/tools
```

**响应**：
```json
{
  "code": 200,
  "data": [
    {
      "name": "query_equivalent_score",
      "description": "查询等位分...",
      "parameters": {...}
    },
    {
      "name": "query_user_volunteers",
      "description": "查询用户志愿表...",
      "parameters": {...}
    }
    // ... 共18个工具
  ]
}
```

#### 4.2 获取系统统计
```http
GET /ai/stats
```

---

## 前端实现方案

### 技术栈建议
- **框架**: React 18+ / Vue 3+
- **状态管理**: Zustand / Pinia
- **UI 组件**: Ant Design / Element Plus
- **HTTP 客户端**: Axios
- **SSE 客户端**: EventSource / fetch

### 核心页面结构

```
src/
├── pages/
│   ├── AIChat/              # AI对话页面
│   │   ├── index.tsx
│   │   ├── ChatWindow.tsx   # 聊天窗口
│   │   ├── ToolCallDisplay.tsx  # 工具调用展示
│   │   └── MessageList.tsx  # 消息列表
│   │
│   ├── VolunteerTable/      # 志愿表页面
│   │   ├── index.tsx
│   │   ├── BatchSelector.tsx    # 批次选择
│   │   ├── GroupList.tsx        # 专业组列表
│   │   ├── GroupItem.tsx        # 专业组项
│   │   ├── MajorList.tsx        # 专业列表
│   │   └── DragSort.tsx         # 拖拽排序
│   │
│   └── Recommendation/      # 推荐结果页面
│       ├── index.tsx
│       ├── FilterPanel.tsx      # 筛选面板
│       ├── ResultList.tsx       # 结果列表
│       └── CompareModal.tsx     # 对比弹窗
│
├── hooks/
│   ├── useAIChat.ts         # AI对话hook
│   ├── useStreamChat.ts     # 流式对话hook
│   ├── useVolunteer.ts      # 志愿表管理hook
│   └── useSession.ts        # 会话管理hook
│
├── services/
│   ├── aiService.ts         # AI服务
│   ├── volunteerService.ts  # 志愿表服务
│   └── sessionService.ts    # 会话服务
│
└── stores/
    ├── volunteerStore.ts    # 志愿表状态
    └── chatStore.ts         # 聊天状态
```

---

## UI/UX 设计建议

### 1. AI 聊天界面设计

#### 布局建议
```
┌─────────────────────────────────────────┐
│  AI 志愿填报助手               [ x ]     │
├─────────────────────────────────────────┤
│                                          │
│  User: 我江苏物理类650分                 │
│                                          │
│  AI: 好的，您的分数是650分。             │
│      正在查询等位分...                   │
│      ┌──────────────────────┐           │
│      │ 🔧 查询等位分          │           │
│      │ - 2024年: 648分       │           │
│      │ - 2023年: 645分       │           │
│      │ - 2022年: 642分       │           │
│      └──────────────────────┘           │
│      根据查询结果...                     │
│                                          │
│  User: 帮我看看这个分数能上哪些计算机专业 │
│                                          │
│  AI: 正在筛选专业...                     │
│      ┌──────────────────────┐           │
│      │ 🔧 筛选专业            │           │
│      │ 查询到 23 个专业      │           │
│      └──────────────────────┘           │
│      为您找到以下专业:                   │
│      1. 南京大学 - 计算机科学 ⭐⭐⭐       │
│         [查看详情] [加入志愿表]          │
│      2. 东南大学 - 软件工程   ⭐⭐⭐       │
│         [查看详情] [加入志愿表]          │
│      ...                                 │
│                                          │
├─────────────────────────────────────────┤
│ [输入消息...]              [发送] [清空]  │
└─────────────────────────────────────────┘
```

#### 关键元素
1. **工具调用可视化**：显示AI正在使用哪个工具
2. **结果可操作**：查询结果可以直接操作（加入志愿表、查看详情）
3. **加载状态**：显示思考中、查询中等状态
4. **历史消息**：支持查看历史对话
5. **快捷操作**：常用问题快捷按钮

### 2. 志愿表界面设计

#### 布局建议
```
┌───────────────────────────────────────────────────┐
│  我的志愿表 - 2025本科批             [提交] [导出]  │
├───────────────────────────────────────────────────┤
│ 基本信息                                           │
│ 省份: 江苏  科类: 物理类  分数: 650  位次: 5234   │
│ 已填: 15/40 专业组                                 │
├───────────────────────────────────────────────────┤
│ ┌─ 冲一冲 (1-10) ──────────────────────────────┐ │
│ │ 1. [⋮] 南京大学 - 01计算机类 (服从调剂) [▼]   │ │
│ │    └─ 1. 计算机科学与技术                     │ │
│ │    └─ 2. 软件工程                            │ │
│ │    └─ 3. 人工智能                            │ │
│ │    [添加专业] [删除] [展开详情]               │ │
│ │                                               │ │
│ │ 2. [⋮] 浙江大学 - 02电子信息类  [▼]           │ │
│ │    └─ 1. 电子信息工程                         │ │
│ │    └─ 2. 通信工程                            │ │
│ │    [添加专业] [删除] [展开详情]               │ │
│ │                                               │ │
│ │ ... (显示第3-10个)                            │ │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ ┌─ 稳一稳 (11-25) ─────────────────────────────┐ │
│ │ 11. [⋮] 东南大学 - 03计算机类  [▼]            │ │
│ │     └─ 1. 计算机科学与技术                    │ │
│ │     └─ 2. 网络空间安全                        │ │
│ │     [添加专业] [删除] [展开详情]              │ │
│ │                                               │ │
│ │ ... (显示第12-25个)                           │ │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ ┌─ 保一保 (26-40) ─────────────────────────────┐ │
│ │ 26. [⋮] 苏州大学 - 01计算机类  [▼]            │ │
│ │     └─ 1. 计算机科学与技术                    │ │
│ │     [添加专业] [删除] [展开详情]              │ │
│ │                                               │ │
│ │ ... (显示第27-40个)                           │ │
│ └───────────────────────────────────────────────┘ │
│                                                   │
│ [+ 添加专业组] [AI帮我优化] [一键导入推荐]        │
└───────────────────────────────────────────────────┘
```

#### 关键功能
1. **拖拽排序**：支持专业组和专业的拖拽调整
2. **折叠展开**：专业组可折叠，减少页面长度
3. **分区显示**：按冲稳保分区，清晰明了
4. **快速操作**：添加、删除、编辑一键完成
5. **AI辅助**：AI帮我优化、智能推荐

### 3. 推荐结果页面设计

```
┌───────────────────────────────────────────────────┐
│  专业推荐                                          │
├───────────────────────────────────────────────────┤
│ 筛选条件:                                          │
│ 分数: [640] - [660]  专业方向: [计算机类 ▼]      │
│ 院校类型: □ 985  □ 211  □ 双一流                 │
│ [搜索]  [重置]                                    │
├───────────────────────────────────────────────────┤
│ 找到 23 个匹配的专业组                  [对比已选] │
│                                                   │
│ ┌─────────────────────────────────────────────┐  │
│ │ 南京大学 - 01计算机类           ⭐⭐⭐ 稳      │  │
│ │ 去年最低分: 648  位次: 5241                 │  │
│ │ 选科要求: 物理+化学                         │  │
│ │ 包含专业: 计算机科学、软件工程、人工智能...  │  │
│ │ [查看详情] [加入志愿表] [对比]  □ 选择      │  │
│ └─────────────────────────────────────────────┘  │
│                                                   │
│ ┌─────────────────────────────────────────────┐  │
│ │ 东南大学 - 03电子信息类         ⭐⭐⭐ 稳      │  │
│ │ 去年最低分: 645  位次: 5689                 │  │
│ │ 选科要求: 物理                             │  │
│ │ 包含专业: 电子信息工程、通信工程...         │  │
│ │ [查看详情] [加入志愿表] [对比]  □ 选择      │  │
│ └─────────────────────────────────────────────┘  │
│                                                   │
│ ... (更多结果)                                   │
│                                                   │
│ [批量加入志愿表] [对比选中项]                     │
└───────────────────────────────────────────────────┘
```

---

## 完整示例代码

### 1. React + TypeScript 流式聊天组件

```typescript
// hooks/useStreamChat.ts
import { useState, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any[];
}

interface StreamEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'chunk' | 'done';
  content?: string;
  toolName?: string;
  parameters?: any;
  data?: any;
  reply?: string;
}

export function useStreamChat(apiUrl: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (message: string, sessionId?: string) => {
    // 添加用户消息
    const userMsg: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);

    setIsLoading(true);
    setCurrentMessage('');
    setToolCalls([]);

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${apiUrl}/ai/chat-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, sessionId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('请求失败');
      if (!response.body) throw new Error('无响应数据');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'thinking':
                  setCurrentMessage(event.content || '');
                  break;

                case 'tool_call':
                  setToolCalls(prev => [...prev, {
                    name: event.toolName,
                    params: event.parameters,
                    status: 'running'
                  }]);
                  break;

                case 'tool_result':
                  setToolCalls(prev => prev.map(tool =>
                    tool.name === event.toolName
                      ? { ...tool, status: 'completed', result: event.data }
                      : tool
                  ));
                  break;

                case 'chunk':
                  setCurrentMessage(prev => prev + (event.content || ''));
                  break;

                case 'done':
                  const assistantMsg: Message = {
                    role: 'assistant',
                    content: event.reply || currentMessage,
                    toolCalls: event.toolCalls
                  };
                  setMessages(prev => [...prev, assistantMsg]);
                  setCurrentMessage('');
                  setIsLoading(false);
                  return event;
              }
            } catch (e) {
              console.error('解析事件失败:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('请求已取消');
      } else {
        console.error('流式聊天失败:', error);
        const errorMsg: Message = {
          role: 'assistant',
          content: '抱歉，发生了错误，请稍后重试。'
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      setCurrentMessage('');
    }
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setCurrentMessage('');
    setToolCalls([]);
  };

  return {
    messages,
    currentMessage,
    toolCalls,
    isLoading,
    sendMessage,
    cancelRequest,
    clearMessages
  };
}
```

```typescript
// components/AIChat/ChatWindow.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useStreamChat } from '../../hooks/useStreamChat';
import MessageList from './MessageList';
import ToolCallDisplay from './ToolCallDisplay';

const ChatWindow: React.FC<{ userId: string }> = ({ userId }) => {
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    currentMessage,
    toolCalls,
    isLoading,
    sendMessage,
    cancelRequest,
    clearMessages
  } = useStreamChat('http://localhost:11452/api');

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentMessage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const msg = input;
    setInput('');
    await sendMessage(msg, sessionId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h2>AI 志愿填报助手</h2>
        <button onClick={clearMessages}>清空对话</button>
      </div>

      <div className="chat-messages">
        <MessageList messages={messages} />

        {/* 当前消息（流式输出中） */}
        {currentMessage && (
          <div className="message assistant streaming">
            <div className="message-content">{currentMessage}</div>
          </div>
        )}

        {/* 工具调用展示 */}
        {toolCalls.length > 0 && (
          <ToolCallDisplay toolCalls={toolCalls} />
        )}

        {/* Loading 状态 */}
        {isLoading && !currentMessage && (
          <div className="message assistant">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入您的问题..."
          disabled={isLoading}
          rows={2}
        />
        <div className="chat-actions">
          {isLoading && (
            <button onClick={cancelRequest} className="btn-cancel">
              取消
            </button>
          )}
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="btn-send"
          >
            发送
          </button>
        </div>
      </div>

      {/* 快捷问题 */}
      <div className="quick-questions">
        <button onClick={() => setInput('我的分数往年大概多少分？')}>
          查询等位分
        </button>
        <button onClick={() => setInput('帮我筛选计算机专业')}>
          筛选专业
        </button>
        <button onClick={() => setInput('查看我的志愿表')}>
          查看志愿表
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
```

### 2. 志愿表管理组件

```typescript
// hooks/useVolunteer.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

interface VolunteerBatch {
  id: string;
  year: number;
  score: number;
  groups: VolunteerGroup[];
}

interface VolunteerGroup {
  id: string;
  groupOrder: number;
  collegeName: string;
  groupName: string;
  majors: VolunteerMajor[];
}

interface VolunteerMajor {
  id: string;
  majorOrder: number;
  majorName: string;
}

export function useVolunteer(userId: string, apiUrl: string) {
  const [batch, setBatch] = useState<VolunteerBatch | null>(null);
  const [loading, setLoading] = useState(false);

  // 加载志愿表
  const loadBatch = async (batchId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/volunteers/batches/${batchId}`);
      setBatch(response.data.data);
    } catch (error) {
      console.error('加载志愿表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 添加专业组
  const addGroup = async (groupData: any) => {
    try {
      const response = await axios.post(`${apiUrl}/volunteers/groups`, groupData);
      if (batch) {
        loadBatch(batch.id); // 重新加载
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '添加失败');
    }
  };

  // 删除专业组
  const deleteGroup = async (groupId: string) => {
    try {
      await axios.delete(`${apiUrl}/volunteers/groups/${groupId}`);
      if (batch) {
        loadBatch(batch.id); // 重新加载
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '删除失败');
    }
  };

  // 调整专业组顺序
  const reorderGroup = async (groupId: string, newOrder: number) => {
    try {
      await axios.patch(`${apiUrl}/volunteers/groups/${groupId}/reorder`, { newOrder });
      if (batch) {
        loadBatch(batch.id); // 重新加载
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '调整顺序失败');
    }
  };

  // 添加专业
  const addMajor = async (majorData: any) => {
    try {
      const response = await axios.post(`${apiUrl}/volunteers/majors`, majorData);
      if (batch) {
        loadBatch(batch.id); // 重新加载
      }
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '添加专业失败');
    }
  };

  // 清空志愿表
  const clearBatch = async () => {
    if (!batch) return;
    try {
      await axios.delete(`${apiUrl}/volunteers/batches/${batch.id}/clear`);
      loadBatch(batch.id); // 重新加载
    } catch (error: any) {
      throw new Error(error.response?.data?.message || '清空失败');
    }
  };

  return {
    batch,
    loading,
    loadBatch,
    addGroup,
    deleteGroup,
    reorderGroup,
    addMajor,
    clearBatch
  };
}
```

```typescript
// components/VolunteerTable/GroupItem.tsx
import React, { useState } from 'react';
import { VolunteerGroup } from '../../types';
import MajorList from './MajorList';

interface Props {
  group: VolunteerGroup;
  onDelete: (groupId: string) => void;
  onReorder: (groupId: string, newOrder: number) => void;
  onAddMajor: (groupId: string, majorData: any) => void;
}

const GroupItem: React.FC<Props> = ({ group, onDelete, onReorder, onAddMajor }) => {
  const [expanded, setExpanded] = useState(true);
  const [showReorderInput, setShowReorderInput] = useState(false);
  const [newOrder, setNewOrder] = useState(group.groupOrder);

  const handleReorder = () => {
    if (newOrder !== group.groupOrder) {
      onReorder(group.id, newOrder);
    }
    setShowReorderInput(false);
  };

  return (
    <div className="group-item">
      <div className="group-header">
        <div className="group-info">
          <span className="group-order">
            {showReorderInput ? (
              <input
                type="number"
                value={newOrder}
                onChange={e => setNewOrder(Number(e.target.value))}
                onBlur={handleReorder}
                onKeyPress={e => e.key === 'Enter' && handleReorder()}
                min={1}
                max={40}
                autoFocus
              />
            ) : (
              <span onClick={() => setShowReorderInput(true)}>
                {group.groupOrder}.
              </span>
            )}
          </span>
          <span className="college-name">{group.collegeName}</span>
          <span className="group-name">- {group.groupName}</span>
          {group.admitProbability && (
            <span className={`probability probability-${group.admitProbability}`}>
              {group.admitProbability}
            </span>
          )}
        </div>

        <div className="group-actions">
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? '折叠' : '展开'}
          </button>
          <button onClick={() => onDelete(group.id)} className="btn-danger">
            删除
          </button>
        </div>
      </div>

      {expanded && (
        <div className="group-content">
          <MajorList
            majors={group.majors}
            groupId={group.id}
            onAddMajor={(majorData) => onAddMajor(group.id, majorData)}
          />

          {group.lastYearMinScore && (
            <div className="historical-info">
              去年最低分: {group.lastYearMinScore}
              {group.lastYearMinRank && `位次: ${group.lastYearMinRank}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupItem;
```

### 3. CSS 样式参考

```css
/* AI Chat Styles */
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  margin-bottom: 16px;
  display: flex;
  animation: slideIn 0.3s ease-out;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.5;
}

.message.user .message-content {
  background: #1890ff;
  color: white;
}

.message.assistant .message-content {
  background: white;
  border: 1px solid #e0e0e0;
}

.message.streaming .message-content::after {
  content: '▊';
  animation: blink 1s step-end infinite;
}

.tool-call-display {
  margin: 12px 0;
  padding: 12px;
  background: #f0f7ff;
  border-left: 3px solid #1890ff;
  border-radius: 4px;
}

.tool-call-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.tool-call-item.running {
  color: #1890ff;
}

.tool-call-item.completed {
  color: #52c41a;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #bbb;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

.chat-input {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e0e0e0;
}

.chat-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  resize: none;
  font-size: 14px;
  font-family: inherit;
}

.chat-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.quick-questions {
  display: flex;
  gap: 8px;
  padding: 0 20px 16px;
  overflow-x: auto;
}

.quick-questions button {
  flex-shrink: 0;
  padding: 6px 12px;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-questions button:hover {
  border-color: #1890ff;
  color: #1890ff;
}

/* Volunteer Table Styles */
.group-item {
  margin-bottom: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: box-shadow 0.3s;
}

.group-item:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.group-order {
  font-weight: bold;
  margin-right: 8px;
  color: #1890ff;
}

.probability {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
}

.probability-冲 {
  background: #fff1f0;
  color: #ff4d4f;
}

.probability-稳 {
  background: #f0f5ff;
  color: #1890ff;
}

.probability-保 {
  background: #f6ffed;
  color: #52c41a;
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes blink {
  50% { opacity: 0; }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
```

---

## 常见问题

### Q1: 如何处理长时间的流式响应？
**A**: 设置合理的超时时间，并提供取消功能。建议30秒超时，超时后提示用户重试。

### Q2: 志愿表的顺序调整如何实现拖拽？
**A**: 推荐使用 `react-beautiful-dnd` 或 `dnd-kit` 库。拖拽结束后调用 `reorderGroup` API。

### Q3: AI 回复中的结果如何变成可操作的按钮？
**A**: 解析 AI 回复和工具调用结果，识别关键信息（如院校、专业组），渲染成可点击的卡片或按钮。

### Q4: 如何实现志愿表的实时协同编辑？
**A**: 使用 WebSocket 或轮询机制，监听志愿表变化。推荐使用 WebSocket for real-time updates。

### Q5: 移动端如何优化体验？
**A**:
- 聊天界面使用底部固定输入框
- 志愿表使用卡片式布局，支持左滑删除
- 工具调用结果折叠显示，点击展开

### Q6: 如何处理网络错误和重试？
**A**:
```typescript
const retryFetch = async (url: string, options: RequestInit, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Q7: 如何优化首屏加载速度？
**A**:
- 懒加载志愿表数据（按需加载专业组）
- 聊天记录分页加载
- 使用骨架屏提升感知性能
- 缓存常用数据（如专业方向列表）

---

## 总结

本文档提供了完整的前端集成方案，包括：

✅ **系统架构**：清晰的三层架构
✅ **数据结构**：志愿表三层模型
✅ **API 接口**：详细的接口说明和示例
✅ **UI 设计**：专业的界面设计建议
✅ **代码示例**：可直接使用的React组件

### 下一步行动

1. **搭建基础框架**：创建项目，安装依赖
2. **实现 AI 聊天**：先实现流式聊天功能
3. **开发志愿表**：实现志愿表的增删改查
4. **集成功能**：将聊天和志愿表打通
5. **优化体验**：添加动画、加载状态、错误处理
6. **测试上线**：进行全面测试后上线

### 技术支持

如有问题，请参考：
- [AI Agent API 文档](./AI_AGENT_API.md)
- [AI Agent 配置文档](./AI_AGENT_SETUP.md)
- [系统提示词重构说明](./AI_AGENT_PROMPT_REFACTOR.md)

---

**版本**: v1.0.0
**更新时间**: 2025-10-29
**维护人**: 开发团队
