# 🔧 评分问题修复 - 立即测试

## 修复内容

### 1. ✅ 院校信息模糊匹配
- **问题**: enrollment_plans的`collegeName`与colleges表的`name`不完全匹配
- **修复**: 添加模糊匹配逻辑
  - 先精确匹配
  - 失败后去除括号内容再模糊匹配
  - 使用LIKE查询

### 2. ✅ 专业信息多级匹配
- **问题**: 专业查找只通过专业组查找，成功率低
- **修复**: 4级匹配策略
  1. 专业代码精确匹配
  2. 专业名称精确匹配
  3. 专业名称模糊匹配
  4. 专业组嵌入向量匹配

### 3. ✅ 详细调试日志
添加了每条推荐的详细日志输出：
- 院校信息（城市、省份、985/211/双一流、排名）
- 是否找到Major对象
- 各维度评分详情

---

## 立即测试步骤

### 第1步：清除所有缓存

```bash
cd e:\5plus1\DEV\zytb\zy_backend
node clear-cache.js
```

**预期输出**:
```
🗑️  开始清除缓存...
✅ 已删除 X 个推荐缓存
✅ 已删除 X 个偏好缓存
✅ 已删除 X 个嵌入向量缓存
✨ 缓存清除完成！
```

---

### 第2步：重启应用

```bash
# 停止当前运行 (Ctrl+C)
npm run dev
```

等待应用启动成功。

---

### 第3步：调用推荐API

```bash
# Windows PowerShell
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN"
    "Content-Type" = "application/json"
}

$body = @{
    sessionId = "099ff94c-e859-44c9-839a-6501a44dc6ec"
    count = 20
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/agent/generate" -Method POST -Headers $headers -Body $body
```

或者使用curl:

```bash
curl -X POST http://localhost:8080/api/agent/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"099ff94c-e859-44c9-839a-6501a44dc6ec","count":20}'
```

---

### 第4步：查看调试日志

在控制台中，你应该看到类似这样的输出：

```
[评分调试] =====================================
[评分调试] 院校: 南京大学
[评分调试] 专业: 计算机科学与技术
[评分调试] 找到Major对象: 是 (计算机科学与技术)
[评分调试] 院校信息:
  - 城市: 南京
  - 省份: 江苏
  - 985: true
  - 211: true
  - 双一流: true
  - 排名: 7
[评分调试] 各维度得分:
  - 院校得分: 95.00
  - 专业得分: 80.00
  - 城市得分: 85.00
  - 就业得分: 75.00
  - 成本得分: 60.00
  - 性格匹配: 90.00
  - 职业匹配: 70.00
  - 嵌入匹配: 82.50
```

---

## 检查点

### ✅ 检查点1: 院校信息不再是NULL

**日志应该显示**:
```
  - 城市: 南京     ← 不是NULL
  - 省份: 江苏     ← 不是NULL
  - 985: true      ← 不是false（如果是985院校）
```

**如果仍然是NULL**:
1. 检查colleges表是否有数据：
   ```sql
   SELECT id, name, city, province, is_985, is_211
   FROM colleges
   LIMIT 10;
   ```

2. 检查enrollment_plans的collegeName格式：
   ```sql
   SELECT DISTINCT college_name
   FROM enrollment_plans
   WHERE source_province = '江苏'
   LIMIT 10;
   ```

3. 手动测试匹配：
   ```sql
   SELECT c.name, c.city, c.province
   FROM colleges c
   WHERE c.name LIKE '%南京大学%';
   ```

---

### ✅ 检查点2: 找到Major对象

**日志应该显示**:
```
[评分调试] 找到Major对象: 是 (计算机科学与技术)
```

**如果仍然显示"否"**:
1. 检查majors表是否有数据：
   ```sql
   SELECT id, name, code, category
   FROM majors
   LIMIT 10;
   ```

2. 检查专业名称格式：
   ```sql
   SELECT DISTINCT major_name, major_code
   FROM enrollment_plans
   WHERE source_province = '江苏'
   LIMIT 10;
   ```

3. 手动测试匹配：
   ```sql
   SELECT name, code, category
   FROM majors
   WHERE name LIKE '%计算机%';
   ```

---

### ✅ 检查点3: 评分不再固定

**观察多条推荐的评分**:

```
推荐1（985+计算机）:
  - 院校得分: 95.00
  - 专业得分: 85.00
  - 城市得分: 90.00

推荐2（211+电子信息）:
  - 院校得分: 85.00    ← 不同
  - 专业得分: 70.00    ← 不同
  - 城市得分: 75.00    ← 不同

推荐3（普通本科+其他专业）:
  - 院校得分: 60.00    ← 更低
  - 专业得分: 55.00    ← 更低
  - 城市得分: 50.00    ← 更低
```

**如果评分仍然相同**:
说明所有候选的院校和专业信息都类似，这可能是正常的。

---

### ✅ 检查点4: 专业和就业评分不为0

**日志应该显示**:
```
  - 专业得分: 60.00 以上   ← 不是0
  - 就业得分: 60.00 以上   ← 不是0
```

**如果仍然是0**:
检查用户偏好设置：
```sql
SELECT indicator_code, value
FROM agent_preferences
WHERE user_id = 'YOUR_USER_ID';
```

确认有以下偏好：
- `目标专业` 或 `专业类别偏好`
- `CORE_02` (就业-深造权重)

---

## 常见问题排查

### 问题1: 日志中所有院校城市都是NULL

**原因**: colleges表没有city字段数据

**解决**:
```sql
-- 检查colleges表
SELECT COUNT(*) as total,
       COUNT(city) as has_city,
       COUNT(province) as has_province
FROM colleges;

-- 如果has_city = 0，需要导入城市数据
```

---

### 问题2: 日志中所有"找到Major对象: 否"

**原因**: majors表没有数据，或者名称完全不匹配

**解决**:
```sql
-- 检查majors表
SELECT COUNT(*) FROM majors;

-- 检查enrollment_plans的专业名称
SELECT DISTINCT major_name FROM enrollment_plans LIMIT 20;

-- 检查majors表的专业名称
SELECT DISTINCT name FROM majors LIMIT 20;

-- 对比两者是否有交集
```

---

### 问题3: 评分仍然很接近

**可能原因**:
1. 所有候选确实都很相似（同城市、同层次）
2. 用户没有设置偏好，都使用默认分

**解决**:
设置更多用户偏好：
- 目标城市: 北京、上海
- 院校层次: 985
- 目标专业: 计算机科学与技术
- MBTI: INTJ

然后重新生成推荐，观察评分差异。

---

## 成功标志

✅ 日志中院校信息完整（city, province, is985等都有值）
✅ 部分推荐"找到Major对象: 是"
✅ 专业评分 > 0
✅ 就业评分 >= 60
✅ 不同推荐的评分有显著差异（至少10分以上）
✅ 返回结果中专业名称不是"未知专业"

---

## 如果问题仍然存在

请将以下信息发给我：

1. **清除缓存的输出**
2. **前3条推荐的完整日志** (从`[评分调试]`开始)
3. **返回的JSON结果**（前2条推荐）
4. **数据库检查结果**:
   ```sql
   -- 1. colleges表样本
   SELECT id, name, city, province, is_985, is_211, rank
   FROM colleges
   LIMIT 3;

   -- 2. enrollment_plans表样本
   SELECT id, college_name, major_name, major_code
   FROM enrollment_plans
   WHERE source_province = '江苏'
   LIMIT 3;

   -- 3. majors表样本
   SELECT id, name, code, category
   FROM majors
   LIMIT 3;
   ```

有了这些信息，我可以精确定位问题所在！

---

生成时间: 2025-01-XX
修复版本: embedding-recommendation.service.ts (模糊匹配版)
