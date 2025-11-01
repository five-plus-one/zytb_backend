# AI 工具前端集成指南

本文档提供完整的前端集成指南,帮助您将 AI Function Calling 工具集成到志愿填报系统的前端应用中。

## 目录

1. [架构概述](#架构概述)
2. [工具 API 列表](#工具-api-列表)
3. [前端集成方案](#前端集成方案)
4. [左右分栏布局实现](#左右分栏布局实现)
5. [AI Function Calling 集成](#ai-function-calling-集成)
6. [完整示例代码](#完整示例代码)

---

## 架构概述

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                         前端应用                              │
│  ┌───────────────────────┐  ┌───────────────────────────┐  │
│  │     AI 对话界面        │  │     志愿表管理界面          │  │
│  │  - 用户消息输入         │  │  - 显示当前志愿列表         │  │
│  │  - AI 回复显示          │  │  - 拖拽调整顺序             │  │
│  │  - Function Calling    │  │  - 删除志愿                 │  │
│  │  - 工具调用可视化       │  │  - 实时同步更新             │  │
│  └───────────────────────┘  └───────────────────────────┘  │
│                    ↓                        ↑                │
└────────────────────┼────────────────────────┼────────────────┘
                     ↓                        ↑
              ┌──────────────────────────────────────┐
              │         后端 API 服务                 │
              │  ┌─────────────────────────────────┐ │
              │  │   /api/agent/chat (SSE)         │ │
              │  │   - AI 对话流式响应              │ │
              │  │   - Function Calling 触发       │ │
              │  └─────────────────────────────────┘ │
              │  ┌─────────────────────────────────┐ │
              │  │   /api/agent/tools/*            │ │
              │  │   - 12 个工具 API               │ │
              │  │   - 查询院校/专业/分数           │ │
              │  │   - 管理志愿表                  │ │
              │  └─────────────────────────────────┘ │
              └──────────────────────────────────────┘
```

### Function Calling 流程

```
用户输入: "帮我推荐一些适合600分的院校"
    ↓
前端发送到 /api/agent/chat (SSE)
    ↓
AI 识别需要调用工具
    ↓
AI 返回 Function Call 指令
    ↓
前端调用 /api/agent/tools/recommend-colleges?score=600&province=...
    ↓
获取推荐结果
    ↓
前端将结果发送回 AI
    ↓
AI 生成自然语言回复
    ↓
显示给用户
```

---

## 工具 API 列表

所有工具 API 均需要在 Header 中携带认证 Token:
```
Authorization: Bearer <your_jwt_token>
```

### 1. 搜索院校

**接口**: `GET /api/agent/tools/search-college`

**查询参数**:
- `keyword`: string (可选) - 院校名称或代码关键词
- `province`: string (可选) - 省份
- `type`: string (可选) - 院校类型 (综合/理工/师范/医药等)
- `is985`: boolean (可选) - 是否985
- `is211`: boolean (可选) - 是否211
- `isDoubleFirstClass`: boolean (可选) - 是否双一流
- `minRank`: number (可选) - 最低排名
- `maxRank`: number (可选) - 最高排名
- `limit`: number (可选, 默认10) - 返回结果数量

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "name": "清华大学",
      "province": "北京",
      "city": "北京",
      "type": "综合",
      "rank": 1,
      "is985": true,
      "is211": true,
      "isDoubleFirstClass": true,
      "nationalSpecialMajorCount": 56,
      "postgraduateRate": 78.5,
      "description": "清华大学是中国著名高等学府..."
    }
  ]
}
```

### 2. 搜索专业

**接口**: `GET /api/agent/tools/search-major`

**查询参数**:
- `keyword`: string (可选) - 专业名称关键词
- `category`: string (可选) - 专业门类 (工学/理学/医学等)
- `subCategory`: string (可选) - 专业类
- `degree`: string (可选) - 学位类型 (本科/专科)
- `limit`: number (可选, 默认10)

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "name": "计算机科学与技术",
      "code": "080901",
      "category": "工学",
      "subCategory": "计算机类",
      "degree": "本科",
      "degreeType": "工学学士",
      "years": 4,
      "requiredSubjects": ["物理"],
      "employmentRate": 95.5,
      "avgSalary": 12000,
      "description": "本专业培养掌握计算机科学..."
    }
  ]
}
```

### 3. 根据分数推荐院校

**接口**: `GET /api/agent/tools/recommend-colleges`

**查询参数** (必需):
- `score`: number - 用户分数
- `province`: string - 考生所在省份
- `subjectType`: string - 科目类型 (理科/文科/物理/历史)
- `rank`: number (可选) - 用户排名
- `limit`: number (可选, 默认20)

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "collegeId": "uuid",
      "collegeName": "北京大学",
      "province": "北京",
      "city": "北京",
      "type": "综合",
      "is985": true,
      "is211": true,
      "minScore": 595,
      "scoreDifference": 5,
      "category": "moderate",
      "probability": "medium",
      "year": 2024
    }
  ]
}
```

**分类说明**:
- `bold` (冲刺): scoreDifference < 0, probability: low
- `moderate` (适中): 0 ≤ scoreDifference < 10, probability: medium
- `stable` (保底): scoreDifference ≥ 10, probability: high

### 4. 查询历年录取分数线

**接口**: `GET /api/agent/tools/admission-scores`

**查询参数**:
- `collegeId` 或 `collegeName`: string (二选一必需)
- `province`: string (必需) - 考生所在省份
- `subjectType`: string (必需) - 科目类型
- `years`: number (可选, 默认3) - 查询近几年数据

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "collegeName": "清华大学",
      "year": 2024,
      "province": "北京",
      "batch": "本科一批",
      "subjectType": "理科",
      "minScore": 680,
      "minRank": 150
    }
  ]
}
```

### 5. 查询分数对应排名

**接口**: `GET /api/agent/tools/score-rank`

**查询参数** (均必需):
- `score`: number - 分数
- `province`: string - 省份
- `subjectType`: string - 科目类型

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "score": 600,
    "rank": 15000,
    "province": "北京",
    "subjectType": "理科",
    "year": 2025,
    "note": "未找到精确匹配,返回最接近的分数"
  }
}
```

### 6. 查询城市信息

**接口**: `GET /api/agent/tools/city-info`

**查询参数**:
- `city`: string (必需) - 城市名称

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "city": "北京",
    "totalColleges": 10,
    "total985": 2,
    "total211": 8,
    "totalDoubleFirstClass": 10,
    "colleges": [
      {
        "name": "清华大学",
        "type": "综合",
        "rank": 1,
        "is985": true,
        "is211": true
      }
    ]
  }
}
```

### 7. 查询院校详细信息

**接口**: `GET /api/agent/tools/college-detail/:collegeId`

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "name": "清华大学",
    "code": "10003",
    "province": "北京",
    "city": "北京",
    "type": "综合",
    "rank": 1,
    "is985": true,
    "is211": true,
    "isDoubleFirstClass": true,
    "worldClassDisciplines": ["计算机科学与技术", "电子科学与技术"],
    "nationalSpecialMajorCount": 56,
    "postgraduateRate": 78.5,
    "address": "北京市海淀区清华园1号",
    "website": "https://www.tsinghua.edu.cn",
    "admissionPhone": "010-62770334",
    "email": "zsb@tsinghua.edu.cn",
    "description": "完整的院校介绍...",
    "evaluationResult": {}
  }
}
```

### 8. 查询专业详细信息

**接口**: `GET /api/agent/tools/major-detail/:majorId`

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "name": "计算机科学与技术",
    "code": "080901",
    "category": "工学",
    "subCategory": "计算机类",
    "discipline": "计算机科学与技术",
    "degree": "本科",
    "degreeType": "工学学士",
    "years": 4,
    "requiredSubjects": ["物理"],
    "employmentRate": 95.5,
    "avgSalary": 12000,
    "description": "专业介绍...",
    "courses": ["数据结构", "算法设计", "操作系统"],
    "career": "软件工程师、系统架构师..."
  }
}
```

### 9. 获取用户志愿表

**接口**: `GET /api/agent/tools/volunteers`

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "priority": 1,
      "collegeId": "uuid",
      "collegeName": "清华大学",
      "majorId": "uuid",
      "majorName": "计算机科学与技术",
      "isObeyAdjustment": true,
      "admitProbability": "medium",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### 10. 添加志愿

**接口**: `POST /api/agent/tools/volunteers`

**请求体**:
```json
{
  "collegeId": "uuid",
  "majorId": "uuid",
  "priority": 1,
  "isObeyAdjustment": true
}
```

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "priority": 1,
    "collegeName": "清华大学",
    "majorName": "计算机科学与技术",
    "isObeyAdjustment": true
  }
}
```

### 11. 删除志愿

**接口**: `DELETE /api/agent/tools/volunteers/:volunteerId`

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "message": "Volunteer deleted successfully"
  }
}
```

### 12. 调整志愿顺序

**接口**: `PUT /api/agent/tools/volunteers/:volunteerId/order`

**请求体**:
```json
{
  "newPriority": 3
}
```

**响应示例**:
```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "priority": 1,
      "collegeName": "北京大学",
      "majorName": "法学"
    },
    {
      "id": "uuid",
      "priority": 2,
      "collegeName": "复旦大学",
      "majorName": "经济学"
    },
    {
      "id": "uuid",
      "priority": 3,
      "collegeName": "清华大学",
      "majorName": "计算机科学与技术"
    }
  ]
}
```

---

## 前端集成方案

### 认证配置

创建 API 客户端工具类:

```typescript
// src/utils/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:11452/api',
  timeout: 15000,
});

// 请求拦截器 - 添加认证 Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 统一处理错误
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token 失效,跳转登录
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 工具 API 封装

```typescript
// src/api/tools.ts
import apiClient from '../utils/apiClient';

export const toolsAPI = {
  // 1. 搜索院校
  searchCollege: (params: {
    keyword?: string;
    province?: string;
    type?: string;
    is985?: boolean;
    is211?: boolean;
    isDoubleFirstClass?: boolean;
    minRank?: number;
    maxRank?: number;
    limit?: number;
  }) => apiClient.get('/agent/tools/search-college', { params }),

  // 2. 搜索专业
  searchMajor: (params: {
    keyword?: string;
    category?: string;
    subCategory?: string;
    degree?: string;
    limit?: number;
  }) => apiClient.get('/agent/tools/search-major', { params }),

  // 3. 根据分数推荐院校
  recommendColleges: (params: {
    score: number;
    province: string;
    subjectType: string;
    rank?: number;
    limit?: number;
  }) => apiClient.get('/agent/tools/recommend-colleges', { params }),

  // 4. 查询历年录取分数线
  getAdmissionScores: (params: {
    collegeId?: string;
    collegeName?: string;
    province: string;
    subjectType: string;
    years?: number;
  }) => apiClient.get('/agent/tools/admission-scores', { params }),

  // 5. 查询分数对应排名
  getScoreRank: (params: {
    score: number;
    province: string;
    subjectType: string;
  }) => apiClient.get('/agent/tools/score-rank', { params }),

  // 6. 查询城市信息
  getCityInfo: (city: string) =>
    apiClient.get('/agent/tools/city-info', { params: { city } }),

  // 7. 查询院校详细信息
  getCollegeDetail: (collegeId: string) =>
    apiClient.get(`/agent/tools/college-detail/${collegeId}`),

  // 8. 查询专业详细信息
  getMajorDetail: (majorId: string) =>
    apiClient.get(`/agent/tools/major-detail/${majorId}`),

  // 9. 获取用户志愿表
  getUserVolunteers: () => apiClient.get('/agent/tools/volunteers'),

  // 10. 添加志愿
  addVolunteer: (data: {
    collegeId: string;
    majorId: string;
    priority?: number;
    isObeyAdjustment?: boolean;
  }) => apiClient.post('/agent/tools/volunteers', data),

  // 11. 删除志愿
  deleteVolunteer: (volunteerId: string) =>
    apiClient.delete(`/agent/tools/volunteers/${volunteerId}`),

  // 12. 调整志愿顺序
  reorderVolunteer: (volunteerId: string, newPriority: number) =>
    apiClient.put(`/agent/tools/volunteers/${volunteerId}/order`, {
      newPriority,
    }),
};
```

---

## 左右分栏布局实现

### React 版本

```tsx
// src/pages/AIVolunteerPage.tsx
import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import ChatPanel from '../components/ChatPanel';
import VolunteerPanel from '../components/VolunteerPanel';
import { toolsAPI } from '../api/tools';

const { Sider, Content } = Layout;

const AIVolunteerPage: React.FC = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载志愿表
  const loadVolunteers = async () => {
    setLoading(true);
    try {
      const response = await toolsAPI.getUserVolunteers();
      setVolunteers(response.data);
    } catch (error) {
      console.error('加载志愿表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVolunteers();
  }, []);

  // 处理 AI 操作后的刷新
  const handleVolunteerChange = () => {
    loadVolunteers();
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 左侧: AI 对话面板 */}
      <Content style={{ padding: '24px' }}>
        <ChatPanel onVolunteerChange={handleVolunteerChange} />
      </Content>

      {/* 右侧: 志愿表面板 */}
      <Sider width={400} theme="light" style={{ padding: '24px' }}>
        <VolunteerPanel
          volunteers={volunteers}
          loading={loading}
          onRefresh={loadVolunteers}
        />
      </Sider>
    </Layout>
  );
};

export default AIVolunteerPage;
```

### Vue 3 版本

```vue
<!-- src/pages/AIVolunteerPage.vue -->
<template>
  <el-container style="height: 100vh">
    <!-- 左侧: AI 对话面板 -->
    <el-main>
      <ChatPanel @volunteer-change="handleVolunteerChange" />
    </el-main>

    <!-- 右侧: 志愿表面板 -->
    <el-aside width="400px" style="padding: 24px">
      <VolunteerPanel
        :volunteers="volunteers"
        :loading="loading"
        @refresh="loadVolunteers"
      />
    </el-aside>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ChatPanel from '@/components/ChatPanel.vue';
import VolunteerPanel from '@/components/VolunteerPanel.vue';
import { toolsAPI } from '@/api/tools';

const volunteers = ref([]);
const loading = ref(false);

const loadVolunteers = async () => {
  loading.value = true;
  try {
    const response = await toolsAPI.getUserVolunteers();
    volunteers.value = response.data;
  } catch (error) {
    console.error('加载志愿表失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleVolunteerChange = () => {
  loadVolunteers();
};

onMounted(() => {
  loadVolunteers();
});
</script>
```

---

## AI Function Calling 集成

### 工具定义

定义 AI 可以调用的工具列表:

```typescript
// src/ai/toolDefinitions.ts
export const toolDefinitions = [
  {
    name: 'search_college',
    description: '搜索院校信息,支持按名称、省份、类型、985/211等条件筛选',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '院校名称关键词' },
        province: { type: 'string', description: '省份' },
        type: { type: 'string', description: '院校类型' },
        is985: { type: 'boolean', description: '是否985' },
        is211: { type: 'boolean', description: '是否211' },
        isDoubleFirstClass: { type: 'boolean', description: '是否双一流' },
        limit: { type: 'number', description: '返回结果数量', default: 10 },
      },
    },
  },
  {
    name: 'search_major',
    description: '搜索专业信息',
    parameters: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '专业名称关键词' },
        category: { type: 'string', description: '专业门类' },
        subCategory: { type: 'string', description: '专业类' },
        degree: { type: 'string', description: '学位类型' },
        limit: { type: 'number', description: '返回结果数量', default: 10 },
      },
    },
  },
  {
    name: 'recommend_colleges',
    description: '根据分数推荐适合的院校,包括冲刺、适中、保底三个层次',
    parameters: {
      type: 'object',
      properties: {
        score: { type: 'number', description: '考生分数', required: true },
        province: { type: 'string', description: '考生所在省份', required: true },
        subjectType: {
          type: 'string',
          description: '科目类型(理科/文科/物理/历史)',
          required: true,
        },
        limit: { type: 'number', description: '返回结果数量', default: 20 },
      },
      required: ['score', 'province', 'subjectType'],
    },
  },
  {
    name: 'get_admission_scores',
    description: '查询某院校的历年录取分数线',
    parameters: {
      type: 'object',
      properties: {
        collegeId: { type: 'string', description: '院校ID' },
        collegeName: { type: 'string', description: '院校名称' },
        province: { type: 'string', description: '考生所在省份', required: true },
        subjectType: {
          type: 'string',
          description: '科目类型',
          required: true,
        },
        years: { type: 'number', description: '查询近几年', default: 3 },
      },
      required: ['province', 'subjectType'],
    },
  },
  {
    name: 'get_score_rank',
    description: '查询分数对应的省内排名',
    parameters: {
      type: 'object',
      properties: {
        score: { type: 'number', description: '分数', required: true },
        province: { type: 'string', description: '省份', required: true },
        subjectType: {
          type: 'string',
          description: '科目类型',
          required: true,
        },
      },
      required: ['score', 'province', 'subjectType'],
    },
  },
  {
    name: 'get_city_info',
    description: '查询某城市的高校信息统计',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名称', required: true },
      },
      required: ['city'],
    },
  },
  {
    name: 'get_college_detail',
    description: '查询院校的详细信息',
    parameters: {
      type: 'object',
      properties: {
        collegeId: { type: 'string', description: '院校ID', required: true },
      },
      required: ['collegeId'],
    },
  },
  {
    name: 'get_major_detail',
    description: '查询专业的详细信息',
    parameters: {
      type: 'object',
      properties: {
        majorId: { type: 'string', description: '专业ID', required: true },
      },
      required: ['majorId'],
    },
  },
  {
    name: 'get_user_volunteers',
    description: '获取用户当前的志愿表',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'add_volunteer',
    description: '添加志愿到志愿表',
    parameters: {
      type: 'object',
      properties: {
        collegeId: { type: 'string', description: '院校ID', required: true },
        majorId: { type: 'string', description: '专业ID', required: true },
        priority: { type: 'number', description: '优先级(顺序)' },
        isObeyAdjustment: {
          type: 'boolean',
          description: '是否服从调剂',
          default: true,
        },
      },
      required: ['collegeId', 'majorId'],
    },
  },
  {
    name: 'delete_volunteer',
    description: '从志愿表中删除指定志愿',
    parameters: {
      type: 'object',
      properties: {
        volunteerId: {
          type: 'string',
          description: '志愿ID',
          required: true,
        },
      },
      required: ['volunteerId'],
    },
  },
  {
    name: 'reorder_volunteer',
    description: '调整志愿在志愿表中的顺序',
    parameters: {
      type: 'object',
      properties: {
        volunteerId: {
          type: 'string',
          description: '志愿ID',
          required: true,
        },
        newPriority: {
          type: 'number',
          description: '新的优先级',
          required: true,
        },
      },
      required: ['volunteerId', 'newPriority'],
    },
  },
];
```

### Function Call 执行器

```typescript
// src/ai/toolExecutor.ts
import { toolsAPI } from '../api/tools';

export async function executeToolCall(toolName: string, parameters: any) {
  switch (toolName) {
    case 'search_college':
      return await toolsAPI.searchCollege(parameters);

    case 'search_major':
      return await toolsAPI.searchMajor(parameters);

    case 'recommend_colleges':
      return await toolsAPI.recommendColleges(parameters);

    case 'get_admission_scores':
      return await toolsAPI.getAdmissionScores(parameters);

    case 'get_score_rank':
      return await toolsAPI.getScoreRank(parameters);

    case 'get_city_info':
      return await toolsAPI.getCityInfo(parameters.city);

    case 'get_college_detail':
      return await toolsAPI.getCollegeDetail(parameters.collegeId);

    case 'get_major_detail':
      return await toolsAPI.getMajorDetail(parameters.majorId);

    case 'get_user_volunteers':
      return await toolsAPI.getUserVolunteers();

    case 'add_volunteer':
      return await toolsAPI.addVolunteer(parameters);

    case 'delete_volunteer':
      return await toolsAPI.deleteVolunteer(parameters.volunteerId);

    case 'reorder_volunteer':
      return await toolsAPI.reorderVolunteer(
        parameters.volunteerId,
        parameters.newPriority
      );

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
```

---

## 完整示例代码

### ChatPanel 组件 (React + TypeScript)

```tsx
// src/components/ChatPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Space, Spin, Tag } from 'antd';
import { SendOutlined, ToolOutlined } from '@ant-design/icons';
import { agentAPI } from '../api/agent';
import { executeToolCall } from '../ai/toolExecutor';
import { toolDefinitions } from '../ai/toolDefinitions';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCall?: {
    name: string;
    parameters: any;
    result?: any;
  };
  timestamp: Date;
}

interface ChatPanelProps {
  onVolunteerChange?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onVolunteerChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化会话
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await agentAPI.getCurrentSession();
        if (response.data) {
          setSessionId(response.data.id);
          // 加载历史消息
          const historyResponse = await agentAPI.getSessionMessages(
            response.data.id
          );
          setMessages(
            historyResponse.data.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.createdAt),
            }))
          );
        }
      } catch (error) {
        console.error('初始化会话失败:', error);
      }
    };
    initSession();
  }, []);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // 调用 AI 对话 API (SSE 流式)
      const eventSource = new EventSource(
        `http://localhost:11452/api/agent/chat?sessionId=${sessionId}&message=${encodeURIComponent(
          inputValue
        )}&tools=${encodeURIComponent(JSON.stringify(toolDefinitions))}`
      );

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      eventSource.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'content') {
          // 流式文本内容
          assistantMessage.content += data.content;
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              return [...prev.slice(0, -1), { ...assistantMessage }];
            }
            return [...prev, { ...assistantMessage }];
          });
        } else if (data.type === 'tool_call') {
          // AI 请求调用工具
          const toolMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'tool',
            content: `正在调用工具: ${data.toolName}...`,
            toolCall: {
              name: data.toolName,
              parameters: data.parameters,
            },
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, toolMessage]);

          try {
            // 执行工具调用
            const result = await executeToolCall(
              data.toolName,
              data.parameters
            );

            // 更新工具调用结果
            toolMessage.toolCall!.result = result;
            toolMessage.content = `工具调用成功: ${data.toolName}`;

            setMessages((prev) => {
              const index = prev.findIndex((m) => m.id === toolMessage.id);
              if (index !== -1) {
                const newMessages = [...prev];
                newMessages[index] = { ...toolMessage };
                return newMessages;
              }
              return prev;
            });

            // 如果是志愿相关操作,触发刷新
            if (
              ['add_volunteer', 'delete_volunteer', 'reorder_volunteer'].includes(
                data.toolName
              )
            ) {
              onVolunteerChange?.();
            }

            // 将工具结果发送回 AI
            // (这里需要后端支持传递工具结果,简化版本省略)
          } catch (error: any) {
            toolMessage.content = `工具调用失败: ${error.message}`;
            setMessages((prev) => {
              const index = prev.findIndex((m) => m.id === toolMessage.id);
              if (index !== -1) {
                const newMessages = [...prev];
                newMessages[index] = { ...toolMessage };
                return newMessages;
              }
              return prev;
            });
          }
        } else if (data.type === 'done') {
          // 对话结束
          eventSource.close();
          setLoading(false);
        } else if (data.type === 'error') {
          console.error('AI 错误:', data.message);
          eventSource.close();
          setLoading(false);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE 连接错误:', error);
        eventSource.close();
        setLoading(false);
      };
    } catch (error: any) {
      console.error('发送消息失败:', error);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Card
        title="AI 志愿助手"
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 消息列表 */}
        <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  textAlign: msg.role === 'user' ? 'right' : 'left',
                }}
              >
                {msg.role === 'tool' ? (
                  <Tag
                    icon={<ToolOutlined />}
                    color={msg.toolCall?.result ? 'success' : 'processing'}
                  >
                    {msg.content}
                  </Tag>
                ) : (
                  <Card
                    size="small"
                    style={{
                      display: 'inline-block',
                      maxWidth: '70%',
                      background:
                        msg.role === 'user' ? '#1890ff' : '#f0f0f0',
                      color: msg.role === 'user' ? 'white' : 'black',
                    }}
                  >
                    {msg.content}
                  </Card>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ textAlign: 'center' }}>
                <Spin />
              </div>
            )}
            <div ref={messagesEndRef} />
          </Space>
        </div>

        {/* 输入框 */}
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSend}
            placeholder="输入你的问题..."
            disabled={loading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={loading}
          >
            发送
          </Button>
        </Space.Compact>
      </Card>
    </div>
  );
};

export default ChatPanel;
```

### VolunteerPanel 组件 (React + TypeScript)

```tsx
// src/components/VolunteerPanel.tsx
import React from 'react';
import { Card, List, Button, Tag, Space, Popconfirm } from 'antd';
import {
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { toolsAPI } from '../api/tools';

interface Volunteer {
  id: string;
  priority: number;
  collegeName: string;
  majorName: string;
  isObeyAdjustment: boolean;
  admitProbability?: 'high' | 'medium' | 'low';
}

interface VolunteerPanelProps {
  volunteers: Volunteer[];
  loading: boolean;
  onRefresh: () => void;
}

const VolunteerPanel: React.FC<VolunteerPanelProps> = ({
  volunteers,
  loading,
  onRefresh,
}) => {
  // 删除志愿
  const handleDelete = async (volunteerId: string) => {
    try {
      await toolsAPI.deleteVolunteer(volunteerId);
      onRefresh();
    } catch (error) {
      console.error('删除志愿失败:', error);
    }
  };

  // 调整顺序
  const handleReorder = async (volunteerId: string, newPriority: number) => {
    if (newPriority < 1 || newPriority > volunteers.length) return;
    try {
      await toolsAPI.reorderVolunteer(volunteerId, newPriority);
      onRefresh();
    } catch (error) {
      console.error('调整顺序失败:', error);
    }
  };

  const getProbabilityColor = (prob?: string) => {
    switch (prob) {
      case 'high':
        return 'green';
      case 'medium':
        return 'orange';
      case 'low':
        return 'red';
      default:
        return 'default';
    }
  };

  const getProbabilityText = (prob?: string) => {
    switch (prob) {
      case 'high':
        return '保底';
      case 'medium':
        return '适中';
      case 'low':
        return '冲刺';
      default:
        return '';
    }
  };

  return (
    <Card
      title={`我的志愿表 (${volunteers.length})`}
      extra={
        <Button size="small" onClick={onRefresh} loading={loading}>
          刷新
        </Button>
      }
      style={{ height: '100%' }}
      bodyStyle={{ overflow: 'auto' }}
    >
      <List
        loading={loading}
        dataSource={volunteers}
        renderItem={(volunteer) => (
          <List.Item
            key={volunteer.id}
            actions={[
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={volunteer.priority === 1}
                onClick={() =>
                  handleReorder(volunteer.id, volunteer.priority - 1)
                }
              />,
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={volunteer.priority === volunteers.length}
                onClick={() =>
                  handleReorder(volunteer.id, volunteer.priority + 1)
                }
              />,
              <Popconfirm
                title="确定删除该志愿吗?"
                onConfirm={() => handleDelete(volunteer.id)}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Tag color="blue">{volunteer.priority}</Tag>
                  {volunteer.collegeName}
                </Space>
              }
              description={
                <Space direction="vertical" size="small">
                  <div>{volunteer.majorName}</div>
                  <Space>
                    {volunteer.admitProbability && (
                      <Tag color={getProbabilityColor(volunteer.admitProbability)}>
                        {getProbabilityText(volunteer.admitProbability)}
                      </Tag>
                    )}
                    {volunteer.isObeyAdjustment && (
                      <Tag color="cyan">服从调剂</Tag>
                    )}
                  </Space>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default VolunteerPanel;
```

---

## 总结

本文档提供了完整的 AI 工具前端集成方案,包括:

1. **12 个工具 API** 的详细接口文档
2. **API 客户端封装** 和认证配置
3. **左右分栏布局** 的 React 和 Vue 实现
4. **AI Function Calling** 的工具定义和执行器
5. **完整的聊天界面** 和志愿表组件示例

### 下一步工作

1. 根据您的前端框架(React/Vue)选择对应的代码示例
2. 复制 API 封装代码到您的项目中
3. 实现左右分栏布局页面
4. 集成 Function Calling 逻辑
5. 测试 AI 工具调用和志愿表操作

如有任何问题,请参考 `docs/AGENT_ASYNC_GENERATION_GUIDE.md` 了解异步任务处理,或查看 `api-test.http` 文件中的 API 测试示例。
