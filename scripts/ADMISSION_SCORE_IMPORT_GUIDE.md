# 专业录取分数线数据导入指南

## 概述
本指南介绍如何将包含专业录取分数线信息的 Excel 文件导入到系统数据库中。

## 准备工作

### 1. Excel 文件格式要求
Excel 文件应包含以下列(表头):

| 列名 | 说明 | 是否必填 | 数据类型 |
|------|------|---------|---------|
| 生源地 | 考生所在省份 | 是 | 文本 |
| 学校 | 院校名称 | 是 | 文本 |
| 年份 | 录取年份 | 是 | 数字 |
| 专业 | 专业名称 | 是 | 文本 |
| 专业组 | 专业组名称 | 否 | 文本 |
| 科类 | 科类(物理类/历史类等) | 是 | 文本 |
| 选科 | 选科要求 | 否 | 文本 |
| 最低分 | 录取最低分 | 否 | 数字 |
| 最低位次 | 录取最低位次 | 否 | 数字 |
| 批次 | 录取批次 | 否 | 文本 |
| 省份 | 院校所在省份 | 否 | 文本 |
| 城市 | 院校所在城市 | 否 | 文本 |

### 2. 数据格式说明

- **年份**: 4位数字,如 "2024"
- **最低分**: 纯数字,如 "650"
- **最低位次**: 纯数字,如 "5000"
- **文本**: 其他所有文本信息

### 3. 注意事项

- **院校名称**: 应与院校表中的名称保持一致,以便自动关联
- **省份/城市**: 如果不填写,系统会尝试从关联的院校表中获取
- **科类**: 建议使用统一的命名,如"物理类"、"历史类"

## 导入步骤

### 步骤 1: 更新数据库表结构

由于添加了新的表,首先需要更新数据库表结构:

```bash
# 启动开发服务器,TypeORM 会自动同步表结构
npm run dev
```

或者手动运行同步脚本:

```bash
ts-node scripts/syncDatabase.ts
```

### 步骤 2: 执行导入

将 Excel 文件放到合适的位置(如 `data` 目录),然后执行:

```bash
npm run import-admission-scores <Excel文件路径>
```

示例:
```bash
# 相对路径
npm run import-admission-scores ./data/admission_scores.xlsx

# 绝对路径
npm run import-admission-scores E:/data/admission_scores.xlsx
```

### 步骤 3: 查看导入结果

导入过程中会显示详细的日志信息:
- 成功导入的记录数
- 失败的记录数
- 详细的错误信息

## 重要说明

### 数据更新策略
- 唯一性判断基于: **年份 + 生源地 + 学校 + 专业 + 科类**
- 如果记录已存在,将**更新**该记录
- 如果记录不存在,将**创建**新记录

### 院校关联
- 系统会自动尝试根据学校名称关联到院校表
- 如果院校表中存在对应的院校名称,会自动建立关联
- 关联成功后,会自动获取院校的省份和城市信息(如果Excel中未提供)
- 即使院校未关联,分数线数据也会正常导入

### 错误处理
如果某条记录导入失败,会:
1. 显示具体的错误信息和行号
2. 继续导入其他记录
3. 最后汇总显示所有错误

### 必填字段验证
以下字段为必填项,缺少这些字段的记录会被跳过:
- 生源地
- 学校
- 年份
- 专业
- 科类

## 示例 Excel 文件

```
生源地 | 学校     | 年份 | 专业           | 专业组     | 科类   | 选科       | 最低分 | 最低位次 | 批次     | 省份   | 城市
浙江省 | 北京大学 | 2024 | 计算机科学与技术 | 计算机类   | 物理类 | 物理+化学  | 680    | 500     | 本科一批 | 北京市 | 北京
浙江省 | 清华大学 | 2024 | 计算机科学与技术 | 理工类     | 物理类 | 物理       | 685    | 350     | 本科一批 | 北京市 | 北京
江苏省 | 北京大学 | 2024 | 法学           | 人文社科类 | 历史类 | 不限       | 650    | 800     | 本科一批 | 北京市 | 北京
```

## 数据查询示例

导入完成后,可以通过以下方式查询数据:

### 1. 按年份和生源地查询
```sql
SELECT * FROM admission_scores
WHERE year = 2024 AND source_province = '浙江省';
```

### 2. 按院校查询
```sql
SELECT * FROM admission_scores
WHERE college_name = '北京大学' AND year = 2024;
```

### 3. 按专业查询
```sql
SELECT * FROM admission_scores
WHERE major_name LIKE '%计算机%' AND year = 2024;
```

### 4. 按分数范围查询
```sql
SELECT * FROM admission_scores
WHERE year = 2024 AND source_province = '浙江省'
  AND min_score BETWEEN 600 AND 650
ORDER BY min_score DESC;
```

### 5. 统计各院校最低分
```sql
SELECT college_name, MIN(min_score) as lowest_score, MAX(min_score) as highest_score
FROM admission_scores
WHERE year = 2024 AND source_province = '浙江省'
GROUP BY college_name
ORDER BY lowest_score DESC;
```

## 数据验证建议

导入完成后,建议验证数据:

### 1. 检查总记录数
```sql
SELECT COUNT(*) FROM admission_scores;
```

### 2. 检查年份分布
```sql
SELECT year, COUNT(*) as count FROM admission_scores
GROUP BY year ORDER BY year DESC;
```

### 3. 检查生源地分布
```sql
SELECT source_province, COUNT(*) as count FROM admission_scores
WHERE year = 2024
GROUP BY source_province ORDER BY count DESC;
```

### 4. 检查分数线范围
```sql
SELECT
  MIN(min_score) as lowest,
  MAX(min_score) as highest,
  AVG(min_score) as average
FROM admission_scores
WHERE year = 2024 AND source_province = '浙江省';
```

## 故障排查

### 问题 1: 数据库连接失败
检查 `.env` 文件中的数据库配置:
```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=123456
DB_NAME=volunteer_system
```

### 问题 2: Excel 文件读取失败
确认:
- 文件路径正确
- 文件格式为 `.xlsx` 或 `.xls`
- 文件没有被其他程序占用

### 问题 3: 字段映射错误
确认 Excel 文件的列名与上述表格完全一致(包括空格和标点符号)

### 问题 4: 院校名称未关联
如果需要关联院校:
1. 确保院校表中有对应的院校名称
2. 院校名称必须完全匹配(大小写、空格等)
3. 可以先导入院校数据,再导入分数线数据

### 问题 5: 数据重复
- 系统会自动检测重复数据(基于年份+生源地+学校+专业+科类)
- 重复数据会被更新而不是创建新记录
- 如果需要保留历史记录,建议备份数据库

## 性能建议

- 对于大批量数据(超过10000条),建议分批导入
- 导入前建议先备份数据库
- 建议在非高峰时段导入数据
- 可以先导入小样本测试,确认无误后再导入全部数据

## 数据质量建议

### 1. 数据清洗
导入前建议检查:
- 院校名称是否统一(如"北京大学"和"北大"应统一为一个名称)
- 专业名称是否规范(如"计算机科学与技术"和"计算机"应统一)
- 科类名称是否统一(如"理科"和"物理类"应统一)
- 分数和位次是否合理(是否有异常值)

### 2. 必填字段完整性
确保必填字段都有值:
- 生源地: 不能为空
- 学校: 不能为空
- 年份: 不能为空
- 专业: 不能为空
- 科类: 不能为空

### 3. 数据一致性
- 同一年份、同一院校的省份和城市应该一致
- 分数和位次应该呈反向关系(分数高位次低)

## 技术支持

如遇到问题,请查看:
- 导入日志中的错误详情
- 数据库日志
- 联系技术支持团队
