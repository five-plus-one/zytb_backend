# 志愿填报系统 API 文档 v2.0

**基础URL**: `http://localhost:11452/api`  
**认证**: Bearer Token  
**最后更新**: 2025-01-05

---

## 📋 快速导航

- [志愿表管理（新）](#志愿表管理)
- [当前志愿表操作](#当前志愿表操作)
- [招生计划查询](#招生计划查询)
- [录取概率计算](#录取概率计算)

---

## 志愿表管理

**基础路径**: `/api/volunteer/tables`

### 1. 获取所有志愿表
```
GET /api/volunteer/tables
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "tables": [
      {
        "id": "uuid",
        "name": "保守方案",
        "isCurrent": true,
        "groupCount": 35
      }
    ]
  }
}
```

### 2. 创建新志愿表
```
POST /api/volunteer/tables
Content-Type: application/json

{
  "name": "激进方案",
  "description": "冲刺985/211",
  "copyFromTableId": "uuid"  // 可选
}
```

### 3. 切换当前志愿表
```
PUT /api/volunteer/tables/:tableId/activate
```

### 4. 删除志愿表
```
DELETE /api/volunteer/tables/:tableId
```
**注意**: 不能删除当前激活的表

---

## 当前志愿表操作

**基础路径**: `/api/volunteer/current`

### 1. 获取当前志愿表
```
GET /api/volunteer/current
```

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "tableInfo": {
      "id": "uuid",
      "name": "保守方案"
    },
    "batchInfo": {
      "score": 625,
      "rank": 5000,
      "province": "江苏"
    },
    "groups": [
      {
        "id": "uuid",
        "groupOrder": 1,
        "collegeName": "北京大学",
        "groupName": "数学类",
        "category": "rush",
        "majors": [...]
      }
    ],
    "stats": {
      "totalGroups": 35,
      "rushCount": 10,
      "stableCount": 15,
      "safeCount": 10
    }
  }
}
```

### 2. 更新批次信息
```
PUT /api/volunteer/current/batch
Content-Type: application/json

{
  "score": 625,
  "rank": 5000,
  "province": "江苏",
  "subjectType": "物理类"
}
```

### 3. 添加专业组
```
POST /api/volunteer/current/groups
Content-Type: application/json

{
  "collegeCode": "10001",
  "collegeName": "北京大学",
  "groupCode": "01",
  "groupName": "数学类",
  "targetPosition": 5,  // 可选：插入位置
  "isObeyAdjustment": true,
  "majors": [...]  // 可选：同时添加专业
}
```

### 4. 删除专业组
```
DELETE /api/volunteer/current/groups/:volunteerId
```

### 5. 批量调整专业组顺序
```
PUT /api/volunteer/current/groups/reorder
Content-Type: application/json

{
  "reorders": [
    {"volunteerId": "uuid1", "newPosition": 1},
    {"volunteerId": "uuid2", "newPosition": 2}
  ]
}
```

### 6. 修改专业组设置
```
PATCH /api/volunteer/current/groups/:volunteerId
Content-Type: application/json

{
  "isObeyAdjustment": false,
  "remarks": "备注"
}
```

### 7. 添加专业
```
POST /api/volunteer/current/groups/:volunteerId/majors
Content-Type: application/json

{
  "majorCode": "070101",
  "majorName": "数学与应用数学",
  "targetPosition": 2  // 可选
}
```

### 8. 删除专业
```
DELETE /api/volunteer/current/groups/:volunteerId/majors/:majorId
```

### 9. 批量设置专业
```
PUT /api/volunteer/current/groups/:volunteerId/majors
Content-Type: application/json

{
  "majors": [
    {"majorCode": "070101", "majorName": "数学"},
    {"majorCode": "070102", "majorName": "信息"}
  ]
}
```

### 10. 调整专业顺序
```
PUT /api/volunteer/current/groups/:volunteerId/majors/reorder
Content-Type: application/json

{
  "reorders": [
    {"majorId": "uuid1", "newPosition": 1},
    {"majorId": "uuid2", "newPosition": 2}
  ]
}
```

---

## 招生计划查询

### 1. 搜索招生计划
```
GET /api/enrollment-plan/search?keyword=河海大学&year=2025&province=江苏&collegeLevel=985,211&page=1
```

**查询参数**:
- `keyword`: **通用关键词**（同时搜索院校名/专业名/专业组名）⭐ 推荐使用
- `collegeName`: 院校名称（精确搜索，不建议与keyword同时使用）
- `majorName`: 专业名称（精确搜索，不建议与keyword同时使用）
- `year`: 年份（必填，默认2025）
- `province`: **生源地省份**（考生所在省份，如"江苏"）⭐ 重要
- `collegeProvince`: 院校所在省份（如"北京"、"上海"）
- `subjectType`: 科类（物理类/历史类）
- `collegeLevel`: 院校层次（985/211/double_first_class，逗号分隔）
- `city`: 院校所在城市
- `page`, `pageSize`: 分页

**正确示例**:
```
# 搜索河海大学在江苏的招生计划
GET /api/enrollment-plan/search?keyword=河海大学&year=2025&province=江苏&page=1

# 搜索江苏省的985/211院校
GET /api/enrollment-plan/search?year=2025&province=江苏&collegeLevel=985,211&page=1

# 搜索计算机相关专业
GET /api/enrollment-plan/search?keyword=计算机&year=2025&province=江苏&page=1
```

**错误示例** ❌:
```
# ❌ 错误：majorName应该是专业名，不是院校名
GET /api/enrollment-plan/search?collegeName=河海大学&majorName=河海大学

# ✅ 正确：使用keyword统一搜索
GET /api/enrollment-plan/search?keyword=河海大学
```

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "data": [
      {
        "groupId": "uuid",
        "collegeCode": "10001",
        "collegeName": "北京大学",
        "groupCode": "01",
        "groupName": "数学类",
        "is985": true,
        "majors": [...]
      }
    ],
    "total": 150,
    "page": 1
  }
}
```

### 2. 获取专业组详情
```
GET /api/enrollment-plan/group/:groupId/detail
```

**groupId 格式**:
- UUID: `9434f64a-1c90-49e1-94c5-cc0701340471`
- 或: `10001_01_2025_江苏`

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "groupInfo": {...},
    "majors": [...],
    "collegeInfo": {...},
    "historicalScores": [
      {
        "year": 2024,
        "minScore": 660,
        "minRank": 1000
      }
    ]
  }
}
```

---

## 录取概率计算

### 计算录取概率
```
POST /api/admission-probability/calculate
Content-Type: application/json

{
  "groupId": "uuid",
  "userScore": 625,
  "userRank": 5000
}
```

**响应示例**:
```json
{
  "code": 200,
  "data": {
    "probability": 0.35,
    "category": "rush",  // rush/stable/safe
    "categoryText": "冲刺",
    "recommendation": "建议放在志愿表靠前位置",
    "historicalData": [...]
  }
}
```

**分类说明**:
- `rush`: 冲刺（分数低10分以上）
- `stable`: 稳妥（分差 -10到+20）
- `safe`: 保底（分数高20分以上）

---

## 业务规则

### 志愿表限制
- 每用户最多 **10个志愿表**
- 每表最多 **40个专业组**
- 每组最多 **6个专业**
- 同时只有 **1个当前表**

### 使用流程
1. 创建/切换志愿表
2. 更新批次信息（分数/排名）
3. 搜索招生计划
4. 添加专业组到志愿表
5. 添加/调整专业
6. 查看录取概率

---

## 错误码

| 错误码 | 说明 |
|-------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

**版本**: v2.0  
**更新**: 2025-01-05  
**联系**: 查看 README
