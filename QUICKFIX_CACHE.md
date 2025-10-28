# 缓存问题快速修复指南

## 问题诊断

你遇到的问题：**返回0条推荐**

```
✅ 使用缓存的推荐结果
✅ 生成了 0 条增强推荐
```

**根本原因**：之前的请求因为TypeORM错误失败，但系统缓存了空数组（0条推荐）。后续请求直接返回了这个错误的缓存。

## 立即修复步骤

### 方法1：使用新增的清除缓存API（推荐）

```bash
curl -X POST http://localhost:3000/api/agent/clear-cache \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "userId": "449a3d10-f2e0-48c9-97de-8c00e01f040f",
    "sessionId": "099ff94c-e859-44c9-839a-6501a44dc6ec"
  }'
```

### 方法2：直接清除Redis缓存

如果有Redis CLI访问权限：

```bash
# 清除特定用户的缓存
redis-cli DEL rec:449a3d10-f2e0-48c9-97de-8c00e01f040f:099ff94c-e859-44c9-839a-6501a44dc6ec
redis-cli DEL emb_user:449a3d10-f2e0-48c9-97de-8c00e01f040f:099ff94c-e859-44c9-839a-6501a44dc6ec

# 或清除所有推荐缓存
redis-cli KEYS "rec:*" | xargs redis-cli DEL
```

### 方法3：重启Redis（清空所有缓存）

```bash
redis-cli FLUSHDB
```

## 已实施的改进

### 1. 不缓存空结果

**文件**: `src/services/agent/embedding-recommendation.service.ts:147-155`

```typescript
// Step 6: 缓存结果（只缓存非空结果）
if (finalRecommendations && finalRecommendations.length > 0) {
  await cacheService.cacheRecommendations(
    userId,
    sessionId,
    finalRecommendations,
    cacheContext
  );
}
```

**效果**: 如果生成0条推荐，系统不会缓存这个结果，下次请求会重新生成。

### 2. 新增清除缓存API

**路由**: `POST /api/agent/clear-cache`

**请求体**:
```json
{
  "userId": "449a3d10-f2e0-48c9-97de-8c00e01f040f",
  "sessionId": "099ff94c-e859-44c9-839a-6501a44dc6ec"  // 可选
}
```

**功能**:
- 清除用户的推荐缓存 (`rec:*`)
- 清除用户的嵌入向量缓存 (`emb_user:*`)
- 清除用户的偏好缓存 (`pref:*`)

### 3. 增强日志输出

**新增日志**:
```
🔍 查询招生计划: 省份=江苏, 科类=物理, 年份=2025
📦 找到 XXX 条招生计划
```

**用途**: 帮助诊断为什么没有找到候选

## 重新测试步骤

### Step 1: 清除缓存

```bash
curl -X POST http://localhost:3000/api/agent/clear-cache \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "userId": "449a3d10-f2e0-48c9-97de-8c00e01f040f",
    "sessionId": "099ff94c-e859-44c9-839a-6501a44dc6ec"
  }'
```

### Step 2: 重新生成推荐

```bash
curl -X POST http://localhost:3000/api/agent/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "sessionId": "099ff94c-e859-44c9-839a-6501a44dc6ec",
    "count": 60
  }'
```

### Step 3: 观察日志

应该看到类似输出：

```
📊 使用增强嵌入推荐引擎生成志愿推荐...
🚀 开始生成增强推荐...
用户: 449a3d10-f2e0-48c9-97de-8c00e01f040f, 分数: 638, 省份: 江苏
🔄 生成新的推荐结果...
✅ 使用缓存的用户嵌入向量
🔍 查询招生计划: 省份=江苏, 科类=物理, 年份=2025
📦 找到 XXX 条招生计划
📋 获取到 XXX 个候选院校专业组合
📊 完成 XXX 个候选的评分
✅ 生成 60 条推荐
```

## 可能的问题排查

### 问题1: 仍然返回0条

**可能原因**:
- 数据库中没有对应省份/科类/年份的招生计划数据
- `subjectType` 字段值不匹配（例如："物理类" vs "物理"）

**检查方法**:
```sql
SELECT COUNT(*) FROM enrollment_plans
WHERE source_province = '江苏'
  AND subject_type = '物理'
  AND year = 2025;
```

**解决**:
- 确认数据库中的 `subject_type` 字段值格式
- 检查 `year` 是否有当年数据
- 查看日志中的"📦 找到 X 条招生计划"，如果是0说明数据问题

### 问题2: 找到招生计划但没有候选

**可能原因**:
- 历史录取分数数据缺失
- `AdmissionScore` 表中的 `collegeName` / `majorGroup` 与 `EnrollmentPlan` 不匹配

**检查方法**:
```sql
SELECT DISTINCT college_name, major_group
FROM admission_scores
WHERE source_province = '江苏'
  AND subject_type = '物理类'
LIMIT 10;
```

**注意**: `AdmissionScore` 使用 `subject_type = '物理类'`，而 `EnrollmentPlan` 使用 `subject_type = '物理'`

### 问题3: Redis连接失败

**症状**:
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解决**:
```bash
# Windows
redis-server

# Linux/Mac
sudo service redis start
# 或
redis-server
```

## 数据字段对照表

| 表名 | 省份字段 | 科类字段 | 院校字段 | 专业组字段 |
|------|---------|---------|---------|-----------|
| EnrollmentPlan | `sourceProvince` | `subjectType`<br>(值: "物理", "历史") | `collegeName` | `majorGroupCode` |
| AdmissionScore | `sourceProvince` | `subjectType`<br>(值: "物理类", "历史类") | `collegeName` | `majorGroup` |

**注意**: 科类字段值格式不同！查询时需要转换。

## 系统行为总结

### 缓存策略
1. **推荐结果缓存** (`rec:*`): TTL 1小时
   - 只缓存非空结果
   - 验证上下文（分数、省份、偏好哈希）

2. **用户嵌入向量缓存** (`emb_user:*`): TTL 2小时
   - 带MD5哈希版本控制
   - 偏好变化自动失效

3. **专业嵌入向量缓存** (`emb_major:*`): TTL 24小时
   - 长期缓存
   - 很少变化

### 缓存失效条件
- TTL过期
- 用户偏好更新（MD5哈希变化）
- 用户分数变化
- 省份变化
- 手动清除

## 总结

现在系统已经：
✅ 修复了TypeORM查询错误
✅ 不会缓存空结果
✅ 提供了清除缓存API
✅ 增强了日志输出

**下一步**: 清除缓存后重新测试！
