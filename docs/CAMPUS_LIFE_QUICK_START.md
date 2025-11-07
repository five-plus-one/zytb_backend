# 校园生活数据导入 - 快速开始

## 快速5步导入数据

### 1. 安装依赖

```bash
npm install csv-parse
```

### 2. 创建数据库表

```bash
# Windows (PowerShell)
$env:PGPASSWORD="your_password"; psql -U postgres -d zytb_db -f scripts/migrations/create_campus_life_tables.sql

# Linux/Mac
PGPASSWORD=your_password psql -U postgres -d zytb_db -f scripts/migrations/create_campus_life_tables.sql
```

### 3. 准备CSV文件

将你的CSV文件放到项目目录中，例如：
```
E:\5plus1\DEV\zytb\zy_backend\data\campus_life_survey.csv
```

CSV格式要求：
- 第一行必须是列标题
- Q4列必须是学校名称
- 支持UTF-8编码（含BOM）

### 4. 配置数据库环境变量

确保 `.env` 或 `.env.production` 文件中有正确的数据库配置：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=zytb_db
```

### 5. 运行导入脚本

```bash
# 方式1: 使用 ts-node
npx ts-node scripts/import_campus_life_data.ts data/campus_life_survey.csv

# 方式2: 使用 tsx (推荐，更快)
npx tsx scripts/import_campus_life_data.ts data/campus_life_survey.csv
```

## 导入输出示例

```
============================================================
校园生活数据导入工具
============================================================
CSV文件: data/campus_life_survey.csv

[Database] 初始化数据库连接...
[Database] ✓ 数据库连接成功

[Step 1/5] 读取并解析CSV文件...
[CsvParser] 读取CSV文件: data/campus_life_survey.csv
[CsvParser] 读取到 150 条原始记录
[CsvParser] 清洗后有效记录: 145 条
✓ 读取完成: 145 条有效记录

[Step 2/5] 按学校分组...
✓ 分组完成: 45 所院校

[Step 3/5] 匹配院校到数据库...
[CollegeNameMatcher] 开始批量匹配 45 所院校
[CollegeNameMatcher] 尝试匹配: "湖南大学" -> "湖南大学"
  ✓ 精确匹配成功: 湖南大学
...
[CollegeNameMatcher] 批量匹配完成: 42/45 成功

[Step 4/5] 处理每所院校的问卷数据...

处理: 湖南大学 (3份答卷)
  ✓ 匹配成功: 湖南大学 (ID: xxx-xxx-xxx)
  → 保存原始答案...
  ✓ 保存了 3 份原始答案
  → 解析答案...
  → 聚合数据...
  → 计算评分...
  → 评分结果:
     宿舍: 4.5/5.0
     食堂: 3.5/5.0
     交通: 4.0/5.0
     学习: 3.8/5.0
     快递: 4.2/5.0
     可靠性: 70/100
  → 保存聚合数据...
  ✓ 湖南大学 处理完成

[Step 5/5] 导入完成！

============================================================
导入统计
============================================================
总记录数:        145
有效记录数:      145
匹配院校数:      42
未匹配院校数:    3
保存原始答案:    145 条
保存聚合数据:    42 条
错误数:          0
============================================================

✓ 所有数据导入成功！

[Database] 数据库连接已关闭
```

## 验证导入结果

### 查询导入的数据

```sql
-- 查看总数
SELECT COUNT(*) FROM college_campus_life;

-- 查看某个学校的数据
SELECT
  college_name,
  dorm_score,
  canteen_quality_score,
  transport_score,
  study_environment_score,
  reliability,
  answer_count
FROM college_campus_life
WHERE college_name = '湖南大学';

-- 查看评分最高的学校（按宿舍条件）
SELECT college_name, dorm_score, reliability
FROM college_campus_life
ORDER BY dorm_score DESC
LIMIT 10;

-- 查看原始答案
SELECT
  college_name,
  q1_dorm_style,
  q2_air_conditioner,
  q3_bathroom
FROM college_life_raw_answers
WHERE college_name = '湖南大学';
```

### 检查数据质量

```sql
-- 查看可靠性分布
SELECT
  CASE
    WHEN reliability >= 90 THEN '高(>=90)'
    WHEN reliability >= 70 THEN '中(70-89)'
    ELSE '低(<70)'
  END as reliability_level,
  COUNT(*) as count
FROM college_campus_life
GROUP BY reliability_level;

-- 查看答卷数量分布
SELECT
  answer_count,
  COUNT(*) as college_count
FROM college_campus_life
GROUP BY answer_count
ORDER BY answer_count DESC;
```

## 常见问题快速解决

### ❌ 错误: "CSV文件不存在"

**解决**: 检查文件路径是否正确，使用绝对路径或相对于项目根目录的路径

```bash
# 使用绝对路径
npx tsx scripts/import_campus_life_data.ts E:/5plus1/DEV/zytb/zy_backend/data/survey.csv

# 使用相对路径（从项目根目录）
npx tsx scripts/import_campus_life_data.ts data/survey.csv
```

### ❌ 错误: "数据库连接失败"

**解决**: 检查 `.env` 文件中的数据库配置

```bash
# 测试数据库连接
psql -U postgres -d zytb_db -c "SELECT 1;"
```

### ❌ 错误: "表不存在"

**解决**: 先创建数据库表

```bash
psql -U postgres -d zytb_db -f scripts/migrations/create_campus_life_tables.sql
```

### ⚠️ 警告: "未找到匹配院校"

**解决**:
1. 检查学校名称是否正确
2. 在数据库中查找该学校：
   ```sql
   SELECT name FROM colleges WHERE name LIKE '%湖南%';
   ```
3. 如果学校存在但名称不同，在 `collegeNameMatcher.ts` 中添加别名

### ⚠️ 警告: "部分数据处理失败"

**解决**: 查看上方的具体错误信息，通常是数据格式问题或字段过长

## 下一步

导入完成后，可以：

1. **查看数据**: 使用SQL查询验证数据
2. **集成到推荐系统**: 在 `indicatorScoring.service.ts` 中使用这些数据
3. **创建API接口**: 让前端可以查询校园生活信息
4. **导入更多数据**: 收集更多学校的问卷数据并导入

## 需要帮助？

详细文档: [CAMPUS_LIFE_IMPORTER.md](./CAMPUS_LIFE_IMPORTER.md)

常见问题: 查看文档的"常见问题"章节
