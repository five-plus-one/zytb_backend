# API 测试脚本

本文档提供了快速测试各个 API 接口的 curl 命令。

## 准备工作

确保服务已启动:
```bash
npm run dev
```

## 环境变量

```bash
# 设置基础 URL
BASE_URL="http://localhost:3000/api"
```

## 用户模块

### 1. 用户注册（无需验证码）

```bash
curl -X POST $BASE_URL/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser001",
    "password": "123456",
    "nickname": "测试用户",
    "phone": "13800138000",
    "email": "test@example.com"
  }'
```

### 2. 用户登录

```bash
curl -X POST $BASE_URL/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser001",
    "password": "123456"
  }'
```

保存返回的 token:
```bash
TOKEN="your_token_here"
```

### 3. 获取用户信息

```bash
curl -X GET $BASE_URL/user/info \
  -H "Authorization: Bearer $TOKEN"
```

### 4. 更新用户信息

```bash
curl -X PUT $BASE_URL/user/info \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "新昵称",
    "province": "浙江",
    "city": "杭州",
    "examScore": 650,
    "subjectType": "physics"
  }'
```

### 5. 修改密码

```bash
curl -X PUT $BASE_URL/user/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "123456",
    "newPassword": "654321"
  }'
```

## 院校模块

### 1. 获取院校列表

```bash
# 基础查询
curl -X GET "$BASE_URL/college/list?pageNum=1&pageSize=10"

# 带筛选条件
curl -X GET "$BASE_URL/college/list?pageNum=1&pageSize=10&province=北京&level=985"

# 关键词搜索
curl -X GET "$BASE_URL/college/list?pageNum=1&pageSize=10&keyword=大学"
```

### 2. 获取院校详情

```bash
curl -X GET $BASE_URL/college/college-001
```

### 3. 获取招生计划

```bash
curl -X GET "$BASE_URL/college/college-001/plan?year=2024&province=浙江"
```

### 4. 获取历年分数线

```bash
curl -X GET "$BASE_URL/college/college-001/scores?province=浙江&subjectType=physics&years=3"
```

### 5. 院校对比

```bash
curl -X POST $BASE_URL/college/compare \
  -H "Content-Type: application/json" \
  -d '{
    "collegeIds": ["college-001", "college-002", "college-003"]
  }'
```

## 专业模块

### 1. 获取专业列表

```bash
# 基础查询
curl -X GET "$BASE_URL/major/list?pageNum=1&pageSize=10"

# 按类别筛选
curl -X GET "$BASE_URL/major/list?pageNum=1&pageSize=10&category=engineering"

# 查询热门专业
curl -X GET "$BASE_URL/major/list?pageNum=1&pageSize=10&hot=true"
```

### 2. 获取专业详情

```bash
curl -X GET $BASE_URL/major/major-001
```

### 3. 获取专业开设院校

```bash
curl -X GET "$BASE_URL/major/major-001/colleges?pageNum=1&pageSize=10"
```

## 志愿模块

### 1. 获取我的志愿

```bash
curl -X GET $BASE_URL/volunteer/my \
  -H "Authorization: Bearer $TOKEN"
```

### 2. 保存志愿(草稿)

```bash
curl -X POST $BASE_URL/volunteer/save \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteers": [
      {
        "priority": 1,
        "collegeId": "college-001",
        "majorId": "major-001",
        "isObeyAdjustment": true,
        "remarks": "第一志愿"
      },
      {
        "priority": 2,
        "collegeId": "college-002",
        "majorId": "major-002",
        "isObeyAdjustment": true,
        "remarks": "第二志愿"
      }
    ]
  }'
```

### 3. 提交志愿

```bash
curl -X POST $BASE_URL/volunteer/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteers": [
      {
        "priority": 1,
        "collegeId": "college-001",
        "majorId": "major-001",
        "isObeyAdjustment": true,
        "remarks": "第一志愿"
      }
    ]
  }'
```

### 4. 志愿智能推荐

```bash
curl -X POST $BASE_URL/volunteer/recommend \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 650,
    "province": "浙江",
    "subjectType": "physics",
    "rank": 1000,
    "preference": {
      "province": ["北京", "上海"],
      "collegeType": ["985", "211"],
      "majorCategory": ["engineering"],
      "isObeyAdjustment": true
    },
    "count": 30
  }'
```

### 5. 志愿分析

```bash
curl -X POST $BASE_URL/volunteer/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "volunteers": [
      {
        "collegeId": "college-001",
        "majorId": "major-001"
      },
      {
        "collegeId": "college-002",
        "majorId": "major-002"
      }
    ],
    "userScore": 650,
    "userRank": 1000,
    "province": "浙江",
    "subjectType": "physics"
  }'
```

## 系统模块

### 1. 获取省份列表

```bash
curl -X GET $BASE_URL/system/provinces
```

### 2. 获取数据字典

```bash
# 院校类型
curl -X GET "$BASE_URL/system/dict?type=college_type"

# 院校层次
curl -X GET "$BASE_URL/system/dict?type=college_level"

# 专业类别
curl -X GET "$BASE_URL/system/dict?type=major_category"

# 科目类型
curl -X GET "$BASE_URL/system/dict?type=subject_type"
```

### 3. 获取系统配置

```bash
curl -X GET $BASE_URL/system/config
```

### 4. 数据统计

```bash
curl -X GET $BASE_URL/system/statistics
```

### 5. 文件上传

```bash
curl -X POST $BASE_URL/system/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your/image.jpg" \
  -F "type=avatar"
```

## 健康检查

```bash
curl -X GET $BASE_URL/health
```

## 完整测试流程

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "=== 1. 用户注册（无需验证码）==="
REGISTER_RESULT=$(curl -s -X POST $BASE_URL/user/register \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"testuser$(date +%s)\",
    \"password\": \"123456\",
    \"nickname\": \"测试用户\",
    \"phone\": \"13800138000\",
    \"email\": \"test@example.com\"
  }")

echo $REGISTER_RESULT

TOKEN=$(echo $REGISTER_RESULT | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo -e "\n=== 2. 获取用户信息 ==="
curl -X GET $BASE_URL/user/info \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== 3. 获取院校列表 ==="
curl -X GET "$BASE_URL/college/list?pageNum=1&pageSize=5"

echo -e "\n\n=== 4. 获取专业列表 ==="
curl -X GET "$BASE_URL/major/list?pageNum=1&pageSize=5"

echo -e "\n\n测试完成!"
```

保存为 `test.sh` 并执行:
```bash
chmod +x test.sh
./test.sh
```

> **注意**: 注册流程已简化，无需验证码。发送验证码接口 `/api/user/verify-code` 仍然保留，可用于其他需要验证码的场景（如密码重置等）。
