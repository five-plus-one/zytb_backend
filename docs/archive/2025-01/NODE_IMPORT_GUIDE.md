# Node.js 直接导入脚本使用指南

这是一个可以直接运行的 Node.js 导入脚本，**不需要启动服务器**，直接连接数据库导入数据。

---

## 🚀 快速使用

### 方法 1: 使用批处理脚本（最简单）

```powershell
# 追加模式（不删除已有数据）
scripts\import-excel.bat E:\5plus1\DEV\zytb\zy_backend\data\hz.xlsx

# 覆盖模式（删除同年份/省份/科类的已有数据）
scripts\import-excel.bat E:\5plus1\DEV\zytb\zy_backend\data\hz.xlsx --clear
```

### 方法 2: 拖拽文件

直接把 Excel 文件拖到 `scripts\import-excel.bat` 上即可！

### 方法 3: 直接运行 Node 脚本

```powershell
# 1. 先编译项目
npm run build

# 2. 运行导入脚本（追加模式）
node scripts/import-excel-directly.js E:\5plus1\DEV\zytb\zy_backend\data\hz.xlsx

# 3. 运行导入脚本（覆盖模式）
node scripts/import-excel-directly.js E:\5plus1\DEV\zytb\zy_backend\data\hz.xlsx --clear
```

---

## 📊 运行效果示例

```
=============================================
     一分一段表 Excel 导入工具
=============================================

📖 正在读取文件: E:\5plus1\DEV\zytb\zy_backend\data\hz.xlsx
✅ 读取成功，共 1500 行数据

🔍 正在验证数据...
✅ 数据验证通过，共 1500 条有效数据

📊 导入数据摘要:
──────────────────────────────────────────────────
年份: 2024
省份: 河南
科类: 物理类, 历史类
分数范围: 200 - 700
总记录数: 1500
──────────────────────────────────────────────────

🔌 正在连接数据库...
✅ 数据库连接成功

💾 开始批量插入数据...
  进度: 1000/1500 (67%)
  进度: 1500/1500 (100%)
✅ 成功插入 1500 条记录

============================================================
✅ 导入完成！
   总行数: 1500
   有效数据: 1500
   成功插入: 1500
============================================================
```

---

## ⚠️ 注意事项

### 1. Excel 格式要求

必须包含以下列（中文或英文列名）：

| 年份 | 省份 | 科类 | 分数 | 人数 | 累计人数 | 位次 |
|------|------|------|------|------|----------|------|
| 2024 | 河南 | 物理类 | 700 | 15 | 15 | 1 |

**必填**：年份、省份、科类、分数、人数

### 2. 参数说明

- **无参数** - 追加模式，不删除已有数据
- **--clear** - 覆盖模式，先删除同年份/省份/科类的已有数据

### 3. 数据验证规则

- 年份：2000-2100
- 分数：0-999
- 人数：≥0

### 4. 性能说明

- 使用批量插入（每批 1000 条）
- 使用数据库事务（失败自动回滚）
- 1 万条数据约需 5-10 秒

---

## 🐛 常见问题

### Q1: 提示"数据库连接失败"

**检查**：
- 数据库是否正在运行
- `src/config/database.ts` 中的数据库配置是否正确

### Q2: 提示"缺少必填字段"

**检查**：
- Excel 表头是否包含：年份、省份、科类、分数、人数
- 列名是否正确（支持中文或英文）

### Q3: 提示"数据格式错误"

**检查**：
- 年份、分数、人数是否为数字类型
- 数据是否在有效范围内

### Q4: 导入卡住不动

**原因**：数据量太大
**解决**：将 Excel 文件拆分成多个小文件，分批导入

---

## 📝 Excel 示例

您可以参考项目中的示例模板：

```powershell
# 生成模板
node scripts/generate-score-ranking-template.js

# 模板位置
docs/templates/score-ranking-template.xlsx  # 空白模板
docs/templates/score-ranking-sample.xlsx     # 示例数据
```

---

## ✅ 导入后验证

导入完成后，您可以：

### 1. 启动服务器查询

```powershell
npm run dev
```

然后访问：
```
http://localhost:11452/score-ranking/options/years
http://localhost:11452/score-ranking/options/provinces
```

### 2. 直接查询数据库

```sql
SELECT year, province, subjectType, COUNT(*) as count
FROM score_rankings
GROUP BY year, province, subjectType
ORDER BY year DESC, province, subjectType;
```

---

## 🎯 推荐工作流程

### 首次导入历年数据

```powershell
# 1. 准备数据文件
data/2024-河南-物理类.xlsx
data/2024-河南-历史类.xlsx
data/2023-河南-物理类.xlsx
...

# 2. 批量导入
scripts\import-excel.bat data\2024-河南-物理类.xlsx
scripts\import-excel.bat data\2024-河南-历史类.xlsx
scripts\import-excel.bat data\2023-河南-物理类.xlsx
```

### 更新某年数据

```powershell
# 使用 --clear 参数覆盖已有数据
scripts\import-excel.bat data\2024-河南-物理类-updated.xlsx --clear
```

---

## 📚 相关文档

- [Excel 模板格式说明](./SCORE_RANKING_IMPORT_GUIDE.md)
- [API 导入使用指南](./SCORE_RANKING_IMPORT_README.md)
- [完整功能总结](./SCORE_RANKING_IMPORT_SUMMARY.md)

---

**版本**: v1.0.0
**更新时间**: 2024-10-29
