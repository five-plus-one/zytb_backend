# 专业系统 API 文档

## 概述

专业系统提供完整的专业信息管理和智能匹配功能，包括：
- 专业基本信息管理（学科、门类、课程、就业方向等）
- 基于嵌入向量的智能专业匹配
- 专业与优势院校关联
- Excel 批量导入导出

## 数据模型

### Major（专业）

```typescript
{
  id: string;                      // UUID
  code?: string;                   // 专业代码（6位，可选，如有则唯一）
  name: string;                    // 专业名称（必填）
  discipline?: string;             // 学科（工学、理学、文学等）
  category: string;                // 门类（计算机类、电子信息类等，必填）
  subCategory?: string;            // 子类
  requiredSubjects?: string[];     // 匹配学科（高中选考要求）
  degree: string;                  // 学位（工学学士等）
  degreeType?: string;             // 学位类型
  years: number;                   // 学制
  description?: string;            // 专业描述
  trainingObjective?: string;      // 培养对象
  isHot: boolean;                  // 是否热门
  tags?: string[];                 // 标签
  avgSalary?: number;              // 平均薪资
  employmentRate?: number;         // 就业率
  courses?: string[];              // 主修课程
  skills?: string[];               // 技能要求
  career?: string;                 // 职业及发展方向
  careerFields?: string[];         // 职业领域
  salaryTrend?: any;               // 薪资趋势
  embeddingVector?: number[];      // 嵌入向量（用于匹配）
  embeddingText?: string;          // 嵌入文本
  advantageColleges?: College[];   // 优势院校
  createdAt: Date;
  updatedAt: Date;
}
```

**必填字段说明**
- `name`: 专业名称（必填）
- `category`: 门类（必填）
- 其他字段均为可选

## API 端点

### 1. 获取专业列表

**请求**
```http
GET /api/majors/list?pageNum=1&pageSize=20
```

**查询参数**
- `pageNum`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20）
- `keyword`: 关键字搜索（专业名称）
- `discipline`: 学科筛选
- `category`: 门类筛选
- `subCategory`: 子类筛选
- `degree`: 学位筛选
- `hot`: 是否热门（true/false）
- `sortField`: 排序字段（默认 name）
- `sortOrder`: 排序方向（asc/desc）

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "code": "080901",
        "name": "计算机科学与技术",
        "discipline": "工学",
        "category": "计算机类",
        "degree": "工学学士",
        "years": 4,
        "isHot": true,
        "avgSalary": 12000,
        "employmentRate": 95.5,
        "requiredSubjects": ["物理", "数学"],
        "courses": ["程序设计基础", "数据结构", "操作系统"],
        "careerFields": ["软件开发", "人工智能", "大数据"]
      }
    ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 2. 获取专业详情

**请求**
```http
GET /api/majors/:id
```

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "uuid",
    "code": "080901",
    "name": "计算机科学与技术",
    "discipline": "工学",
    "category": "计算机类",
    "trainingObjective": "本专业培养具有良好科学素养...",
    "courses": ["程序设计基础", "数据结构", "计算机组成原理"],
    "career": "可从事软件开发工程师、系统架构师...",
    "advantageColleges": [],
    "topColleges": [],
    "relatedMajors": []
  }
}
```

### 3. 获取专业优势院校

**请求**
```http
GET /api/majors/:id/colleges?pageNum=1&pageSize=10
```

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "majorId": "uuid",
    "majorName": "计算机科学与技术",
    "list": [
      {
        "id": "uuid",
        "name": "清华大学",
        "province": "北京市",
        "is985": true,
        "is211": true
      }
    ],
    "total": 5,
    "pageNum": 1,
    "pageSize": 10
  }
}
```

### 4. 生成专业嵌入向量

**请求**
```http
POST /api/majors/:id/embedding
```

**说明**
为指定专业生成用于匹配的嵌入向量。需要配置 OpenAI API Key。

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "嵌入向量生成成功"
  }
}
```

### 5. 批量生成所有专业嵌入向量

**请求**
```http
POST /api/majors/embeddings/generate-all
```

**说明**
异步任务，为所有专业生成嵌入向量。

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "嵌入向量生成任务已启动"
  }
}
```

### 6. 计算指定专业匹配度

**请求**
```http
POST /api/majors/match/:majorId
Content-Type: application/json

{
  "interests": ["编程", "算法", "人工智能"],
  "careerGoals": ["软件工程师", "算法工程师"],
  "skills": ["逻辑思维", "数学", "英语"],
  "subjects": ["物理", "数学"],
  "industryPreferences": ["互联网", "科技"]
}
```

**参数说明**
- `interests`: 兴趣爱好
- `careerGoals`: 职业目标
- `skills`: 技能特长
- `subjects`: 擅长学科
- `industryPreferences`: 行业偏好

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "major": {
      "id": "uuid",
      "name": "计算机科学与技术",
      "code": "080901",
      "discipline": "工学",
      "category": "计算机类",
      "advantageColleges": []
    },
    "matchScore": 87,
    "matchLevel": "非常匹配"
  }
}
```

**匹配等级**
- `非常匹配`: 80-100分
- `较为匹配`: 60-79分
- `一般匹配`: 40-59分
- `匹配度较低`: 0-39分

### 7. 获取所有专业匹配度排名

**请求**
```http
POST /api/majors/match/ranking?pageNum=1&pageSize=20
Content-Type: application/json

{
  "interests": ["编程", "算法", "人工智能"],
  "careerGoals": ["软件工程师"],
  "skills": ["逻辑思维", "数学"],
  "subjects": ["物理", "数学"],
  "industryPreferences": ["互联网"]
}
```

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "major": {
          "id": "uuid",
          "name": "计算机科学与技术",
          "code": "080901"
        },
        "matchScore": 87,
        "matchLevel": "非常匹配"
      },
      {
        "major": {
          "id": "uuid",
          "name": "软件工程",
          "code": "080902"
        },
        "matchScore": 85,
        "matchLevel": "非常匹配"
      }
    ],
    "total": 100,
    "pageNum": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 8. 添加专业优势院校

**请求**
```http
POST /api/majors/:id/advantage-colleges
Content-Type: application/json

{
  "collegeIds": ["uuid1", "uuid2", "uuid3"]
}
```

**响应**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "优势院校添加成功"
  }
}
```

## Excel 导入导出

### 生成专业 Excel 模板

```bash
npm run create-major-sample
```

生成的模板位于 `data/sample_majors.xlsx`，包含以下字段：

| 字段名 | 说明 | 示例 |
|--------|------|------|
| 专业代码 | 6位专业代码，选填，如有则需唯一 | 080901 |
| 专业名称 | 专业名称，必填 | 计算机科学与技术 |
| 学科 | 所属学科门类 | 工学、理学、文学等 |
| 门类 | 专业门类，必填 | 计算机类、电子信息类等 |
| 子类 | 专业子类，选填 | |
| 匹配学科 | 高中选考要求，用逗号分隔 | 物理,数学 |
| 学位 | 学位名称 | 工学学士 |
| 学位类型 | 学位类型 | 工学 |
| 学制 | 学习年限，数字 | 4 |
| 培养对象 | 培养目标描述 | 培养具有...的专门人才 |
| 主修课程 | 主要课程，用逗号分隔 | 程序设计,数据结构,操作系统 |
| 是否热门 | "是"或"否" | 是 |
| 标签 | 专业特点标签，用逗号分隔 | IT行业,高薪,技术密集 |
| 平均薪资 | 毕业生平均月薪，数字(元) | 12000 |
| 就业率 | 就业率百分比，数字 | 95.5 |
| 职业方向 | 职业发展方向描述 | 可从事软件开发工程师... |
| 职业领域 | 就业领域，用逗号分隔 | 软件开发,人工智能,大数据 |
| 技能要求 | 所需技能，用逗号分隔 | 编程能力,算法设计,系统分析 |
| 优势院校 | 该专业优势院校，用逗号分隔 | 清华大学,北京大学,浙江大学 |

### 导入专业数据

```bash
npm run import-majors ./data/majors.xlsx
```

导入功能说明：
- 优先根据专业代码判断是新增还是更新，如无代码则按名称判断
- 如果没有专业代码，可以只填写专业名称和门类
- 自动关联优势院校（需要先导入院校数据）
- 支持数组字段（用逗号或顿号分隔）
- 自动类型转换（数字、布尔值、百分比）

## 配置说明

### 环境变量

在 `.env` 文件中配置：

```env
# OpenAI API 配置（用于嵌入向量生成）
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_URL=https://api.openai.com/v1/embeddings
EMBEDDING_MODEL=text-embedding-ada-002
```

### 嵌入向量说明

1. **什么是嵌入向量？**
   - 嵌入向量是将文本转换为数字向量的技术
   - 用于计算专业与用户偏好的语义相似度
   - 支持更智能、更准确的专业推荐

2. **如何使用？**
   - 首先导入专业数据
   - 配置 OpenAI API Key
   - 调用批量生成接口生成嵌入向量
   - 使用匹配接口计算匹配度

3. **不配置可以吗？**
   - 可以，但无法使用智能匹配功能
   - 基本的专业查询功能不受影响

## 完整使用流程

### 1. 准备数据

```bash
# 生成专业 Excel 模板
npm run create-major-sample

# 编辑 data/sample_majors.xlsx，填入专业数据
```

### 2. 导入数据

```bash
# 导入院校数据（如果还没导入）
npm run import-colleges ./data/colleges.xlsx

# 导入专业数据
npm run import-majors ./data/majors.xlsx
```

### 3. 生成嵌入向量（可选）

```bash
# 配置 .env 文件中的 OPENAI_API_KEY

# 调用 API 生成嵌入向量
curl -X POST http://localhost:3000/api/majors/embeddings/generate-all
```

### 4. 使用匹配功能

```bash
# 计算专业匹配度
curl -X POST http://localhost:3000/api/majors/match/ranking \
  -H "Content-Type: application/json" \
  -d '{
    "interests": ["编程", "算法"],
    "careerGoals": ["软件工程师"],
    "skills": ["逻辑思维", "数学"],
    "subjects": ["物理", "数学"],
    "industryPreferences": ["互联网"]
  }'
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 专业不存在 |
| 500 | 服务器内部错误 |

## 注意事项

1. **专业代码可选**：专业代码为可选字段，如果填写则必须唯一；没有代码时系统会按专业名称判断是否重复
2. **必填字段**：只有专业名称和门类是必填的，其他字段都是可选的
3. **优势院校关联**：需要先导入院校数据，才能正确关联优势院校
4. **嵌入向量生成**：需要配置 OpenAI API，且会产生 API 调用费用
5. **匹配度计算**：首次使用匹配功能前，需要先生成嵌入向量
6. **数据格式**：Excel 中的数组字段使用逗号或顿号分隔

## 技术支持

如有问题，请查看：
- 项目 README
- API 综合文档
- 错误日志 logs/
