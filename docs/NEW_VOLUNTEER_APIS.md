# 新增志愿填报接口文档

本文档介绍新增的三个核心接口：等位分查询、专业筛选、招生计划详情查询。

---

## 📋 目录

- [1. 等位分查询接口](#1-等位分查询接口)
- [2. 专业筛选接口](#2-专业筛选接口)
- [3. 招生计划详情查询接口](#3-招生计划详情查询接口)
- [使用示例](#使用示例)

---

## 1. 等位分查询接口

### 功能说明
根据当前年份的分数查询往年同位次对应的分数，用于等位分分析。

### 1.1 查询等位分

**接口**: `GET /equivalent-score`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| currentYear | number | ✅ | 当前年份（如2025） |
| province | string | ✅ | 省份（如"江苏"） |
| subjectType | string | ✅ | 科类（如"物理类"） |
| score | number | ✅ | 当前分数 |
| compareYears | string | ❌ | 对比年份（逗号分隔，如"2024,2023,2022"） |

**请求示例**:
```bash
GET /equivalent-score?currentYear=2025&province=江苏&subjectType=物理类&score=650
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "currentYear": 2025,
    "currentScore": 650,
    "currentRank": 5234,
    "province": "江苏",
    "subjectType": "物理类",
    "equivalentScores": [
      {
        "year": 2024,
        "score": 648,
        "rank": 5241,
        "scoreDiff": -2
      },
      {
        "year": 2023,
        "score": 645,
        "rank": 5198,
        "scoreDiff": -5
      },
      {
        "year": 2022,
        "score": 642,
        "rank": 5256,
        "scoreDiff": -8
      }
    ]
  }
}
```

### 1.2 批量查询等位分

**接口**: `POST /equivalent-score/batch`

**请求体**:
```json
{
  "queries": [
    {
      "currentYear": 2025,
      "province": "江苏",
      "subjectType": "物理类",
      "score": 650
    },
    {
      "currentYear": 2025,
      "province": "江苏",
      "subjectType": "历史类",
      "score": 620
    }
  ]
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "currentYear": 2025,
      "currentScore": 650,
      "currentRank": 5234,
      "province": "江苏",
      "subjectType": "物理类",
      "equivalentScores": [...]
    },
    {
      "currentYear": 2025,
      "currentScore": 620,
      "currentRank": 3245,
      "province": "江苏",
      "subjectType": "历史类",
      "equivalentScores": [...]
    }
  ]
}
```

---

## 2. 专业筛选接口

### 功能说明
根据分数范围和专业方向筛选招生计划，并显示往年录取分数。

### 2.1 筛选专业

**接口**: `GET /major-filter`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | ✅ | 年份 |
| sourceProvince | string | ✅ | 生源地 |
| subjectType | string | ✅ | 科类 |
| score | number | ✅ | 分数 |
| scoreRange | number | ❌ | 分数浮动范围（默认±10分） |
| majorDirection | string | ❌ | 专业方向/类别（模糊搜索） |
| majorName | string | ❌ | 专业名称（模糊搜索） |
| collegeName | string | ❌ | 院校名称（模糊搜索） |
| batch | string | ❌ | 批次 |
| pageNum | number | ❌ | 页码（默认1） |
| pageSize | number | ❌ | 每页数量（默认20） |

**请求示例**:
```bash
GET /major-filter?year=2025&sourceProvince=江苏&subjectType=物理类&score=650&majorDirection=计算机
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid-1",
        "year": 2025,
        "sourceProvince": "江苏",
        "subjectType": "物理类",
        "batch": "本科批",
        "collegeCode": "10001",
        "collegeName": "北京大学",
        "majorGroupCode": "01",
        "majorGroupName": "计算机类",
        "majorCode": "080901",
        "majorName": "计算机科学与技术",
        "planCount": 3,
        "studyYears": 4,
        "tuition": 5000,
        "subjectRequirements": "物理(必选)",
        "majorRemarks": null,
        "historicalScores": [
          {
            "year": 2024,
            "minScore": 648,
            "minRank": 5200
          },
          {
            "year": 2023,
            "minScore": 645,
            "minRank": 5150
          }
        ]
      }
    ],
    "userRank": 5234,
    "total": 156,
    "pageNum": 1,
    "pageSize": 20,
    "totalPages": 8
  }
}
```

### 2.2 获取可用的专业方向列表

**接口**: `GET /major-filter/directions`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | ✅ | 年份 |
| sourceProvince | string | ✅ | 生源地 |
| subjectType | string | ✅ | 科类 |

**请求示例**:
```bash
GET /major-filter/directions?year=2025&sourceProvince=江苏&subjectType=物理类
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    "计算机类",
    "电子信息类",
    "机械类",
    "土木类",
    "经济学类",
    "工商管理类"
  ]
}
```

---

## 3. 招生计划详情查询接口

### 功能说明
查询院校不同专业组的招生计划，并显示对应的往年录取分数。

### 3.1 查询招生计划详情

**接口**: `GET /enrollment-plan-detail`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | ✅ | 年份 |
| sourceProvince | string | ✅ | 生源地 |
| subjectType | string | ✅ | 科类 |
| collegeName | string | ❌ | 院校名称（模糊搜索） |
| collegeCode | string | ❌ | 院校代码 |
| majorGroupCode | string | ❌ | 专业组代码 |
| batch | string | ❌ | 批次 |
| includeHistoricalScores | boolean | ❌ | 是否包含历史数据（默认true） |
| historicalYears | number | ❌ | 查询几年的历史数据（默认3年） |
| pageNum | number | ❌ | 页码（默认1） |
| pageSize | number | ❌ | 每页数量（默认20） |

**请求示例**:
```bash
GET /enrollment-plan-detail?year=2025&sourceProvince=江苏&subjectType=物理类&collegeName=南京大学
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid-1",
        "year": 2025,
        "sourceProvince": "江苏",
        "subjectType": "物理类",
        "batch": "本科批",
        "collegeCode": "10284",
        "collegeName": "南京大学",
        "collegeInfo": {
          "level": "本科",
          "category": "综合类",
          "province": "江苏",
          "city": "南京",
          "isKey985": true,
          "isKey211": true,
          "isDoubleFirstClass": true
        },
        "majorGroupCode": "01",
        "majorGroupName": "计算机类",
        "subjectRequirements": "物理(必选)",
        "majorCode": "080901",
        "majorName": "计算机科学与技术",
        "majorRemarks": "新工科专业",
        "planCount": 5,
        "studyYears": 4,
        "tuition": 5800,
        "historicalScores": [
          {
            "year": 2024,
            "minScore": 655,
            "minRank": 3200,
            "majorGroup": "计算机类"
          },
          {
            "year": 2023,
            "minScore": 652,
            "minRank": 3150,
            "majorGroup": "计算机类"
          },
          {
            "year": 2022,
            "minScore": 650,
            "minRank": 3100,
            "majorGroup": "计算机类"
          }
        ]
      }
    ],
    "total": 35,
    "pageNum": 1,
    "pageSize": 20,
    "totalPages": 2
  }
}
```

### 3.2 按院校分组查询招生计划

**接口**: `GET /enrollment-plan-detail/by-college`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | ✅ | 年份 |
| sourceProvince | string | ✅ | 生源地 |
| subjectType | string | ✅ | 科类 |
| collegeCode | string | ❌ | 院校代码 |
| collegeName | string | ❌ | 院校名称（模糊搜索） |

**请求示例**:
```bash
GET /enrollment-plan-detail/by-college?year=2025&sourceProvince=江苏&subjectType=物理类&collegeName=南京大学
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "collegeCode": "10284",
      "collegeName": "南京大学",
      "totalPlanCount": 150,
      "majorGroups": [
        {
          "majorGroupCode": "01",
          "majorGroupName": "计算机类",
          "subjectRequirements": "物理(必选)",
          "majors": [
            {
              "majorCode": "080901",
              "majorName": "计算机科学与技术",
              "planCount": 5,
              "studyYears": 4,
              "tuition": 5800,
              "majorRemarks": null
            },
            {
              "majorCode": "080902",
              "majorName": "软件工程",
              "planCount": 4,
              "studyYears": 4,
              "tuition": 5800,
              "majorRemarks": null
            }
          ]
        },
        {
          "majorGroupCode": "02",
          "majorGroupName": "电子信息类",
          "subjectRequirements": "物理(必选)",
          "majors": [
            {
              "majorCode": "080701",
              "majorName": "电子信息工程",
              "planCount": 3,
              "studyYears": 4,
              "tuition": 5800,
              "majorRemarks": null
            }
          ]
        }
      ]
    }
  ]
}
```

### 3.3 获取院校历史录取分数统计

**接口**: `GET /enrollment-plan-detail/college-stats`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collegeName | string | ✅ | 院校名称 |
| sourceProvince | string | ✅ | 生源地 |
| subjectType | string | ✅ | 科类 |
| years | number | ❌ | 查询几年（默认5年） |

**请求示例**:
```bash
GET /enrollment-plan-detail/college-stats?collegeName=南京大学&sourceProvince=江苏&subjectType=物理类&years=3
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "year": 2024,
      "minScore": 640,
      "maxScore": 670,
      "avgScore": 655,
      "minRank": 5000,
      "majorCount": 35
    },
    {
      "year": 2023,
      "minScore": 638,
      "maxScore": 668,
      "avgScore": 653,
      "minRank": 4900,
      "majorCount": 32
    },
    {
      "year": 2022,
      "minScore": 635,
      "maxScore": 665,
      "avgScore": 650,
      "minRank": 4850,
      "majorCount": 30
    }
  ]
}
```

---

## 使用示例

### 场景 1: 等位分分析

用户输入分数后，查询往年同位次分数，用于分析录取可能性。

```javascript
// 1. 查询等位分
const response = await fetch(
  '/equivalent-score?currentYear=2025&province=江苏&subjectType=物理类&score=650'
);
const data = await response.json();

console.log(`当前分数：${data.data.currentScore}`);
console.log(`当前位次：${data.data.currentRank}`);
console.log('往年等位分：');
data.data.equivalentScores.forEach(es => {
  console.log(`${es.year}年: ${es.score}分 (位次${es.rank})`);
});
```

### 场景 2: 专业筛选

根据分数和专业方向筛选可填报的专业。

```javascript
// 1. 获取可用的专业方向
const directionsResponse = await fetch(
  '/major-filter/directions?year=2025&sourceProvince=江苏&subjectType=物理类'
);
const directions = await directionsResponse.json();

// 2. 筛选计算机类专业
const majorsResponse = await fetch(
  '/major-filter?year=2025&sourceProvince=江苏&subjectType=物理类&score=650&majorDirection=计算机&scoreRange=10'
);
const majors = await majorsResponse.json();

console.log(`用户位次：${majors.data.userRank}`);
console.log(`找到 ${majors.data.total} 个匹配专业`);
majors.data.list.forEach(major => {
  console.log(`${major.collegeName} - ${major.majorName}`);
  console.log(`  去年最低分：${major.historicalScores[0]?.minScore || 'N/A'}`);
});
```

### 场景 3: 院校招生计划查询

查询某个院校的所有招生计划和历史录取数据。

```javascript
// 1. 按院校分组查询
const collegeResponse = await fetch(
  '/enrollment-plan-detail/by-college?year=2025&sourceProvince=江苏&subjectType=物理类&collegeName=南京大学'
);
const collegeData = await collegeResponse.json();

const college = collegeData.data[0];
console.log(`${college.collegeName} 共招生 ${college.totalPlanCount} 人`);

college.majorGroups.forEach(group => {
  console.log(`\n专业组：${group.majorGroupName}`);
  console.log(`选科要求：${group.subjectRequirements}`);
  group.majors.forEach(major => {
    console.log(`  ${major.majorName} - ${major.planCount}人`);
  });
});

// 2. 查询历史录取统计
const statsResponse = await fetch(
  '/enrollment-plan-detail/college-stats?collegeName=南京大学&sourceProvince=江苏&subjectType=物理类&years=3'
);
const stats = await statsResponse.json();

console.log('\n历史录取统计：');
stats.data.forEach(stat => {
  console.log(`${stat.year}年: ${stat.minScore}-${stat.maxScore}分 (平均${stat.avgScore}分)`);
});
```

---

## 错误响应

所有接口在发生错误时返回统一格式：

```json
{
  "code": 400,
  "message": "缺少必填参数：year（年份）、sourceProvince（生源地）、subjectType（科类）"
}
```

常见错误代码：
- `400` - 参数错误
- `404` - 资源不存在
- `500` - 服务器错误

---

**更新时间**: 2025-10-29
**版本**: v1.0.0
