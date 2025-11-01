# 智能体API文档

## 概述

志愿填报智能体系统提供了一套完整的AI对话服务，帮助用户通过自然对话完成志愿填报。系统会收集用户的30个核心偏好指标和70个次要指标，然后基于科学的数学模型生成个性化的志愿推荐。

**Base URL**: `/api/agent`

**认证方式**: 所有接口都需要JWT认证，在请求头中添加:
```
Authorization: Bearer <token>
```

---

## API端点

### 1. 开始新会话

创建一个新的对话会话。

**端点**: `POST /api/agent/start`

**请求体**:
```json
{
  "userId": "uuid",
  "province": "浙江",
  "examScore": 620,
  "subjectType": "物理类"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "session-uuid",
    "greeting": "你好!我是你的志愿填报智能助手'小志'🎓\n\n恭喜你完成高考!..."
  }
}
```

---

### 2. 发送消息(普通模式)

向智能体发送消息并获取响应。

**端点**: `POST /api/agent/chat`

**请求体**:
```json
{
  "userId": "uuid",
  "sessionId": "session-uuid",
  "message": "我想学计算机，将来进互联网公司"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "session-uuid",
    "message": "很好的选择！计算机专业在互联网行业确实有很多机会💻\n\n...",
    "stage": "core_preferences",
    "progress": {
      "coreCount": 5,
      "secondaryCount": 0,
      "totalMessages": 12
    }
  }
}
```

---

### 3. 发送消息(流式模式)

使用Server-Sent Events (SSE)进行流式对话。

**端点**: `POST /api/agent/chat/stream`

**请求体**:
```json
{
  "userId": "uuid",
  "sessionId": "session-uuid",
  "message": "我想学计算机"
}
```

**响应** (SSE格式):
```
data: {"type":"connected"}

data: {"type":"chunk","content":"很"}

data: {"type":"chunk","content":"好"}

data: {"type":"chunk","content":"的"}

data: {"type":"chunk","content":"选择"}

...

data: {"type":"done"}
```

**客户端示例**:
```javascript
const eventSource = new EventSource('/api/agent/chat/stream', {
  headers: {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
  },
  method: 'POST',
  body: JSON.stringify({
    userId: 'xxx',
    sessionId: 'xxx',
    message: 'xxx'
  })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'chunk') {
    console.log(data.content); // 流式输出文本
  } else if (data.type === 'done') {
    eventSource.close();
  } else if (data.type === 'error') {
    console.error(data.message);
    eventSource.close();
  }
};
```

---

### 4. 生成志愿推荐

基于已收集的偏好指标生成志愿推荐。

**端点**: `POST /api/agent/generate`

**请求体**:
```json
{
  "sessionId": "session-uuid",
  "count": 60
}
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "count": 60,
    "recommendations": [
      {
        "collegeId": "college-uuid",
        "collegeName": "浙江大学",
        "majorName": "计算机科学与技术",
        "majorGroupCode": "0812",
        "majorGroupName": "计算机类",
        "totalScore": 92.5,
        "scoreCategory": "bold",
        "admissionProbability": {
          "probability": "medium",
          "historicalMinScore": 625,
          "historicalAvgScore": 630,
          "scoreDifference": -5,
          "years": 3,
          "trend": "rising"
        },
        "majorAdjustmentRisk": {
          "riskLevel": "low",
          "majorsInGroup": 4,
          "matchedMajors": 3,
          "unmatchedMajors": ["信息安全"],
          "adjustmentProbability": 0.15,
          "riskDescription": "✅ 低风险: 专业组内大部分专业符合偏好"
        },
        "dimensionScores": {
          "collegeScore": 95,
          "majorScore": 90,
          "cityScore": 85,
          "careerScore": 88,
          "admissionScore": 65,
          "riskPenalty": -5
        },
        "matchingReasons": [
          "985工程院校,综合实力强",
          "分数处于历年录取线附近,有录取可能",
          "专业排名全国前5,就业前景好"
        ],
        "riskWarnings": [
          "分数低于历年录取线,存在一定风险"
        ]
      },
      // ... 更多推荐
    ]
  }
}
```

---

### 5. 获取会话状态

查询会话的当前状态和进度。

**端点**: `GET /api/agent/session/:sessionId`

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "session-uuid",
    "stage": "core_preferences",
    "status": "active",
    "corePreferencesCount": 15,
    "secondaryPreferencesCount": 0,
    "totalMessages": 28,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastActiveAt": "2024-01-01T01:30:00.000Z",
    "hasRecommendations": false,
    "hasFinalVolunteers": false
  }
}
```

**会话阶段说明**:
- `init`: 初始化阶段
- `core_preferences`: 收集核心指标阶段(0-30个)
- `secondary_preferences`: 收集次要指标阶段(可选)
- `generating`: 生成推荐中
- `refining`: 精炼志愿阶段
- `completed`: 完成

---

### 6. 暂停会话

暂停当前会话，用户可以稍后继续。

**端点**: `POST /api/agent/session/:sessionId/pause`

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "Session paused successfully"
  }
}
```

---

### 7. 恢复会话

恢复已暂停的会话。

**端点**: `POST /api/agent/session/:sessionId/resume`

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "Session resumed successfully"
  }
}
```

---

### 8. 重新开始

重置用户的所有活跃会话，准备创建新会话。

**端点**: `POST /api/agent/reset`

**请求体**:
```json
{
  "userId": "uuid"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "Sessions reset successfully"
  }
}
```

---

### 9. 联网搜索

搜索院校、专业、城市等相关信息。

**端点**: `POST /api/agent/search`

**请求体**:
```json
{
  "query": "浙江大学计算机专业就业情况",
  "type": "college"
}
```

**type可选值**:
- `college`: 院校信息
- `major`: 专业信息
- `city`: 城市信息
- `general`: 通用搜索(默认)

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "result": "根据网上的信息:\n\n1. 浙江大学计算机专业2024年就业分析\n   ..."
  }
}
```

---

## 完整的使用流程

### 1. 开始对话

```javascript
// 用户登录后,开始新会话
const response = await fetch('/api/agent/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: currentUser.id,
    province: '浙江',
    examScore: 620,
    subjectType: '物理类'
  })
});

const { data } = await response.json();
console.log('欢迎语:', data.greeting);
console.log('会话ID:', data.sessionId);
```

### 2. 持续对话(流式)

```javascript
async function chatWithAgent(message) {
  const response = await fetch('/api/agent/chat/stream', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: currentUser.id,
      sessionId: currentSessionId,
      message: message
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.type === 'chunk') {
          // 实时显示文本
          appendToChat(data.content);
        } else if (data.type === 'done') {
          console.log('对话完成');
        }
      }
    }
  }
}
```

### 3. 检查进度

```javascript
const statusResponse = await fetch(`/api/agent/session/${sessionId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data } = await statusResponse.json();

if (data.corePreferencesCount >= 30) {
  // 核心指标收集完成,可以生成志愿表
  showGenerateButton();
}
```

### 4. 生成志愿表

```javascript
const response = await fetch('/api/agent/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sessionId: currentSessionId,
    count: 60  // 生成60个推荐(2倍数量)
  })
});

const { data } = await response.json();
console.log(`生成了${data.count}个推荐`);
displayRecommendations(data.recommendations);
```

---

## 核心概念

### 1. 30个核心指标

智能体会通过对话收集30个核心指标，包括:

**决策维度(3个最核心)**:
- `CORE_01`: 院校-专业-城市权重分配
- `CORE_02`: 就业-深造权重分配
- `CORE_03`: 兴趣-前景权重分配

**性格思维(5个)**:
- `CORE_04`: MBTI人格类型
- `CORE_05`: 思维偏向(文理)
- `CORE_06`: 学习风格(理论vs应用)
- `CORE_07`: 社交偏好
- `CORE_08`: 压力承受能力

**专业方向(6个)**:
- `CORE_09`: 专业大类偏好
- `CORE_10`: 具体专业意向
- `CORE_11`: 专业确定性
- `CORE_12`: 专业冷热偏好
- `CORE_13`: 是否服从专业调剂
- `CORE_14`: 跨专业组风险接受度

...等等

### 2. 推荐算法

推荐系统基于多维度加权计算:

```
总分 = 院校得分 × 院校权重
     + 专业得分 × 专业权重
     + 城市得分 × 城市权重
     + 就业得分 × 就业权重
     + 历史适配度得分 × 20%
     + 风险惩罚
```

### 3. 历史分数适配度

系统会分析近3年的录取分数线:
- **高概率**: 用户分数超过历年最低分15分以上
- **中等概率**: 用户分数在历年最低分±15分内
- **低概率**: 用户分数低于历年最低分15分以上

### 4. 专业组调剂风险

评估用户在专业组内被调剂到不匹配专业的风险:
- **低风险**: 专业组内70%以上专业匹配
- **中等风险**: 匹配度30%-70%
- **高风险**: 匹配度低于30%

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权(token无效或过期) |
| 404 | 资源不存在(如session不存在) |
| 500 | 服务器内部错误 |

**错误响应格式**:
```json
{
  "code": 400,
  "message": "Missing required parameters",
  "data": null
}
```

---

## 最佳实践

### 1. 会话管理

- 每个用户同时只能有一个活跃会话
- 用户可以暂停当前会话,稍后继续
- 会话超过7天未活跃会自动暂停

### 2. 流式输出

- 推荐使用流式模式以获得更好的用户体验
- 流式输出可以实时显示AI的思考过程
- 移动端建议降低流式速度以节省流量

### 3. 错误处理

```javascript
try {
  const response = await chatWithAgent(message);
} catch (error) {
  if (error.message.includes('Session not found')) {
    // 会话不存在,引导用户重新开始
    startNewSession();
  } else {
    // 其他错误
    showError(error.message);
  }
}
```

### 4. 性能优化

- 使用sessionStorage缓存会话ID
- 定期检查会话状态而不是每次都调用
- 批量处理消息而不是单条发送

---

## 技术架构

### 后端架构

```
Controller (API层)
    ↓
AgentService (主服务)
    ↓
├── ConversationService (会话管理)
├── PreferenceService (偏好管理)
├── LLMService (LLM集成)
├── PromptService (提示词工程)
├── RecommendationEngine (推荐引擎)
└── SearchService (联网搜索)
    ↓
Database (MySQL + TypeORM)
```

### 数据模型

- `AgentSession`: 会话表
- `AgentMessage`: 消息表
- `AgentPreference`: 偏好指标表
- `AgentRecommendation`: 推荐记录表

---

## 开发指南

### 环境变量配置

在`.env`文件中添加:

```env
# LLM API配置
LLM_API_KEY=your_openai_api_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-3.5-turbo

# 搜索API(可选)
SERP_API_KEY=your_serp_api_key
```

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 测试智能体
curl -X POST http://localhost:3000/api/agent/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"userId":"xxx","province":"浙江","examScore":620,"subjectType":"物理类"}'
```

---

## 常见问题

**Q: 为什么会话创建失败?**

A: 可能原因:
1. 用户已有活跃会话(需先暂停或完成)
2. 缺少必要参数
3. 数据库连接问题

**Q: 流式输出中断怎么办?**

A: 使用普通模式作为fallback，或者实现断点续传机制。

**Q: 如何自定义指标?**

A: 修改`src/config/indicators.ts`文件,添加或修改指标定义。

**Q: 推荐结果不准确?**

A: 检查:
1. 用户偏好指标是否收集完整
2. 历史分数数据是否充足
3. 权重配置是否合理

---

## 更新日志

### v1.0.0 (2024-01-01)

- ✅ 完整的智能体对话系统
- ✅ 30个核心指标 + 70个次要指标
- ✅ 科学的数学模型推荐算法
- ✅ 历史分数适配度分析
- ✅ 专业组调剂风险评估
- ✅ 流式输出支持
- ✅ 会话暂停/恢复
- ✅ 联网搜索功能

---

## 联系我们

如有问题或建议，欢迎联系:
- GitHub Issues: [项目地址]
- Email: support@example.com
