# 一分一段表导入功能测试指南

本文档提供快速测试一分一段表导入功能的方法。

---

## 🚀 快速开始

### 1. 生成测试模板

```bash
# 生成 Excel 模板文件
node scripts/generate-score-ranking-template.js
```

这会在 `docs/templates/` 目录下生成两个文件：
- `score-ranking-template.xlsx` - 空白模板
- `score-ranking-sample.xlsx` - 包含示例数据

### 2. 启动服务器

```bash
npm run dev
```

### 3. 测试导入

#### 方法一：使用 curl

```bash
# 导入示例数据
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@docs/templates/score-ranking-sample.xlsx"

# 导入并覆盖已有数据
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@docs/templates/score-ranking-sample.xlsx" \
  -F "clearExisting=true"
```

#### 方法二：使用 Postman/Apifox

1. 创建新请求：`POST http://localhost:3000/score-ranking/import`
2. 选择 Body → form-data
3. 添加字段：
   - `file`: 选择 `docs/templates/score-ranking-sample.xlsx`
   - `clearExisting`: `false` 或 `true`
4. 发送请求

### 4. 验证导入结果

```bash
# 查询导入的数据
curl "http://localhost:3000/score-ranking/list?year=2024&province=河南&subjectType=物理类"

# 查询可用年份
curl "http://localhost:3000/score-ranking/options/years"

# 查询可用省份
curl "http://localhost:3000/score-ranking/options/provinces"

# 根据分数查询位次
curl "http://localhost:3000/score-ranking/rank-by-score?year=2024&province=河南&subjectType=物理类&score=680"
```

---

## 📝 完整 API 测试集

### 1. 导入测试

```bash
# 测试 1: 正常导入
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@docs/templates/score-ranking-sample.xlsx"

# 预期结果: 成功导入约 100 条记录
```

### 2. 查询测试

```bash
# 测试 2: 获取列表
curl "http://localhost:3000/score-ranking/list?year=2024&province=河南&pageNum=1&pageSize=10"

# 测试 3: 根据分数查询位次
curl "http://localhost:3000/score-ranking/rank-by-score?year=2024&province=河南&subjectType=物理类&score=700"

# 测试 4: 根据位次查询分数
curl "http://localhost:3000/score-ranking/score-by-rank?year=2024&province=河南&subjectType=物理类&rank=100"

# 测试 5: 获取分数段统计
curl "http://localhost:3000/score-ranking/distribution?year=2024&province=河南&subjectType=物理类"
```

### 3. 批量查询测试

```bash
# 测试 6: 批量查询多个分数的位次
curl -X POST http://localhost:3000/score-ranking/batch-rank-by-scores \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "province": "河南",
    "subjectType": "物理类",
    "scores": [700, 690, 680, 670, 660]
  }'
```

### 4. 清空数据测试

```bash
# 测试 7: 清空指定年份数据
curl -X POST http://localhost:3000/score-ranking/clear \
  -H "Content-Type: application/json" \
  -d '{"year": 2024, "province": "河南", "subjectType": "物理类"}'

# 预期结果: 返回删除的记录数
```

---

## 🧪 错误场景测试

### 测试无效数据

创建一个包含错误数据的 Excel 文件进行测试：

| 年份 | 省份 | 科类 | 分数 | 人数 |
|------|------|------|------|------|
| 1999 | 河南 | 物理类 | 700 | 15 |  ← 年份超出范围
| 2024 |      | 物理类 | 699 | 28 |  ← 缺少省份
| 2024 | 河南 | 物理类 | 1000 | 35 | ← 分数超出范围
| 2024 | 河南 | 物理类 | 698 | -10 | ← 人数为负数

预期结果：导入失败，返回错误详情

---

## ✅ 测试检查清单

- [ ] Excel 模板文件生成成功
- [ ] 示例数据导入成功
- [ ] 查询列表返回正确数据
- [ ] 根据分数查询位次正确
- [ ] 根据位次查询分数正确
- [ ] 分数段统计准确
- [ ] 批量查询功能正常
- [ ] 清空数据功能正常
- [ ] 错误数据验证生效
- [ ] 文件类型验证生效

---

## 🐛 常见问题排查

### 问题 1: 上传文件失败

**检查**:
- 确认 `uploads/score-ranking` 目录存在且有写权限
- 检查文件大小是否超过 50MB 限制
- 确认文件格式为 .xlsx、.xls 或 .csv

### 问题 2: 导入后查询不到数据

**检查**:
- 确认导入响应中 `insertedRows > 0`
- 检查数据库连接是否正常
- 验证查询参数（year、province、subjectType）是否与导入数据一致

### 问题 3: 数据验证失败

**检查**:
- Excel 表头列名是否正确
- 必填字段是否都有值
- 数据类型是否正确（年份、分数、人数都应为数字）

---

## 📊 性能测试

### 大批量数据导入测试

1. 生成 10 万条测试数据
2. 测试导入时间
3. 验证数据完整性
4. 测试查询性能

```bash
# 使用性能测试脚本（需要先创建）
node scripts/test-large-import.js
```

---

**更新时间**: 2024-10-29
**版本**: v1.0.0
