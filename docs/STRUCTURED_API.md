# 结构化推荐 API 文档

## 概述

结构化推荐 API 提供前端友好的数据格式，避免 Markdown 文本，支持一键操作和数据可视化。

**基础 URL**: `/api/recommendations`

---

## 1. 获取结构化推荐

### 请求

```http
POST /api/recommendations/structured
Content-Type: application/json
```

### 请求体

```json
{
  "userProfile": {
    "score": 620,
    "rank": 8500,
    "province": "江苏",
    "category": "物理类",
    "year": 2025
  },
  "preferences": {
    "majors": ["计算机科学与技术", "软件工程"],
    "majorCategories": ["计算机类", "电子信息类"],
    "locations": ["江苏", "上海", "北京"],
    "collegeTypes": ["985", "211"],
    "maxTuition": 50000,
    "acceptCooperation": true,
    "rushCount": 12,
    "stableCount": 20,
    "safeCount": 8
  }
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "userProfile": {
      "score": 620,
      "rank": 8500,
      "province": "江苏",
      "category": "物理类",
      "year": 2025
    },
    "preferences": {
      "majorNames": ["计算机科学与技术", "软件工程"],
      "collegeProvinces": ["江苏", "上海", "北京"],
      "collegeTypes": ["985", "211"],
      "is985": true,
      "is211": true
    },
    "recommendations": {
      "rush": [
        {
          "groupId": "10001_01",
          "collegeName": "南京大学",
          "collegeCode": "10001",
          "collegeProvince": "江苏",
          "groupName": "计算机类",
          "groupCode": "01",
          "is985": true,
          "is211": true,
          "isDoubleFirstClass": true,
          "riskLevel": "冲",
          "probability": 28,
          "confidence": 85,
          "adjustmentRisk": "中",
          "scoreGap": -8.5,
          "rankGap": -1200,
          "userScore": 620,
          "userRank": 8500,
          "avgMinScore": 628,
          "avgMinRank": 7300,
          "historicalData": [
            {
              "year": 2024,
              "minScore": 630,
              "avgScore": 635,
              "maxScore": 642,
              "minRank": 7200,
              "maxRank": 6500,
              "planCount": 50
            },
            {
              "year": 2023,
              "minScore": 628,
              "avgScore": 633,
              "maxScore": 640,
              "minRank": 7350,
              "maxRank": 6600,
              "planCount": 48
            }
          ],
          "scoreTrend": "up",
          "majors": [
            {
              "majorId": "080901",
              "majorName": "计算机科学与技术",
              "majorCode": "080901",
              "planCount": 30,
              "tuition": 5800,
              "duration": "4年",
              "degree": "工学学士"
            }
          ],
          "totalMajors": 3,
          "totalPlanCount": 50,
          "recommendReasons": [
            "您的分数比该专业组近3年平均最低分低8.5分",
            "您的位次比历史最低位次靠后约1200位",
            "985工程院校",
            "录取概率偏低（28%），可以冲刺"
          ],
          "warnings": [
            "⚠️ 调剂风险中等，建议合理选择专业顺序"
          ],
          "highlights": [
            "🏆 985工程",
            "⭐ 双一流"
          ],
          "rankScore": 85.2
        }
      ],
      "stable": [ /* 20个稳一稳专业组 */ ],
      "safe": [ /* 8个保一保专业组 */ ]
    },
    "summary": {
      "totalCount": 40,
      "rushCount": 12,
      "stableCount": 20,
      "safeCount": 8,
      "avgProbability": {
        "rush": 25.5,
        "stable": 62.3,
        "safe": 94.1
      },
      "distribution": {
        "total985": 8,
        "total211": 15,
        "totalOthers": 17
      },
      "scoreRange": {
        "min": 590,
        "max": 635,
        "userScore": 620
      },
      "probabilityDistribution": {
        "veryLow": 5,
        "low": 7,
        "medium": 18,
        "high": 5,
        "veryHigh": 5
      }
    },
    "metadata": {
      "timestamp": 1735689600000,
      "version": "2.0.0",
      "algorithm": "AdmissionProbabilityService v2.0 (冲<35%, 稳35-90%, 保90-99%)",
      "dataSource": "enrollment_plans + admission_scores (实时计算)",
      "filteredCount": 5
    }
  },
  "timestamp": 1735689600000,
  "requestId": "req_1735689600000_abc123"
}
```

---

## 2. 获取图表数据

### 请求

```http
POST /api/recommendations/charts
Content-Type: application/json
```

### 请求体

```json
{
  "userProfile": {
    "score": 620,
    "rank": 8500,
    "province": "江苏",
    "category": "物理类",
    "year": 2025
  },
  "preferences": { /* 同上 */ }
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "probabilityPieChart": {
      "labels": ["冲一冲", "稳一稳", "保一保"],
      "data": [12, 20, 8],
      "colors": ["#FF6384", "#36A2EB", "#4BC0C0"]
    },
    "collegeLevelChart": {
      "labels": ["985院校", "211院校", "其他院校"],
      "data": [8, 15, 17],
      "colors": ["#FFD700", "#C0C0C0", "#87CEEB"]
    },
    "scoreTrendChart": {
      "labels": [2022, 2023, 2024],
      "datasets": [
        {
          "label": "南京理工大学-计算机类",
          "data": [615, 618, 620],
          "color": "#FF6384"
        },
        {
          "label": "河海大学-软件工程",
          "data": [610, 612, 615],
          "color": "#36A2EB"
        }
      ]
    }
  },
  "timestamp": 1735689600000
}
```

---

## 3. 导出为 Excel

### 请求

```http
POST /api/recommendations/export/excel
Content-Type: application/json
```

### 请求体

```json
{
  "userProfile": {
    "score": 620,
    "rank": 8500,
    "province": "江苏",
    "category": "物理类",
    "year": 2025
  },
  "preferences": { /* 同上 */ }
}
```

### 响应

```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="志愿推荐_江苏_620分_1735689600000.xlsx"

[Excel 文件二进制数据]
```

**Excel 表格包含以下列**：
- 序号
- 冲稳保
- 院校名称
- 专业组名称
- 专业组代码
- 是否985
- 是否211
- 录取概率
- 置信度
- 调剂风险
- 分数差
- 位次差
- 近3年平均最低分
- 近3年平均最低位次
- 专业数量
- 招生计划数
- 分数趋势
- 推荐理由

---

## 4. 获取专业组详情

### 请求

```http
GET /api/recommendations/group/:groupId
```

### 响应

```json
{
  "success": true,
  "data": {
    "message": "此功能待实现",
    "groupId": "10001_01"
  }
}
```

---

## 5. 对比专业组

### 请求

```http
POST /api/recommendations/compare
Content-Type: application/json
```

### 请求体

```json
{
  "groupIds": ["10001_01", "10002_02", "10003_03"]
}
```

### 响应

```json
{
  "success": true,
  "data": {
    "message": "此功能待实现",
    "groupIds": ["10001_01", "10002_02", "10003_03"]
  }
}
```

---

## 数据结构详解

### StructuredGroupRecommendation

```typescript
interface StructuredGroupRecommendation {
  // 基本信息
  groupId: string;              // 专业组唯一标识
  collegeName: string;          // 院校名称
  collegeCode?: string;         // 院校代码
  collegeProvince?: string;     // 院校所在省份
  groupName: string;            // 专业组名称
  groupCode: string;            // 专业组代码

  // 院校标签
  is985: boolean;               // 是否985
  is211: boolean;               // 是否211
  isDoubleFirstClass: boolean;  // 是否双一流
  collegeType?: string;         // 院校类型（综合/理工/师范等）
  collegeLevel?: string;        // 办学层次

  // 冲稳保分类
  riskLevel: '冲' | '稳' | '保';     // 冲稳保分类
  probability: number;              // 录取概率 (0-100)
  confidence: number;               // 置信度 (0-100)
  adjustmentRisk: '高' | '中' | '低'; // 调剂风险

  // 分数分析
  scoreGap: number;                 // 分数差距（用户分数 - 历史平均）
  rankGap: number | null;           // 位次差距（历史平均位次 - 用户位次）
  userScore: number;                // 用户分数
  userRank: number;                 // 用户位次
  avgMinScore: number;              // 近3年平均最低分
  avgMinRank: number;               // 近3年平均最低位次

  // 历年数据
  historicalData: YearlyAdmissionData[]; // 历年录取数据（按年份降序）
  scoreVolatility?: number;         // 分数波动性（标准差）
  scoreTrend?: 'up' | 'down' | 'stable'; // 分数趋势

  // 专业信息
  majors: MajorInfo[];              // 包含的专业列表
  totalMajors: number;              // 专业总数
  totalPlanCount: number;           // 总招生计划数

  // 推荐理由
  recommendReasons: string[];       // 推荐理由列表
  warnings?: string[];              // 风险提示
  highlights?: string[];            // 亮点标签

  // 排序权重
  rankScore: number;                // 综合排序分数（内部使用）
}
```

---

## 错误响应

### 参数错误

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "用户信息不完整，需要提供：score, rank, province, category"
  },
  "timestamp": 1735689600000
}
```

### 服务器错误

```json
{
  "success": false,
  "error": {
    "code": "RECOMMENDATION_ERROR",
    "message": "推荐生成失败",
    "details": "Error stack trace (仅开发环境)"
  },
  "timestamp": 1735689600000
}
```

---

## 前端使用示例

### React + Axios

```typescript
import axios from 'axios';

const getRecommendations = async (userProfile, preferences) => {
  try {
    const response = await axios.post('/api/recommendations/structured', {
      userProfile,
      preferences
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('获取推荐失败:', error);
    throw error;
  }
};

// 使用
const result = await getRecommendations(
  {
    score: 620,
    rank: 8500,
    province: '江苏',
    category: '物理类',
    year: 2025
  },
  {
    majors: ['计算机科学与技术'],
    locations: ['江苏', '上海']
  }
);

console.log('推荐结果:', result.recommendations);
console.log('统计信息:', result.summary);
```

### Vue 3 + Fetch

```typescript
const getRecommendations = async (userProfile: any, preferences: any) => {
  const response = await fetch('/api/recommendations/structured', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userProfile, preferences })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error.message);
  }

  return data.data;
};
```

---

## 前端组件设计建议

### 1. 推荐卡片组件 (RecommendationCard.vue/tsx)

```vue
<template>
  <div class="recommendation-card" :class="`risk-${group.riskLevel}`">
    <div class="card-header">
      <h3>{{ group.collegeName }}</h3>
      <span class="risk-badge">{{ group.riskLevel }}</span>
      <span class="probability">{{ group.probability }}%</span>
    </div>

    <div class="card-tags">
      <span v-for="highlight in group.highlights" :key="highlight">
        {{ highlight }}
      </span>
    </div>

    <div class="card-info">
      <div class="info-row">
        <span>专业组：{{ group.groupName }}</span>
      </div>
      <div class="info-row">
        <span>分数差：{{ group.scoreGap > 0 ? '+' : '' }}{{ group.scoreGap }}</span>
        <span>位次差：{{ group.rankGap }}</span>
      </div>
    </div>

    <div class="card-reasons">
      <ul>
        <li v-for="reason in group.recommendReasons" :key="reason">
          {{ reason }}
        </li>
      </ul>
    </div>

    <div class="card-actions">
      <button @click="addToVolunteer">加入志愿表</button>
      <button @click="viewDetail">查看详情</button>
    </div>
  </div>
</template>
```

### 2. 推荐列表组件 (RecommendationList.vue/tsx)

```vue
<template>
  <div class="recommendation-list">
    <div class="tabs">
      <button @click="activeTab = 'rush'" :class="{active: activeTab === 'rush'}">
        冲一冲 ({{ summary.rushCount }})
      </button>
      <button @click="activeTab = 'stable'" :class="{active: activeTab === 'stable'}">
        稳一稳 ({{ summary.stableCount }})
      </button>
      <button @click="activeTab = 'safe'" :class="{active: activeTab === 'safe'}">
        保一保 ({{ summary.safeCount }})
      </button>
    </div>

    <div class="list-content">
      <RecommendationCard
        v-for="group in currentList"
        :key="group.groupId"
        :group="group"
      />
    </div>
  </div>
</template>
```

### 3. 图表组件 (RecommendationCharts.vue/tsx)

使用 Chart.js 或 ECharts 渲染图表数据

---

## 测试

### 测试脚本

```bash
# 测试结构化推荐
curl -X POST http://localhost:3000/api/recommendations/structured \
  -H "Content-Type: application/json" \
  -d '{
    "userProfile": {
      "score": 620,
      "rank": 8500,
      "province": "江苏",
      "category": "物理类",
      "year": 2025
    },
    "preferences": {
      "majors": ["计算机科学与技术"]
    }
  }'

# 测试图表数据
curl -X POST http://localhost:3000/api/recommendations/charts \
  -H "Content-Type: application/json" \
  -d '{
    "userProfile": {
      "score": 620,
      "rank": 8500,
      "province": "江苏",
      "category": "物理类"
    }
  }'

# 测试导出 Excel
curl -X POST http://localhost:3000/api/recommendations/export/excel \
  -H "Content-Type: application/json" \
  -d '{
    "userProfile": {
      "score": 620,
      "rank": 8500,
      "province": "江苏",
      "category": "物理类"
    }
  }' \
  --output 志愿推荐.xlsx
```

---

## 版本历史

- **v2.0.0** (2025-01-31)
  - ✅ 实现结构化数据接口
  - ✅ 修正冲稳保分类标准（冲<35%, 稳35-90%, 保90-99%）
  - ✅ 添加自动过滤不合理推荐
  - ✅ 支持 Excel 导出
  - ✅ 提供图表数据接口

- **v1.0.0** (2025-01-30)
  - 初始版本
  - 基础推荐功能
