# 志愿填报系统 - 前端API接口文档

**Base URL:** `http://localhost:11452/api`

---

## 1. 用户认证模块

### 1.1 用户注册
```
POST /users/register
```

**请求体:**
```json
{
  "username": "testuser",
  "password": "password123",
  "nickname": "测试用户",
  "phone": "13800138000",
  "email": "test@example.com"
}
```

**响应:**
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "id": "uuid",
    "username": "testuser",
    "nickname": "测试用户",
    "token": "eyJhbGc..."
  }
}
```

### 1.2 用户登录
```
POST /users/login
```

**请求体:**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**响应:**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid",
      "username": "testuser",
      "nickname": "测试用户",
      "role": "user"
    },
    "token": "eyJhbGc..."
  }
}
```

### 1.3 获取用户信息
```
GET /users/info
Headers: Authorization: Bearer {token}
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "username": "testuser",
    "nickname": "测试用户",
    "phone": "13800138000",
    "email": "test@example.com",
    "examYear": 2024,
    "examScore": 638,
    "examRank": 8837,
    "subjectType": "物理类",
    "selectedSubjects": ["物理", "化学", "生物"],
    "preferences": "{...}",
    "role": "user"
  }
}
```

### 1.4 更新用户档案
```
PUT /users/profile
Headers: Authorization: Bearer {token}
```

**请求体:**
```json
{
  "examYear": 2024,
  "examScore": 638,
  "examRank": 8837,
  "subjectType": "物理类",
  "selectedSubjects": ["物理", "化学", "生物"],
  "preferences": "{\"preferredCities\": [\"南京\", \"苏州\"]}"
}
```

**响应:**
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "examYear": 2024,
    "examScore": 638,
    "examRank": 8837,
    "subjectType": "物理类",
    "selectedSubjects": ["物理", "化学", "生物"]
  }
}
```

### 1.5 修改密码
```
PUT /users/password
Headers: Authorization: Bearer {token}
```

**请求体:**
```json
{
  "oldPassword": "password123",
  "newPassword": "newpassword123"
}
```

---

## 2. AI智能推荐模块

### 2.1 创建会话
```
POST /agent/session
Headers: Authorization: Bearer {token}
```

**请求体:**
```json
{
  "title": "我的志愿咨询"
}
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "sessionId": "uuid",
    "title": "我的志愿咨询",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2.2 发送消息（流式响应）
```
POST /agent/chat
Headers: Authorization: Bearer {token}
Content-Type: application/json
```

**请求体:**
```json
{
  "sessionId": "uuid",
  "message": "我是江苏物理类考生，分数638，帮我推荐计算机专业"
}
```

**响应 (Server-Sent Events):**
```
data: {"type":"chunk","content":"好的"}
data: {"type":"chunk","content":"，我"}
data: {"type":"chunk","content":"来帮"}
...
data: {"type":"metadata","extractedData":{"recommendations":[...]}}
data: {"type":"done","message":"完整回复内容","entities":[...]}
```

**实体标记格式:**
消息中的实体会被标记为：
```
[[entity:college:base64data]]厦门大学[[/entity]]
[[entity:group:base64data]]厦门大学08专业组[[/entity]]
[[entity:major:base64data]]计算机科学与技术[[/entity]]
[[entity:city:base64data]]厦门[[/entity]]
```

前端需要解析这些标记，将其渲染为可点击的蓝色链接。

**前端解析示例:**
```javascript
// 解析标记文本
function parseEntityMarkedText(text) {
  const segments = [];
  const pattern = /\[\[entity:([^:]+):([^\]]+)\]\]([^\[]+)\[\[\/entity\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // 添加普通文本
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      });
    }

    // 添加实体
    const entityType = match[1];
    const entityDataBase64 = match[2];
    const entityText = match[3];
    const entityData = JSON.parse(atob(entityDataBase64));

    segments.push({
      type: 'entity',
      content: entityText,
      entityType: entityType,
      data: entityData
    });

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex)
    });
  }

  return segments;
}

// 渲染
segments.forEach(seg => {
  if (seg.type === 'text') {
    // 普通文本
    append(seg.content);
  } else {
    // 可点击实体
    const link = document.createElement('a');
    link.textContent = seg.content;
    link.className = 'entity-link';
    link.style.color = 'blue';
    link.style.cursor = 'pointer';
    link.onclick = () => handleEntityClick(seg.entityType, seg.data);
    append(link);
  }
});
```

### 2.3 获取会话历史
```
GET /agent/session/{sessionId}/messages?limit=100&offset=0
Headers: Authorization: Bearer {token}
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "我是江苏物理类考生，分数638",
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "[[entity:college:...]]厦门大学[[/entity]]是很好的选择",
        "extractedData": {
          "recommendations": [...]
        },
        "metadata": {
          "entities": [...]
        },
        "createdAt": "2024-01-01T00:00:10.000Z"
      }
    ],
    "total": 10
  }
}
```

### 2.4 获取会话列表
```
GET /agent/sessions
Headers: Authorization: Bearer {token}
```

**响应:**
```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "title": "我的志愿咨询",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T01:00:00.000Z"
    }
  ]
}
```

---

## 3. 招生计划查询模块

### 3.1 快速搜索招生计划（带缓存）
```
GET /enrollment-plan/search
```

**查询参数:**
- `year`: 年份（必填）
- `province`: 省份（必填）
- `collegeName`: 院校名称（可选，模糊匹配）
- `majorName`: 专业名称（可选，模糊匹配）
- `location`: 地区（可选）
- `userScore`: 用户分数（可选，用于智能匹配±20分）
- `subjectType`: 科目类型（可选）
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认20

**示例:**
```
GET /enrollment-plan/search?year=2024&province=江苏&collegeName=厦门&userScore=638&page=1&pageSize=20
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "groups": [
      {
        "groupId": "uuid",
        "groupCode": "08",
        "collegeName": "厦门大学",
        "collegeCode": "10384",
        "subjectRequirement": "化学",
        "tuition": 5460.00,
        "plans": [
          {
            "id": "uuid",
            "majorName": "计算机科学与技术",
            "majorCode": "080901",
            "enrollmentCount": 3,
            "tuition": 5460.00,
            "duration": 4,
            "remarks": null
          }
        ],
        "historicalScores": [
          {
            "year": 2023,
            "minScore": 644,
            "avgScore": 648,
            "minRank": 6604,
            "avgRank": 5800
          }
        ]
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3.2 获取筛选选项（带缓存）
```
GET /enrollment-plan/search/options?year=2024&province=江苏
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "colleges": ["北京大学", "清华大学", "厦门大学", ...],
    "majors": ["计算机科学与技术", "软件工程", ...],
    "locations": ["北京", "上海", "江苏", ...],
    "subjectTypes": ["物理类", "历史类"]
  }
}
```

### 3.3 查询专业组详情
```
GET /enrollment-plan/group/{groupId}
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "groupCode": "08",
    "collegeName": "厦门大学",
    "collegeCode": "10384",
    "year": 2024,
    "province": "江苏",
    "batch": "本科批",
    "subjectRequirement": "化学",
    "tuition": 5460.00,
    "plans": [
      {
        "majorName": "计算机科学与技术",
        "majorCode": "080901",
        "enrollmentCount": 3
      }
    ],
    "historicalScores": [
      {
        "year": 2023,
        "minScore": 644,
        "avgScore": 648,
        "minRank": 6604
      },
      {
        "year": 2022,
        "minScore": 640,
        "avgScore": 645,
        "minRank": 7200
      }
    ]
  }
}
```

### 3.4 查询院校包含的专业组
```
GET /enrollment-plan/college/{collegeCode}/groups?year=2024&province=江苏
```

**响应:**
```json
{
  "code": 200,
  "data": [
    {
      "groupId": "uuid",
      "groupCode": "08",
      "collegeName": "厦门大学",
      "subjectRequirement": "化学",
      "planCount": 13,
      "totalEnrollment": 24
    },
    {
      "groupId": "uuid",
      "groupCode": "04",
      "collegeName": "厦门大学",
      "subjectRequirement": "不限",
      "planCount": 4,
      "totalEnrollment": 12
    }
  ]
}
```

---

## 4. 志愿表管理模块

### 4.1 创建志愿表
```
POST /volunteers/batch
Headers: Authorization: Bearer {token}
```

**请求体:**
```json
{
  "name": "2024江苏本科批志愿表",
  "year": 2024,
  "province": "江苏",
  "batchType": "本科批"
}
```

### 4.2 添加志愿
```
POST /volunteers/batch/{batchId}/volunteer
Headers: Authorization: Bearer {token}
```

**请求体:**
```json
{
  "orderNum": 1,
  "collegeCode": "10384",
  "collegeName": "厦门大学",
  "groupCode": "08",
  "majors": [
    {
      "orderNum": 1,
      "majorCode": "080901",
      "majorName": "计算机科学与技术"
    },
    {
      "orderNum": 2,
      "majorCode": "080902",
      "majorName": "软件工程"
    }
  ],
  "isObeyAdjustment": true
}
```

### 4.3 获取志愿表列表
```
GET /volunteers/batches
Headers: Authorization: Bearer {token}
```

### 4.4 获取志愿表详情
```
GET /volunteers/batch/{batchId}
Headers: Authorization: Bearer {token}
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "name": "2024江苏本科批志愿表",
    "year": 2024,
    "province": "江苏",
    "batchType": "本科批",
    "status": 1,
    "volunteers": [
      {
        "orderNum": 1,
        "collegeName": "厦门大学",
        "groupCode": "08",
        "majors": [
          {"orderNum": 1, "majorName": "计算机科学与技术"},
          {"orderNum": 2, "majorName": "软件工程"}
        ],
        "isObeyAdjustment": true
      }
    ]
  }
}
```

### 4.5 删除志愿
```
DELETE /volunteers/volunteer/{volunteerId}
Headers: Authorization: Bearer {token}
```

### 4.6 对比志愿信息
```
POST /volunteers/compare
Headers: Authorization: Bearer {token}
```

**请求体:**
```json
{
  "volunteerIds": ["uuid1", "uuid2", "uuid3"]
}
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "comparison": [
      {
        "volunteerId": "uuid1",
        "collegeName": "厦门大学",
        "groupCode": "08",
        "historicalScores": {
          "2023": {"minScore": 644, "minRank": 6604},
          "2022": {"minScore": 640, "minRank": 7200}
        },
        "probability": 0.65,
        "category": "稳"
      }
    ]
  }
}
```

---

## 5. 院校专业查询模块

### 5.1 查询院校列表
```
GET /colleges?page=1&pageSize=20&keyword=厦门&province=福建&level=985
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "colleges": [
      {
        "id": "uuid",
        "code": "10384",
        "name": "厦门大学",
        "province": "福建",
        "city": "厦门",
        "level": "985",
        "type": "综合",
        "is985": true,
        "is211": true,
        "isDoubleFirstClass": true,
        "website": "https://www.xmu.edu.cn"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 5.2 查询院校详情
```
GET /colleges/{collegeId}
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "id": "uuid",
    "code": "10384",
    "name": "厦门大学",
    "province": "福建",
    "city": "厦门",
    "level": "985",
    "type": "综合",
    "is985": true,
    "is211": true,
    "isDoubleFirstClass": true,
    "website": "https://www.xmu.edu.cn",
    "description": "厦门大学由著名爱国华侨领袖陈嘉庚先生于1921年创办..."
  }
}
```

### 5.3 查询专业列表
```
GET /majors?page=1&pageSize=20&keyword=计算机&category=工学
```

### 5.4 查询专业详情
```
GET /majors/{majorId}
```

---

## 6. 历年数据查询模块

### 6.1 查询历年录取分数
```
GET /admission-scores?year=2023&province=江苏&collegeCode=10384&subjectType=物理类
```

**响应:**
```json
{
  "code": 200,
  "data": [
    {
      "year": 2023,
      "collegeName": "厦门大学",
      "groupCode": "08",
      "minScore": 644,
      "avgScore": 648,
      "maxScore": 655,
      "minRank": 6604,
      "avgRank": 5800,
      "enrollmentCount": 24
    }
  ]
}
```

### 6.2 分数转位次
```
GET /score-rankings/score-to-rank?year=2024&province=江苏&subjectType=物理类&score=638
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "score": 638,
    "rank": 8837,
    "year": 2024,
    "province": "江苏",
    "subjectType": "物理类"
  }
}
```

### 6.3 位次转分数
```
GET /score-rankings/rank-to-score?year=2024&province=江苏&subjectType=物理类&rank=8837
```

---

## 7. 管理员模块

### 7.1 获取用户列表（管理员）
```
GET /users/admin/users?page=1&pageSize=20&keyword=test&role=user&status=1
Headers: Authorization: Bearer {admin_token}
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "testuser",
        "nickname": "测试用户",
        "phone": "13800138000",
        "email": "test@example.com",
        "role": "user",
        "status": 1,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 7.2 更新用户信息（管理员）
```
PUT /users/admin/users/{userId}
Headers: Authorization: Bearer {admin_token}
```

**请求体:**
```json
{
  "nickname": "新昵称",
  "role": "admin",
  "status": 0
}
```

### 7.3 删除用户（管理员）
```
DELETE /users/admin/users/{userId}
Headers: Authorization: Bearer {admin_token}
```

### 7.4 获取系统配置
```
GET /admin/config?keys=smtp_host,smtp_port
```

**响应:**
```json
{
  "code": 200,
  "data": {
    "smtp_host": "smtp.qq.com",
    "smtp_port": "587"
  }
}
```

### 7.5 批量更新系统配置（管理员）
```
POST /admin/config
Headers: Authorization: Bearer {admin_token}
```

**请求体:**
```json
{
  "configs": {
    "smtp_host": "smtp.qq.com",
    "smtp_port": "587",
    "smtp_user": "your@email.com",
    "smtp_password": "password",
    "smtp_from": "noreply@example.com"
  }
}
```

---

## 8. 密码重置模块

### 8.1 请求密码重置
```
POST /admin/password/reset-request
```

**请求体:**
```json
{
  "email": "user@example.com"
}
```

**响应:**
```json
{
  "code": 200,
  "message": "如果该邮箱存在，将收到重置链接"
}
```

### 8.2 重置密码
```
POST /admin/password/reset
```

**请求体:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newpassword123"
}
```

**响应:**
```json
{
  "code": 200,
  "message": "密码重置成功"
}
```

---

## 9. 实体点击处理

当用户点击AI回复中的实体（院校、专业组、专业、城市）时，前端应该根据实体类型调用相应的接口：

### 9.1 点击院校
```javascript
function handleEntityClick(entityType, entityData) {
  if (entityType === 'college') {
    // 查询院校详情
    fetch(`/api/colleges/${entityData.collegeId}`)
      .then(res => res.json())
      .then(data => showCollegeDetail(data));

    // 或查询该院校的所有专业组
    fetch(`/api/enrollment-plan/college/${entityData.collegeCode}/groups?year=2024&province=江苏`)
      .then(res => res.json())
      .then(data => showCollegeGroups(data));
  }
}
```

### 9.2 点击专业组
```javascript
if (entityType === 'group') {
  // 查询专业组详情（包含历年分数）
  fetch(`/api/enrollment-plan/group/${entityData.groupId}`)
    .then(res => res.json())
    .then(data => showGroupDetail(data));
}
```

### 9.3 点击专业
```javascript
if (entityType === 'major') {
  // 查询专业详情
  fetch(`/api/majors/${entityData.majorId}`)
    .then(res => res.json())
    .then(data => showMajorDetail(data));
}
```

### 9.4 点击城市
```javascript
if (entityType === 'city') {
  // 搜索该城市的所有院校
  fetch(`/api/enrollment-plan/search?year=2024&province=江苏&location=${entityData.location}`)
    .then(res => res.json())
    .then(data => showCityColleges(data));
}
```

---

## 10. 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，token无效或过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**错误响应格式:**
```json
{
  "code": 400,
  "message": "用户名不能为空",
  "data": null
}
```

---

## 11. 注意事项

1. **认证**: 除了登录、注册、密码重置等公开接口外，其他接口都需要在请求头中携带 `Authorization: Bearer {token}`

2. **缓存**: 招生计划搜索接口使用了Redis缓存，搜索结果缓存5分钟，筛选选项缓存1小时

3. **实体识别**: AI回复中的实体会自动被标记，前端需要解析 `[[entity:type:data]]text[[/entity]]` 格式并渲染为可点击链接

4. **流式响应**: AI聊天接口使用Server-Sent Events (SSE)，前端需要使用EventSource或fetch API处理流式数据

5. **分页**: 列表接口都支持分页，默认 `page=1, pageSize=20`

6. **模糊搜索**: 院校名、专业名支持模糊匹配（LIKE查询）

7. **智能匹配**: 招生计划搜索时提供 `userScore` 参数，会返回用户分数±20分范围内的结果
