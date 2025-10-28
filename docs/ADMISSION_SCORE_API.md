# 专业录取分数线 API 文档

## 基础信息

- **基础路径**: `/api/admission-score`
- **返回格式**: JSON

## 通用返回格式

### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

### 错误响应
```json
{
  "code": 500,
  "message": "错误信息",
  "data": null
}
```

## 接口列表

### 1. 获取录取分数线列表

**接口**: `GET /api/admission-score/list`

**描述**: 分页查询录取分数线列表，支持多种筛选条件

**请求参数**:
| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| pageNum | number | 否 | 页码，默认1 | 1 |
| pageSize | number | 否 | 每页数量，默认20 | 20 |
| year | number | 否 | 录取年份 | 2024 |
| sourceProvince | string | 否 | 生源省份 | 浙江省 |
| collegeName | string | 否 | 院校名称（模糊查询） | 北京大学 |
| majorName | string | 否 | 专业名称（模糊查询） | 计算机 |
| subjectType | string | 否 | 科类 | 物理类 |
| batch | string | 否 | 批次 | 本科一批 |
| minScoreMin | number | 否 | 最低分下限 | 600 |
| minScoreMax | number | 否 | 最低分上限 | 650 |
| minRankMin | number | 否 | 最低位次下限 | 1000 |
| minRankMax | number | 否 | 最低位次上限 | 5000 |
| keyword | string | 否 | 关键词（搜索院校名或专业名） | 计算机 |
| sortField | string | 否 | 排序字段 | minScore |
| sortOrder | string | 否 | 排序方式(asc/desc) | desc |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "sourceProvince": "浙江省",
        "collegeName": "北京大学",
        "year": 2024,
        "majorName": "计算机科学与技术",
        "majorGroup": "计算机类",
        "subjectType": "物理类",
        "subjectRequirements": "物理+化学",
        "minScore": 680,
        "minRank": 500,
        "batch": "本科一批",
        "province": "北京市",
        "city": "北京",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 2. 获取录取分数线详情

**接口**: `GET /api/admission-score/:id`

**描述**: 根据ID获取录取分数线详细信息

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 分数线记录ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "sourceProvince": "浙江省",
    "collegeName": "北京大学",
    "year": 2024,
    "majorName": "计算机科学与技术",
    "minScore": 680,
    "minRank": 500,
    "college": {
      "id": "uuid",
      "name": "北京大学",
      "province": "北京市"
    }
  }
}
```

### 3. 按院校获取录取分数线

**接口**: `GET /api/admission-score/college/:collegeName`

**描述**: 获取指定院校的录取分数线

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collegeName | string | 是 | 院校名称（需URL编码） |

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | 否 | 年份 |
| sourceProvince | string | 否 | 生源省份 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "scores": [ ... ],
    "statistics": {
      "totalRecords": 50,
      "years": [2024, 2023, 2022],
      "majorCount": 30,
      "avgScore": 650,
      "minScore": 620,
      "maxScore": 690
    }
  }
}
```

### 4. 按专业获取录取分数线

**接口**: `GET /api/admission-score/major/:majorName`

**描述**: 获取指定专业在各院校的录取分数线

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| majorName | string | 是 | 专业名称（需URL编码） |

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | 否 | 年份 |
| sourceProvince | string | 否 | 生源省份 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "scores": [ ... ],
    "statistics": {
      "totalRecords": 100,
      "collegeCount": 50,
      "avgScore": 630,
      "minScore": 580,
      "maxScore": 690
    }
  }
}
```

### 5. 获取历年分数线趋势

**接口**: `GET /api/admission-score/trend/analysis`

**描述**: 获取指定院校和专业的历年分数线变化趋势

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collegeName | string | 是 | 院校名称 |
| majorName | string | 是 | 专业名称 |
| sourceProvince | string | 是 | 生源省份 |
| years | number | 否 | 查询年数，默认5年 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "collegeName": "北京大学",
    "majorName": "计算机科学与技术",
    "sourceProvince": "浙江省",
    "trend": [
      {
        "year": 2024,
        "minScore": 680,
        "minRank": 500,
        "batch": "本科一批"
      },
      {
        "year": 2023,
        "minScore": 675,
        "minRank": 550,
        "batch": "本科一批"
      }
    ]
  }
}
```

### 6. 获取分数线统计信息

**接口**: `GET /api/admission-score/statistics/overview`

**描述**: 获取指定年份和省份的分数线统计数据

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | 是 | 年份 |
| sourceProvince | string | 是 | 生源省份 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "totalRecords": 5000,
    "byCollege": [
      {
        "collegeName": "北京大学",
        "count": 50,
        "avgScore": 680,
        "minScore": 650,
        "maxScore": 700
      }
    ],
    "bySubject": [
      {
        "subjectType": "物理类",
        "count": 3000,
        "avgScore": 620
      }
    ],
    "scoreDistribution": [
      {
        "range": "700+",
        "min": 700,
        "max": 999,
        "count": 50
      },
      {
        "range": "650-699",
        "min": 650,
        "max": 699,
        "count": 500
      }
    ]
  }
}
```

### 7. 根据分数推荐院校和专业

**接口**: `GET /api/admission-score/recommend/by-score`

**描述**: 根据考生分数智能推荐院校和专业

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| score | number | 是 | 考生分数 |
| sourceProvince | string | 是 | 生源省份 |
| subjectType | string | 是 | 科类 |
| year | number | 否 | 参考年份（默认去年） |
| range | number | 否 | 分数浮动范围，默认20分 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "score": 650,
    "sourceProvince": "浙江省",
    "subjectType": "物理类",
    "year": 2023,
    "recommendations": {
      "stable": [
        {
          "collegeName": "XX大学",
          "majorName": "XX专业",
          "minScore": 640,
          "minRank": 3000
        }
      ],
      "appropriate": [
        {
          "collegeName": "YY大学",
          "majorName": "YY专业",
          "minScore": 648,
          "minRank": 2500
        }
      ],
      "challenging": [
        {
          "collegeName": "ZZ大学",
          "majorName": "ZZ专业",
          "minScore": 658,
          "minRank": 2000
        }
      ]
    }
  }
}
```

### 8. 获取可用年份列表

**接口**: `GET /api/admission-score/options/years`

**描述**: 获取系统中所有可用的录取年份

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [2024, 2023, 2022, 2021]
}
```

### 9. 获取可用省份列表

**接口**: `GET /api/admission-score/options/provinces`

**描述**: 获取系统中所有可用的生源省份

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | 否 | 年份（筛选指定年份的省份） |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": ["浙江省", "江苏省", "广东省", "山东省"]
}
```

## 院校相关接口（已完善）

### 获取院校历年分数线

**接口**: `GET /api/college/:id/scores`

**描述**: 获取指定院校的历年录取分数线（已集成真实数据）

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 院校ID |

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| province | string | 是 | 生源省份 |
| subjectType | string | 否 | 科类，默认physics |
| years | number | 否 | 查询年数，默认3年 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "collegeId": "uuid",
    "collegeName": "北京大学",
    "province": "浙江省",
    "subjectType": "物理类",
    "scores": [
      {
        "year": 2024,
        "scores": [
          {
            "majorName": "计算机科学与技术",
            "minScore": 680,
            "minRank": 500,
            "batch": "本科一批"
          }
        ],
        "minScore": 650,
        "maxScore": 690,
        "avgScore": 670,
        "count": 30
      }
    ],
    "hasData": true
  }
}
```

## 使用示例

### JavaScript/TypeScript
```javascript
// 获取录取分数线列表
const response = await fetch('/api/admission-score/list?year=2024&sourceProvince=浙江省&subjectType=物理类&pageNum=1&pageSize=20');
const data = await response.json();

// 按院校查询
const collegeScores = await fetch('/api/admission-score/college/' + encodeURIComponent('北京大学') + '?year=2024&sourceProvince=浙江省');
const collegeData = await collegeScores.json();

// 分数推荐
const recommend = await fetch('/api/admission-score/recommend/by-score?score=650&sourceProvince=浙江省&subjectType=物理类');
const recommendations = await recommend.json();

// 获取院校历年分数线
const collegeHistory = await fetch('/api/college/college-id/scores?province=浙江省&subjectType=物理类&years=5');
const historyData = await collegeHistory.json();
```

### cURL
```bash
# 获取录取分数线列表
curl "http://localhost:3000/api/admission-score/list?year=2024&sourceProvince=浙江省"

# 按院校查询
curl "http://localhost:3000/api/admission-score/college/%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6?year=2024"

# 分数推荐
curl "http://localhost:3000/api/admission-score/recommend/by-score?score=650&sourceProvince=浙江省&subjectType=物理类"

# 获取分数线趋势
curl "http://localhost:3000/api/admission-score/trend/analysis?collegeName=北京大学&majorName=计算机科学与技术&sourceProvince=浙江省&years=5"
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 注意事项

1. 所有分页接口默认 `pageNum=1`, `pageSize=20`，最大 `pageSize=100`
2. 日期时间格式统一使用 ISO 8601 格式
3. 院校名称和专业名称在URL中需要进行URL编码
4. 模糊查询字段会自动进行前后匹配
5. 关键词搜索会同时搜索院校名称和专业名称
6. 分数推荐功能默认使用去年数据作为参考
7. 排序字段支持: year, minScore, minRank 等数据库字段
8. 推荐结果分为三类:
   - **stable**: 稳妥选择（分数低于考生5分以上）
   - **appropriate**: 合适选择（分数与考生相差±5分）
   - **challenging**: 冲刺选择（分数高于考生5分以上）

## 业务场景示例

### 场景1: 查询某分数段的所有院校和专业
```bash
curl "http://localhost:3000/api/admission-score/list?year=2024&sourceProvince=浙江省&minScoreMin=600&minScoreMax=650&sortField=minScore&sortOrder=desc"
```

### 场景2: 分析某专业的录取难度
```bash
curl "http://localhost:3000/api/admission-score/major/计算机科学与技术?year=2024&sourceProvince=浙江省"
```

### 场景3: 志愿填报智能推荐
```bash
# 考生650分，获取推荐
curl "http://localhost:3000/api/admission-score/recommend/by-score?score=650&sourceProvince=浙江省&subjectType=物理类&range=30"
```

### 场景4: 查看某院校某专业历年趋势
```bash
curl "http://localhost:3000/api/admission-score/trend/analysis?collegeName=北京大学&majorName=计算机科学与技术&sourceProvince=浙江省&years=5"
```

### 场景5: 统计分析当年录取情况
```bash
curl "http://localhost:3000/api/admission-score/statistics/overview?year=2024&sourceProvince=浙江省"
```
