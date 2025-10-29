# 一分一段表 Excel 导入使用指南

本文档介绍如何使用 Excel 文件批量导入历年一分一段表数据。

---

## 📋 目录

- [Excel 模板格式](#excel-模板格式)
- [API 接口说明](#api-接口说明)
- [导入步骤](#导入步骤)
- [字段说明](#字段说明)
- [注意事项](#注意事项)
- [常见问题](#常见问题)

---

## 📊 Excel 模板格式

### 必需列（支持中文或英文列名）

| 年份 (year) | 省份 (province) | 科类 (subjectType) | 分数 (score) | 人数 (count) | 累计人数 (cumulativeCount) | 位次 (rank) |
|------------|----------------|-------------------|-------------|-------------|-------------------------|------------|
| 2024       | 河南           | 物理类             | 700         | 15          | 15                      | 1          |
| 2024       | 河南           | 物理类             | 699         | 28          | 43                      | 16         |
| 2024       | 河南           | 物理类             | 698         | 35          | 78                      | 44         |
| ...        | ...            | ...               | ...         | ...         | ...                     | ...        |

### 示例数据

```excel
年份    省份    科类      分数    人数    累计人数    位次
2024   河南    物理类    700     15      15        1
2024   河南    物理类    699     28      43        16
2024   河南    物理类    698     35      78        44
2024   河南    物理类    697     42      120       79
2024   河南    物理类    696     51      171       121
2024   河南    物理类    695     58      229       172
2024   河南    历史类    650     12      12        1
2024   河南    历史类    649     18      30        13
2024   河南    历史类    648     25      55        31
```

---

## 🔌 API 接口说明

### 1. 导入 Excel 文件

**端点**: `POST /score-ranking/import`

**请求类型**: `multipart/form-data`

**请求参数**:
- `file` (文件): Excel 文件 (.xlsx, .xls, .csv)
- `clearExisting` (可选, boolean): 是否清空同年份/省份/科类的已有数据，默认 `false`

**响应示例**:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "message": "导入成功",
    "totalRows": 1500,
    "validRows": 1500,
    "insertedRows": 1500,
    "errorRows": 0,
    "errors": []
  }
}
```

**错误响应示例**:

```json
{
  "code": 400,
  "message": "数据验证失败，共 3 条错误",
  "data": {
    "success": false,
    "message": "数据验证失败，共 3 条错误",
    "totalRows": 1500,
    "validRows": 1497,
    "errorRows": 3,
    "errors": [
      { "row": 5, "error": "年份格式错误或超出范围" },
      { "row": 12, "error": "缺少必填字段（年份、省份、科类、分数、人数）" },
      { "row": 28, "error": "分数格式错误或超出范围" }
    ]
  }
}
```

### 2. 清空数据

**端点**: `POST /score-ranking/clear`

**请求体**:
```json
{
  "year": 2024,           // 可选
  "province": "河南",     // 可选
  "subjectType": "物理类" // 可选
}
```

**注意**: 至少需要提供一个筛选条件

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": true,
    "deletedCount": 1500,
    "message": "已删除 1500 条记录"
  }
}
```

---

## 🚀 导入步骤

### 方法一：使用 Postman/Apifox

1. **准备 Excel 文件**
   - 按照模板格式准备数据
   - 保存为 `.xlsx` 或 `.xls` 格式

2. **发送请求**
   - 打开 Postman
   - 创建新请求：`POST http://localhost:3000/score-ranking/import`
   - 在 Body 标签中选择 `form-data`
   - 添加参数：
     - `file`: 选择文件类型，上传 Excel 文件
     - `clearExisting`: 输入 `true` 或 `false`（可选）
   - 点击 Send

3. **查看结果**
   - 检查响应中的 `success` 字段
   - 如果有错误，查看 `errors` 数组中的详细信息

### 方法二：使用 curl 命令

```bash
# 基本导入
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@/path/to/score-ranking-2024-henan.xlsx"

# 导入并清空已有数据
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@/path/to/score-ranking-2024-henan.xlsx" \
  -F "clearExisting=true"
```

### 方法三：使用前端页面（如果已实现）

```html
<form id="importForm" enctype="multipart/form-data">
  <input type="file" name="file" accept=".xlsx,.xls,.csv" required>
  <label>
    <input type="checkbox" name="clearExisting" value="true">
    清空已有数据
  </label>
  <button type="submit">导入</button>
</form>

<script>
document.getElementById('importForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  const response = await fetch('/score-ranking/import', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (result.data.success) {
    alert(`导入成功！共导入 ${result.data.insertedRows} 条记录`);
  } else {
    alert(`导入失败：${result.data.message}`);
    console.error(result.data.errors);
  }
});
</script>
```

---

## 📝 字段说明

| 字段名 | 中文列名 | 英文列名 | 类型 | 必填 | 说明 |
|--------|---------|---------|------|-----|------|
| 年份 | 年份 | year | 整数 | ✅ | 考试年份，范围 2000-2100 |
| 省份 | 省份 | province | 字符串 | ✅ | 省份名称，如"河南"、"北京" |
| 科类 | 科类/科目类型 | subjectType | 字符串 | ✅ | 如"物理类"、"历史类" |
| 分数 | 分数 | score | 整数 | ✅ | 考试分数，范围 0-999 |
| 人数 | 人数 | count | 整数 | ✅ | 该分数的考生人数 |
| 累计人数 | 累计人数 | cumulativeCount | 整数 | ❌ | 该分数及以上的考生总数 |
| 位次 | 位次 | rank | 整数 | ❌ | 该分数对应的位次（排名） |

**注意**:
- Excel 文件可以使用中文列名或英文列名，系统会自动识别
- `累计人数` 和 `位次` 为可选字段，但强烈建议填写
- 如果 Excel 中同时存在中文和英文列名，优先使用中文列名

---

## ⚠️ 注意事项

### 数据准备

1. **确保数据准确性**
   - 年份必须真实有效
   - 分数必须在合理范围内（0-999）
   - 人数必须大于等于 0
   - 累计人数应该随着分数降低而增加

2. **数据完整性**
   - 每个省份/科类应该有完整的分数段数据
   - 建议从最高分到最低分连续录入
   - 累计人数应该是累加的

3. **文件格式**
   - 支持 `.xlsx`, `.xls`, `.csv` 格式
   - 文件大小限制：50MB
   - 建议单个文件不超过 10 万条数据

### 导入策略

1. **首次导入**
   - 不需要设置 `clearExisting`
   - 直接上传即可

2. **更新数据**
   - 设置 `clearExisting=true` 会删除同年份/省份/科类的所有数据
   - 谨慎使用，确保新数据准备完整

3. **分批导入**
   - 可以分省份、分年份导入
   - 每次导入一个省份的一年数据
   - 便于管理和校验

### 性能优化

- 系统使用批量插入（每批 1000 条）
- 使用数据库事务保证数据一致性
- 导入失败会自动回滚
- 大文件导入可能需要几分钟，请耐心等待

---

## ❓ 常见问题

### Q1: 导入时提示"缺少必填字段"？

**A**: 检查 Excel 表头是否包含以下列：
- 年份 (或 year)
- 省份 (或 province)
- 科类 (或 subjectType)
- 分数 (或 score)
- 人数 (或 count)

### Q2: 导入时提示"年份格式错误"？

**A**: 确保年份列的值为数字，且在 2000-2100 范围内。

### Q3: 导入后如何验证数据？

**A**: 使用查询接口验证：

```bash
# 查询某年某省的数据
GET /score-ranking/list?year=2024&province=河南&subjectType=物理类

# 查询可用年份
GET /score-ranking/options/years

# 查询可用省份
GET /score-ranking/options/provinces
```

### Q4: 如何重新导入某年的数据？

**A**: 使用 `clearExisting=true` 参数：

```bash
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@score-ranking-2024.xlsx" \
  -F "clearExisting=true"
```

### Q5: 导入失败会影响已有数据吗？

**A**: 不会。系统使用数据库事务，导入失败会自动回滚，不影响已有数据。

### Q6: 可以同时导入多个省份的数据吗？

**A**: 可以。在同一个 Excel 文件中，不同行可以有不同的省份。

**示例**:
```excel
年份    省份    科类      分数    人数
2024   河南    物理类    700     15
2024   河南    物理类    699     28
2024   北京    综合      690     8
2024   北京    综合      689     12
```

### Q7: 累计人数和位次可以不填吗？

**A**: 可以不填，但强烈建议填写：
- 不填时，这两个字段将被设为 0 或 null
- 会影响位次查询功能的准确性
- 建议在 Excel 中提前计算好

### Q8: 如何批量删除某年的数据？

**A**: 使用清空接口：

```bash
curl -X POST http://localhost:3000/score-ranking/clear \
  -H "Content-Type: application/json" \
  -d '{"year": 2024}'
```

### Q9: Excel 文件太大导致上传超时？

**A**: 建议分批导入：
- 按省份分割文件
- 按年份分割文件
- 每个文件控制在 5 万条以内

### Q10: 如何获取导入模板？

**A**: 您可以：
1. 参考本文档的示例表格
2. 查看项目中的 `docs/templates/score-ranking-template.xlsx`
3. 导出现有数据作为模板参考

---

## 📞 技术支持

如遇到其他问题，请联系开发团队或提交 Issue。

**相关文档**:
- [API 文档](./API_DOCUMENTATION.md)
- [数据库设计](./DATABASE_DESIGN.md)
- [系统架构](./ARCHITECTURE.md)

---

**更新时间**: 2024-10-29
**版本**: v1.0.0
