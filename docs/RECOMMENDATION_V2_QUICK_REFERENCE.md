# 推荐卡片 V2 快速参考

## 🎯 核心改进

| 方面 | 旧版 | 新版 | 改进幅度 |
|-----|------|------|---------|
| Token消耗 | ~20,000 | ~500 | ⬇️ 97.5% |
| 响应时间 | 15-20秒 | 3-5秒 | ⬇️ 70-80% |
| DB查询 | 40+次 | 2-3次 | ⬇️ 90% |
| 数据格式 | LLM输出 | 后端控制 | ✅ 100%可控 |

## 🔄 工作流程对比

### 旧版流程
```
用户请求 → AI调用smart_recommendation →
返回完整数据(40个卡片×30字段) →
LLM流式输出JSON数据(~20,000 tokens) →
前端接收并解析
```

### 新版流程
```
用户请求 → AI调用get_recommendation_ids →
返回ID列表(40个ID，~500 tokens) →
AI向用户说明概况 →
后端批量查询数据库 →
直接推送JSON给前端
```

## 🛠️ 关键文件

| 文件 | 作用 | 状态 |
|-----|------|-----|
| `src/ai/tools/getRecommendationIds.tool.ts` | 轻量级推荐工具（只返回ID） | ✅ 新增 |
| `src/services/recommendationCard.service.ts` | 批量卡片数据服务 | ✅ 新增 |
| `src/ai/agent.service.ts` | 检测ID并获取卡片数据 | ✅ 修改 |
| `src/ai/tools/index.ts` | 注册新工具 | ✅ 修改 |
| `src/ai/tools/smartRecommendation.tool.ts` | 旧版工具（向后兼容） | ⚠️ 保留 |

## 📡 API事件格式

### 流式响应事件类型

#### 1. Session事件
```json
{"type": "session", "sessionId": "xxx-xxx-xxx"}
```

#### 2. Content事件（AI文字）
```json
{"type": "content", "content": "我为您找到了40个推荐..."}
```

#### 3. 工具执行提示
```json
{"type": "content", "content": "🔍 正在查询数据...\n\n"}
{"type": "content", "content": "✓ get_recommendation_ids 执行完成\n"}
```

#### 4. 卡片数据推送（⭐ 新增）
```json
{
  "type": "recommendation_cards",
  "data": {
    "rush": [
      {
        "groupId": "10284_01",
        "collegeName": "南京大学",
        "probability": 25,
        "riskLevel": "冲",
        // ... 完整卡片数据
      }
    ],
    "stable": [ /* ... */ ],
    "safe": [ /* ... */ ]
  },
  "summary": {
    "totalCount": 40,
    "rushCount": 12,
    "stableCount": 20,
    "safeCount": 8
  }
}
```

#### 5. 完成事件
```json
{
  "type": "done",
  "success": true,
  "message": "完整回复内容",
  "conversationHistory": [...]
}
```

## 🎨 前端集成示例

```typescript
// 监听流式响应
const eventSource = new EventSource('/api/ai/chat-stream');

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'session':
      console.log('会话ID:', data.sessionId);
      break;

    case 'content':
      // 逐字显示AI回复
      appendText(data.content);
      break;

    case 'recommendation_cards':
      // ⭐ 渲染推荐卡片
      renderCards({
        rush: data.data.rush,
        stable: data.data.stable,
        safe: data.data.safe,
        summary: data.summary
      });
      break;

    case 'done':
      console.log('对话完成');
      eventSource.close();
      break;
  }
});
```

## 📋 卡片数据结构（精简版）

```typescript
interface RecommendationCard {
  // 基本信息
  groupId: string;           // "10284_01"
  collegeName: string;       // "南京大学"
  groupName: string;         // "物理类专业组01"

  // 核心分类
  riskLevel: '冲'|'稳'|'保';
  probability: number;       // 录取概率 0-100
  adjustmentRisk: '高'|'中'|'低';

  // 分数分析
  userScore: number;         // 用户分数
  avgMinScore: number;       // 历史平均分
  scoreGap: number;          // 分数差距

  // 历史数据（3-5年）
  historicalData: Array<{
    year: number;
    minScore: number;
    minRank: number;
    planCount: number;
  }>;

  // 专业信息
  majors: Array<{
    majorName: string;
    planCount: number;
    tuition: number;
  }>;
  totalPlanCount: number;

  // 智能分析
  recommendReasons: string[];  // 推荐理由
  warnings: string[];          // 风险警告
  highlights: string[];        // 亮点标签
}
```

## 🧪 快速测试命令

### 1. 编译检查
```bash
npx tsc --noEmit
```

### 2. 启动服务器
```bash
npm run dev
```

### 3. 测试推荐接口
```bash
curl -X POST http://localhost:3000/api/ai/chat-stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "我是江苏考生，物理类，高考分数650分，位次1200名，我想学计算机专业",
    "userId": "test-user"
  }'
```

## 🔍 关键日志标识

成功执行时的日志输出：

```
🔧 调用工具: get_recommendation_ids
✅ 工具执行完成: 成功
🎯 检测到推荐ID列表，标记需要获取卡片数据
📦 开始获取推荐卡片数据...
✅ 成功获取 40 个卡片数据
✅ 卡片数据已推送给前端
```

错误日志标识：

```
❌ 获取卡片数据失败: [错误信息]
❌ 工具执行失败: [工具名称]
```

## ⚙️ 配置要点

### AI System Prompt（关键部分）

```
### ⭐ get_recommendation_ids 工具（推荐使用）
核心能力：
- 一次调用返回完整的推荐ID列表（冲12 + 稳20 + 保8）
- 只返回专业组ID和摘要信息，不返回详细数据
- 系统会自动获取卡片数据并推送给前端
- 大幅降低Token消耗（从20k降至500 tokens）

✅ 正确使用方式：
1. 调用 get_recommendation_ids 工具
2. 向用户说明推荐结果的总体情况
3. 卡片数据会自动加载并推送给前端

❌ 不要做：
- 不要尝试描述每个推荐的详细信息
- 不要输出推荐卡片的JSON格式
```

### 工具注册顺序

```typescript
// src/ai/tools/index.ts
registry.register(new GetRecommendationIdsTool());  // ⭐ 新版（推荐）
registry.register(new SmartRecommendationTool());    // ⚠️ 旧版（兼容）
```

## 🚨 常见问题速查

| 问题 | 可能原因 | 快速解决 |
|-----|---------|---------|
| 没收到卡片数据 | AI未调用新工具 | 检查用户输入是否包含分数/位次 |
| 卡片数据不完整 | 历史数据缺失 | 检查admission_scores表 |
| Token消耗仍高 | AI调用了旧工具 | 检查system prompt是否更新 |
| 响应速度慢 | 未使用批量查询 | 检查SQL是否用了IN子句 |

## 📊 性能监控指标

### 需要监控的指标

1. **Token消耗**: 目标 ~500, 警戒 >1000
2. **响应时间**: 目标 3-5秒, 警戒 >8秒
3. **数据库查询**: 目标 2-3次, 警戒 >5次
4. **卡片完整性**: 目标 100%, 警戒 <95%

### 日志分析命令

```bash
# 统计工具调用次数
grep "调用工具:" logs/app.log | sort | uniq -c

# 统计卡片数据获取耗时
grep "成功获取.*卡片数据" logs/app.log | wc -l

# 查找错误
grep "❌" logs/app.log | tail -20
```

## 🔗 相关文档

- **完整实现文档**: [RECOMMENDATION_CARDS_V2_IMPLEMENTATION.md](./RECOMMENDATION_CARDS_V2_IMPLEMENTATION.md)
- **测试指南**: [TESTING_GUIDE_V2.md](./TESTING_GUIDE_V2.md)
- **API文档**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **旧版实现**: [RECOMMENDATION_CARD_IMPLEMENTATION.md](./RECOMMENDATION_CARD_IMPLEMENTATION.md)

## ✅ 检查清单

部署前必检项：

- [ ] TypeScript编译通过 (`npx tsc --noEmit`)
- [ ] 新工具已注册 (`src/ai/tools/index.ts`)
- [ ] System prompt已更新（标记新工具为推荐）
- [ ] 数据库连接正常
- [ ] 历史数据完整（至少3年）
- [ ] 前端监听 `recommendation_cards` 事件

---

**版本**: v1.0
**更新**: 2025-01-31
**适用**: 推荐卡片V2实现
