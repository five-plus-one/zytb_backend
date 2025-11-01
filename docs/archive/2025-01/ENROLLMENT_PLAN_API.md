# 招生计划 API 文档

## 基础信息

- **基础路径**: `/api/enrollment-plan`
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

### 1. 获取招生计划列表

**接口**: `GET /api/enrollment-plan/list`

**描述**: 分页查询招生计划列表，支持多种筛选条件

**请求参数**:
| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| pageNum | number | 否 | 页码，默认1 | 1 |
| pageSize | number | 否 | 每页数量，默认20 | 20 |
| year | number | 否 | 招生年份 | 2024 |
| sourceProvince | string | 否 | 生源省份 | 浙江省 |
| subjectType | string | 否 | 科类 | 物理类 |
| batch | string | 否 | 批次 | 本科一批 |
| collegeCode | string | 否 | 院校代码 | 10001 |
| collegeName | string | 否 | 院校名称（模糊查询） | 北京大学 |
| majorCode | string | 否 | 专业代码 | 080901 |
| majorName | string | 否 | 专业名称（模糊查询） | 计算机 |
| keyword | string | 否 | 关键词（搜索院校名或专业名） | 计算机 |
| sortField | string | 否 | 排序字段 | year |
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
        "year": 2024,
        "sourceProvince": "浙江省",
        "subjectType": "物理类",
        "batch": "本科一批",
        "collegeCode": "10001",
        "collegeName": "北京大学",
        "majorGroupCode": "001",
        "majorGroupName": "计算机类",
        "subjectRequirements": "物理+化学",
        "majorCode": "080901",
        "majorName": "计算机科学与技术",
        "majorRemarks": "",
        "planCount": 50,
        "studyYears": 4,
        "tuition": 5000.00,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 2. 获取招生计划详情

**接口**: `GET /api/enrollment-plan/:id`

**描述**: 根据ID获取招生计划详细信息

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 招生计划ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "year": 2024,
    "sourceProvince": "浙江省",
    "subjectType": "物理类",
    "batch": "本科一批",
    "collegeCode": "10001",
    "collegeName": "北京大学",
    "majorCode": "080901",
    "majorName": "计算机科学与技术",
    "planCount": 50,
    "studyYears": 4,
    "tuition": 5000.00,
    "college": {
      "id": "uuid",
      "name": "北京大学",
      "province": "北京市",
      "city": "北京"
    }
  }
}
```

### 3. 按院校获取招生计划

**接口**: `GET /api/enrollment-plan/college/:collegeCode`

**描述**: 获取指定院校的招生计划

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collegeCode | string | 是 | 院校代码 |

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
    "plans": [ ... ],
    "statistics": {
      "totalPlans": 50,
      "totalPlanCount": 1000,
      "years": [2024, 2023, 2022],
      "majorCount": 30
    }
  }
}
```

### 4. 按专业获取招生计划

**接口**: `GET /api/enrollment-plan/major/:majorCode`

**描述**: 获取指定专业在各院校的招生计划

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| majorCode | string | 是 | 专业代码 |

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
    "plans": [ ... ],
    "statistics": {
      "totalPlans": 100,
      "totalPlanCount": 2000,
      "collegeCount": 50
    }
  }
}
```

### 5. 获取招生计划统计信息

**接口**: `GET /api/enrollment-plan/statistics/overview`

**描述**: 获取指定年份和省份的招生计划统计数据

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
    "totalPlans": 5000,
    "totalPlanCount": 100000,
    "collegeCount": 200,
    "byCollege": [
      {
        "collegeName": "北京大学",
        "count": 50,
        "planCount": 1000
      }
    ],
    "byBatch": [
      {
        "batch": "本科一批",
        "count": 3000,
        "planCount": 60000
      }
    ],
    "bySubject": [
      {
        "subjectType": "物理类",
        "count": 3500,
        "planCount": 70000
      }
    ]
  }
}
```

### 6. 获取可用年份列表

**接口**: `GET /api/enrollment-plan/options/years`

**描述**: 获取系统中所有可用的招生年份

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [2024, 2023, 2022, 2021]
}
```

### 7. 获取可用省份列表

**接口**: `GET /api/enrollment-plan/options/provinces`

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

### 获取院校招生计划

**接口**: `GET /api/college/:id/plan`

**描述**: 获取指定院校的招生计划（已集成真实数据）

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 院校ID |

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | 否 | 年份 |
| province | string | 否 | 生源省份 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "collegeId": "uuid",
    "collegeName": "北京大学",
    "year": 2024,
    "province": "浙江省",
    "plans": [
      {
        "id": "uuid",
        "year": 2024,
        "sourceProvince": "浙江省",
        "subjectType": "物理类",
        "batch": "本科一批",
        "majorCode": "080901",
        "majorName": "计算机科学与技术",
        "planCount": 50,
        "studyYears": 4,
        "tuition": 5000.00
      }
    ],
    "statistics": {
      "totalPlans": 50,
      "totalPlanCount": 1000,
      "years": [2024, 2023],
      "batches": ["本科一批"]
    }
  }
}
```

## 使用示例

### JavaScript/TypeScript
```javascript
// 获取招生计划列表
const response = await fetch('/api/enrollment-plan/list?year=2024&sourceProvince=浙江省&pageNum=1&pageSize=20');
const data = await response.json();

// 按院校查询
const collegeData = await fetch('/api/enrollment-plan/college/10001?year=2024&sourceProvince=浙江省');
const collegePlans = await collegeData.json();

// 获取统计信息
const stats = await fetch('/api/enrollment-plan/statistics/overview?year=2024&sourceProvince=浙江省');
const statistics = await stats.json();
```

### cURL
```bash
# 获取招生计划列表
curl "http://localhost:3000/api/enrollment-plan/list?year=2024&sourceProvince=浙江省"

# 按院校代码查询
curl "http://localhost:3000/api/enrollment-plan/college/10001?year=2024"

# 获取统计信息
curl "http://localhost:3000/api/enrollment-plan/statistics/overview?year=2024&sourceProvince=浙江省"
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
3. 金额字段（如学费）单位为元，保留2位小数
4. 模糊查询字段会自动进行前后匹配
5. 关键词搜索会同时搜索院校名称和专业名称
6. 排序字段支持: year, planCount, tuition 等数据库字段
