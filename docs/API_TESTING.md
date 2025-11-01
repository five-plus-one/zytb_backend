# API 测试文档 - 专业组详情和对比功能

## 概述

本文档提供专业组详情查询和对比功能的测试方法和示例。

---

## 1. 专业组详情查询

### API 端点
```
GET /api/recommendations/group/:groupId
```

### 参数

#### 路径参数
- `groupId` (必需): 专业组ID，格式为 `collegeCode_groupCode`
  - 示例: `10284_01` (南京大学专业组01)

#### 查询参数 (可选)
- `score` (可选): 用户分数，用于计算录取概率
- `rank` (可选): 用户位次，用于计算录取概率

### 示例 1: 不提供用户信息

```bash
curl -X GET "http://localhost:3000/api/recommendations/group/10284_01"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "groupId": "10284_01",
    "collegeName": "南京大学",
    "collegeCode": "10284",
    "collegeProvince": "江苏",
    "groupName": "计算机类",
    "groupCode": "01",
    "is985": true,
    "is211": true,
    "isDoubleFirstClass": true,
    "collegeType": "综合",
    "collegeLevel": null,
    "riskLevel": "稳",
    "probability": 0,
    "confidence": 0,
    "adjustmentRisk": "中",
    "scoreGap": 0,
    "rankGap": null,
    "userScore": 0,
    "userRank": 0,
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
      },
      {
        "year": 2022,
        "minScore": 626,
        "avgScore": 631,
        "maxScore": 638,
        "minRank": 7400,
        "maxRank": 6700,
        "planCount": 45
      }
    ],
    "scoreVolatility": 2.0,
    "scoreTrend": "up",
    "majors": [
      {
        "majorId": "080901",
        "majorName": "计算机科学与技术",
        "majorCode": "080901",
        "planCount": 30,
        "tuition": 5800,
        "duration": "4年",
        "degree": null,
        "studyLocation": null,
        "remarks": "国家级一流专业"
      },
      {
        "majorId": "080902",
        "majorName": "软件工程",
        "majorCode": "080902",
        "planCount": 20,
        "tuition": 5800,
        "duration": "4年",
        "degree": null,
        "studyLocation": null,
        "remarks": null
      }
    ],
    "totalMajors": 2,
    "totalPlanCount": 50,
    "recommendReasons": [],
    "warnings": [],
    "highlights": [
      "🏆 985工程",
      "⭐ 双一流",
      "📊 招生规模大"
    ],
    "rankScore": 0
  },
  "timestamp": 1735689600000,
  "requestId": "req_1735689600000_abc123"
}
```

### 示例 2: 提供用户信息（计算录取概率）

```bash
curl -X GET "http://localhost:3000/api/recommendations/group/10284_01?score=620&rank=8500"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "groupId": "10284_01",
    "collegeName": "南京大学",
    "collegeCode": "10284",
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
    "scoreGap": -8.0,
    "rankGap": -1200,
    "userScore": 620,
    "userRank": 8500,
    "avgMinScore": 628,
    "avgMinRank": 7300,
    "historicalData": [ /* 同上 */ ],
    "scoreVolatility": 2.0,
    "scoreTrend": "up",
    "majors": [ /* 同上 */ ],
    "totalMajors": 2,
    "totalPlanCount": 50,
    "recommendReasons": [
      "您的分数比该专业组近3年平均最低分低8.0分",
      "您的位次比历史最低位次靠后约1200位",
      "985工程院校",
      "录取概率偏低（28%），可以冲刺"
    ],
    "warnings": [
      "⚠️ 调剂风险中等，建议合理选择专业顺序"
    ],
    "highlights": [
      "🏆 985工程",
      "⭐ 双一流",
      "📊 招生规模大"
    ],
    "rankScore": 0
  },
  "timestamp": 1735689600000,
  "requestId": "req_1735689600000_abc123"
}
```

### 错误响应

#### 无效的 groupId 格式
```bash
curl -X GET "http://localhost:3000/api/recommendations/group/invalid_id"
```

```json
{
  "success": false,
  "error": {
    "code": "GROUP_DETAIL_ERROR",
    "message": "无效的专业组ID格式，应为: collegeCode_groupCode"
  },
  "timestamp": 1735689600000
}
```

#### 专业组不存在
```bash
curl -X GET "http://localhost:3000/api/recommendations/group/99999_99"
```

```json
{
  "success": false,
  "error": {
    "code": "GROUP_DETAIL_ERROR",
    "message": "未找到专业组: 99999_99"
  },
  "timestamp": 1735689600000
}
```

---

## 2. 专业组对比

### API 端点
```
POST /api/recommendations/compare
```

### 请求体

```json
{
  "groupIds": ["10284_01", "10247_02", "10003_03"],
  "userProfile": {
    "score": 620,
    "rank": 8500
  }
}
```

#### 参数说明
- `groupIds` (必需): 专业组ID数组，2-5个
- `userProfile` (可选): 用户信息，用于计算适合度

### 示例 1: 不提供用户信息

```bash
curl -X POST http://localhost:3000/api/recommendations/compare \
  -H "Content-Type: application/json" \
  -d '{
    "groupIds": ["10284_01", "10247_02", "10003_03"]
  }'
```

**响应**:
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "groupId": "10284_01",
        "collegeName": "南京大学",
        "groupName": "计算机类",
        /* ... 完整详情 */
      },
      {
        "groupId": "10247_02",
        "collegeName": "同济大学",
        "groupName": "工科试验班",
        /* ... 完整详情 */
      },
      {
        "groupId": "10003_03",
        "collegeName": "清华大学",
        "groupName": "电子信息类",
        /* ... 完整详情 */
      }
    ],
    "comparison": [
      {
        "field": "collegeName",
        "label": "院校名称",
        "values": ["南京大学", "同济大学", "清华大学"],
        "type": "string"
      },
      {
        "field": "groupName",
        "label": "专业组名称",
        "values": ["计算机类", "工科试验班", "电子信息类"],
        "type": "string"
      },
      {
        "field": "collegeProvince",
        "label": "所在省份",
        "values": ["江苏", "上海", "北京"],
        "type": "string"
      },
      {
        "field": "is985",
        "label": "985工程",
        "values": ["是", "是", "是"],
        "type": "string",
        "highlight": 0
      },
      {
        "field": "is211",
        "label": "211工程",
        "values": ["是", "是", "是"],
        "type": "string",
        "highlight": 0
      },
      {
        "field": "probability",
        "label": "录取概率",
        "values": [0, 0, 0],
        "type": "number",
        "unit": "%",
        "highlight": 0
      },
      {
        "field": "avgMinScore",
        "label": "近3年平均最低分",
        "values": [628, 615, 652],
        "type": "number",
        "unit": "分"
      },
      {
        "field": "totalMajors",
        "label": "专业数量",
        "values": [2, 5, 3],
        "type": "number",
        "unit": "个",
        "highlight": 1
      },
      {
        "field": "totalPlanCount",
        "label": "招生计划数",
        "values": [50, 80, 40],
        "type": "number",
        "unit": "人",
        "highlight": 1
      },
      {
        "field": "scoreTrend",
        "label": "分数趋势",
        "values": ["↗ 上升", "→ 平稳", "↗ 上升"],
        "type": "string"
      }
    ],
    "recommendations": [
      "💡 建议先填写您的分数和位次，以获取更精准的对比分析"
    ],
    "summary": {
      "best": {
        "groupId": "10003_03",
        "collegeName": "清华大学",
        "reason": "985工程，双一流"
      }
    }
  },
  "timestamp": 1735689600000,
  "requestId": "req_1735689600000_xyz789"
}
```

### 示例 2: 提供用户信息（含录取概率）

```bash
curl -X POST http://localhost:3000/api/recommendations/compare \
  -H "Content-Type: application/json" \
  -d '{
    "groupIds": ["10284_01", "10247_02", "10287_01"],
    "userProfile": {
      "score": 620,
      "rank": 8500
    }
  }'
```

**响应** (部分):
```json
{
  "success": true,
  "data": {
    "groups": [ /* ... */ ],
    "comparison": [
      {
        "field": "probability",
        "label": "录取概率",
        "values": [28, 55, 72],
        "type": "number",
        "unit": "%",
        "highlight": 2
      },
      {
        "field": "riskLevel",
        "label": "冲稳保分类",
        "values": ["冲", "稳", "稳"],
        "type": "string"
      },
      {
        "field": "scoreGap",
        "label": "分数差",
        "values": [-8.0, 5.0, 8.5],
        "type": "number",
        "unit": "分",
        "highlight": 2
      },
      /* ... 更多对比字段 */
    ],
    "recommendations": [
      "📊 **录取概率**: 南京航空航天大学 概率最高（72%），南京大学 概率最低（28%）",
      "🏆 985院校: 南京大学",
      "✅ **分数优势**: 同济大学(+5.0分)、南京航空航天大学(+8.5分)",
      "⚠️  **分数劣势**: 南京大学(-8.0分)",
      "📈 **分数稳定**: 同济大学、南京航空航天大学 历年分数波动小，预测准确性高",
      "🎓 **专业选择多**: 同济大学(5个专业)",
      "💯 **推荐**: 南京航空航天大学 是您的分数有优势且录取概率较高，推荐选择"
    ],
    "summary": {
      "best": {
        "groupId": "10284_01",
        "collegeName": "南京大学",
        "reason": "985工程，双一流"
      },
      "mostSuitable": {
        "groupId": "10287_01",
        "collegeName": "南京航空航天大学",
        "groupName": "计算机类",
        "reason": "录取概率适中(72%)，预测可靠(置信度88%)，分数优势明显(+8.5分)"
      }
    }
  },
  "timestamp": 1735689600000,
  "requestId": "req_1735689600000_xyz789"
}
```

### 错误响应

#### 专业组数量不足
```bash
curl -X POST http://localhost:3000/api/recommendations/compare \
  -H "Content-Type: application/json" \
  -d '{"groupIds": ["10284_01"]}'
```

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "message": "需要提供至少2个专业组ID进行对比",
  "timestamp": 1735689600000
}
```

#### 专业组数量超限
```bash
curl -X POST http://localhost:3000/api/recommendations/compare \
  -H "Content-Type: application/json" \
  -d '{"groupIds": ["10284_01", "10247_02", "10287_01", "10003_03", "10055_01", "10422_01"]}'
```

```json
{
  "success": false,
  "code": "BAD_REQUEST",
  "message": "最多支持对比5个专业组",
  "timestamp": 1735689600000
}
```

---

## 3. 前端集成示例

### React 示例

```typescript
import axios from 'axios';

// 1. 获取专业组详情
const getGroupDetail = async (groupId: string, userScore?: number, userRank?: number) => {
  try {
    const params = userScore && userRank ? { score: userScore, rank: userRank } : {};
    const response = await axios.get(`/api/recommendations/group/${groupId}`, { params });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('获取专业组详情失败:', error);
    throw error;
  }
};

// 2. 对比专业组
const compareGroups = async (groupIds: string[], userProfile?: { score: number; rank: number }) => {
  try {
    const response = await axios.post('/api/recommendations/compare', {
      groupIds,
      userProfile
    });

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error.message);
    }
  } catch (error) {
    console.error('专业组对比失败:', error);
    throw error;
  }
};

// 使用示例
const detail = await getGroupDetail('10284_01', 620, 8500);
console.log('专业组详情:', detail);

const comparison = await compareGroups(
  ['10284_01', '10247_02', '10287_01'],
  { score: 620, rank: 8500 }
);
console.log('对比结果:', comparison);
```

### Vue 3 示例

```typescript
import { ref } from 'vue';

const useGroupDetail = () => {
  const loading = ref(false);
  const detail = ref(null);
  const error = ref(null);

  const fetchDetail = async (groupId: string, score?: number, rank?: number) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (score) params.append('score', score.toString());
      if (rank) params.append('rank', rank.toString());

      const response = await fetch(`/api/recommendations/group/${groupId}?${params}`);
      const data = await response.json();

      if (data.success) {
        detail.value = data.data;
      } else {
        error.value = data.error.message;
      }
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return { loading, detail, error, fetchDetail };
};

const useGroupComparison = () => {
  const loading = ref(false);
  const comparison = ref(null);
  const error = ref(null);

  const compare = async (groupIds: string[], userProfile?: any) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/recommendations/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds, userProfile })
      });

      const data = await response.json();

      if (data.success) {
        comparison.value = data.data;
      } else {
        error.value = data.error.message;
      }
    } catch (err: any) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return { loading, comparison, error, compare };
};
```

---

## 4. 测试脚本

### 测试专业组详情

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "========== 测试1: 获取专业组详情（不提供用户信息）=========="
curl -X GET "${BASE_URL}/recommendations/group/10284_01" | jq .

echo -e "\n========== 测试2: 获取专业组详情（提供用户信息）=========="
curl -X GET "${BASE_URL}/recommendations/group/10284_01?score=620&rank=8500" | jq .

echo -e "\n========== 测试3: 无效的专业组ID =========="
curl -X GET "${BASE_URL}/recommendations/group/invalid" | jq .

echo -e "\n========== 测试4: 不存在的专业组 =========="
curl -X GET "${BASE_URL}/recommendations/group/99999_99" | jq .
```

### 测试专业组对比

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "========== 测试1: 对比3个专业组（不提供用户信息）=========="
curl -X POST "${BASE_URL}/recommendations/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "groupIds": ["10284_01", "10247_02", "10287_01"]
  }' | jq .

echo -e "\n========== 测试2: 对比3个专业组（提供用户信息）=========="
curl -X POST "${BASE_URL}/recommendations/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "groupIds": ["10284_01", "10247_02", "10287_01"],
    "userProfile": {
      "score": 620,
      "rank": 8500
    }
  }' | jq .

echo -e "\n========== 测试3: 专业组数量不足 =========="
curl -X POST "${BASE_URL}/recommendations/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "groupIds": ["10284_01"]
  }' | jq .

echo -e "\n========== 测试4: 专业组数量超限 =========="
curl -X POST "${BASE_URL}/recommendations/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "groupIds": ["10284_01", "10247_02", "10287_01", "10003_03", "10055_01", "10422_01"]
  }' | jq .
```

---

## 5. Postman 集合

可以导入以下 JSON 到 Postman 进行测试：

```json
{
  "info": {
    "name": "志愿推荐 - 专业组详情和对比",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "获取专业组详情",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseUrl}}/recommendations/group/10284_01?score=620&rank=8500",
          "host": ["{{baseUrl}}"],
          "path": ["recommendations", "group", "10284_01"],
          "query": [
            {"key": "score", "value": "620"},
            {"key": "rank", "value": "8500"}
          ]
        }
      }
    },
    {
      "name": "对比专业组",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"groupIds\": [\"10284_01\", \"10247_02\", \"10287_01\"],\n  \"userProfile\": {\n    \"score\": 620,\n    \"rank\": 8500\n  }\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/recommendations/compare",
          "host": ["{{baseUrl}}"],
          "path": ["recommendations", "compare"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    }
  ]
}
```

---

## 6. 注意事项

1. **专业组ID格式**: 必须为 `collegeCode_groupCode`，例如 `10284_01`
2. **用户信息**: 可选，但提供后可以计算录取概率和适合度
3. **对比数量**: 2-5个专业组
4. **数据库依赖**: 确保数据库中有相应的专业组数据
5. **性能**: 对比功能会查询多个专业组的详情，可能需要较长时间

---

## 7. 下一步

- [ ] 实现专业组收藏功能
- [ ] 添加专业组推荐历史
- [ ] 优化查询性能（缓存）
- [ ] 添加更多对比维度（就业率、深造率等）
