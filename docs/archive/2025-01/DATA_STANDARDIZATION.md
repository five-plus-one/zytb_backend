# 数据标准化解决方案

## 📋 问题背景

志愿填报系统中存在多个数据表（`enrollment_plans`、`admission_scores`、`colleges`等），这些表之间存在以下问题：

1. **字段值不统一**：如`subject_type`在不同表中可能是"物理"或"物理类"
2. **字段缺失**：某些表缺少关键字段，如`colleges`表的`code`字段大部分为NULL
3. **院校名称不匹配**：不同表中的院校名称可能有细微差异，导致JOIN查询失败

这些问题导致**AI筛选功能无法正常工作**，返回空结果。

## 🎯 解决方案

本解决方案提供了一套**一劳永逸的数据标准化工具**，包括：

### 1. 数据标准化工具

**位置**: `src/utils/data-standardization.ts`

**功能**:
- 标准化院校名称（去除后缀、处理别名）
- 标准化专业名称
- 标准化省份名称
- 模糊匹配院校名称（基于编辑距离算法）
- 自动补全缺失字段

**使用方法**:
```bash
# 运行完整的标准化流程
npx ts-node standardize-data.ts
```

### 2. 快速修复脚本

#### 2.1 标准化 subject_type 字段

**问题**: 数据库中存储的是"物理"、"历史"，但查询使用的是"物理类"、"历史类"

**解决**:
```bash
npx ts-node standardize-subject-type.ts
```

**效果**:
- ✅ 将所有表的`subject_type`从"物理"改为"物理类"
- ✅ 将所有表的`subject_type`从"历史"改为"历史类"
- 影响表：`enrollment_plans`, `admission_scores`, `score_rankings`

#### 2.2 补全 colleges 表的 code 字段

**问题**: `colleges`表中大部分院校的`code`字段为NULL

**解决**: 运行完整标准化流程会自动从`enrollment_plans`表中提取并补全

#### 2.3 补全 enrollment_plans 表的院校信息

**问题**: `enrollment_plans`表缺少院校省份、城市等信息

**解决**: 添加新字段并从`colleges`表补全
- `college_province`: 院校所在省份
- `college_city`: 院校所在城市
- `college_is_985`: 是否985
- `college_is_211`: 是否211

### 3. 标准化配置

**位置**: `src/utils/standardization-config.ts`

可配置的映射规则包括：
- 院校名称后缀去除规则
- 院校名称替换规则
- 院校别名映射
- 专业名称标准化规则
- 省份名称标准化规则

## 🚀 实施步骤

### 第一步：标准化 subject_type（已完成）

```bash
npx ts-node standardize-subject-type.ts
```

**结果**:
```
✅ enrollment_plans: 物理类 16103条, 历史类 5261条
✅ admission_scores: 已更新
✅ score_rankings: 已更新
```

### 第二步：运行完整标准化（可选）

```bash
npx ts-node standardize-data.ts
```

这将：
1. 补全`colleges`表的`code`字段
2. 为`enrollment_plans`表添加并补全院校信息字段
3. 为`admission_scores`表补全院校省份和代码

### 第三步：重启后端服务

```bash
npm run dev
```

## 📊 修复效果

### 修复前
```
📍 筛选江苏省内院校，找到211所院校
📊 符合条件的招生计划总数: 0  ❌
```

### 修复后
```
📍 筛选江苏省内院校，找到211所院校
📊 符合条件的招生计划总数: 3450  ✅

测试结果：
- 江苏省内院校（不限专业）：3450个
- 江苏省内软件专业：54个
- 电子相关专业：918个
```

## 🔧 核心修复

### 1. MajorFilterService 优化

**位置**: `src/services/majorFilter.service.ts`

**改进**:
- 使用院校名称列表进行`IN`查询（而不是院校代码）
- 通过`colleges`表的`province`字段筛选省内院校
- 添加详细的日志输出

### 2. AI 系统提示词更新

**位置**: `src/ai/agent.service.ts`

**改进**:
- 明确告知AI当前数据年份是2025年
- 强调province筛选的正确用法
- 添加scoreRange建议（默认30分）

### 3. 工具描述优化

**位置**: `src/ai/tools/majorFilter.tool.ts`

**改进**:
- 添加`collegeProvince`参数说明
- 明确year参数应使用2025
- 建议scoreRange设为30以获得更多结果

## 📝 数据标准化规则

### 院校名称标准化

```typescript
// 去除后缀
'中国矿业大学（徐州）' → '中国矿业大学'

// 替换规则
'中国人民解放军南京陆军指挥学院' → '南京陆军指挥学院'

// 别名映射
'南京大学金陵学院' → '南京大学'
```

### 专业名称标准化

```typescript
// 去除后缀
'计算机科学与技术（中外合作办学）' → '计算机科学与技术'

// 类别统一
'计算机科学与技术类' → '计算机类'
```

### 科类标准化

```typescript
'物理' → '物理类'
'历史' → '历史类'
```

## 🛠️ 工具列表

| 脚本名称 | 功能 | 使用场景 |
|---------|------|---------|
| `standardize-subject-type.ts` | 标准化科类字段 | ✅ **必须运行** |
| `standardize-data.ts` | 完整数据标准化 | 可选，补全更多字段 |
| `quick-fix-analysis.ts` | 分析匹配情况 | 诊断问题 |
| `check-data-detail.ts` | 详细数据检查 | 诊断问题 |
| `test-filter-fix.ts` | 测试筛选功能 | 验证修复效果 |

## ✅ 验证

运行测试脚本验证修复效果：

```bash
npx ts-node test-filter-fix.ts
```

预期输出：
```
=== 测试1：筛选江苏省内院校（不限专业） ===
用户位次: 44618
找到 10 个专业  ✅

=== 测试2：筛选江苏省内的"软件"相关专业 ===
找到 10 个软件相关专业  ✅

=== 测试3：不限省份，查找"电子"相关专业 ===
找到 10 个电子相关专业  ✅
```

## 🎓 最佳实践

1. **定期运行标准化**：在导入新数据后运行标准化脚本
2. **配置规则维护**：根据实际情况更新`standardization-config.ts`中的映射规则
3. **日志监控**：关注查询日志中的匹配情况
4. **数据验证**：使用测试脚本验证数据质量

## 📚 相关文件

- `src/utils/data-standardization.ts` - 数据标准化核心工具
- `src/utils/standardization-config.ts` - 标准化配置
- `src/services/majorFilter.service.ts` - 专业筛选服务
- `src/ai/agent.service.ts` - AI Agent服务
- `src/ai/tools/majorFilter.tool.ts` - 专业筛选工具

## 🐛 故障排除

### 问题1：查询返回0结果

**原因**: `subject_type`字段值不匹配

**解决**:
```bash
npx ts-node standardize-subject-type.ts
```

### 问题2：省内院校筛选不准确

**原因**: `colleges`表`province`字段缺失或不准确

**解决**:
```bash
npx ts-node standardize-data.ts
```

### 问题3：院校名称无法匹配

**原因**: 两个表中的院校名称格式不同

**解决**: 更新`standardization-config.ts`中的别名映射规则

---

**更新时间**: 2025-10-29
**版本**: v1.0.0
**状态**: ✅ 已完成并验证
