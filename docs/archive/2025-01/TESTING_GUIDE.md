# 🧪 推荐系统测试指南

## 快速验证修复

### 1️⃣ 重启应用

```bash
# 停止当前运行的应用 (Ctrl+C)
npm run dev
```

等待应用启动成功，看到：
```
✅ Server is running on port 8080
✅ Database connection successful
```

---

### 2️⃣ 测试推荐API

```bash
# 生成推荐（替换YOUR_TOKEN和YOUR_SESSION_ID）
curl -X POST http://localhost:8080/api/agent/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "099ff94c-e859-44c9-839a-6501a44dc6ec",
    "count": 20
  }'
```

---

### 3️⃣ 检查返回结果

#### ✅ 检查点1: 专业名称不再是"未知专业"

**期望看到**:
```json
{
  "recommendations": [
    {
      "majorName": "计算机科学与技术",  // ✅ 不是"未知专业"
      "collegeName": "南京大学"
    },
    {
      "majorName": "软件工程",  // ✅ 实际专业名称
      "collegeName": "东南大学"
    }
  ]
}
```

**如果看到"未知专业"**: 说明plan.majorName和plan.majorGroupName都为NULL，需要检查数据库

---

#### ✅ 检查点2: 专业评分不为0

**期望看到**:
```json
{
  "dimensionScores": {
    "majorScore": 65.5,  // ✅ 不是0，范围应该在30-100之间
    "employmentScore": 60,  // ✅ 至少是60（默认值）
    "personalityFitScore": 75  // ✅ 不是0
  }
}
```

**如果专业评分为0**: 检查用户偏好中是否设置了"目标专业"或"专业类别偏好"

---

#### ✅ 检查点3: 城市和院校评分不固定

**测试方法**:

1. **场景A**: 用户偏好设置"目标城市=北京"
   ```bash
   # 先更新偏好，然后重新生成推荐
   ```

   **期望**: 北京的学校城市得分 > 其他城市

2. **场景B**: 用户偏好设置"院校层次=985"

   **期望**: 985院校得分 > 211 > 普通本科

**示例对比**:
```json
// 北京985院校
{
  "collegeName": "北京大学",
  "dimensionScores": {
    "collegeScore": 95,  // ✅ 985高分
    "cityScore": 90      // ✅ 北京 + 用户偏好北京
  }
}

// 非目标城市的普通本科
{
  "collegeName": "XX学院",
  "dimensionScores": {
    "collegeScore": 55,  // ✅ 普通本科较低分
    "cityScore": 40      // ✅ 不在目标城市
  }
}
```

---

#### ✅ 检查点4: 评分会根据用户偏好动态变化

**测试步骤**:

1. 生成第一次推荐，记录评分
2. 修改用户偏好（如：改变MBTI、目标城市、院校层次）
3. 重新生成推荐，观察评分变化

**期望**:
- MBTI改为INTJ后，计算机专业的性格匹配度应接近95分
- 目标城市改为上海后，上海的学校城市得分显著提高
- 院校层次偏好改为"211"后，211院校评分提高

---

### 4️⃣ 测试诊断API（可选）

```bash
# 诊断数据库状态
curl -X GET http://localhost:8080/api/diagnostic/database \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**期望输出**:
```json
{
  "success": true,
  "data": {
    "totalEnrollmentPlans": 5000,  // ✅ 应该 > 0
    "totalColleges": 200,          // ✅ 应该 > 0
    "jiangsuData": [               // ✅ 应该有江苏的数据
      {"province": "江苏", "year": 2025, "count": 1500}
    ],
    "nullCollegeIdCount": 5000,    // ⚠️ 可以调用/fix修复
    "issues": [],
    "summary": {
      "status": "healthy"
    }
  }
}
```

如果 `nullCollegeIdCount > 0`，可以运行修复：

```bash
# 自动关联college_id
curl -X POST http://localhost:8080/api/diagnostic/fix \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 调试技巧

### 查看详细日志

应用启动后，推荐生成时会输出详细日志：

```
🚀 开始生成增强推荐...
用户: user123, 分数: 580, 省份: 江苏
🔍 查询招生计划: 省份=江苏, 科类=物理类, 年份=2025
📦 找到 500 条招生计划
📊 完成 450 个候选的评分
✅ 生成 40 条推荐
```

**如果看到**:
- `📦 找到 0 条招生计划` → 数据库没有匹配数据，检查省份/科类/年份
- `📊 完成 0 个候选的评分` → 分数筛选太严格，检查分数范围
- `✅ 生成 0 条推荐` → 所有候选被过滤，检查筛选逻辑

---

### 清除缓存测试

如果修改了代码但推荐结果没变化，可能是缓存：

```bash
# 方法1: 修改用户偏好（会自动失效缓存）
# 方法2: 重启Redis
# 方法3: 手动删除Redis中的缓存键

# 使用redis-cli
redis-cli
> KEYS rec:*
> DEL rec:user123:session456:...
```

---

## 常见问题排查

### Q1: 所有推荐的评分几乎一样

**可能原因**:
1. 用户没有设置偏好（所有权重都是默认值）
2. 候选院校都很相似（如：都是同一城市的普通本科）
3. colleges表数据不完整（所有college的city/province都是NULL）

**解决**:
1. 设置更多用户偏好（目标城市、院校层次、专业类别）
2. 调用 `/api/diagnostic/database` 检查colleges表数据
3. 调用 `/api/diagnostic/fix` 修复college_id关联

---

### Q2: 专业名称仍然是"未知专业"

**可能原因**:
1. enrollment_plans表的 `major_name` 和 `major_group_name` 都是NULL
2. 数据导入时没有填充这些字段

**解决**:
```sql
-- 检查数据
SELECT major_name, major_group_name, major_group_code
FROM enrollment_plans
WHERE source_province = '江苏'
LIMIT 10;

-- 如果都是NULL，需要重新导入数据或手动填充
```

---

### Q3: 城市评分总是70分（默认值）

**可能原因**:
1. colleges表的 `city` 字段为NULL
2. enrollment_plans的 `college_id` 为NULL，且colleges表没有匹配的 `college_name`

**解决**:
```sql
-- 检查colleges表
SELECT id, name, city, province FROM colleges LIMIT 10;

-- 检查关联情况
SELECT ep.college_name, c.name, c.city
FROM enrollment_plans ep
LEFT JOIN colleges c ON ep.college_id = c.id
WHERE ep.source_province = '江苏'
LIMIT 10;
```

如果college_id为NULL但college_name有值，调用 `/api/diagnostic/fix`

---

## 性能检查

### 推荐生成时间

**正常情况**: 1-3秒
**如果超过5秒**:
1. 检查是否每次都查询colleges表（college_id为NULL时）
2. 考虑运行 `/api/diagnostic/fix` 修复关联
3. 考虑为colleges表添加索引

```sql
-- 添加索引
CREATE INDEX idx_colleges_name ON colleges(name);
CREATE INDEX idx_enrollment_college_id ON enrollment_plans(college_id);
```

---

## 成功标志

✅ 专业名称显示真实名称（不是"未知专业"）
✅ 专业评分在30-100之间波动（不是0）
✅ 就业评分至少60分（不是0）
✅ 城市评分根据用户偏好变化（不是固定50）
✅ 院校评分根据985/211/排名变化（不是固定62.72）
✅ 推荐结果有梯度（冲刺、稳妥、保底）
✅ 生成时间 < 3秒

---

## 下一步优化（可选）

1. **数据完整性**:
   - 运行 `/api/diagnostic/fix` 修复college_id
   - 导入更完整的院校和专业数据

2. **性能优化**:
   - 批量查询colleges表（而不是逐个查询）
   - 缓存colleges表到Redis

3. **算法调优**:
   - 根据实际使用调整各维度权重
   - 优化专业匹配算法（引入同义词、相关专业）

---

生成时间: 2025-01-XX
适用版本: 修复后的embedding-recommendation.service.ts
