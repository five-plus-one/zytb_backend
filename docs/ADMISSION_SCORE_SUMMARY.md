# 专业录取分数线模块开发总结

## 概述
本次开发完成了专业录取分数线数据表的创建、Excel导入工具、API查询接口以及院校API的分数线查询完善。

## 完成的功能

### 1. 数据模型
创建了 `AdmissionScore` 模型，包含以下字段：
- **生源信息**: 生源地
- **院校信息**: 学校名称、省份、城市
- **年份**: 录取年份
- **专业信息**: 专业名称、专业组
- **科类**: 科类（物理类/历史类等）
- **选科要求**: 选科要求
- **录取数据**: 最低分、最低位次
- **批次**: 录取批次
- **关联信息**: 院校关联（可选）

**文件位置**: [src/models/AdmissionScore.ts](../src/models/AdmissionScore.ts)

### 2. Excel 导入工具
创建了功能完整的专业录取分数线数据导入脚本，支持：
- Excel文件读取（.xlsx/.xls格式）
- 字段自动映射
- 数据类型转换
- 重复数据更新（基于年份+生源地+学校+专业+科类）
- 院校自动关联
- 从院校表自动获取省份/城市信息
- 详细的导入日志和错误处理

**文件位置**: [scripts/importAdmissionScores.ts](../scripts/importAdmissionScores.ts)

**使用方法**:
```bash
npm run import-admission-scores <Excel文件路径>
```

**导入指南**: [scripts/ADMISSION_SCORE_IMPORT_GUIDE.md](../scripts/ADMISSION_SCORE_IMPORT_GUIDE.md)

### 3. API 接口

#### 3.1 专业录取分数线专用接口
创建了完整的分数线查询接口：

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取分数线列表 | GET | `/api/admission-score/list` | 支持多条件筛选和分页 |
| 获取分数线详情 | GET | `/api/admission-score/:id` | 根据ID获取详情 |
| 按院校获取分数线 | GET | `/api/admission-score/college/:collegeName` | 按院校名称查询 |
| 按专业获取分数线 | GET | `/api/admission-score/major/:majorName` | 按专业名称查询 |
| 获取历年趋势 | GET | `/api/admission-score/trend/analysis` | 分析历年变化趋势 |
| 获取统计信息 | GET | `/api/admission-score/statistics/overview` | 统计分析数据 |
| 分数推荐 | GET | `/api/admission-score/recommend/by-score` | 智能推荐院校和专业 |
| 获取可用年份 | GET | `/api/admission-score/options/years` | 年份选项 |
| 获取可用省份 | GET | `/api/admission-score/options/provinces` | 省份选项 |

**文件位置**:
- 服务层: [src/services/admissionScore.service.ts](../src/services/admissionScore.service.ts)
- 控制器: [src/controllers/admissionScore.controller.ts](../src/controllers/admissionScore.controller.ts)
- 路由: [src/routes/admissionScore.routes.ts](../src/routes/admissionScore.routes.ts)

#### 3.2 完善的院校API
更新了学校API的历年分数线查询接口：

**接口**: `GET /api/college/:id/scores`

现在返回真实的录取分数线数据，包括：
- 按年份分组的分数线数据
- 每年的所有专业分数详情
- 统计信息（最低分、最高分、平均分等）

**文件位置**: [src/services/college.service.ts](../src/services/college.service.ts)

### 4. 文档

#### API 文档
详细的API使用文档，包含：
- 接口列表和参数说明
- 请求/响应示例
- 错误码说明
- 使用示例（JavaScript、cURL）
- 业务场景示例

**文件位置**: [docs/ADMISSION_SCORE_API.md](../docs/ADMISSION_SCORE_API.md)

#### 导入指南
Excel数据导入的详细指南，包含：
- 文件格式要求
- 字段说明
- 导入步骤
- 故障排查
- SQL查询示例
- 数据质量建议

**文件位置**: [scripts/ADMISSION_SCORE_IMPORT_GUIDE.md](../scripts/ADMISSION_SCORE_IMPORT_GUIDE.md)

## 数据库设计

### 表名
`admission_scores`

### 索引设计
- 主键: `id` (UUID)
- 组合索引:
  - `(year, source_province, college_name)`
  - `(year, source_province, major_name)`
  - `(year, source_province, subject_type)`
- 单字段索引:
  - `year`
  - `source_province`
  - `college_name`
  - `major_name`
  - `subject_type`

### 唯一性约束
数据唯一性基于以下字段组合：
- 年份 + 生源地 + 学校 + 专业 + 科类

## NPM 脚本

在 `package.json` 中添加了以下命令：

```json
{
  "import-admission-scores": "ts-node scripts/importAdmissionScores.ts"
}
```

## 使用流程

### 1. 导入数据
```bash
# 导入录取分数线数据
npm run import-admission-scores /path/to/admission_scores.xlsx
```

### 2. 查询数据
```bash
# 启动开发服务器
npm run dev

# 访问API
# 获取列表: GET http://localhost:3000/api/admission-score/list?year=2024&sourceProvince=浙江省
# 分数推荐: GET http://localhost:3000/api/admission-score/recommend/by-score?score=650&sourceProvince=浙江省&subjectType=物理类
# 院校分数: GET http://localhost:3000/api/college/college-id/scores?province=浙江省&subjectType=物理类
```

## 特性亮点

### 1. 智能推荐功能
- 根据考生分数智能推荐院校和专业
- 分为三类推荐：稳妥、合适、冲刺
- 可自定义分数浮动范围

### 2. 趋势分析
- 查看某院校某专业的历年分数线变化
- 帮助考生了解录取难度趋势

### 3. 统计分析
- 按院校统计（平均分、最低分、最高分）
- 按科类统计
- 分数段分布统计

### 4. 灵活查询
- 支持年份、省份、院校、专业、科类等多维度筛选
- 支持分数范围和位次范围筛选
- 支持关键词搜索

### 5. 数据关联
- 自动关联院校表
- 自动获取院校的省份和城市信息

### 6. 完善的错误处理
- 详细的导入日志
- 行号定位错误
- 继续导入策略

## 业务场景

### 场景1: 志愿填报助手
考生输入分数，系统推荐合适的院校和专业：
```bash
GET /api/admission-score/recommend/by-score?score=650&sourceProvince=浙江省&subjectType=物理类
```

### 场景2: 院校专业分析
查看某专业在不同院校的录取情况：
```bash
GET /api/admission-score/major/计算机科学与技术?year=2024&sourceProvince=浙江省
```

### 场景3: 历年趋势对比
分析某院校某专业的历年录取分数变化：
```bash
GET /api/admission-score/trend/analysis?collegeName=北京大学&majorName=计算机科学与技术&sourceProvince=浙江省&years=5
```

### 场景4: 院校详情页
在院校详情页展示该校历年各专业录取分数：
```bash
GET /api/college/:id/scores?province=浙江省&subjectType=物理类&years=3
```

### 场景5: 数据统计分析
查看整体录取情况统计：
```bash
GET /api/admission-score/statistics/overview?year=2024&sourceProvince=浙江省
```

## 扩展建议

### 未来可以添加的功能
1. **位次转换**: 不同年份位次换算
2. **专业热度**: 统计专业报考热度
3. **录取概率**: 计算录取概率
4. **批次线对比**: 与批次线对比分析
5. **多年对比**: 多年数据横向对比
6. **数据可视化**: 图表展示趋势和分布
7. **收藏功能**: 用户收藏关注的院校专业
8. **模拟填报**: 模拟志愿填报和风险评估

### 性能优化建议
1. 对于高频查询，可以考虑添加Redis缓存
2. 推荐接口可以考虑定期预计算
3. 统计接口可以使用物化视图
4. 可以添加数据归档机制（旧年份数据）

## 技术栈

- **框架**: Express + TypeScript
- **ORM**: TypeORM
- **数据库**: MySQL
- **Excel处理**: xlsx
- **API风格**: RESTful

## 文件清单

### 新增文件
```
src/
  models/
    AdmissionScore.ts                    # 录取分数线数据模型
  services/
    admissionScore.service.ts            # 录取分数线服务层
  controllers/
    admissionScore.controller.ts         # 录取分数线控制器
  routes/
    admissionScore.routes.ts             # 录取分数线路由

scripts/
  importAdmissionScores.ts               # 分数线导入脚本
  ADMISSION_SCORE_IMPORT_GUIDE.md        # 导入指南

docs/
  ADMISSION_SCORE_API.md                 # API文档
```

### 修改文件
```
src/
  routes/
    index.ts                             # 添加录取分数线路由
  services/
    college.service.ts                   # 完善院校历年分数线查询

package.json                             # 添加新的npm脚本
```

## 与招生计划模块的区别

| 特性 | 招生计划 | 录取分数线 |
|------|---------|-----------|
| 数据性质 | 计划招生人数（事前） | 实际录取结果（事后） |
| 主要用途 | 了解招生名额 | 了解录取难度 |
| 核心字段 | 计划人数、学费 | 最低分、最低位次 |
| 应用场景 | 专业选择参考 | 分数定位、志愿填报 |

两个模块互补，共同为志愿填报提供完整的数据支持。

## 总结

本次开发完成了一个功能完整、设计合理的专业录取分数线管理系统，包括：
- ✅ 完善的数据模型
- ✅ 可靠的数据导入工具
- ✅ 强大的查询API
- ✅ 智能推荐功能
- ✅ 趋势分析功能
- ✅ 统计分析功能
- ✅ 详细的文档

系统设计充分考虑了志愿填报的实际业务场景，为考生提供科学的决策依据。
