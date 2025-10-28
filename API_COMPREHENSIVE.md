# 志愿填报系统 - 完整API文档

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 通用说明](#2-通用说明)
- [3. 用户模块 API](#3-用户模块-api)
- [4. 院校模块 API](#4-院校模块-api)
- [5. 专业模块 API](#5-专业模块-api)
- [6. 志愿模块 API](#6-志愿模块-api)
- [7. 招生计划模块 API](#7-招生计划模块-api)
- [8. 录取分数模块 API](#8-录取分数模块-api)
- [9. 分数排名模块 API](#9-分数排名模块-api)
- [10. 智能体模块 API](#10-智能体模块-api)
- [11. 系统模块 API](#11-系统模块-api)
- [12. 错误码说明](#12-错误码说明)

---

## 1. 项目概述

### 1.1 项目信息

- **项目名称**: 志愿填报系统后端 API
- **版本**: v2.0.0
- **技术栈**: Node.js + Express + TypeScript + TypeORM + MySQL
- **基础URL**: `http://localhost:8080/api`
- **字符编码**: UTF-8

### 1.2 技术架构

```
┌─────────────────────────────────────────────┐
│         客户端 (Web/Mobile)                  │
└─────────────────┬───────────────────────────┘
                  │ HTTP/HTTPS
┌─────────────────▼───────────────────────────┐
│     Express.js 中间件层                      │
│  • Helmet (安全头)                           │
│  • CORS (跨域)                              │
│  • Morgan (HTTP日志)                        │
│  • JWT 认证                                 │
│  • 请求验证                                  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         API 路由层 (Routes)                  │
│  /user  /college  /major  /volunteer        │
│  /agent  /enrollment-plan  /admission-score │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│        控制器层 (Controllers)                │
│  • 参数校验                                  │
│  • 业务调度                                  │
│  • 响应格式化                                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│        服务层 (Services)                     │
│  • 业务逻辑                                  │
│  • 数据处理                                  │
│  • 算法实现                                  │
│  • LLM 集成 (智能体)                         │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      数据访问层 (TypeORM + Models)           │
│  User / College / Major / Volunteer         │
│  AgentSession / AgentMessage / AgentPreference│
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          MySQL 8.0 数据库                    │
└─────────────────────────────────────────────┘
```

### 1.3 核心功能模块

| 模块 | 说明 | 端点前缀 |
|------|------|----------|
| 用户管理 | 注册、登录、个人信息管理 | `/api/user` |
| 院校查询 | 院校列表、详情、对比 | `/api/college` |
| 专业查询 | 专业列表、详情、院校 | `/api/major` |
| 志愿填报 | 志愿保存、提交、推荐 | `/api/volunteer` |
| 招生计划 | 查询院校招生计划 | `/api/enrollment-plan` |
| 录取分数 | 历年录取分数查询 | `/api/admission-score` |
| 分数排名 | 分数对应位次查询 | `/api/score-ranking` |
| **智能体对话** | AI智能志愿填报助手 | `/api/agent` |
| 系统工具 | 数据字典、配置、上传 | `/api/system` |

---

## 2. 通用说明

### 2.1 请求格式

- **Content-Type**: `application/json; charset=utf-8`
- **字符编码**: UTF-8
- **日期格式**: ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)

### 2.2 响应格式

所有接口统一返回格式:

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | HTTP状态码 (200成功, 4xx客户端错误, 5xx服务器错误) |
| message | string | 响应消息描述 |
| data | any | 响应数据 (可为对象、数组、字符串等) |

### 2.3 分页格式

分页查询请求参数:
```json
{
  "pageNum": 1,
  "pageSize": 10
}
```

分页查询响应格式:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [],
    "total": 100,
    "pageNum": 1,
    "pageSize": 10,
    "pages": 10
  }
}
```

### 2.4 认证方式

使用 JWT (JSON Web Token) 进行身份认证。

**请求头格式**:
```
Authorization: Bearer <token>
```

**Token 有效期**: 7天

### 2.5 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/Token无效 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 3. 用户模块 API

**基础路径**: `/api/user`

### 3.1 用户注册

**接口**: `POST /api/user/register`
**认证**: 无需认证

#### 请求参数
```json
{
  "username": "zhangsan",
  "password": "123456",
  "nickname": "张三",
  "phone": "13800138000",
  "email": "zhangsan@example.com"
}
```

| 参数 | 类型 | 必填 | 说明 | 验证规则 |
|------|------|------|------|----------|
| username | string | 是 | 用户名 | 4-20个字符,字母数字下划线 |
| password | string | 是 | 密码 | 6-20个字符 |
| nickname | string | 是 | 昵称 | 不能为空 |
| phone | string | 是 | 手机号 | 中国大陆11位手机号 |
| email | string | 否 | 邮箱 | 有效的邮箱格式 |

#### 响应示例
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "nickname": "张三",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3.2 用户登录

**接口**: `POST /api/user/login`
**认证**: 无需认证

#### 请求参数
```json
{
  "username": "zhangsan",
  "password": "123456"
}
```

#### 响应示例
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "nickname": "张三",
    "avatar": "https://example.com/avatar.jpg",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3.3 获取用户信息

**接口**: `GET /api/user/info`
**认证**: 需要JWT Token

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "zhangsan",
    "nickname": "张三",
    "phone": "138****8000",
    "email": "zhangsan@example.com",
    "province": "浙江省",
    "city": "杭州市",
    "examScore": 650,
    "subjectType": "physics"
  }
}
```

---

### 3.4 更新用户信息

**接口**: `PUT /api/user/info`
**认证**: 需要JWT Token

#### 请求参数
```json
{
  "nickname": "张三同学",
  "province": "浙江省",
  "examScore": 650
}
```

---

### 3.5 修改密码

**接口**: `PUT /api/user/password`
**认证**: 需要JWT Token

#### 请求参数
```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

---

## 4. 院校模块 API

**基础路径**: `/api/college`

### 4.1 获取院校列表

**接口**: `GET /api/college/list`
**认证**: 无需认证

#### 请求参数(Query)
```
GET /api/college/list?pageNum=1&pageSize=10&keyword=北京&province=北京市&type=综合类&level=985
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageNum | number | 否 | 页码(默认1) |
| pageSize | number | 否 | 每页数量(默认10) |
| keyword | string | 否 | 搜索关键词 |
| province | string | 否 | 省份筛选 |
| city | string | 否 | 城市筛选 |
| type | string | 否 | 院校类型 |
| level | string | 否 | 院校层次(985/211/双一流) |
| nature | string | 否 | 办学性质(公办/民办) |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "北京大学",
        "code": "10001",
        "province": "北京市",
        "type": "综合类",
        "level": "985,211,双一流",
        "rank": 1,
        "minScore": 680
      }
    ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 10
  }
}
```

---

### 4.2 获取院校详情

**接口**: `GET /api/college/:id`
**认证**: 无需认证

---

### 4.3 获取院校招生计划

**接口**: `GET /api/college/:id/plan`
**认证**: 无需认证

---

### 4.4 获取院校历年分数线

**接口**: `GET /api/college/:id/scores`
**认证**: 无需认证

---

### 4.5 对比院校

**接口**: `POST /api/college/compare`
**认证**: 无需认证

#### 请求参数
```json
{
  "collegeIds": ["id1", "id2", "id3"]
}
```

---

## 5. 专业模块 API

**基础路径**: `/api/major`

### 5.1 获取专业列表

**接口**: `GET /api/major/list`
**认证**: 无需认证

---

### 5.2 获取专业详情

**接口**: `GET /api/major/:id`
**认证**: 无需认证

---

### 5.3 获取开设该专业的院校

**接口**: `GET /api/major/:id/colleges`
**认证**: 无需认证

---

## 6. 志愿模块 API

**基础路径**: `/api/volunteer`
**认证要求**: 所有接口均需要JWT Token

### 6.1 获取我的志愿

**接口**: `GET /api/volunteer/my`

---

### 6.2 保存志愿(草稿)

**接口**: `POST /api/volunteer/save`

#### 请求参数
```json
{
  "volunteers": [
    {
      "priority": 1,
      "collegeId": "college-id",
      "majorId": "major-id",
      "isObeyAdjustment": true
    }
  ]
}
```

---

### 6.3 提交志愿

**接口**: `POST /api/volunteer/submit`

---

### 6.4 删除志愿

**接口**: `DELETE /api/volunteer/:id`

---

### 6.5 智能推荐志愿

**接口**: `POST /api/volunteer/recommend`

#### 请求参数
```json
{
  "score": 650,
  "province": "浙江省",
  "subjectType": "physics",
  "rank": 5000,
  "count": 30
}
```

---

### 6.6 分析志愿录取概率

**接口**: `POST /api/volunteer/analyze`

---

## 7. 招生计划模块 API

**基础路径**: `/api/enrollment-plan`

### 7.1 查询招生计划

**接口**: `GET /api/enrollment-plan/search`

#### 请求参数(Query)
```
GET /api/enrollment-plan/search?collegeName=北京大学&year=2024&province=浙江省&subjectType=physics
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collegeName | string | 否 | 院校名称 |
| majorName | string | 否 | 专业名称 |
| year | number | 否 | 年份(默认当前年) |
| province | string | 否 | 省份 |
| subjectType | string | 否 | 科目类型 |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "plan-id",
      "collegeName": "北京大学",
      "majorName": "计算机科学与技术",
      "planCount": 15,
      "tuition": 5000,
      "year": 2024,
      "province": "浙江省"
    }
  ]
}
```

---

### 7.2 按院校查询

**接口**: `GET /api/enrollment-plan/by-college/:collegeName`

---

### 7.3 按专业查询

**接口**: `GET /api/enrollment-plan/by-major/:majorName`

---

## 8. 录取分数模块 API

**基础路径**: `/api/admission-score`

### 8.1 查询录取分数

**接口**: `GET /api/admission-score/search`

#### 请求参数(Query)
```
GET /api/admission-score/search?collegeName=北京大学&year=2024&province=浙江省
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collegeName | string | 否 | 院校名称 |
| majorName | string | 否 | 专业名称 |
| year | number | 否 | 年份 |
| province | string | 是 | 省份 |
| subjectType | string | 否 | 科目类型 |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "score-id",
      "collegeName": "北京大学",
      "year": 2024,
      "province": "浙江省",
      "minScore": 680,
      "avgScore": 690,
      "maxScore": 700,
      "minRank": 50
    }
  ]
}
```

---

### 8.2 历年分数对比

**接口**: `GET /api/admission-score/trend`

#### 请求参数
```
GET /api/admission-score/trend?collegeName=北京大学&province=浙江省&years=3
```

---

### 8.3 按院校查询

**接口**: `GET /api/admission-score/by-college/:collegeName`

---

## 9. 分数排名模块 API

**基础路径**: `/api/score-ranking`

### 9.1 查询分数对应排名

**接口**: `GET /api/score-ranking/by-score`

#### 请求参数(Query)
```
GET /api/score-ranking/by-score?score=650&province=浙江省&year=2024&subjectType=physics
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| score | number | 是 | 分数 |
| province | string | 是 | 省份 |
| year | number | 否 | 年份(默认当前年) |
| subjectType | string | 是 | 科目类型(physics/history) |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "score": 650,
    "rank": 5000,
    "province": "浙江省",
    "year": 2024,
    "subjectType": "physics",
    "totalCount": 300000
  }
}
```

---

### 9.2 查询排名对应分数

**接口**: `GET /api/score-ranking/by-rank`

#### 请求参数
```
GET /api/score-ranking/by-rank?rank=5000&province=浙江省&year=2024&subjectType=physics
```

---

### 9.3 查询分数段人数分布

**接口**: `GET /api/score-ranking/distribution`

---

## 10. 智能体模块 API

**基础路径**: `/api/agent`
**认证要求**: 所有接口均需要JWT Token

### 10.1 开始新会话

创建一个新的AI对话会话。

**接口**: `POST /api/agent/start`

#### 请求参数
```json
{
  "userId": "user-uuid",
  "province": "浙江",
  "examScore": 620,
  "subjectType": "物理类"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| province | string | 是 | 省份 |
| examScore | number | 是 | 高考分数 |
| subjectType | string | 是 | 科目类型(物理类/历史类) |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "session-uuid",
    "greeting": "你好!我是你的志愿填报智能助手'小志'🎓\n\n恭喜你完成高考!我将通过对话了解你的偏好,然后为你推荐最适合的志愿方案。\n\n首先,让我们聊聊你对院校、专业、城市三个方面的重视程度吧。如果给这三者分配100分,你会怎么分配呢?"
  }
}
```

---

### 10.2 发送消息(普通模式)

向智能体发送消息并获取响应。

**接口**: `POST /api/agent/chat`

#### 请求参数
```json
{
  "userId": "user-uuid",
  "sessionId": "session-uuid",
  "message": "我想学计算机,将来进互联网公司"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 用户ID |
| sessionId | string | 是 | 会话ID |
| message | string | 是 | 用户消息 |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "session-uuid",
    "message": "很好的选择!计算机专业在互联网行业确实有很多机会💻\n\n那你更倾向于偏理论研究的计算机科学,还是偏实际应用的软件工程呢?",
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

### 10.3 发送消息(流式模式)

使用Server-Sent Events (SSE)进行流式对话,实时返回AI响应。

**接口**: `POST /api/agent/chat/stream`

#### 请求参数
```json
{
  "userId": "user-uuid",
  "sessionId": "session-uuid",
  "message": "我想学计算机"
}
```

#### 响应格式 (SSE)
```
data: {"type":"connected"}

data: {"type":"chunk","content":"很"}

data: {"type":"chunk","content":"好"}

data: {"type":"chunk","content":"的"}

data: {"type":"chunk","content":"选择"}

data: {"type":"done"}
```

**SSE事件类型**:
- `connected`: 连接成功
- `chunk`: 文本片段
- `done`: 响应完成
- `error`: 发生错误

#### 客户端示例 (JavaScript)
```javascript
const response = await fetch('/api/agent/chat/stream', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'xxx',
    sessionId: 'xxx',
    message: 'xxx'
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
        console.log(data.content);
      } else if (data.type === 'done') {
        console.log('对话完成');
      }
    }
  }
}
```

---

### 10.4 生成志愿推荐

基于已收集的偏好指标生成志愿推荐。

**接口**: `POST /api/agent/generate`

#### 请求参数
```json
{
  "sessionId": "session-uuid",
  "count": 60
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| sessionId | string | 是 | 会话ID |
| count | number | 否 | 推荐数量(默认60,系统会生成2倍数量后筛选) |

#### 响应示例
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
          "trend": "rising",
          "score": 65
        },
        "majorAdjustmentRisk": {
          "riskLevel": "low",
          "majorsInGroup": 4,
          "matchedMajors": 3,
          "unmatchedMajors": ["信息安全"],
          "adjustmentProbability": 0.15,
          "riskScore": -5,
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
      }
    ]
  }
}
```

**字段详细说明**:

| 字段 | 说明 |
|------|------|
| scoreCategory | 志愿类别: bold(冲刺)/moderate(适中)/stable(稳妥) |
| admissionProbability.probability | 录取概率: high/medium/low |
| admissionProbability.trend | 分数线趋势: rising/falling/stable |
| majorAdjustmentRisk.riskLevel | 调剂风险: low/medium/high/none |
| dimensionScores | 各维度得分(0-100) |

---

### 10.5 获取会话状态

查询会话的当前状态和进度。

**接口**: `GET /api/agent/session/:sessionId`

#### 响应示例
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

**会话状态说明**:
- `active`: 活跃中
- `paused`: 已暂停
- `completed`: 已完成
- `expired`: 已过期

---

### 10.6 暂停会话

暂停当前会话,用户可以稍后继续。

**接口**: `POST /api/agent/session/:sessionId/pause`

#### 响应示例
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

### 10.7 恢复会话

恢复已暂停的会话。

**接口**: `POST /api/agent/session/:sessionId/resume`

#### 响应示例
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

### 10.8 重新开始

重置用户的所有活跃会话,准备创建新会话。

**接口**: `POST /api/agent/reset`

#### 请求参数
```json
{
  "userId": "user-uuid"
}
```

#### 响应示例
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

### 10.9 联网搜索

搜索院校、专业、城市等相关信息。

**接口**: `POST /api/agent/search`

#### 请求参数
```json
{
  "query": "浙江大学计算机专业就业情况",
  "type": "college"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 搜索关键词 |
| type | string | 否 | 搜索类型(college/major/city/general) |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "result": "根据网上的信息:\n\n1. 浙江大学计算机专业2024年就业分析\n   - 就业率: 98.5%\n   - 平均薪资: 15-20万\n   - 主要去向: 阿里巴巴、字节跳动、腾讯等互联网大厂\n\n2. 专业实力\n   - 全国排名: Top 5\n   - 师资力量强大,拥有多位院士\n   ..."
  }
}
```

---

### 10.10 智能体核心概念

#### 10.10.1 指标体系

智能体会通过对话收集 **30个核心指标** 和 **70个次要指标**:

**核心指标分类**:

1. **决策维度 (3个最核心)**
   - CORE_01: 院校-专业-城市权重分配
   - CORE_02: 就业-深造权重分配
   - CORE_03: 兴趣-前景权重分配

2. **性格思维 (5个)**
   - CORE_04: MBTI人格类型
   - CORE_05: 思维偏向(文理)
   - CORE_06: 学习风格(理论vs应用)
   - CORE_07: 社交偏好
   - CORE_08: 压力承受能力

3. **专业方向 (6个)**
   - CORE_09: 专业大类偏好
   - CORE_10: 具体专业意向
   - CORE_11: 专业确定性
   - CORE_12: 专业冷热偏好
   - CORE_13: 是否服从专业调剂
   - CORE_14: 跨专业组风险接受度

4. **院校偏好 (6个)**
   - CORE_15: 院校层次偏好
   - CORE_16: 院校类型偏好
   - CORE_17: 院校地理位置
   - CORE_18: 院校规模偏好
   - CORE_19: 院校历史文化
   - CORE_20: 院校排名敏感度

5. **城市偏好 (4个)**
   - CORE_21: 目标城市列表
   - CORE_22: 城市发展水平
   - CORE_23: 离家距离偏好
   - CORE_24: 气候偏好

6. **就业规划 (4个)**
   - CORE_25: 就业地域偏好
   - CORE_26: 目标行业
   - CORE_27: 薪资预期
   - CORE_28: 工作稳定性vs挑战性

7. **深造规划 (2个)**
   - CORE_29: 深造意向强度
   - CORE_30: 保研/考研/留学偏好

#### 10.10.2 推荐算法

推荐系统基于多维度加权计算:

```
总分 = 院校得分 × 院校权重
     + 专业得分 × 专业权重
     + 城市得分 × 城市权重
     + 就业得分 × 就业权重
     + 历史适配度得分 × 20%
     + 风险惩罚
```

**各维度得分计算**:
- **院校得分**: 基于院校层次、排名、类型等
- **专业得分**: 基于专业匹配度、就业前景等
- **城市得分**: 基于城市偏好、经济发展等
- **就业得分**: 基于就业率、薪资水平等
- **历史适配度**: 基于近3年录取分数分析
- **风险惩罚**: 专业组调剂风险的负分

#### 10.10.3 历史分数适配度

系统会分析近3年的录取分数线:

| 分数差 | 录取概率 | 概率评级 |
|--------|----------|----------|
| ≥30分 | 90% | high |
| 15-30分 | 80% | high |
| 5-15分 | 65% | medium |
| -5到5分 | 50% | medium |
| -15到-5分 | 30% | low |
| <-15分 | 15% | low |

**趋势调整**:
- 上升趋势: 概率降低10%
- 下降趋势: 概率提高5%

#### 10.10.4 专业组调剂风险

评估用户在专业组内被调剂到不匹配专业的风险:

| 匹配专业占比 | 风险等级 | 调剂概率 |
|--------------|----------|----------|
| >70% | low | <20% |
| 30%-70% | medium | 20%-60% |
| <30% | high | >60% |

---

## 11. 系统模块 API

**基础路径**: `/api/system`

### 11.1 获取省份列表

**接口**: `GET /api/system/provinces`
**认证**: 无需认证

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "code": "110000", "name": "北京市" },
    { "code": "120000", "name": "天津市" },
    { "code": "330000", "name": "浙江省" }
  ]
}
```

---

### 11.2 获取数据字典

**接口**: `GET /api/system/dict`
**认证**: 无需认证

#### 请求参数
```
GET /api/system/dict?type=college_type
```

**type可选值**:
- `college_type`: 院校类型
- `college_level`: 院校层次
- `major_category`: 专业门类
- `subject_type`: 科目类型

---

### 11.3 获取系统配置

**接口**: `GET /api/system/config`
**认证**: 无需认证

---

### 11.4 文件上传

**接口**: `POST /api/system/upload`
**认证**: 需要JWT Token

#### 请求格式
- **Content-Type**: `multipart/form-data`
- **文件字段名**: `file`

---

### 11.5 健康检查

**接口**: `GET /api/health`
**认证**: 无需认证

#### 响应示例
```json
{
  "status": "ok",
  "timestamp": "2024-06-25T10:30:00.000Z"
}
```

---

## 12. 错误码说明

### 12.1 通用错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 200 | 成功 | - |
| 400 | 请求参数错误 | 检查请求参数格式和必填字段 |
| 401 | 未授权/Token无效 | 重新登录获取有效Token |
| 403 | 禁止访问 | 检查用户权限 |
| 404 | 资源不存在 | 检查请求的资源ID是否正确 |
| 500 | 服务器内部错误 | 联系管理员 |

### 12.2 业务错误信息

| 错误信息 | 说明 |
|----------|------|
| 用户名已存在 | 注册时用户名重复 |
| 手机号已被注册 | 注册时手机号重复 |
| 用户名或密码错误 | 登录凭证不正确 |
| Token已过期 | JWT Token超过有效期(7天) |
| Session not found | 会话不存在或已过期 |
| 志愿数量超过限制 | 超过96个志愿上限 |
| 志愿填报未开放 | 不在填报时间范围内 |
| Missing required parameters | 缺少必要参数 |
| LLM API调用失败 | 第三方LLM服务异常 |

---

## 附录

### A. 完整API端点汇总表

| 模块 | 方法 | 端点 | 认证 | 说明 |
|------|------|------|------|------|
| **用户** | POST | /api/user/register | ❌ | 用户注册 |
| | POST | /api/user/login | ❌ | 用户登录 |
| | GET | /api/user/info | ✅ | 获取用户信息 |
| | PUT | /api/user/info | ✅ | 更新用户信息 |
| | PUT | /api/user/password | ✅ | 修改密码 |
| **院校** | GET | /api/college/list | ❌ | 院校列表 |
| | GET | /api/college/:id | ❌ | 院校详情 |
| | GET | /api/college/:id/plan | ❌ | 招生计划 |
| | GET | /api/college/:id/scores | ❌ | 历年分数 |
| | POST | /api/college/compare | ❌ | 对比院校 |
| **专业** | GET | /api/major/list | ❌ | 专业列表 |
| | GET | /api/major/:id | ❌ | 专业详情 |
| | GET | /api/major/:id/colleges | ❌ | 开设院校 |
| **志愿** | GET | /api/volunteer/my | ✅ | 我的志愿 |
| | POST | /api/volunteer/save | ✅ | 保存志愿 |
| | POST | /api/volunteer/submit | ✅ | 提交志愿 |
| | DELETE | /api/volunteer/:id | ✅ | 删除志愿 |
| | POST | /api/volunteer/recommend | ✅ | 智能推荐 |
| | POST | /api/volunteer/analyze | ✅ | 概率分析 |
| **招生计划** | GET | /api/enrollment-plan/search | ❌ | 查询计划 |
| | GET | /api/enrollment-plan/by-college/:name | ❌ | 按院校查询 |
| | GET | /api/enrollment-plan/by-major/:name | ❌ | 按专业查询 |
| **录取分数** | GET | /api/admission-score/search | ❌ | 查询分数 |
| | GET | /api/admission-score/trend | ❌ | 历年趋势 |
| | GET | /api/admission-score/by-college/:name | ❌ | 按院校查询 |
| **分数排名** | GET | /api/score-ranking/by-score | ❌ | 分数查排名 |
| | GET | /api/score-ranking/by-rank | ❌ | 排名查分数 |
| | GET | /api/score-ranking/distribution | ❌ | 分数段分布 |
| **智能体** | POST | /api/agent/start | ✅ | 开始会话 |
| | POST | /api/agent/chat | ✅ | 发送消息 |
| | POST | /api/agent/chat/stream | ✅ | 流式对话 |
| | POST | /api/agent/generate | ✅ | 生成推荐 |
| | GET | /api/agent/session/:id | ✅ | 会话状态 |
| | POST | /api/agent/session/:id/pause | ✅ | 暂停会话 |
| | POST | /api/agent/session/:id/resume | ✅ | 恢复会话 |
| | POST | /api/agent/reset | ✅ | 重新开始 |
| | POST | /api/agent/search | ✅ | 联网搜索 |
| **系统** | GET | /api/system/provinces | ❌ | 省份列表 |
| | GET | /api/system/dict | ❌ | 数据字典 |
| | GET | /api/system/config | ❌ | 系统配置 |
| | POST | /api/system/upload | ✅ | 文件上传 |
| | GET | /api/health | ❌ | 健康检查 |

**总计**: 42个API端点

---

### B. 环境变量配置

在`.env`文件中配置:

```env
# 服务器配置
PORT=8080
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=volunteer_system

# JWT配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# LLM API配置 (智能体模块需要)
LLM_API_KEY=your_openai_api_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-3.5-turbo

# 搜索API配置 (可选)
SERP_API_KEY=your_serp_api_key
```

---

### C. 快速开始示例

#### C.1 完整的用户注册登录流程

```bash
# 1. 用户注册
curl -X POST http://localhost:8080/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"zhangsan",
    "password":"123456",
    "nickname":"张三",
    "phone":"13800138000"
  }'

# 2. 用户登录
curl -X POST http://localhost:8080/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"zhangsan","password":"123456"}'

# 3. 获取用户信息(使用返回的token)
curl -X GET http://localhost:8080/api/user/info \
  -H "Authorization: Bearer <token>"
```

#### C.2 智能体对话流程

```bash
# 1. 开始新会话
curl -X POST http://localhost:8080/api/agent/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user-uuid",
    "province":"浙江",
    "examScore":620,
    "subjectType":"物理类"
  }'

# 2. 发送消息
curl -X POST http://localhost:8080/api/agent/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"user-uuid",
    "sessionId":"session-uuid",
    "message":"我想学计算机"
  }'

# 3. 查看会话状态
curl -X GET http://localhost:8080/api/agent/session/<session-uuid> \
  -H "Authorization: Bearer <token>"

# 4. 生成志愿推荐
curl -X POST http://localhost:8080/api/agent/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"session-uuid",
    "count":60
  }'
```

---

### D. 数据库表结构

#### 核心表

- `users`: 用户表
- `colleges`: 院校表
- `majors`: 专业表
- `volunteers`: 志愿表
- `enrollment_plans`: 招生计划表
- `admission_scores`: 录取分数表
- `score_rankings`: 分数排名表

#### 智能体相关表

- `agent_sessions`: 会话表
- `agent_messages`: 消息表
- `agent_preferences`: 偏好指标表
- `agent_recommendations`: 推荐记录表

---

### E. 技术支持

- **文档地址**: [GitHub Repository]
- **问题反馈**: [GitHub Issues]
- **联系邮箱**: support@example.com

---

**文档版本**: v2.0.0
**最后更新**: 2025-01-25
**维护者**: 开发团队

---

© 2025 志愿填报系统. All Rights Reserved.
