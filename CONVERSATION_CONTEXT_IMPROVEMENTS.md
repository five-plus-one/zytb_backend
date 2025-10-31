# AI对话质量改进方案

## 📋 概述

本文档描述了针对志愿填报AI助手的重大改进，旨在解决对话中发现的核心问题：
- **数据一致性问题**：AI记错用户分数
- **意图理解偏差**：用户说"计算机方向"却添加所有专业
- **状态管理混乱**：志愿表数据反复丢失
- **缺乏主动性**：需要用户反复催促和纠错

## 🎯 核心改进

### 1. 会话上下文管理器 (ConversationContextManager)

#### 功能
- **用户档案存储**：记住用户的分数、位次、省份、专业偏好等关键信息
- **参数校验**：防止工具调用时使用错误的参数（如分数不一致）
- **自动补全**：根据用户偏好自动填充工具参数
- **意图提取**：从用户输入中自动识别专业偏好、地区偏好等

#### 文件位置
```
src/ai/utils/conversationContext.manager.ts
```

#### 核心接口

```typescript
// 用户档案
interface UserProfile {
  score?: number;              // 高考分数
  rank?: number;               // 省排名
  province?: string;           // 省份
  category?: string;           // 科类
  year?: number;               // 年份
  preferences: {
    majors?: string[];         // 专业偏好（如：计算机科学与技术）
    majorCategories?: string[]; // 专业大类（如：计算机类）
    locations?: string[];      // 地区偏好（如：江苏省）
    collegeTypes?: string[];   // 院校类型（如：985、211）
  }
}

// 参数校验结果
interface ValidationResult {
  valid: boolean;
  error?: string;
  correctedParams?: any;  // 自动纠正后的参数
}
```

### 2. 增强的工具集成

#### 在 volunteerSmart.tool.ts 中的集成

```typescript
async execute(params, context) {
  const sessionId = context?.sessionId || 'default';

  // 1. 校验参数一致性
  const validation = this.contextManager.validateToolParams(sessionId, this.name, params);
  if (!validation.valid && validation.correctedParams) {
    params = validation.correctedParams;
    console.warn(validation.error);
  }

  // 2. 自动补全参数（根据用户偏好）
  params = this.contextManager.enrichToolParams(sessionId, this.name, params);

  // 3. 记录查询信息
  this.contextManager.recordQueriedColleges(sessionId, [...]);

  // 4. 获取批次后更新用户档案
  const batch = await this.volunteerService.getBatchDetail(batchId);
  this.contextManager.updateUserProfile(sessionId, {
    score: batch.score,
    rank: batch.rank,
    province: batch.province,
    category: batch.subjectType,
    year: batch.year
  });
}
```

## 🔧 使用示例

### 场景1：防止分数不一致

**之前的问题**：
```
用户："我638分"
AI查询时使用：643分 ❌
```

**现在的行为**：
```typescript
// 用户第一次提到分数时
contextManager.updateUserProfile(sessionId, { score: 638 });

// 后续工具调用时
validateToolParams(sessionId, 'query_colleges', { score: 643 });
// 返回: { valid: false, correctedParams: { score: 638 } }
// 自动纠正为638分 ✅
```

### 场景2：自动应用专业偏好

**之前的问题**：
```
用户："我想学计算机方向"
AI查询时：返回所有专业 ❌
```

**现在的行为**：
```typescript
// 用户说"计算机方向"时
extractPreferencesFromInput(sessionId, "我想学计算机方向");
// 自动设置: preferences.majors = ['计算机科学与技术', '软件工程']

// 后续调用 filter_majors 时
enrichToolParams(sessionId, 'filter_majors', {});
// 自动补全为: { majorName: '计算机科学与技术,软件工程' } ✅
```

### 场景3：批次ID自动管理

**之前的问题**：
```
用户："加入志愿表"
AI：重复创建批次，导致数据丢失 ❌
```

**现在的行为**：
```typescript
// 创建批次后
recordCurrentBatch(sessionId, batchId);

// 后续工具调用时
enrichToolParams(sessionId, 'add_college', {});
// 自动补全为: { batchId: '已创建的批次ID' } ✅
```

## 📊 预期效果

### ✅ 数据一致性保障
- AI无法使用与用户提供不一致的数据
- 自动纠正错误参数
- 减少用户纠错次数

### ✅ 意图准确理解
- 用户说"计算机方向"后，所有查询自动带上专业筛选
- 用户说"省内"后，自动限定地区范围
- 减少无关结果

### ✅ 状态稳定可靠
- 批次ID在会话中持久化
- 避免重复创建批次
- 减少数据丢失风险

### ✅ 用户体验提升
- 用户无需重复提供相同信息
- AI主动记住用户偏好
- 减少对话轮次

## 🔄 API 变更

### ConversationContextManager 主要方法

| 方法 | 说明 | 使用场景 |
|------|------|----------|
| `updateUserProfile(sessionId, updates)` | 更新用户档案 | 用户提供分数、位次、选择专业方向时 |
| `getUserProfile(sessionId)` | 获取用户档案 | 需要读取用户信息时 |
| `validateToolParams(sessionId, toolName, params)` | 校验参数 | 工具调用前 |
| `enrichToolParams(sessionId, toolName, params)` | 自动补全参数 | 工具调用前 |
| `extractPreferencesFromInput(sessionId, input)` | 提取偏好 | 处理用户输入时 |
| `recordCurrentBatch(sessionId, batchId)` | 记录批次 | 创建/获取批次后 |
| `recordQueriedColleges(sessionId, colleges)` | 记录查询院校 | 查询院校后 |
| `getStateSnapshot(sessionId)` | 获取状态快照 | 调试、日志记录 |

## 📝 集成检查清单

在其他工具中集成上下文管理器时，请确保：

- [ ] 导入 `ConversationContextManager`
- [ ] 在类中初始化：`private contextManager = ConversationContextManager.getInstance()`
- [ ] 在 `execute` 方法开始时：
  - [ ] 调用 `validateToolParams` 校验参数
  - [ ] 调用 `enrichToolParams` 自动补全参数
  - [ ] 根据需要更新用户档案
  - [ ] 记录查询结果到上下文

## 🚀 后续改进建议

### 优先级 P1
1. **操作预览机制**：批量操作前展示将要添加的内容
2. **数据持久性验证**：写入后立即验证，防止数据丢失
3. **错误诊断系统**：提供明确的错误诊断和修复建议

### 优先级 P2
4. **主动性增强**：自动完成显而易见的下一步（如自动查询位次）
5. **信息展示优化**：减少噪音，提升关键信息可读性
6. **多轮对话追踪**：记录对话历史，提供更智能的上下文感知

## 📚 参考资料

### 相关文件
- [conversationContext.manager.ts](src/ai/utils/conversationContext.manager.ts) - 会话上下文管理器
- [volunteerSmart.tool.ts](src/ai/tools/volunteerSmart.tool.ts) - 智能志愿工具（已集成）
- [batchHelper.ts](src/ai/utils/batchHelper.ts) - 批次辅助工具

### 设计文档
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API 文档
- 本文档分析的问题对话（详见开发会议记录）

## 🐛 已知限制

1. **Session管理**：当前使用内存存储，重启服务后会丢失。建议后续使用Redis或数据库持久化。
2. **并发处理**：多个会话之间完全隔离，无法共享学习结果。
3. **意图识别**：基于关键词匹配，复杂语义理解有限。建议后续接入NLU服务。

## 📞 联系方式

如有问题或建议，请联系开发团队或在 GitHub 提 Issue。

---

**更新时间**：2025-10-31
**版本**：v1.0
**作者**：AI 改进小组
