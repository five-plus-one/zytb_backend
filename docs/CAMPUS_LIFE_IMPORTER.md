# 校园生活数据导入工具

## 概述

这是一个用于导入校园生活问卷调查数据的工具，支持从CSV文件中读取问卷数据，自动匹配院校，解析答案，计算评分，并保存到数据库。

## 功能特性

- ✅ CSV文件自动解析
- ✅ 院校名称智能匹配（支持简称、别名、模糊匹配）
- ✅ 答案自动解析（规则+AI）
- ✅ 多份答卷聚合（取众数、平均值）
- ✅ 自动评分（宿舍、食堂、交通、学习环境、快递）
- ✅ 数据质量评估（基于答卷数量）
- ✅ 原始数据完整保存

## 数据表结构

### 1. `college_campus_life` - 校园生活主表

存储结构化、聚合后的校园生活信息：

| 字段 | 类型 | 说明 |
|------|------|------|
| college_id | UUID | 关联的院校ID |
| dorm_score | DECIMAL | 宿舍条件评分 (0-5) |
| canteen_quality_score | DECIMAL | 食堂质量评分 (0-5) |
| transport_score | DECIMAL | 交通便利性评分 (0-5) |
| study_environment_score | DECIMAL | 学习环境评分 (0-5) |
| express_delivery_convenience | DECIMAL | 快递便利性评分 (0-5) |
| reliability | INT | 数据可靠性 (0-100) |
| answer_count | INT | 聚合的答卷份数 |

### 2. `college_life_raw_answers` - 原始答案表

存储每份问卷的原始文本答案（Q1-Q25）

## 使用步骤

### 步骤1：准备环境

确保已安装依赖：

```bash
npm install csv-parse
```

### 步骤2：创建数据库表

运行SQL迁移脚本：

```bash
# 使用psql
psql -U postgres -d zytb_db -f scripts/migrations/create_campus_life_tables.sql

# 或使用SQL客户端执行该文件
```

### 步骤3：准备CSV文件

CSV文件格式要求：

```csv
答题序号,来源,Q1,Q2,Q3,Q4,...,Q25,开始时间,提交时间,IP省份,IP城市,...
2,,2,,,湖南大学,是,有,有,...
3,,1,[DESENSITIZED],2.0,吉林大学,是,无,无，平均半公里左右,...
```

**重要说明**：
- Q4字段必须是学校名称
- 支持的学校名称格式：全称、简称、别名
- 会自动过滤`[DESENSITIZED]`等无效数据

### 步骤4：执行导入

```bash
# 基本用法
npx ts-node scripts/import_campus_life_data.ts <csv_file_path>

# 示例
npx ts-node scripts/import_campus_life_data.ts data/campus_life/survey.csv

# 或使用 tsx（更快）
npx tsx scripts/import_campus_life_data.ts data/campus_life/survey.csv
```

### 步骤5：查看导入结果

导入完成后会显示统计信息：

```
============================================================
导入统计
============================================================
总记录数:        150
有效记录数:      145
匹配院校数:      45
未匹配院校数:    3
保存原始答案:    145 条
保存聚合数据:    45 条
错误数:          0
============================================================
```

## 评分规则

### 1. 宿舍条件评分 (0-5分)

| 因素 | 分值 |
|------|------|
| 基础分 | 1.0 |
| 上床下桌 | +1.0 |
| 有空调 | +1.5 |
| 独立卫浴 | +1.5 |
| 澡堂在楼下 | +0.8 |
| 有洗衣机 | +0.5 |
| 不断电 | +0.5 |

### 2. 食堂质量评分 (0-5分)

| 因素 | 分值 |
|------|------|
| 基础分 | 3.0 |
| 价格便宜 | +1.0 |
| 无异物问题 | +0.5 |
| 有异物问题 | -1.5 |

### 3. 交通便利性评分 (0-5分)

| 因素 | 分值 |
|------|------|
| 在市区 | +2.0 |
| 有地铁 | +2.0 |
| 到市区≤30分钟 | +1.0 |

### 4. 学习环境评分 (0-5分)

| 因素 | 分值 |
|------|------|
| 基础分（有图书馆） | 2.0 |
| 有通宵自习室 | +1.5 |
| 校园网质量好 | +1.0 |
| 不断网 | +0.5 |

### 5. 快递便利性评分 (0-5分)

| 因素 | 分值 |
|------|------|
| 基础分 | 3.0 |
| 送到宿舍 | +2.0 |
| 校内快递点 | +1.0 |
| 需到校外 | -1.0 |

## 院校名称匹配策略

工具会按以下顺序尝试匹配：

1. **精确匹配**: "湖南大学" → "湖南大学"
2. **简称匹配**: "湖南大学长沙校区" → "湖南大学"
3. **别名匹配**: "湖大" → "湖南大学"
4. **模糊匹配**: "湖南 大学" → "湖南大学"
5. **关键词匹配**: "南京 理工" → "南京理工大学"

### 支持的别名示例

| 全称 | 支持的别名 |
|------|-----------|
| 南京大学 | 南大、NJU |
| 东南大学 | 东大、SEU |
| 湖南大学 | 湖大、HNU |
| 上海交通大学 | 上交、交大、SJTU |
| 北京大学 | 北大、PKU |

更多别名请查看 `src/utils/campusLifeImporter/collegeNameMatcher.ts`

## 数据可靠性计算

```
reliability = min(100, 50 + (answerCount - 1) × 10)
```

| 答卷数 | 可靠性评分 |
|--------|-----------|
| 1份 | 50分 |
| 2份 | 60分 |
| 3份 | 70分 |
| 5份 | 90分 |
| 6份+ | 100分 |

## 常见问题

### Q1: 导入时提示"未找到匹配院校"？

**A**: 可能原因：
1. 学校名称拼写错误
2. 学校名称格式特殊
3. 数据库中没有该院校

**解决方案**：
- 检查CSV中的学校名称（Q4字段）
- 在 `collegeNameMatcher.ts` 中添加别名映射
- 在colleges表中添加该院校

### Q2: 如何添加更多院校别名？

**A**: 编辑 `src/utils/campusLifeImporter/collegeNameMatcher.ts`：

```typescript
const COLLEGE_ALIASES: Record<string, string[]> = {
  '你的学校全称': ['简称1', '简称2', '英文缩写'],
  // ...
};
```

### Q3: 导入后如何验证数据？

**A**: 使用SQL查询：

```sql
-- 查看导入的院校数量
SELECT COUNT(*) FROM college_campus_life;

-- 查看评分分布
SELECT
  AVG(dorm_score) as avg_dorm,
  AVG(canteen_quality_score) as avg_canteen,
  AVG(transport_score) as avg_transport,
  AVG(reliability) as avg_reliability
FROM college_campus_life;

-- 查看具体某所院校的数据
SELECT * FROM college_campus_life
WHERE college_name = '湖南大学';

-- 查看原始答案
SELECT * FROM college_life_raw_answers
WHERE college_name = '湖南大学';
```

### Q4: 如何重新导入数据？

**A**: 删除旧数据后重新导入：

```sql
-- 删除聚合数据
DELETE FROM college_campus_life;

-- 删除原始答案
DELETE FROM college_life_raw_answers;
```

然后重新运行导入脚本。

### Q5: 导入速度慢怎么办？

**A**: 优化建议：
1. 使用 `tsx` 代替 `ts-node`：
   ```bash
   npx tsx scripts/import_campus_life_data.ts data/survey.csv
   ```
2. 减少日志输出
3. 批量保存（修改代码实现）

## 后续集成

导入完成后，可以在推荐引擎中使用这些数据：

```typescript
// src/services/agent/indicatorScoring.service.ts

class IndicatorScoringService {
  /**
   * SEC_21: 宿舍条件重视度评分
   */
  async scoreDormCondition(
    group: GroupRecommendation,
    userPrefs: UserIndicatorPreferences
  ): Promise<number> {
    const campusLife = await this.campusLifeRepo.findOne({
      where: { collegeId: group.collegeId }
    });

    if (!campusLife || !campusLife.dormScore) {
      return 50; // 无数据，返回中等分
    }

    // 将1-5分映射到0-100分
    return campusLife.dormScore * 20;
  }

  // 其他指标评分...
}
```

## 文件结构

```
src/
├── models/
│   ├── CollegeCampusLife.ts          # 校园生活主表模型
│   └── CollegeLifeRawAnswer.ts       # 原始答案表模型
└── utils/
    └── campusLifeImporter/
        ├── csvParser.ts              # CSV解析器
        ├── collegeNameMatcher.ts     # 院校名称匹配器
        ├── answerParser.ts           # 答案解析器
        └── scoreCalculator.ts        # 评分计算器

scripts/
├── migrations/
│   └── create_campus_life_tables.sql # 数据库迁移脚本
└── import_campus_life_data.ts        # 主导入脚本
```

## 技术栈

- **TypeScript**: 类型安全
- **TypeORM**: ORM框架
- **csv-parse**: CSV解析
- **PostgreSQL**: 数据库

## 支持

如有问题或建议，请联系开发团队。
