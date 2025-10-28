# 志愿填报系统后端接口文档

## 目录
- [1. 项目概述](#1-项目概述)
- [2. 通用说明](#2-通用说明)
- [3. 用户模块 API](#3-用户模块-api)
- [4. 院校模块 API](#4-院校模块-api)
- [5. 专业模块 API](#5-专业模块-api)
- [6. 志愿模块 API](#6-志愿模块-api)
- [7. 系统模块 API](#7-系统模块-api)
- [8. 错误码说明](#8-错误码说明)
- [9. 附录](#9-附录)

---

## 1. 项目概述

### 1.1 项目信息
- **项目名称**: 志愿填报系统后端 API
- **版本**: 1.0.0
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
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      数据访问层 (TypeORM + Models)           │
│  User / College / Major / Volunteer         │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          MySQL 8.0 数据库                    │
└─────────────────────────────────────────────┘
```

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

**示例**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJpYXQiOjE2...
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

#### 错误示例
```json
{
  "code": 400,
  "message": "用户名已存在",
  "data": null
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

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

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

#### 请求头
```
Authorization: Bearer <token>
```

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
    "avatar": "https://example.com/avatar.jpg",
    "realName": "张三",
    "idCard": "330106********1234",
    "province": "浙江省",
    "city": "杭州市",
    "school": "杭州第一中学",
    "examYear": 2024,
    "examScore": 650,
    "subjectType": "physics",
    "status": 1,
    "createdAt": "2024-01-01T08:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| phone | string | 手机号已脱敏(中间4位*号) |
| idCard | string | 身份证已脱敏(中间8位*号) |
| subjectType | string | 选考科目类型: physics(物理)/history(历史) |
| status | number | 账号状态: 1=正常, 0=禁用 |

---

### 3.4 更新用户信息

**接口**: `PUT /api/user/info`
**认证**: 需要JWT Token

#### 请求参数
```json
{
  "nickname": "张三同学",
  "avatar": "https://example.com/new-avatar.jpg",
  "email": "new-email@example.com",
  "realName": "张三",
  "idCard": "330106199001011234",
  "province": "浙江省",
  "city": "杭州市",
  "school": "杭州第一中学",
  "examScore": 650,
  "subjectType": "physics"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称 |
| avatar | string | 否 | 头像URL |
| email | string | 否 | 邮箱 |
| realName | string | 否 | 真实姓名 |
| idCard | string | 否 | 身份证号(18位) |
| province | string | 否 | 省份 |
| city | string | 否 | 城市 |
| school | string | 否 | 学校名称 |
| examScore | number | 否 | 高考分数 |
| subjectType | string | 否 | 选考类型: physics/history |

#### 响应示例
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nickname": "张三同学",
    "avatar": "https://example.com/new-avatar.jpg",
    ...
  }
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

| 参数 | 类型 | 必填 | 说明 | 验证规则 |
|------|------|------|------|----------|
| oldPassword | string | 是 | 原密码 | - |
| newPassword | string | 是 | 新密码 | 6-20个字符 |

#### 响应示例
```json
{
  "code": 200,
  "message": "密码修改成功",
  "data": null
}
```

#### 错误示例
```json
{
  "code": 400,
  "message": "原密码错误",
  "data": null
}
```

---

### 3.6 发送验证码

**接口**: `POST /api/user/verify-code`
**认证**: 无需认证

#### 请求参数
```json
{
  "phone": "13800138000",
  "type": "register"
}
```

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| phone | string | 是 | 手机号 | 11位中国大陆手机号 |
| type | string | 是 | 验证码类型 | register(注册) / login(登录) / reset(重置密码) |

#### 响应示例
```json
{
  "code": 200,
  "message": "验证码已发送",
  "data": {
    "expiresIn": 300
  }
}
```

**说明**:
- 验证码有效期为5分钟(300秒)
- 同一手机号1分钟内只能发送一次

---

## 4. 院校模块 API

### 4.1 获取院校列表

**接口**: `GET /api/college/list`
**认证**: 无需认证

#### 请求参数(Query)
```
GET /api/college/list?pageNum=1&pageSize=10&keyword=北京&province=北京市&type=综合类&level=985&minScore=600&maxScore=700&sortField=rank&sortOrder=ASC
```

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| pageNum | number | 否 | 页码 | 1 (默认1) |
| pageSize | number | 否 | 每页数量 | 10 (默认10) |
| keyword | string | 否 | 搜索关键词(院校名称) | "北京大学" |
| province | string | 否 | 省份筛选 | "北京市" |
| city | string | 否 | 城市筛选 | "北京市" |
| type | string | 否 | 院校类型 | "综合类" |
| level | string | 否 | 院校层次 | "985" |
| nature | string | 否 | 办学性质 | "公办" |
| minScore | number | 否 | 最低分数线 | 600 |
| maxScore | number | 否 | 最高分数线 | 700 |
| sortField | string | 否 | 排序字段 | rank/name/minScore |
| sortOrder | string | 否 | 排序方向 | ASC/DESC |

**院校类型可选值**: 综合类、理工类、师范类、农林类、医药类、财经类、政法类、语言类、艺术类、体育类、民族类、军事类

**院校层次可选值**: 985、211、双一流、普通本科、专科

**办学性质可选值**: 公办、民办、中外合作办学

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
        "city": "北京市",
        "type": "综合类",
        "level": "985,211,双一流",
        "nature": "公办",
        "logo": "https://example.com/pku-logo.png",
        "rank": 1,
        "minScore": 680,
        "avgScore": 690,
        "maxScore": 700,
        "tags": ["985", "211", "双一流", "C9联盟"],
        "hotLevel": 10,
        "foundedYear": 1898,
        "studentCount": 46000,
        "teacherCount": 9000,
        "academicianCount": 80,
        "keyDisciplineCount": 48,
        "website": "https://www.pku.edu.cn"
      }
    ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 10,
    "pages": 10
  }
}
```

---

### 4.2 获取院校详情

**接口**: `GET /api/college/:id`
**认证**: 无需认证

#### 请求示例
```
GET /api/college/550e8400-e29b-41d4-a716-446655440001
```

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "北京大学",
    "code": "10001",
    "province": "北京市",
    "city": "北京市",
    "type": "综合类",
    "level": "985,211,双一流",
    "nature": "公办",
    "department": "教育部",
    "logo": "https://example.com/pku-logo.png",
    "banner": "https://example.com/pku-banner.jpg",
    "description": "北京大学创办于1898年,初名京师大学堂,是中国第一所国立综合性大学...",
    "address": "北京市海淀区颐和园路5号",
    "website": "https://www.pku.edu.cn",
    "phone": "010-62751234",
    "email": "admission@pku.edu.cn",
    "rank": 1,
    "minScore": 680,
    "avgScore": 690,
    "maxScore": 700,
    "tags": ["985", "211", "双一流", "C9联盟"],
    "hotLevel": 10,
    "foundedYear": 1898,
    "area": 7000,
    "studentCount": 46000,
    "teacherCount": 9000,
    "academicianCount": 80,
    "keyDisciplineCount": 48,
    "features": [
      "国家重点实验室20个",
      "一级学科国家重点学科18个",
      "博士后流动站41个"
    ],
    "admissionData": {
      "enrollmentPlan": 3500,
      "actualEnrollment": 3400,
      "acceptanceRate": 0.01
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 4.3 获取院校招生计划

**接口**: `GET /api/college/:id/plan`
**认证**: 无需认证

#### 请求参数
```
GET /api/college/550e8400-e29b-41d4-a716-446655440001/plan?year=2024&province=浙江省
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | 否 | 年份 (默认当前年份) |
| province | string | 否 | 省份 |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "collegeId": "550e8400-e29b-41d4-a716-446655440001",
    "collegeName": "北京大学",
    "year": 2024,
    "province": "浙江省",
    "totalPlan": 120,
    "majorPlans": [
      {
        "majorId": "660e8400-e29b-41d4-a716-446655440001",
        "majorName": "计算机科学与技术",
        "majorCode": "080901",
        "planCount": 15,
        "tuition": 5000,
        "duration": 4,
        "degreeType": "工学学士",
        "subjectRequirements": ["物理", "化学"],
        "remarks": "含人工智能方向"
      },
      {
        "majorId": "660e8400-e29b-41d4-a716-446655440002",
        "majorName": "软件工程",
        "majorCode": "080902",
        "planCount": 10,
        "tuition": 5000,
        "duration": 4,
        "degreeType": "工学学士",
        "subjectRequirements": ["物理"],
        "remarks": null
      }
    ]
  }
}
```

---

### 4.4 获取院校历年分数线

**接口**: `GET /api/college/:id/scores`
**认证**: 无需认证

#### 请求参数
```
GET /api/college/550e8400-e29b-41d4-a716-446655440001/scores?province=浙江省&subjectType=physics&years=3
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| province | string | 是 | 省份 |
| subjectType | string | 否 | 科目类型 (默认physics) |
| years | number | 否 | 查询年数 (默认3年) |

**subjectType可选值**: physics(物理类), history(历史类)

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "collegeId": "550e8400-e29b-41d4-a716-446655440001",
    "collegeName": "北京大学",
    "province": "浙江省",
    "subjectType": "physics",
    "scoreLines": [
      {
        "year": 2024,
        "minScore": 680,
        "avgScore": 690,
        "maxScore": 700,
        "minRank": 50,
        "avgRank": 30,
        "provinceLine": 497,
        "exceedLine": 183
      },
      {
        "year": 2023,
        "minScore": 675,
        "avgScore": 685,
        "maxScore": 695,
        "minRank": 55,
        "avgRank": 35,
        "provinceLine": 488,
        "exceedLine": 187
      },
      {
        "year": 2022,
        "minScore": 670,
        "avgScore": 680,
        "maxScore": 690,
        "minRank": 60,
        "avgRank": 40,
        "provinceLine": 495,
        "exceedLine": 175
      }
    ]
  }
}
```

**字段说明**:
| 字段 | 说明 |
|------|------|
| minScore | 最低录取分数 |
| avgScore | 平均录取分数 |
| maxScore | 最高录取分数 |
| minRank | 最低位次 |
| avgRank | 平均位次 |
| provinceLine | 该省当年本科线 |
| exceedLine | 超本科线分数 |

---

### 4.5 对比院校

**接口**: `POST /api/college/compare`
**认证**: 无需认证

#### 请求参数
```json
{
  "collegeIds": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collegeIds | string[] | 是 | 院校ID数组 (最多5个) |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "colleges": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "北京大学",
        "province": "北京市",
        "type": "综合类",
        "level": "985,211,双一流",
        "rank": 1,
        "minScore": 680,
        "studentCount": 46000,
        "teacherCount": 9000,
        "academicianCount": 80,
        "keyDisciplineCount": 48,
        "area": 7000,
        "foundedYear": 1898
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "清华大学",
        "province": "北京市",
        "type": "理工类",
        "level": "985,211,双一流",
        "rank": 2,
        "minScore": 685,
        "studentCount": 48000,
        "teacherCount": 9500,
        "academicianCount": 85,
        "keyDisciplineCount": 50,
        "area": 4400,
        "foundedYear": 1911
      }
    ],
    "compareItems": [
      { "name": "全国排名", "key": "rank" },
      { "name": "最低分数", "key": "minScore" },
      { "name": "院校层次", "key": "level" },
      { "name": "在校生数", "key": "studentCount" },
      { "name": "教师人数", "key": "teacherCount" },
      { "name": "院士人数", "key": "academicianCount" },
      { "name": "重点学科", "key": "keyDisciplineCount" },
      { "name": "校园面积", "key": "area" },
      { "name": "创办时间", "key": "foundedYear" }
    ]
  }
}
```

---

## 5. 专业模块 API

### 5.1 获取专业列表

**接口**: `GET /api/major/list`
**认证**: 无需认证

#### 请求参数(Query)
```
GET /api/major/list?pageNum=1&pageSize=10&keyword=计算机&category=工学&degree=本科&hot=true&sortField=avgSalary&sortOrder=DESC
```

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| pageNum | number | 否 | 页码 | 1 |
| pageSize | number | 否 | 每页数量 | 10 |
| keyword | string | 否 | 搜索关键词(专业名称) | "计算机" |
| category | string | 否 | 专业门类 | "工学" |
| subCategory | string | 否 | 专业类别 | "计算机类" |
| degree | string | 否 | 学历层次 | "本科" |
| hot | boolean | 否 | 是否热门 | true |
| sortField | string | 否 | 排序字段 | avgSalary/employmentRate |
| sortOrder | string | 否 | 排序方向 | ASC/DESC |

**专业门类可选值**: 哲学、经济学、法学、教育学、文学、历史学、理学、工学、农学、医学、管理学、艺术学

**学历层次可选值**: 本科、专科

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "计算机科学与技术",
        "code": "080901",
        "category": "工学",
        "subCategory": "计算机类",
        "degree": "本科",
        "degreeType": "工学学士",
        "years": 4,
        "isHot": true,
        "tags": ["高薪", "就业好", "人才缺口大"],
        "avgSalary": 12000,
        "employmentRate": 95.5,
        "description": "本专业培养掌握计算机科学与技术基本理论..."
      }
    ],
    "total": 50,
    "pageNum": 1,
    "pageSize": 10,
    "pages": 5
  }
}
```

---

### 5.2 获取专业详情

**接口**: `GET /api/major/:id`
**认证**: 无需认证

#### 请求示例
```
GET /api/major/660e8400-e29b-41d4-a716-446655440001
```

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "计算机科学与技术",
    "code": "080901",
    "category": "工学",
    "subCategory": "计算机类",
    "degree": "本科",
    "degreeType": "工学学士",
    "years": 4,
    "description": "本专业培养掌握计算机科学与技术基本理论、基本知识和基本技能,能在科研部门、教育单位、企业、事业、技术和行政管理部门等单位从事计算机教学、科学研究和应用的计算机科学与技术学科的高级专门科学技术人才。",
    "isHot": true,
    "tags": ["高薪", "就业好", "人才缺口大"],
    "avgSalary": 12000,
    "employmentRate": 95.5,
    "courses": [
      "高等数学",
      "线性代数",
      "离散数学",
      "数据结构",
      "算法分析",
      "操作系统",
      "计算机网络",
      "数据库原理",
      "编译原理",
      "软件工程",
      "人工智能"
    ],
    "skills": [
      "编程能力(Java/Python/C++)",
      "算法与数据结构",
      "数据库设计与管理",
      "网络协议与安全",
      "软件工程方法",
      "问题分析与解决",
      "团队协作"
    ],
    "career": "毕业生主要在IT企业、科研院所、高等院校、政府机关等单位从事软件开发、系统架构、技术支持、项目管理等工作。",
    "careerFields": [
      "软件开发工程师",
      "系统架构师",
      "算法工程师",
      "数据库管理员",
      "网络安全工程师",
      "项目经理",
      "技术总监"
    ],
    "salaryTrend": [
      { "year": 1, "salary": 8000 },
      { "year": 3, "salary": 12000 },
      { "year": 5, "salary": 18000 },
      { "year": 10, "salary": 30000 }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

---

### 5.3 获取开设该专业的院校

**接口**: `GET /api/major/:id/colleges`
**认证**: 无需认证

#### 请求参数
```
GET /api/major/660e8400-e29b-41d4-a716-446655440001/colleges?pageNum=1&pageSize=10&province=浙江省&level=985
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageNum | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| province | string | 否 | 省份筛选 |
| level | string | 否 | 院校层次筛选 |
| sortField | string | 否 | 排序字段 |
| sortOrder | string | 否 | 排序方向 |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "majorId": "660e8400-e29b-41d4-a716-446655440001",
    "majorName": "计算机科学与技术",
    "records": [
      {
        "collegeId": "550e8400-e29b-41d4-a716-446655440001",
        "collegeName": "北京大学",
        "province": "北京市",
        "level": "985,211,双一流",
        "rank": 1,
        "minScore": 680,
        "tuition": 5000,
        "planCount": 15
      },
      {
        "collegeId": "550e8400-e29b-41d4-a716-446655440002",
        "collegeName": "清华大学",
        "province": "北京市",
        "level": "985,211,双一流",
        "rank": 2,
        "minScore": 685,
        "tuition": 5000,
        "planCount": 20
      }
    ],
    "total": 500,
    "pageNum": 1,
    "pageSize": 10,
    "pages": 50
  }
}
```

---

## 6. 志愿模块 API

**说明**: 本模块所有接口均需要JWT认证

### 6.1 获取我的志愿

**接口**: `GET /api/volunteer/my`
**认证**: 需要JWT Token

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "priority": 1,
      "college": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "北京大学",
        "province": "北京市",
        "level": "985,211,双一流",
        "minScore": 680,
        "logo": "https://example.com/pku-logo.png"
      },
      "major": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "计算机科学与技术",
        "category": "工学",
        "avgSalary": 12000
      },
      "isObeyAdjustment": true,
      "admitProbability": "medium",
      "remarks": "冲刺院校",
      "status": "submitted",
      "submittedAt": "2024-06-25T10:00:00.000Z",
      "createdAt": "2024-06-20T08:00:00.000Z",
      "updatedAt": "2024-06-25T10:00:00.000Z"
    }
  ]
}
```

**字段说明**:
| 字段 | 说明 |
|------|------|
| priority | 志愿顺序 (1-96) |
| isObeyAdjustment | 是否服从专业调剂 |
| admitProbability | 录取概率: high(冲)/medium(稳)/low(保) |
| status | 状态: draft(草稿)/submitted(已提交)/confirmed(已确认)/admitted(已录取) |

---

### 6.2 保存志愿(草稿)

**接口**: `POST /api/volunteer/save`
**认证**: 需要JWT Token

#### 请求参数
```json
{
  "volunteers": [
    {
      "priority": 1,
      "collegeId": "550e8400-e29b-41d4-a716-446655440001",
      "majorId": "660e8400-e29b-41d4-a716-446655440001",
      "isObeyAdjustment": true,
      "remarks": "冲刺院校"
    },
    {
      "priority": 2,
      "collegeId": "550e8400-e29b-41d4-a716-446655440002",
      "majorId": "660e8400-e29b-41d4-a716-446655440002",
      "isObeyAdjustment": true,
      "remarks": "稳妥院校"
    }
  ]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| volunteers | array | 是 | 志愿数组 (最多96个) |
| volunteers[].priority | number | 是 | 志愿顺序 (1-96) |
| volunteers[].collegeId | string | 是 | 院校ID |
| volunteers[].majorId | string | 是 | 专业ID |
| volunteers[].isObeyAdjustment | boolean | 是 | 是否服从调剂 |
| volunteers[].remarks | string | 否 | 备注 |

#### 响应示例
```json
{
  "code": 200,
  "message": "保存成功",
  "data": {
    "count": 2,
    "volunteers": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440001",
        "priority": 1,
        "status": "draft",
        ...
      }
    ]
  }
}
```

---

### 6.3 提交志愿

**接口**: `POST /api/volunteer/submit`
**认证**: 需要JWT Token

#### 请求参数
格式同 `/api/volunteer/save`,但提交后状态变为 `submitted`,不可再编辑。

#### 响应示例
```json
{
  "code": 200,
  "message": "志愿提交成功",
  "data": {
    "count": 2,
    "submittedAt": "2024-06-25T10:00:00.000Z",
    "volunteers": [...]
  }
}
```

**注意**:
- 提交后状态变更为 `submitted`
- 提交后不可再修改或删除
- 超过志愿填报截止时间后无法提交

---

### 6.4 删除志愿

**接口**: `DELETE /api/volunteer/:id`
**认证**: 需要JWT Token

#### 请求示例
```
DELETE /api/volunteer/770e8400-e29b-41d4-a716-446655440001
```

#### 响应示例
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

**限制**: 只能删除 `draft` 状态的志愿

---

### 6.5 智能推荐志愿

**接口**: `POST /api/volunteer/recommend`
**认证**: 需要JWT Token

#### 请求参数
```json
{
  "score": 650,
  "province": "浙江省",
  "subjectType": "physics",
  "rank": 5000,
  "preference": {
    "provincePreference": ["浙江省", "上海市", "北京市"],
    "typePreference": ["综合类", "理工类"],
    "majorPreference": ["计算机类", "电子信息类"]
  },
  "count": 30
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| score | number | 是 | 高考分数 |
| province | string | 是 | 省份 |
| subjectType | string | 是 | 科目类型(physics/history) |
| rank | number | 是 | 省内排名 |
| preference | object | 否 | 偏好设置 |
| preference.provincePreference | string[] | 否 | 偏好省份 |
| preference.typePreference | string[] | 否 | 偏好院校类型 |
| preference.majorPreference | string[] | 否 | 偏好专业类别 |
| count | number | 否 | 推荐数量 (默认30) |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "score": 650,
    "rank": 5000,
    "province": "浙江省",
    "recommendCount": 30,
    "recommendations": [
      {
        "type": "rush",
        "label": "冲刺",
        "colleges": [
          {
            "collegeId": "550e8400-e29b-41d4-a716-446655440001",
            "collegeName": "北京大学",
            "province": "北京市",
            "level": "985,211,双一流",
            "minScore": 680,
            "minRank": 1000,
            "probability": "low",
            "probabilityPercent": 30,
            "recommendReason": "根据历年数据,您的分数有30%的录取可能性",
            "majors": [
              {
                "majorId": "660e8400-e29b-41d4-a716-446655440001",
                "majorName": "计算机科学与技术",
                "avgSalary": 12000,
                "employmentRate": 95.5
              }
            ]
          }
        ]
      },
      {
        "type": "stable",
        "label": "稳妥",
        "colleges": [...]
      },
      {
        "type": "safe",
        "label": "保底",
        "colleges": [...]
      }
    ]
  }
}
```

**推荐策略说明**:
- **冲刺(rush)**: 分数线高于考生成绩10-30分,录取概率30-50%
- **稳妥(stable)**: 分数线与考生成绩接近(±10分),录取概率70-85%
- **保底(safe)**: 分数线低于考生成绩10-30分,录取概率>90%

---

### 6.6 分析志愿录取概率

**接口**: `POST /api/volunteer/analyze`
**认证**: 需要JWT Token

#### 请求参数
```json
{
  "volunteers": [
    {
      "collegeId": "550e8400-e29b-41d4-a716-446655440001",
      "majorId": "660e8400-e29b-41d4-a716-446655440001"
    },
    {
      "collegeId": "550e8400-e29b-41d4-a716-446655440002",
      "majorId": "660e8400-e29b-41d4-a716-446655440002"
    }
  ],
  "userScore": 650,
  "userRank": 5000,
  "province": "浙江省",
  "subjectType": "physics"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| volunteers | array | 是 | 待分析志愿数组 |
| volunteers[].collegeId | string | 是 | 院校ID |
| volunteers[].majorId | string | 是 | 专业ID |
| userScore | number | 是 | 用户分数 |
| userRank | number | 是 | 用户排名 |
| province | string | 是 | 省份 |
| subjectType | string | 是 | 科目类型 |

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userScore": 650,
    "userRank": 5000,
    "analysis": [
      {
        "collegeId": "550e8400-e29b-41d4-a716-446655440001",
        "collegeName": "北京大学",
        "majorId": "660e8400-e29b-41d4-a716-446655440001",
        "majorName": "计算机科学与技术",
        "historicalData": {
          "minScore": 680,
          "avgScore": 690,
          "minRank": 1000,
          "avgRank": 500
        },
        "probability": "low",
        "probabilityPercent": 25,
        "scoreDiff": -30,
        "rankDiff": 4000,
        "suggestion": "该志愿为冲刺志愿,录取概率较低,建议作为前序志愿填报",
        "risks": [
          "分数低于历年平均分30分",
          "排名低于历年平均排名4000位"
        ],
        "advantages": [
          "顶尖985院校",
          "计算机专业全国排名第一"
        ]
      },
      {
        "collegeId": "550e8400-e29b-41d4-a716-446655440002",
        "collegeName": "浙江大学",
        "majorId": "660e8400-e29b-41d4-a716-446655440002",
        "majorName": "软件工程",
        "historicalData": {
          "minScore": 640,
          "avgScore": 650,
          "minRank": 6000,
          "avgRank": 5000
        },
        "probability": "high",
        "probabilityPercent": 85,
        "scoreDiff": 10,
        "rankDiff": -1000,
        "suggestion": "该志愿为稳妥志愿,录取概率较高,建议重点考虑",
        "risks": [],
        "advantages": [
          "985院校",
          "本省院校",
          "软件工程专业实力强"
        ]
      }
    ],
    "summary": {
      "totalCount": 2,
      "rushCount": 1,
      "stableCount": 1,
      "safeCount": 0,
      "suggestions": [
        "建议增加2-3个保底志愿",
        "志愿梯度设置合理",
        "专业选择集中在计算机类,建议适当分散"
      ]
    }
  }
}
```

---

## 7. 系统模块 API

### 7.1 获取省份列表

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
    { "code": "130000", "name": "河北省" },
    { "code": "310000", "name": "上海市" },
    { "code": "330000", "name": "浙江省" },
    { "code": "440000", "name": "广东省" }
  ]
}
```

---

### 7.2 获取数据字典

**接口**: `GET /api/system/dict`
**认证**: 无需认证

#### 请求参数
```
GET /api/system/dict?type=college_type
```

| 参数 | 类型 | 必填 | 说明 | 可选值 |
|------|------|------|------|--------|
| type | string | 是 | 字典类型 | college_type / college_level / major_category / subject_type |

#### 响应示例

**院校类型** (`type=college_type`):
```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "value": "综合类", "label": "综合类" },
    { "value": "理工类", "label": "理工类" },
    { "value": "师范类", "label": "师范类" },
    { "value": "农林类", "label": "农林类" },
    { "value": "医药类", "label": "医药类" },
    { "value": "财经类", "label": "财经类" },
    { "value": "政法类", "label": "政法类" },
    { "value": "语言类", "label": "语言类" },
    { "value": "艺术类", "label": "艺术类" },
    { "value": "体育类", "label": "体育类" },
    { "value": "民族类", "label": "民族类" },
    { "value": "军事类", "label": "军事类" }
  ]
}
```

**院校层次** (`type=college_level`):
```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "value": "985", "label": "985工程" },
    { "value": "211", "label": "211工程" },
    { "value": "双一流", "label": "双一流" },
    { "value": "普通本科", "label": "普通本科" },
    { "value": "专科", "label": "专科" }
  ]
}
```

**专业门类** (`type=major_category`):
```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "value": "哲学", "label": "哲学" },
    { "value": "经济学", "label": "经济学" },
    { "value": "法学", "label": "法学" },
    { "value": "教育学", "label": "教育学" },
    { "value": "文学", "label": "文学" },
    { "value": "历史学", "label": "历史学" },
    { "value": "理学", "label": "理学" },
    { "value": "工学", "label": "工学" },
    { "value": "农学", "label": "农学" },
    { "value": "医学", "label": "医学" },
    { "value": "管理学", "label": "管理学" },
    { "value": "艺术学", "label": "艺术学" }
  ]
}
```

**科目类型** (`type=subject_type`):
```json
{
  "code": 200,
  "message": "success",
  "data": [
    { "value": "physics", "label": "物理类" },
    { "value": "history", "label": "历史类" }
  ]
}
```

---

### 7.3 获取系统配置

**接口**: `GET /api/system/config`
**认证**: 无需认证

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "volunteer": {
      "currentYear": 2024,
      "maxVolunteerCount": 96,
      "startDate": "2024-06-25T00:00:00.000Z",
      "endDate": "2024-06-30T23:59:59.000Z",
      "isOpen": true,
      "tips": [
        "建议按照"冲稳保"梯度填报志愿",
        "每个志愿都要认真考虑是否服从专业调剂",
        "提交前务必仔细核对院校代码和专业代码"
      ]
    },
    "system": {
      "systemName": "志愿填报系统",
      "version": "1.0.0",
      "isMaintenance": false,
      "maintenanceMessage": null,
      "contactPhone": "400-xxx-xxxx",
      "contactEmail": "support@example.com"
    },
    "upload": {
      "maxSize": 5242880,
      "allowedTypes": ["image/jpeg", "image/png", "image/jpg"],
      "maxSizeMB": 5
    }
  }
}
```

---

### 7.4 获取系统统计

**接口**: `GET /api/system/statistics`
**认证**: 无需认证

#### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userCount": 15680,
    "collegeCount": 2800,
    "majorCount": 6500,
    "volunteerCount": 128900,
    "submittedVolunteerCount": 105600,
    "todayRegisterCount": 230,
    "todaySubmitCount": 856,
    "hotColleges": [
      {
        "collegeId": "550e8400-e29b-41d4-a716-446655440001",
        "collegeName": "北京大学",
        "applyCount": 3200
      },
      {
        "collegeId": "550e8400-e29b-41d4-a716-446655440002",
        "collegeName": "清华大学",
        "applyCount": 3150
      }
    ],
    "hotMajors": [
      {
        "majorId": "660e8400-e29b-41d4-a716-446655440001",
        "majorName": "计算机科学与技术",
        "applyCount": 8900
      },
      {
        "majorId": "660e8400-e29b-41d4-a716-446655440002",
        "majorName": "软件工程",
        "applyCount": 7600
      }
    ]
  }
}
```

---

### 7.5 文件上传

**接口**: `POST /api/system/upload`
**认证**: 需要JWT Token

#### 请求格式
- **Content-Type**: `multipart/form-data`
- **文件字段名**: `file`

#### 请求示例
```bash
curl -X POST http://localhost:3000/api/system/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@avatar.jpg" \
  -F "type=avatar"
```

#### 请求参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 上传的文件 |
| type | string | 否 | 文件类型(avatar/other) |

**文件限制**:
- 支持格式: JPEG, PNG, JPG
- 最大大小: 5MB
- 文件名: 自动生成唯一文件名

#### 响应示例
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "http://localhost:3000/uploads/1640000000000-avatar.jpg",
    "filename": "1640000000000-avatar.jpg",
    "size": 102400,
    "mimetype": "image/jpeg"
  }
}
```

#### 错误示例
```json
{
  "code": 400,
  "message": "文件大小超过5MB限制",
  "data": null
}
```

---

### 7.6 健康检查

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

## 8. 错误码说明

### 8.1 通用错误码
| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 200 | 成功 | - |
| 400 | 请求参数错误 | 检查请求参数格式和必填字段 |
| 401 | 未授权/Token无效 | 重新登录获取有效Token |
| 403 | 禁止访问 | 检查用户权限 |
| 404 | 资源不存在 | 检查请求的资源ID是否正确 |
| 500 | 服务器内部错误 | 联系管理员 |

### 8.2 业务错误信息
| 错误信息 | 说明 |
|----------|------|
| 用户名已存在 | 注册时用户名重复 |
| 手机号已被注册 | 注册时手机号重复 |
| 用户名或密码错误 | 登录凭证不正确 |
| 原密码错误 | 修改密码时原密码验证失败 |
| Token已过期 | JWT Token超过有效期(7天) |
| 院校不存在 | 查询的院校ID不存在 |
| 专业不存在 | 查询的专业ID不存在 |
| 志愿数量超过限制 | 超过96个志愿上限 |
| 志愿填报未开放 | 不在填报时间范围内 |
| 志愿已提交,无法修改 | 尝试修改已提交的志愿 |
| 文件格式不支持 | 上传的文件格式不在允许列表中 |
| 文件大小超过限制 | 上传文件超过5MB |

---

## 9. 附录

### 9.1 数据模型关系图
```
┌─────────────┐         ┌──────────────┐
│    User     │────┐    │   College    │
│  (用户表)    │    │    │  (院校表)     │
└─────────────┘    │    └──────────────┘
                   │           │
                   │           │
                   ▼           ▼
            ┌──────────────────────┐
            │     Volunteer        │
            │   (志愿填报表)        │◄────┐
            └──────────────────────┘     │
                       │                 │
                       │                 │
                       ▼                 │
                ┌──────────────┐         │
                │    Major     │─────────┘
                │  (专业表)     │
                └──────────────┘
```

### 9.2 Postman测试集合
可以导入以下环境变量到Postman:
```json
{
  "name": "志愿填报系统",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api",
      "enabled": true
    },
    {
      "key": "token",
      "value": "",
      "enabled": true
    }
  ]
}
```

### 9.3 常见场景示例

#### 场景1: 完整的用户注册登录流程
```bash
# 1. 发送验证码
curl -X POST http://localhost:3000/api/user/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","type":"register"}'

# 2. 用户注册
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username":"zhangsan",
    "password":"123456",
    "nickname":"张三",
    "phone":"13800138000"
  }'

# 3. 用户登录
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"zhangsan","password":"123456"}'

# 4. 获取用户信息(使用返回的token)
curl -X GET http://localhost:3000/api/user/info \
  -H "Authorization: Bearer <token>"
```

#### 场景2: 搜索院校并查看详情
```bash
# 1. 搜索北京的985院校
curl -X GET "http://localhost:3000/api/college/list?province=北京市&level=985&pageNum=1&pageSize=10"

# 2. 查看院校详情
curl -X GET http://localhost:3000/api/college/<collegeId>

# 3. 查看历年分数线
curl -X GET "http://localhost:3000/api/college/<collegeId>/scores?province=浙江省&subjectType=physics&years=3"

# 4. 查看招生计划
curl -X GET "http://localhost:3000/api/college/<collegeId>/plan?year=2024&province=浙江省"
```

#### 场景3: 智能推荐并填报志愿
```bash
# 1. 获取智能推荐
curl -X POST http://localhost:3000/api/volunteer/recommend \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "score":650,
    "province":"浙江省",
    "subjectType":"physics",
    "rank":5000,
    "count":30
  }'

# 2. 保存志愿草稿
curl -X POST http://localhost:3000/api/volunteer/save \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteers":[
      {
        "priority":1,
        "collegeId":"<collegeId>",
        "majorId":"<majorId>",
        "isObeyAdjustment":true,
        "remarks":"冲刺院校"
      }
    ]
  }'

# 3. 分析录取概率
curl -X POST http://localhost:3000/api/volunteer/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteers":[
      {"collegeId":"<collegeId>","majorId":"<majorId>"}
    ],
    "userScore":650,
    "userRank":5000,
    "province":"浙江省",
    "subjectType":"physics"
  }'

# 4. 正式提交志愿
curl -X POST http://localhost:3000/api/volunteer/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteers":[...]
  }'
```

### 9.4 开发环境配置

#### 环境变量 (.env)
```bash
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=volunteer_system

# JWT配置
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# 短信服务配置(可选)
SMS_APP_ID=your_sms_app_id
SMS_APP_KEY=your_sms_app_key

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs
```

### 9.5 数据库初始化
```bash
# 1. 创建数据库
mysql -u root -p -e "CREATE DATABASE volunteer_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 导入初始化脚本
mysql -u root -p volunteer_system < database/init.sql

# 3. 启动应用(TypeORM会自动同步表结构)
npm run dev
```

### 9.6 技术支持
- **文档地址**: [项目README.md](README.md)
- **快速开始**: [QUICK_START.md](QUICK_START.md)
- **API测试**: [API_TEST.md](API_TEST.md)
- **GitHub**: (项目仓库地址)
- **联系邮箱**: support@example.com

---

**文档版本**: v1.0.0
**最后更新**: 2024-06-25
**维护者**: 开发团队

---

**说明**: 本文档基于实际代码库自动生成,涵盖所有27个API端点的完整说明。如有疑问,请参考源代码或联系技术支持。
