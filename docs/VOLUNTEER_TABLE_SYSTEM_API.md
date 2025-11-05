# 志愿表系统 API 文档

## 系统概述

志愿表系统支持江苏新高考模式，允许用户创建多个志愿填报方案（如保守方案、激进方案），并在它们之间自由切换。

### 数据结构层次

```
VolunteerTable (志愿表)
  └─ VolunteerBatch (批次信息)
       └─ VolunteerGroup (专业组, 最多40个)
            └─ VolunteerMajor (专业, 每组最多6个)
```

### 核心特性

- ✅ 多志愿表支持：用户可创建最多10个志愿表
- ✅ 当前表切换：同一时间只有一个志愿表是当前使用的
- ✅ 位置自动管理：插入、删除操作自动调整后续位置
- ✅ 数据完整性：使用事务保证数据一致性
- ✅ 权限验证：所有操作都验证用户权限

---

## 一、志愿表管理 API

基础路径：`/api/volunteer/tables`

### 1.1 获取所有志愿表列表

**GET** `/api/volunteer/tables`

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "tables": [
      {
        "id": "uuid-1",
        "name": "保守方案",
        "description": "稳妥为主的志愿填报方案",
        "isCurrent": true,
        "groupCount": 35,
        "createdAt": "2025-01-10T10:00:00.000Z",
        "updatedAt": "2025-01-10T15:30:00.000Z"
      },
      {
        "id": "uuid-2",
        "name": "激进方案",
        "description": "冲刺名校的方案",
        "isCurrent": false,
        "groupCount": 28,
        "createdAt": "2025-01-11T09:00:00.000Z",
        "updatedAt": "2025-01-11T11:20:00.000Z"
      }
    ],
    "currentTableId": "uuid-1"
  }
}
```

---

### 1.2 创建新志愿表

**POST** `/api/volunteer/tables`

**请求体：**
```json
{
  "name": "激进方案",
  "description": "冲刺985/211院校",
  "copyFromTableId": "uuid-1"  // 可选：从现有表复制
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "tableId": "uuid-new",
    "isCurrent": false
  }
}
```

**说明：**
- 用户最多可创建10个志愿表
- 如果提供 `copyFromTableId`，将复制源表的所有批次、专业组、专业数据
- 新创建的表默认不是当前表

---

### 1.3 切换当前志愿表

**PUT** `/api/volunteer/tables/:tableId/activate`

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message": "已切换到志愿表：激进方案",
    "currentTableId": "uuid-2"
  }
}
```

**说明：**
- 使用事务确保同一时间只有一个当前表
- 切换后，所有 `/api/volunteer/current/*` 的操作都将针对新的当前表

---

### 1.4 重命名/更新志愿表

**PATCH** `/api/volunteer/tables/:tableId`

**请求体：**
```json
{
  "name": "稳妥方案",
  "description": "更新后的描述"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "tableId": "uuid-1",
    "name": "稳妥方案",
    "description": "更新后的描述"
  }
}
```

---

### 1.5 删除志愿表

**DELETE** `/api/volunteer/tables/:tableId`

**响应示例：**
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

**限制：**
- ❌ 不能删除当前使用的志愿表（需先切换到其他表）
- ✅ 删除操作会级联删除该表的所有批次、专业组、专业数据

---

### 1.6 复制志愿表

**POST** `/api/volunteer/tables/:tableId/duplicate`

**请求体：**
```json
{
  "newName": "保守方案-副本"  // 可选
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "复制成功",
  "data": {
    "newTableId": "uuid-new",
    "name": "保守方案-副本"
  }
}
```

**说明：**
- 如果不提供 `newName`，默认为 `{原表名}-副本`
- 复制的表状态重置为 `draft`（草稿）

---

## 二、当前志愿表操作 API

基础路径：`/api/volunteer/current`

所有操作都针对用户当前激活的志愿表。

---

### 2.1 获取当前志愿表完整内容

**GET** `/api/volunteer/current`

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "tableInfo": {
      "id": "uuid-1",
      "name": "保守方案",
      "description": "稳妥为主",
      "isCurrent": true
    },
    "batchInfo": {
      "id": "batch-1",
      "year": 2025,
      "province": "江苏",
      "score": 625,
      "rank": 5000,
      "batchType": "本科批",
      "subjectType": "物理类",
      "status": "draft"
    },
    "groups": [
      {
        "id": "group-1",
        "groupOrder": 1,
        "collegeCode": "10001",
        "collegeName": "北京大学",
        "groupCode": "01",
        "groupName": "数学类",
        "subjectRequirement": "物理+化学",
        "isObeyAdjustment": true,
        "majors": [
          {
            "id": "major-1",
            "majorOrder": 1,
            "majorCode": "070101",
            "majorName": "数学与应用数学",
            "planCount": 20,
            "tuitionFee": 5000,
            "duration": 4
          }
        ],
        "category": "rush",  // rush/stable/safe
        "recentScore": {
          "year": 2024,
          "minScore": 660,
          "minRank": 1000
        },
        "remarks": null,
        "createdAt": "2025-01-10T10:00:00.000Z"
      }
    ],
    "stats": {
      "totalGroups": 35,
      "maxGroups": 40,
      "rushCount": 10,
      "stableCount": 15,
      "safeCount": 10
    }
  }
}
```

**说明：**
- `category` 分类规则：
  - `rush`：冲刺（分数比去年低10分以上）
  - `stable`：稳妥（分数差在-10到+20之间）
  - `safe`：保底（分数比去年高20分以上）

---

### 2.2 更新批次信息

**PUT** `/api/volunteer/current/batch`

**请求体：**
```json
{
  "year": 2025,
  "province": "江苏",
  "score": 625,
  "rank": 5000,
  "batchType": "本科批",
  "subjectType": "物理类"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "batchId": "batch-1",
    "year": 2025,
    "province": "江苏",
    "score": 625,
    "rank": 5000
  }
}
```

---

## 三、专业组操作 API

基础路径：`/api/volunteer/current/groups`

---

### 3.1 添加专业组

**POST** `/api/volunteer/current/groups`

**请求体：**
```json
{
  "collegeCode": "10001",
  "collegeName": "北京大学",
  "groupCode": "01",
  "groupName": "数学类",
  "subjectRequirement": "物理+化学",
  "targetPosition": 5,  // 可选：插入位置(1-40)，不提供则追加到末尾
  "isObeyAdjustment": true,
  "majors": [  // 可选：同时添加专业
    {
      "majorCode": "070101",
      "majorName": "数学与应用数学",
      "planCount": 20,
      "tuitionFee": 5000,
      "duration": 4
    }
  ]
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "volunteerId": "group-uuid",
    "groupOrder": 5,
    "message": "已添加到第5个志愿"
  }
}
```

**说明：**
- 最多40个专业组
- 如果 `targetPosition` 为5，则原来的第5个及之后的专业组自动后移
- 可同时添加最多6个专业

---

### 3.2 删除专业组

**DELETE** `/api/volunteer/current/groups/:volunteerId`

**响应示例：**
```json
{
  "code": 200,
  "message": "删除成功，后续志愿自动前移",
  "data": null
}
```

**说明：**
- 删除后，后续专业组自动前移
- 级联删除该专业组下的所有专业

---

### 3.3 批量调整专业组顺序

**PUT** `/api/volunteer/current/groups/reorder`

**请求体：**
```json
{
  "reorders": [
    { "volunteerId": "group-uuid-1", "newPosition": 3 },
    { "volunteerId": "group-uuid-2", "newPosition": 1 },
    { "volunteerId": "group-uuid-3", "newPosition": 2 }
  ]
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "调整成功",
  "data": null
}
```

**说明：**
- 所有新位置必须唯一
- 位置必须在 1-40 之间
- 使用事务确保数据一致性

---

### 3.4 修改专业组设置

**PATCH** `/api/volunteer/current/groups/:volunteerId`

**请求体：**
```json
{
  "isObeyAdjustment": false,
  "remarks": "不服从调剂，确保专业对口"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "更新成功",
  "data": null
}
```

---

## 四、专业操作 API

基础路径：`/api/volunteer/current/groups/:volunteerId/majors`

---

### 4.1 添加专业

**POST** `/api/volunteer/current/groups/:volunteerId/majors`

**请求体：**
```json
{
  "majorCode": "070101",
  "majorName": "数学与应用数学",
  "targetPosition": 2,  // 可选：插入位置(1-6)
  "planCount": 20,
  "tuitionFee": 5000,
  "duration": 4
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "majorId": "major-uuid",
    "majorOrder": 2
  }
}
```

**说明：**
- 每个专业组最多6个专业
- 插入位置后的专业自动后移

---

### 4.2 删除专业

**DELETE** `/api/volunteer/current/groups/:volunteerId/majors/:majorId`

**响应示例：**
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

**说明：**
- 删除后，后续专业自动前移

---

### 4.3 批量设置专业（覆盖）

**PUT** `/api/volunteer/current/groups/:volunteerId/majors`

**请求体：**
```json
{
  "majors": [
    {
      "majorCode": "070101",
      "majorName": "数学与应用数学",
      "planCount": 20,
      "tuitionFee": 5000,
      "duration": 4
    },
    {
      "majorCode": "070102",
      "majorName": "信息与计算科学",
      "planCount": 15,
      "tuitionFee": 5000,
      "duration": 4
    }
  ]
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "设置成功",
  "data": null
}
```

**说明：**
- 会删除该专业组的所有旧专业，然后创建新的专业列表
- 最多6个专业
- 使用事务确保原子性

---

### 4.4 调整专业顺序

**PUT** `/api/volunteer/current/groups/:volunteerId/majors/reorder`

**请求体：**
```json
{
  "reorders": [
    { "majorId": "major-uuid-1", "newPosition": 2 },
    { "majorId": "major-uuid-2", "newPosition": 1 }
  ]
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "调整成功",
  "data": null
}
```

**说明：**
- 所有新位置必须唯一
- 位置必须在 1-6 之间

---

## 五、数据库迁移

### 迁移脚本

位置：`scripts/migrations/add_volunteer_tables.sql`

**执行步骤：**

1. 创建 `volunteer_tables` 表
2. 为现有用户创建默认志愿表（名为"我的志愿表"，`isCurrent=true`）
3. 在 `volunteer_batches` 表中添加 `table_id` 列
4. 将现有批次关联到默认志愿表
5. 添加外键约束

**执行命令：**
```bash
mysql -u root -p zy_backend < scripts/migrations/add_volunteer_tables.sql
```

---

## 六、关键业务逻辑

### 6.1 位置管理算法

#### 插入位置
```typescript
// 将目标位置及之后的所有组位置+1
UPDATE volunteer_groups
SET group_order = group_order + 1
WHERE batch_id = ? AND group_order >= ?
```

#### 删除后调整
```typescript
// 将被删除位置之后的所有组位置-1
UPDATE volunteer_groups
SET group_order = group_order - 1
WHERE batch_id = ? AND group_order > ?
```

#### 批量重排序
```typescript
// 1. 临时设为负数（避免唯一约束冲突）
UPDATE volunteer_groups SET group_order = -1 WHERE id = ?
UPDATE volunteer_groups SET group_order = -2 WHERE id = ?

// 2. 更新为最终位置
UPDATE volunteer_groups SET group_order = 3 WHERE id = ?
UPDATE volunteer_groups SET group_order = 1 WHERE id = ?
```

### 6.2 当前表切换机制

```typescript
// 在事务中执行
BEGIN TRANSACTION;

// 1. 将用户所有表设为非当前
UPDATE volunteer_tables
SET is_current = false
WHERE user_id = ? AND is_current = true;

// 2. 将目标表设为当前
UPDATE volunteer_tables
SET is_current = true
WHERE id = ?;

COMMIT;
```

---

## 七、错误码说明

| 错误码 | 说明 |
|-------|------|
| 400 | 请求参数错误（如位置超出范围、志愿表已满） |
| 403 | 权限不足（如操作其他用户的数据） |
| 404 | 资源不存在（如志愿表、专业组不存在） |
| 500 | 服务器内部错误 |

---

## 八、前端集成建议

### 8.1 页面结构建议

```
志愿表管理页
  ├─ 志愿表列表（可切换、创建、删除、复制）
  └─ 当前志愿表编辑区
       ├─ 批次信息编辑
       ├─ 专业组列表（拖拽排序）
       │    └─ 专业列表（拖拽排序）
       └─ 统计信息（冲刺/稳妥/保底数量）
```

### 8.2 推荐的状态管理

```typescript
// 全局状态
interface VolunteerState {
  tables: VolunteerTable[];           // 所有志愿表
  currentTableId: string;             // 当前表ID
  currentTable: CurrentTableData;     // 当前表详细内容
}

// 操作流程
1. 进入页面 → GET /api/volunteer/tables（获取列表）
2. 切换表 → PUT /api/volunteer/tables/:id/activate
3. 查看详情 → GET /api/volunteer/current
4. 编辑操作 → POST/PUT/PATCH/DELETE /api/volunteer/current/*
5. 拖拽排序 → PUT /api/volunteer/current/groups/reorder
```

### 8.3 拖拽实现参考

```typescript
// 使用 react-beautiful-dnd 或 @dnd-kit/core

const onDragEnd = async (result) => {
  if (!result.destination) return;

  const reorders = calculateReorders(result);

  await api.put('/api/volunteer/current/groups/reorder', {
    reorders
  });

  // 刷新数据
  refreshCurrentTable();
};
```

---

## 九、测试清单

### 9.1 志愿表管理测试

- [ ] 创建空白志愿表
- [ ] 从现有表复制创建
- [ ] 切换当前志愿表
- [ ] 重命名志愿表
- [ ] 删除非当前表
- [ ] 尝试删除当前表（应失败）
- [ ] 复制志愿表
- [ ] 达到10个表上限后尝试创建（应失败）

### 9.2 专业组操作测试

- [ ] 添加专业组到末尾
- [ ] 插入专业组到指定位置
- [ ] 删除专业组（验证后续自动前移）
- [ ] 拖拽调整专业组顺序
- [ ] 修改服从调剂设置
- [ ] 添加第41个专业组（应失败）

### 9.3 专业操作测试

- [ ] 添加专业到末尾
- [ ] 插入专业到指定位置
- [ ] 删除专业（验证后续自动前移）
- [ ] 批量设置专业（覆盖）
- [ ] 调整专业顺序
- [ ] 添加第7个专业（应失败）

### 9.4 边界情况测试

- [ ] 空志愿表的各种操作
- [ ] 并发切换当前表
- [ ] 并发添加/删除专业组
- [ ] 位置重排时的边界值（1, 40, 超出范围）

---

## 十、部署注意事项

1. **执行数据库迁移**
   ```bash
   mysql -u root -p zy_backend < scripts/migrations/add_volunteer_tables.sql
   ```

2. **验证迁移结果**
   - 检查 `volunteer_tables` 表是否创建成功
   - 检查现有用户是否都有默认志愿表
   - 检查 `volunteer_batches.table_id` 是否正确关联

3. **备份数据**
   - 在生产环境执行迁移前，务必备份数据库

4. **回滚方案**
   ```sql
   -- 如需回滚
   ALTER TABLE volunteer_batches DROP FOREIGN KEY FK_volunteer_batches_table_id;
   ALTER TABLE volunteer_batches DROP COLUMN table_id;
   DROP TABLE volunteer_tables;
   ```

---

## 十一、已完成的文件清单

### 模型层
- ✅ `src/models/VolunteerTable.ts` - 志愿表实体
- ✅ `src/models/VolunteerNew.ts` - 修改VolunteerBatch添加tableId关联

### 服务层
- ✅ `src/services/volunteerPosition.service.ts` - 位置管理服务

### 控制器层
- ✅ `src/controllers/volunteerTableManagement.controller.ts` - 志愿表管理
- ✅ `src/controllers/volunteerCurrent.controller.ts` - 当前表操作

### 路由层
- ✅ `src/routes/volunteerTableManagement.routes.ts` - 表管理路由
- ✅ `src/routes/volunteerCurrent.routes.ts` - 当前表操作路由
- ✅ `src/routes/index.ts` - 注册新路由

### 数据库
- ✅ `scripts/migrations/add_volunteer_tables.sql` - 迁移脚本

### 文档
- ✅ `docs/VOLUNTEER_TABLE_SYSTEM_API.md` - 本文档

---

## 联系支持

如有问题，请联系开发团队或查看项目 README。
