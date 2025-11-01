# 一分一段数据导入使用指南 📊

## 📋 什么是一分一段表？

一分一段表是高考志愿填报的重要参考工具，它显示每个分数有多少考生，以及该分数及以上有多少考生（累计人数），帮助考生准确定位自己在全省的排名。

## 🎯 快速开始

### 第一步：准备Excel文件

创建一个Excel文件（`.xlsx`或`.xls`格式），表头必须包含以下列：

| 年份 | 省份 | 科类 | 分数 | 人数 | 累计人数 | 位次 |
|------|------|------|------|------|---------|------|
| 2024 | 江苏省 | 物理类 | 680 | 50 | 50 | 50 |
| 2024 | 江苏省 | 物理类 | 679 | 45 | 95 | 95 |
| 2024 | 江苏省 | 物理类 | 678 | 60 | 155 | 155 |

#### 字段说明

| 字段名 | 说明 | 是否必填 | 数据类型 | 示例 |
|--------|------|---------|---------|------|
| 年份 | 高考年份 | ✅ 必填 | 数字 | 2024 |
| 省份 | 省份名称 | ✅ 必填 | 文本 | 江苏省 |
| 科类 | 物理类或历史类 | ✅ 必填 | 文本 | 物理类 |
| 分数 | 高考分数 | ✅ 必填 | 数字 | 680 |
| 人数 | 该分数的考生人数 | ✅ 必填 | 数字 | 50 |
| 累计人数 | 该分数及以上的总人数 | ✅ 必填 | 数字 | 50 |
| 位次 | 排名位次 | ❌ 可选 | 数字 | 50 |

#### 重要提示

- **列名必须完全一致**（包括中文标点符号）
- **科类名称建议**: "物理类"、"历史类"（统一命名）
- **数据顺序**: 建议从高分到低分排列
- **累计人数**: 必须是递增的（高分累计人数少，低分累计人数多）

### 第二步：启动开发服务器

```bash
# 启动服务器（会自动同步数据库表结构）
npm run dev
```

等待看到类似输出：
```
服务器已启动在 http://localhost:3000
```

### 第三步：执行导入

打开新的终端窗口，执行导入命令：

```bash
# 使用绝对路径（推荐）
npm run import-score-rankings E:/path/to/your/score_rankings.xlsx

# 或使用相对路径
npm run import-score-rankings ./data/score_rankings.xlsx
```

### 第四步：查看导入结果

导入过程中会实时显示进度：

```bash
开始导入一分一段数据...
Excel 文件路径: E:\path\to\score_rankings.xlsx
读取到 750 条数据
数据库连接成功
新增: 2024 江苏省 物理类 680分
新增: 2024 江苏省 物理类 679分
...
导入完成!
成功: 750 条
失败: 0 条
```

## 📝 完整示例

### 示例1：江苏省2024年物理类

创建Excel文件 `jiangsu_2024_physics.xlsx`:

| 年份 | 省份 | 科类 | 分数 | 人数 | 累计人数 | 位次 |
|------|------|------|------|------|---------|------|
| 2024 | 江苏省 | 物理类 | 690 | 10 | 10 | 10 |
| 2024 | 江苏省 | 物理类 | 689 | 15 | 25 | 25 |
| 2024 | 江苏省 | 物理类 | 688 | 20 | 45 | 45 |
| 2024 | 江苏省 | 物理类 | 687 | 25 | 70 | 70 |
| ... | ... | ... | ... | ... | ... | ... |

导入命令：
```bash
npm run import-score-rankings ./data/jiangsu_2024_physics.xlsx
```

### 示例2：江苏省2024年历史类

创建Excel文件 `jiangsu_2024_history.xlsx`:

| 年份 | 省份 | 科类 | 分数 | 人数 | 累计人数 | 位次 |
|------|------|------|------|------|---------|------|
| 2024 | 江苏省 | 历史类 | 660 | 8 | 8 | 8 |
| 2024 | 江苏省 | 历史类 | 659 | 12 | 20 | 20 |
| 2024 | 江苏省 | 历史类 | 658 | 18 | 38 | 38 |
| ... | ... | ... | ... | ... | ... | ... |

导入命令：
```bash
npm run import-score-rankings ./data/jiangsu_2024_history.xlsx
```

## 🔍 验证导入结果

### 方法1：通过API查询

```bash
# 查看列表
curl "http://localhost:3000/api/score-ranking/list?year=2024&province=江苏省&subjectType=物理类"

# 根据分数查询位次（例如查询650分的位次）
curl "http://localhost:3000/api/score-ranking/rank-by-score?year=2024&province=江苏省&subjectType=物理类&score=650"

# 根据位次查询分数（例如查询位次1000对应的分数）
curl "http://localhost:3000/api/score-ranking/score-by-rank?year=2024&province=江苏省&subjectType=物理类&rank=1000"

# 查看分数段统计
curl "http://localhost:3000/api/score-ranking/distribution?year=2024&province=江苏省&subjectType=物理类"
```

### 方法2：在浏览器中查看

打开浏览器访问：
```
http://localhost:3000/api/score-ranking/list?year=2024&province=江苏省&subjectType=物理类
```

## ⚠️ 常见问题解决

### 问题1：列名不匹配

**错误提示**：
```
第 2 行数据缺少必填字段,跳过
```

**解决方法**：
- 检查Excel第一行的列名是否与要求完全一致
- 注意中文标点符号
- 不要有多余的空格

✅ 正确的列名：
```
年份    省份    科类    分数    人数    累计人数    位次
```

❌ 错误的列名：
```
年份    省 份   科类    分数    人数    累计人数    排名
(省份中间有空格)                              (位次写成排名)
```

### 问题2：文件路径错误

**错误提示**：
```
文件不存在: /path/to/file.xlsx
```

**解决方法**：

```bash
# ❌ 错误 - 缺少 ./
npm run import-score-rankings data/file.xlsx

# ✅ 正确 - 相对路径加 ./
npm run import-score-rankings ./data/file.xlsx

# ✅ 正确 - 使用绝对路径
npm run import-score-rankings E:/5plus1/DEV/zytb/Data/yfyd/score_rankings.xlsx
```

### 问题3：数据库连接失败

**错误提示**：
```
导入失败: connect ECONNREFUSED
```

**解决方法**：
1. 确保MySQL服务正在运行
2. 检查 `.env` 文件配置：

```env
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=123456
DB_NAME=volunteer_system
```

3. 测试数据库连接：
```bash
mysql -h localhost -P 3307 -u root -p
```

### 问题4：数据重复

系统会自动处理重复数据：
- **唯一性判断**: 年份 + 省份 + 科类 + 分数
- **处理方式**: 如果记录已存在，会更新该记录（而不是创建新记录）

如果需要重新导入数据，直接再次执行导入命令即可。

## 💡 数据准备技巧

### 1. 数据清洗检查清单

✅ **必须检查的项目**：
- [ ] 所有必填字段都有值
- [ ] 年份是4位数字（如2024）
- [ ] 分数、人数、累计人数都是纯数字
- [ ] 累计人数是递增的
- [ ] 科类名称统一（都是"物理类"或都是"历史类"）
- [ ] 省份名称统一（如"江苏省"）

### 2. Excel数据示例（正确格式）

```
年份    省份      科类      分数    人数    累计人数    位次
2024    江苏省    物理类    700     5       5          5
2024    江苏省    物理类    699     8       13         13
2024    江苏省    物理类    698     12      25         25
2024    江苏省    物理类    697     15      40         40
```

### 3. 避免的错误格式

❌ **错误示例**：
```
年份        省份        科类        分数        人数        累计人数
2024年      江苏        物理        700分       5人         5人
(包含文字)  (缺"省")    (缺"类")    (包含文字)  (包含文字)  (包含文字)
```

## 📊 使用场景

### 场景1：考生查询自己的位次

考生小明考了650分（物理类），想知道自己的位次：

```bash
curl "http://localhost:3000/api/score-ranking/rank-by-score?year=2024&province=江苏省&subjectType=物理类&score=650"
```

返回结果：
```json
{
  "score": 650,
  "exactMatch": true,
  "count": 120,
  "cumulativeCount": 5280,
  "rank": 5280
}
```

说明：650分有120人，累计5280人，位次约5280名。

### 场景2：查询某个位次对应的分数

已知去年某专业最低位次是3000，想知道今年需要多少分：

```bash
curl "http://localhost:3000/api/score-ranking/score-by-rank?year=2024&province=江苏省&subjectType=物理类&rank=3000"
```

### 场景3：查看分数段分布

查看江苏省2024年物理类各分数段的人数分布：

```bash
curl "http://localhost:3000/api/score-ranking/distribution?year=2024&province=江苏省&subjectType=物理类"
```

## 🔧 高级功能

### 批量查询多个分数的位次

创建POST请求：
```bash
curl -X POST "http://localhost:3000/api/score-ranking/batch-rank-by-scores" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "province": "江苏省",
    "subjectType": "物理类",
    "scores": [650, 640, 630, 620, 610]
  }'
```

## 📚 相关API文档

导入成功后，可以使用以下API：

| 接口 | 说明 |
|------|------|
| `GET /api/score-ranking/list` | 获取一分一段列表 |
| `GET /api/score-ranking/rank-by-score` | 根据分数查位次 |
| `GET /api/score-ranking/score-by-rank` | 根据位次查分数 |
| `GET /api/score-ranking/distribution` | 查看分数段分布 |
| `POST /api/score-ranking/batch-rank-by-scores` | 批量查询位次 |
| `GET /api/score-ranking/options/years` | 获取可用年份 |
| `GET /api/score-ranking/options/provinces` | 获取可用省份 |

## 🎓 数据来源建议

一分一段表数据通常可以从以下渠道获取：
1. 省教育考试院官网
2. 各省招生信息网
3. 高考志愿填报指南手册

## 📞 获取帮助

如果遇到问题：
1. 查看终端输出的详细错误信息
2. 检查Excel文件格式是否正确
3. 确认数据库连接是否正常
4. 查看本指南的常见问题部分

---

**提示**: 一分一段表数据对志愿填报至关重要，请确保数据准确性！
