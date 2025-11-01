# 🔧 自动诊断和修复指南

## 问题确认

系统显示：**数据库中没有符合条件的招生计划数据**

```
📦 找到 0 条招生计划
查询条件: 省份 IN [江苏, 江苏, 江苏省]
查询条件: 科类 IN [物理类, 物理, 物理类]
查询条件: 年份 = 2025
```

## 🚀 立即操作

我已经创建了自动诊断API，现在请按以下步骤操作：

### 步骤1: 重启应用（应用新的诊断API）

```bash
# 停止当前应用 (Ctrl+C)
npm run dev
```

### 步骤2: 调用诊断API

```bash
# 诊断数据库
GET http://localhost:8080/api/diagnostic/database
Authorization: Bearer <your_token>
```

**或使用curl**:
```bash
curl -X GET http://localhost:8080/api/diagnostic/database \
  -H "Authorization: Bearer <your_token>"
```

这将返回详细的诊断报告，包括：
- ✅ 表中的总记录数
- ✅ 实际的字段值格式（省份、科类、年份）
- ✅ 江苏省数据统计
- ✅ college_id关联情况
- ✅ 年份分布
- ✅ 问题列表和修复建议

### 步骤3: 根据诊断结果自动修复

如果诊断显示可以自动修复（例如college_id未关联），调用：

```bash
# 自动修复
POST http://localhost:8080/api/diagnostic/fix
Authorization: Bearer <your_token>
```

**或使用curl**:
```bash
curl -X POST http://localhost:8080/api/diagnostic/fix \
  -H "Authorization: Bearer <your_token>"
```

## 📊 可能的诊断结果

### 情况A: 表是空的

**诊断结果**:
```json
{
  "data": {
    "totalEnrollmentPlans": 0
  },
  "issues": ["enrollment_plans表是空的"],
  "suggestions": ["需要导入招生计划数据"]
}
```

**解决方案**:
- 你需要招生计划数据文件（Excel）
- 是否有2025年江苏省的招生计划数据？

### 情况B: 有数据但格式不匹配

**诊断结果**:
```json
{
  "data": {
    "sampleData": [
      {"province": "江苏省", "subjectType": "物理", "year": 2024}
    ],
    "jiangsuData": []
  },
  "issues": ["没有找到江苏省相关数据"]
}
```

**原因**: 数据库使用"江苏省"和"物理"，但查询用"江苏"和"物理类"

**解决**: 系统已经配置了兼容性查询，但可能需要调整

### 情况C: 年份不对

**诊断结果**:
```json
{
  "data": {
    "yearDistribution": [
      {"year": 2024, "count": 5000},
      {"year": 2023, "count": 4800}
    ]
  },
  "issues": ["数据库最新年份是2024，不是2025"]
}
```

**解决**: 系统会自动使用2024年数据

### 情况D: college_id未关联

**诊断结果**:
```json
{
  "data": {
    "nullCollegeIdCount": 5000
  },
  "issues": ["有 5000 条记录的college_id为NULL"]
}
```

**解决**: 调用 `/api/diagnostic/fix` 自动关联

## 🎯 快速测试流程

1. **重启应用**
   ```bash
   npm run dev
   ```

2. **调用诊断API**（需要登录获取token）
   ```bash
   # 如果你有token
   curl http://localhost:8080/api/diagnostic/database \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **查看诊断结果**，根据建议操作

4. **如果可以自动修复**，调用修复API
   ```bash
   curl -X POST http://localhost:8080/api/diagnostic/fix \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

5. **重新测试推荐**
   ```bash
   curl -X POST http://localhost:8080/api/agent/generate \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "099ff94c-e859-44c9-839a-6501a44dc6ec", "count": 60}'
   ```

## 📝 如果需要导入数据

如果诊断显示表是空的，我可以帮你：

1. **创建导入脚本**（如果你有数据文件）
2. **创建测试数据**（用于快速验证功能）
3. **指导数据格式**（如果你要准备数据）

## 🔍 诊断API详细说明

### GET /api/diagnostic/database

**响应示例**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-XX...",
    "issues": [
      "enrollment_plans表是空的",
      "colleges表是空的"
    ],
    "suggestions": [
      "需要导入招生计划数据",
      "需要先导入院校数据"
    ],
    "data": {
      "totalEnrollmentPlans": 0,
      "totalColleges": 100,
      "sampleData": [...],
      "jiangsuData": [...],
      "yearDistribution": [...],
      "testQueryResult": {
        "resultCount": 0
      }
    },
    "summary": {
      "totalIssues": 2,
      "canAutoFix": false,
      "status": "needs_attention"
    }
  }
}
```

### POST /api/diagnostic/fix

**响应示例**:
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-XX...",
    "fixes": [
      {
        "type": "college_id_association",
        "description": "关联了 5000 条记录的college_id",
        "count": 5000
      }
    ],
    "summary": {
      "totalFixes": 1,
      "success": true
    }
  }
}
```

## ⏭️ 下一步

**请先重启应用，然后告诉我诊断API的返回结果，我会根据具体情况给出精确的解决方案！**

如果你无法调用API（例如没有token），请直接告诉我：
1. 是否有招生计划数据文件？
2. 数据库中是否应该有数据？
3. 是否需要我创建测试数据？
