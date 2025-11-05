# 招生计划搜索API修复总结

**修复日期**: 2025-01-05  
**修复文件**: `src/controllers/enrollmentPlanSearch.controller.ts`

---

## 🐛 发现的问题

### 1. 缺少通用关键词参数
**问题**: 没有通用的 `keyword` 参数，用户需要分别使用 `collegeName` 和 `majorName`
**影响**: 搜索体验差，前端需要判断搜索类型

### 2. 参数语义不清
**问题**: 
- `province` 参数含义模糊（生源地 vs 院校所在地）
- 缺少 `collegeProvince` 参数区分院校所在省份

**影响**: 无法正确筛选院校所在地

### 3. 参数冲突处理不当
**问题**: 当 `keyword` 和 `collegeName`/`majorName` 同时存在时，逻辑混乱

---

## ✅ 修复内容

### 1. 新增 `keyword` 通用搜索参数

```typescript
// 通用关键词搜索（同时搜索院校名、专业名、专业组名）
if (keyword) {
  queryBuilder.andWhere(
    '(ep.collegeName LIKE :keyword OR ep.majorName LIKE :keyword OR ep.majorGroupName LIKE :keyword)',
    { keyword: `%${keyword}%` }
  );
}
```

**特点**:
- 同时搜索院校名、专业名、专业组名
- 使用 OR 逻辑，匹配任一即可
- 模糊匹配，支持部分关键词

### 2. 明确省份参数语义

```typescript
// 生源地省份（考生所在省份）
if (province) {
  queryBuilder.andWhere('ep.sourceProvince = :province', { province });
}

// 院校所在省份
if (collegeProvince) {
  queryBuilder.andWhere('ep.collegeProvince = :collegeProvince', { collegeProvince });
}
```

**区分**:
- `province`: 生源地省份（考生在哪个省参加高考，如"江苏"）
- `collegeProvince`: 院校所在省份（学校在哪个省，如"北京"）

### 3. 优化参数优先级

```typescript
// 院校名称精确搜索（仅在没有keyword时使用）
if (collegeName && !keyword) {
  queryBuilder.andWhere('ep.collegeName LIKE :collegeName', {
    collegeName: `%${collegeName}%`
  });
}

// 专业名称精确搜索（仅在没有keyword时使用）
if (majorName && !keyword) {
  queryBuilder.andWhere('ep.majorName LIKE :majorName', {
    majorName: `%${majorName}%`
  });
}
```

**逻辑**:
- `keyword` 优先级最高
- 当有 `keyword` 时，忽略 `collegeName` 和 `majorName`
- 避免参数冲突导致的搜索结果为空

---

## 📖 API使用指南

### ✅ 推荐用法

#### 1. 通用搜索（推荐）
```bash
# 搜索河海大学
GET /api/enrollment-plan/search?keyword=河海大学&year=2025&province=江苏

# 搜索计算机相关专业
GET /api/enrollment-plan/search?keyword=计算机&year=2025&province=江苏

# 搜索数学类专业组
GET /api/enrollment-plan/search?keyword=数学类&year=2025&province=江苏
```

#### 2. 组合筛选
```bash
# 江苏省的985/211院校
GET /api/enrollment-plan/search?year=2025&province=江苏&collegeLevel=985,211

# 北京地区的计算机专业
GET /api/enrollment-plan/search?keyword=计算机&year=2025&province=江苏&collegeProvince=北京

# 物理类的985院校
GET /api/enrollment-plan/search?year=2025&province=江苏&collegeLevel=985&subjectType=物理类
```

### ❌ 错误用法

```bash
# ❌ 错误1：majorName填院校名
GET /api/enrollment-plan/search?collegeName=河海大学&majorName=河海大学
# ✅ 正确：使用keyword
GET /api/enrollment-plan/search?keyword=河海大学

# ❌ 错误2：同时使用keyword和collegeName
GET /api/enrollment-plan/search?keyword=河海&collegeName=河海大学
# ✅ 正确：只使用keyword
GET /api/enrollment-plan/search?keyword=河海

# ❌ 错误3：省份参数混淆
GET /api/enrollment-plan/search?province=北京  # 想搜索北京的学校
# ✅ 正确：使用collegeProvince
GET /api/enrollment-plan/search?province=江苏&collegeProvince=北京
```

---

## 🔍 参数完整说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `keyword` | string | 否 | **通用关键词**（同时搜索院校/专业/专业组）⭐ | 河海大学、计算机、数学类 |
| `year` | number | 是 | 招生年份 | 2025 |
| `province` | string | 推荐 | **生源地省份**（考生所在省） | 江苏、浙江、上海 |
| `collegeProvince` | string | 否 | 院校所在省份 | 北京、上海 |
| `subjectType` | string | 否 | 科类 | 物理类、历史类 |
| `collegeLevel` | string | 否 | 院校层次（逗号分隔） | 985,211 |
| `collegeName` | string | 否 | 院校名称（不建议与keyword同时用） | 河海大学 |
| `majorName` | string | 否 | 专业名称（不建议与keyword同时用） | 计算机科学与技术 |
| `city` | string | 否 | 院校所在城市 | 南京、北京 |
| `page` | number | 否 | 页码 | 1 |
| `pageSize` | number | 否 | 每页数量 | 20 |

---

## 🎯 搜索逻辑流程

```
1. 必选条件：year（招生年份）

2. 核心搜索（三选一）：
   ├─ keyword（推荐）    → 搜索院校名/专业名/专业组名
   ├─ collegeName        → 精确搜索院校
   └─ majorName          → 精确搜索专业

3. 省份筛选（可选）：
   ├─ province          → 筛选生源地（考生所在省）
   └─ collegeProvince   → 筛选院校所在省

4. 其他筛选（可选）：
   ├─ subjectType       → 科类筛选
   ├─ collegeLevel      → 院校层次筛选（支持多选）
   └─ city              → 城市筛选
```

---

## 🧪 测试案例

### 测试1：搜索河海大学
```bash
curl "http://localhost:11452/api/enrollment-plan/search?keyword=河海大学&year=2025&province=江苏&page=1"
```
**预期**: 返回河海大学在江苏的所有招生计划

### 测试2：搜索985/211院校
```bash
curl "http://localhost:11452/api/enrollment-plan/search?year=2025&province=江苏&collegeLevel=985,211&page=1"
```
**预期**: 返回所有985或211院校在江苏的招生计划

### 测试3：搜索北京地区的学校
```bash
curl "http://localhost:11452/api/enrollment-plan/search?year=2025&province=江苏&collegeProvince=北京&page=1"
```
**预期**: 返回北京的学校在江苏的招生计划

### 测试4：搜索计算机专业
```bash
curl "http://localhost:11452/api/enrollment-plan/search?keyword=计算机&year=2025&province=江苏&page=1"
```
**预期**: 返回所有包含"计算机"的院校/专业/专业组

---

## 📝 前端集成建议

### 1. 搜索框实现
```typescript
// 统一使用keyword参数
const searchEnrollmentPlans = async (searchText: string) => {
  const params = {
    keyword: searchText,  // 用户输入的任何文本
    year: 2025,
    province: userProvince,  // 用户所在省份
    page: 1,
    pageSize: 20
  };
  
  const response = await api.get('/enrollment-plan/search', { params });
  return response.data;
};
```

### 2. 高级筛选
```typescript
const advancedSearch = async (filters: SearchFilters) => {
  const params = {
    keyword: filters.keyword,
    year: filters.year || 2025,
    province: filters.province,          // 生源地
    collegeProvince: filters.collegeProvince,  // 院校所在地
    collegeLevel: filters.collegeLevels?.join(','),  // ['985','211']
    subjectType: filters.subjectType,
    page: filters.page || 1
  };
  
  const response = await api.get('/enrollment-plan/search', { params });
  return response.data;
};
```

### 3. UI建议
```
┌─────────────────────────────────┐
│ 搜索框: [河海大学____________]  │  ← 使用 keyword 参数
├─────────────────────────────────┤
│ 筛选条件:                        │
│ □ 985  □ 211  □ 双一流          │  ← collegeLevel
│ 科类: [物理类 ▾]                │  ← subjectType  
│ 院校所在地: [北京 ▾]            │  ← collegeProvince
└─────────────────────────────────┘
```

---

## ✅ 修复验证清单

- [x] 添加 `keyword` 通用搜索参数
- [x] 区分 `province` 和 `collegeProvince`
- [x] 优化参数优先级逻辑
- [x] 更新API文档
- [x] 代码编译通过
- [ ] 单元测试（待补充）
- [ ] 集成测试（待前端验证）

---

**修复完成！** 🎉

现在API支持更灵活、更精确的搜索功能。
