# 一分一段表 Excel 导入功能

完整的一分一段表数据导入解决方案，支持 Excel/CSV 文件批量导入。

---

## 📦 功能特性

✅ **Excel/CSV 导入** - 支持 .xlsx、.xls、.csv 格式
✅ **智能字段映射** - 支持中文/英文列名自动识别
✅ **数据验证** - 自动验证必填字段和数据格式
✅ **批量处理** - 支持大批量数据导入（每批 1000 条）
✅ **事务安全** - 导入失败自动回滚，保护已有数据
✅ **错误报告** - 详细的错误行号和错误信息
✅ **覆盖选项** - 可选择是否清空已有数据
✅ **性能优化** - 分批插入，高效处理大文件

---

## 🚀 快速开始

### 1. 生成 Excel 模板

```bash
node scripts/generate-score-ranking-template.js
```

生成的文件位于 `docs/templates/`：
- `score-ranking-template.xlsx` - 空白模板
- `score-ranking-sample.xlsx` - 示例数据

### 2. 准备数据

按照以下格式准备 Excel 文件：

| 年份 | 省份 | 科类 | 分数 | 人数 | 累计人数 | 位次 |
|------|------|------|------|------|----------|------|
| 2024 | 河南 | 物理类 | 700 | 15 | 15 | 1 |
| 2024 | 河南 | 物理类 | 699 | 28 | 43 | 16 |

**必填字段**：年份、省份、科类、分数、人数
**可选字段**：累计人数、位次

### 3. 导入数据

#### 使用 curl

```bash
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@/path/to/your-file.xlsx"
```

#### 使用 Postman

1. 创建 POST 请求：`http://localhost:3000/score-ranking/import`
2. Body → form-data
3. 添加 `file` 字段，选择 Excel 文件
4. 发送请求

---

## 📚 API 文档

### 导入接口

**端点**: `POST /score-ranking/import`

**请求参数**:
```
file: Excel 文件（必填）
clearExisting: 是否清空已有数据（可选，默认 false）
```

**成功响应**:
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

**失败响应**:
```json
{
  "code": 400,
  "message": "数据验证失败，共 3 条错误",
  "data": {
    "success": false,
    "totalRows": 1500,
    "validRows": 1497,
    "errorRows": 3,
    "errors": [
      { "row": 5, "error": "年份格式错误或超出范围" },
      { "row": 12, "error": "缺少必填字段" }
    ]
  }
}
```

### 清空数据接口

**端点**: `POST /score-ranking/clear`

**请求体**:
```json
{
  "year": 2024,          // 可选
  "province": "河南",    // 可选
  "subjectType": "物理类" // 可选
}
```

### 查询接口

详见 [完整 API 文档](./SCORE_RANKING_IMPORT_GUIDE.md)

---

## 📋 字段说明

| 字段 | 类型 | 必填 | 范围 | 说明 |
|------|------|------|------|------|
| 年份 | 整数 | ✅ | 2000-2100 | 考试年份 |
| 省份 | 字符串 | ✅ | - | 省份名称 |
| 科类 | 字符串 | ✅ | - | 如"物理类"、"历史类" |
| 分数 | 整数 | ✅ | 0-999 | 考试分数 |
| 人数 | 整数 | ✅ | ≥0 | 该分数的考生人数 |
| 累计人数 | 整数 | ❌ | ≥0 | 该分数及以上考生总数 |
| 位次 | 整数 | ❌ | ≥1 | 该分数对应位次 |

---

## 🎯 使用场景

### 场景 1: 首次导入某年数据

```bash
# 直接导入即可
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@score-ranking-2024-henan.xlsx"
```

### 场景 2: 更新已有数据

```bash
# 使用 clearExisting 参数清空后重新导入
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@score-ranking-2024-henan-updated.xlsx" \
  -F "clearExisting=true"
```

### 场景 3: 导入多个省份

```excel
年份    省份    科类      分数    人数
2024   河南    物理类    700     15
2024   河南    物理类    699     28
2024   北京    综合      690     8
2024   北京    综合      689     12
```

### 场景 4: 批量导入历年数据

```bash
# 按年份分别导入
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@score-ranking-2024.xlsx"

curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@score-ranking-2023.xlsx"

curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@score-ranking-2022.xlsx"
```

---

## 🔧 技术实现

### 核心代码文件

- **Service**: [src/services/scoreRanking.service.ts](../src/services/scoreRanking.service.ts)
  - `importFromExcel()` - Excel 解析和导入
  - `batchCreate()` - 批量创建记录
  - `clearData()` - 清空数据

- **Controller**: [src/controllers/scoreRanking.controller.ts](../src/controllers/scoreRanking.controller.ts)
  - `importFromExcel()` - 处理文件上传
  - `clearData()` - 处理清空请求

- **Routes**: [src/routes/scoreRanking.routes.ts](../src/routes/scoreRanking.routes.ts)
  - `POST /import` - 导入路由
  - `POST /clear` - 清空路由

### 技术栈

- **Excel 解析**: xlsx (^0.18.5)
- **文件上传**: multer (^1.4.5)
- **数据库**: TypeORM + MySQL
- **事务处理**: TypeORM QueryRunner

### 数据流程

```
1. 上传 Excel 文件
   ↓
2. multer 保存到临时目录
   ↓
3. xlsx 解析为 JSON
   ↓
4. 数据验证和转换
   ↓
5. 批量插入数据库（事务）
   ↓
6. 删除临时文件
   ↓
7. 返回导入结果
```

---

## ⚠️ 注意事项

### 数据准确性

- 确保累计人数随分数降低而增加
- 位次应该是连续的
- 分数范围应该合理（通常 200-750）

### 性能考虑

- 单个文件建议不超过 10 万条
- 大文件可能需要几分钟处理时间
- 系统使用批量插入优化性能

### 安全性

- 文件大小限制：50MB
- 支持的格式：.xlsx、.xls、.csv
- 使用事务保证数据一致性
- 导入失败自动回滚

---

## 📖 相关文档

- **[完整使用指南](./SCORE_RANKING_IMPORT_GUIDE.md)** - 详细的使用说明和常见问题
- **[测试指南](./SCORE_RANKING_IMPORT_TEST.md)** - API 测试方法和测试用例
- **[API 文档](./API_DOCUMENTATION.md)** - 完整的 API 接口文档

---

## 🧪 测试

### 快速测试

```bash
# 1. 生成测试数据
node scripts/generate-score-ranking-template.js

# 2. 导入示例数据
curl -X POST http://localhost:3000/score-ranking/import \
  -F "file=@docs/templates/score-ranking-sample.xlsx"

# 3. 查询验证
curl "http://localhost:3000/score-ranking/list?year=2024&province=河南"
```

### 完整测试

参见 [测试指南](./SCORE_RANKING_IMPORT_TEST.md)

---

## 🐛 故障排除

### 问题：导入失败，提示文件格式错误

**解决**：确认文件是 .xlsx、.xls 或 .csv 格式

### 问题：数据验证失败

**解决**：
1. 检查 Excel 表头是否包含必填列
2. 确认数据类型正确（年份、分数、人数为数字）
3. 验证数据范围（年份 2000-2100，分数 0-999）

### 问题：导入后查询不到数据

**解决**：
1. 确认导入响应中 `insertedRows > 0`
2. 检查查询参数是否与导入数据一致
3. 查看数据库是否正常连接

---

## 📞 支持

如有问题，请：
1. 查看 [使用指南](./SCORE_RANKING_IMPORT_GUIDE.md)
2. 查看 [测试指南](./SCORE_RANKING_IMPORT_TEST.md)
3. 提交 Issue 或联系开发团队

---

**版本**: v1.0.0
**更新时间**: 2024-10-29
**作者**: 志愿填报系统开发团队
