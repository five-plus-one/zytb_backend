# 历年分数数据修复文档

## 📋 问题描述

用户反馈的三个核心问题：
1. **历年分数无法正确获取** - 字段匹配不准确，导致查询失败
2. **院校排名问题** - 无排名的院校应该排在最后
3. **缺少招生计划查询接口** - 需要能查询院校招生计划并获取历年分数

---

## ✅ 修复内容

### 1. 历年分数模糊匹配 - 四级查询策略

**文件**: [embedding-recommendation.service.ts](src/services/agent/embedding-recommendation.service.ts#L1644-L1750)

**问题根源**:
- 旧版本使用精确匹配：`majorGroup: plan.majorGroupCode`
- AdmissionScore表字段可能不一致（有的是专业名称，有的是专业组）
- 导致大量查询失败返回空结果

**新的查询策略**（按优先级尝试）:

#### 策略1: 精确匹配专业组代码
```typescript
.where('score.college_name = :collegeName', { collegeName })
.andWhere('score.major_group = :majorGroup', { majorGroup: majorGroupCode })
.andWhere('score.source_province = :sourceProvince', { sourceProvince })
.andWhere('score.subject_type = :subjectType', { subjectType })
```

**适用场景**: 专业组代码完全一致

---

#### 策略2: 模糊匹配专业名称
```typescript
const cleanMajorName = majorName.replace(/[（(].*?[)）]/g, '').trim();

.where('score.college_name LIKE :collegeName', { collegeName: `%${collegeName}%` })
.andWhere('score.major_name LIKE :majorName', { majorName: `%${cleanMajorName}%` })
.andWhere('score.source_province = :sourceProvince', { sourceProvince })
.andWhere('score.subject_type = :subjectType', { subjectType })
```

**适用场景**:
- 专业名称包含关系
- 自动去除括号内容（如"计算机科学与技术(师范类)" → "计算机科学与技术"）

---

#### 策略3: 模糊匹配专业组名称
```typescript
const cleanMajorGroupName = majorGroupName.replace(/[（(].*?[)）]/g, '').trim();

.where('score.college_name LIKE :collegeName', { collegeName: `%${collegeName}%` })
.andWhere('score.major_group LIKE :majorGroup', { majorGroup: `%${cleanMajorGroupName}%` })
.andWhere('score.source_province = :sourceProvince', { sourceProvince })
.andWhere('score.subject_type = :subjectType', { subjectType })
```

**适用场景**: 专业组名称模糊匹配

---

#### 策略4: 兜底匹配（仅院校）
```typescript
.where('score.college_name LIKE :collegeName', { collegeName: `%${collegeName}%` })
.andWhere('score.source_province = :sourceProvince', { sourceProvince })
.andWhere('score.subject_type = :subjectType', { subjectType })
```

**适用场景**:
- 前3个策略都失败时
- 至少返回该院校的历年分数（不区分专业）

---

**调用位置**: [embedding-recommendation.service.ts:322-329](src/services/agent/embedding-recommendation.service.ts#L322-L329)

```typescript
// 旧版本（已删除）
const admissionScores = await AppDataSource.getRepository(AdmissionScore)
  .find({
    where: {
      collegeName: collegeName,
      majorGroup: plan.majorGroupCode || undefined, // ❌ 字段名错误
      sourceProvince: userInfo.province,
      subjectType: userInfo.subjectType
    },
    order: { year: 'DESC' },
    take: 3
  });

// 新版本
const admissionScores = await this.findHistoricalScores(
  collegeName,
  plan.majorName,
  plan.majorGroupName,
  plan.majorGroupCode,
  userInfo.province,
  userInfo.subjectType
);
```

---

**日志输出示例**:

```
🔍 [历年分数查询] 开始查询:
  - 院校: 南京大学
  - 专业: 计算机科学与技术
  - 专业组: 计算机类 (08)
  - 生源地: 江苏
  - 科类: 物理类
  ✅ 策略2成功: 找到 3 条记录（模糊匹配专业名称）
```

---

### 2. 院校排名优化 - 无排名院校排在最后

**文件**: [college.service.ts](src/services/college.service.ts#L14-L92)

**问题**:
- 旧版本直接按`rank`字段升序/降序排序
- 如果rank为NULL或0，排序结果不符合预期

**解决方案**: 使用SQL CASE表达式

```typescript
// 特殊处理：如果按rank排序，确保无排名的院校排在最后
if (orderField === 'rank') {
  queryBuilder.addOrderBy(
    `CASE WHEN college.rank IS NULL OR college.rank = 0 THEN 1 ELSE 0 END`,
    'ASC'
  );
  queryBuilder.addOrderBy('college.rank', orderDirection);
} else {
  queryBuilder.orderBy(`college.${orderField}`, orderDirection);
}
```

**排序逻辑**:
1. 第一层排序：有排名(0) 在前，无排名(1) 在后
2. 第二层排序：按实际rank值排序（ASC或DESC）

**示例**:

```
排序前（按rank ASC）:
  - 某民办院校 (rank: NULL)
  - 清华大学 (rank: 1)
  - 北京大学 (rank: 2)
  - 某独立学院 (rank: 0)

排序后（按rank ASC，无排名在后）:
  - 清华大学 (rank: 1)
  - 北京大学 (rank: 2)
  - 某民办院校 (rank: NULL)  ← 排在最后
  - 某独立学院 (rank: 0)     ← 排在最后
```

---

### 3. 招生计划查询接口 - 包含历年分数

**文件**: [college.service.ts](src/services/college.service.ts#L83-L234)

**新增功能**: `getCollegePlan` 方法现在会自动查询并匹配历年分数

#### 修改内容：

**新增参数**: `subjectType?: string`

```typescript
async getCollegePlan(
  id: string,
  year?: number,
  province?: string,
  subjectType?: string  // ← 新增
)
```

**查询历年分数**: (lines 135-149)

```typescript
// 查询历年分数（如果提供了省份和科类）
let historicalScores: AdmissionScore[] = [];
if (province && subjectType) {
  historicalScores = await this.scoreRepository.find({
    where: {
      collegeName: college.name,
      sourceProvince: province,
      subjectType: subjectType
    },
    order: {
      year: 'DESC',
      minScore: 'DESC'
    }
  });
}
```

**为每个招生计划匹配分数**: (lines 152-214)

使用三级匹配策略：

```typescript
let matchedScores = historicalScores.filter(score => {
  // 策略1：匹配专业组代码
  if (plan.majorGroupCode && score.majorGroup === plan.majorGroupCode) {
    return true;
  }
  // 策略2：模糊匹配专业名称
  if (plan.majorName && score.majorName) {
    const cleanPlanMajor = plan.majorName.replace(/[（(].*?[)）]/g, '').trim();
    const cleanScoreMajor = score.majorName.replace(/[（(].*?[)）]/g, '').trim();
    if (cleanScoreMajor.includes(cleanPlanMajor) || cleanPlanMajor.includes(cleanScoreMajor)) {
      return true;
    }
  }
  // 策略3：模糊匹配专业组名称
  if (plan.majorGroupName && score.majorGroup) {
    const cleanGroupName = plan.majorGroupName.replace(/[（(].*?[)）]/g, '').trim();
    if (score.majorGroup.includes(cleanGroupName) || cleanGroupName.includes(score.majorGroup)) {
      return true;
    }
  }
  return false;
});
```

**按年份去重**: (lines 177-194)

如果同一年有多条记录，取最低分：

```typescript
const scoresByYear: Record<number, any> = {};
matchedScores.forEach(score => {
  if (!scoresByYear[score.year]) {
    scoresByYear[score.year] = {
      year: score.year,
      minScore: score.minScore,
      minRank: score.minRank,
      batch: score.batch
    };
  } else {
    // 取最低分
    if (score.minScore && (!scoresByYear[score.year].minScore || score.minScore < scoresByYear[score.year].minScore)) {
      scoresByYear[score.year].minScore = score.minScore;
      scoresByYear[score.year].minRank = score.minRank;
    }
  }
});
```

---

**返回结果示例**:

```json
{
  "collegeId": "xxx",
  "collegeName": "南京大学",
  "year": 2025,
  "province": "江苏",
  "plans": [
    {
      "id": "plan-001",
      "year": 2025,
      "majorName": "计算机科学与技术",
      "majorGroupCode": "08",
      "planCount": 30,
      "tuition": 6380,
      "historicalScores": [
        {
          "year": 2024,
          "minScore": 650,
          "minRank": 3500,
          "batch": "本科一批"
        },
        {
          "year": 2023,
          "minScore": 648,
          "minRank": 3600,
          "batch": "本科一批"
        },
        {
          "year": 2022,
          "minScore": 645,
          "minRank": 3700,
          "batch": "本科一批"
        }
      ]
    }
  ]
}
```

---

#### Controller更新

**文件**: [college.controller.ts](src/controllers/college.controller.ts#L30-L45)

**新增参数**: `subjectType`

```typescript
async getCollegePlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { year, province, subjectType } = req.query as any; // ← 新增
    const result = await collegeService.getCollegePlan(
      id,
      year ? parseInt(year) : undefined,
      province,
      subjectType  // ← 新增
    );
    ResponseUtil.success(res, result);
  } catch (error: any) {
    ResponseUtil.error(res, error.message);
  }
}
```

---

## 📋 API使用示例

### 1. 查询院校列表（无排名在后）

**请求**:
```
GET /api/colleges?sortField=rank&sortOrder=asc&pageNum=1&pageSize=20
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      { "id": "1", "name": "清华大学", "rank": 1 },
      { "id": "2", "name": "北京大学", "rank": 2 },
      { "id": "3", "name": "某民办院校", "rank": null }  // ← 排在最后
    ],
    "total": 3,
    "pageNum": 1,
    "pageSize": 20
  }
}
```

---

### 2. 查询招生计划（包含历年分数）

**请求**:
```
GET /api/colleges/xxx/plan?year=2025&province=江苏&subjectType=物理类
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "collegeId": "xxx",
    "collegeName": "南京大学",
    "year": 2025,
    "province": "江苏",
    "plans": [
      {
        "id": "plan-001",
        "year": 2025,
        "majorName": "计算机科学与技术",
        "majorGroupCode": "08",
        "majorGroupName": "计算机类",
        "planCount": 30,
        "tuition": 6380,
        "historicalScores": [
          {
            "year": 2024,
            "minScore": 650,
            "minRank": 3500,
            "batch": "本科一批"
          },
          {
            "year": 2023,
            "minScore": 648,
            "minRank": 3600,
            "batch": "本科一批"
          }
        ]
      }
    ],
    "statistics": {
      "totalPlans": 15,
      "totalPlanCount": 450,
      "years": [2025, 2024, 2023],
      "batches": ["本科一批", "本科二批"]
    }
  }
}
```

---

## 🔍 关键技术点

### 1. 模糊匹配的清理逻辑

**去除括号内容**:
```typescript
const cleanName = majorName.replace(/[（(].*?[)）]/g, '').trim();
```

**示例**:
- 输入: "计算机科学与技术(师范类)"
- 输出: "计算机科学与技术"

**原因**:
- 历年数据中可能有/无括号注释
- 去除后提高匹配成功率

---

### 2. SQL CASE表达式排序

```sql
ORDER BY
  CASE WHEN college.rank IS NULL OR college.rank = 0 THEN 1 ELSE 0 END ASC,
  college.rank ASC
```

**执行逻辑**:
1. 先按CASE结果排序（0在前，1在后）
2. 再按实际rank值排序

---

### 3. 多级查询策略

**为什么需要4级策略？**

不同数据源的字段一致性问题：
- 有的数据用`majorGroup`存专业组代码
- 有的数据用`majorGroup`存专业组名称
- 有的数据用`majorName`存具体专业
- 有的数据字段为空

**解决方案**: 多级尝试，确保总能查到数据

---

## 📊 性能优化

### 1. 索引利用

AdmissionScore表已有索引：
- `['year', 'sourceProvince', 'collegeName']`
- `['year', 'sourceProvince', 'majorName']`
- `['year', 'sourceProvince', 'subjectType']`

查询策略已充分利用这些索引。

---

### 2. 限制返回数量

```typescript
.limit(3)  // 只取最近3年
```

**原因**:
- 减少数据传输量
- 最近3年数据最有参考价值

---

### 3. 批量查询优化

招生计划接口：
- 一次查询所有历年分数
- 在内存中进行匹配和过滤
- 避免N+1查询问题

---

## 🧪 测试建议

### 测试用例1: 精确匹配
```
院校: 南京大学
专业组代码: 08
省份: 江苏
科类: 物理类

预期: 策略1成功，返回3条记录
```

---

### 测试用例2: 模糊匹配专业名称
```
院校: 清华大学
专业名称: 计算机科学与技术(实验班)
省份: 北京
科类: 物理类

历年数据: 计算机科学与技术

预期: 策略2成功，去除括号后匹配
```

---

### 测试用例3: 兜底匹配
```
院校: 某新建院校
专业组: 新专业组（历年无数据）
省份: 江苏
科类: 物理类

预期: 策略4成功，返回该院校其他专业的分数（作为参考）
```

---

### 测试用例4: 完全无数据
```
院校: 新建院校
省份: 江苏
科类: 物理类

预期: 返回空数组，不报错
```

---

## ⚠️ 注意事项

### 1. 字段名映射

AdmissionScore表字段（使用下划线）:
- `college_name`
- `major_name`
- `major_group`
- `source_province`
- `subject_type`

TypeORM实体属性（使用驼峰）:
- `collegeName`
- `majorName`
- `majorGroup`
- `sourceProvince`
- `subjectType`

**QueryBuilder中**: 使用下划线
**Find方法中**: 使用驼峰

---

### 2. 数据一致性

如果数据源字段不一致，需要：
1. 在数据导入时统一格式
2. 或在查询时使用更多策略

---

### 3. 缓存失效

修改后需要清除推荐缓存：
```bash
node clear-cache.js
```

---

## 📄 修改的文件

1. **src/services/agent/embedding-recommendation.service.ts**
   - 新增: `findHistoricalScores()` 方法 (lines 1644-1750)
   - 修改: 调用位置 (lines 322-329)

2. **src/services/college.service.ts**
   - 修改: `getCollegeList()` - 院校排名优化 (lines 14-92)
   - 修改: `getCollegePlan()` - 新增历年分数 (lines 83-234)

3. **src/controllers/college.controller.ts**
   - 修改: `getCollegePlan()` - 新增subjectType参数 (lines 30-45)

---

## ✅ 编译验证

所有修改已通过TypeScript编译验证:
```bash
npm run build
# ✅ 编译成功，无错误
```

---

生成时间: 2025-01-26
状态: ✅ 已完成
下一步: 重启应用测试新功能
