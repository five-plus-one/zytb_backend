# 招生计划查询页面 - 后端API需求清单

> **优先级说明**: 🔴 P0-必须 | 🟡 P1-重要 | 🟢 P2-可选

---

## 1. 招生计划搜索 🔴 P0（需优化现有接口）

### 接口
```
GET /enrollment-plan/search
```

### 请求参数
```typescript
{
  year: number                    // 年份，必填，如2025
  province: string                // 省份，必填，如"江苏"
  collegeName?: string            // 院校名称模糊搜索
  majorName?: string              // 专业名称模糊搜索
  location?: string               // 地区（省份或城市）
  subjectType?: string            // 科目类型："物理类"|"历史类"
  collegeLevel?: string           // 院校层次："985"|"211"|"双一流"|"普通本科"
  collegeType?: string            // 院校类型："综合"|"理工"|"师范"|"医药"|"财经"|"农林"|"政法"|"艺术"
  minScore?: number               // 最低分数范围
  maxScore?: number               // 最高分数范围
  minTuition?: number             // 最低学费
  maxTuition?: number             // 最高学费
  minPlanCount?: number           // 最小招生人数
  maxPlanCount?: number           // 最大招生人数
  subjectRequirement?: string     // 选科要求
  page: number                    // 页码，默认1
  pageSize: number                // 每页数量，默认20
}
```

### 响应数据
```typescript
{
  code: 200,
  message: "success",
  data: {
    total: number,               // 总数
    page: number,                // 当前页
    pageSize: number,            // 每页数量
    totalPages: number,          // 总页数
    data: Array<{
      collegeCode: string,       // 院校代码
      collegeName: string,       // 院校名称
      collegeProvince: string,   // 院校省份
      collegeCity: string,       // 院校城市
      collegeType: string,       // 院校类型
      groupCode: string,         // 专业组代码
      groupName: string,         // 专业组名称
      groupId: string,           // 专业组ID (用于详情查询)
      subjectRequirement: string,// 选科要求
      is985: boolean,
      is211: boolean,
      isDoubleFirstClass: boolean,
      totalPlanCount: number,    // 总招生人数
      avgTuition: number,        // 平均学费
      majors: Array<{
        majorCode: string,
        majorName: string,
        planCount: number,
        tuition: string,
        studyYears: number
      }>,
      // 🆕 新增：最近2年的分数（用于列表展示）
      recentScores: Array<{
        year: number,
        minScore: number,
        minRank: number
      }>
    }>
  }
}
```

### 优化需求
1. 添加 `groupId` 字段（用于详情查询）
2. 添加 `recentScores` 数组（最近1-2年分数，列表展示用）
3. 添加 `totalPlanCount`（专业组总招生人数）
4. 添加 `avgTuition`（平均学费）
5. 支持更多筛选条件（学费范围、招生人数范围等）

---

## 2. 专业组详细信息 🔴 P0（新增接口）

### 接口
```
GET /enrollment-plan/group/:groupId/detail
```

### 请求参数
```
groupId: string  // 专业组ID
```

### 响应数据
```typescript
{
  code: 200,
  message: "success",
  data: {
    // 专业组基本信息
    groupInfo: {
      groupId: string,
      collegeCode: string,
      collegeName: string,
      collegeProvince: string,
      collegeCity: string,
      groupCode: string,
      groupName: string,
      subjectRequirement: string,
      totalPlanCount: number,
      avgTuition: number,
      is985: boolean,
      is211: boolean,
      isDoubleFirstClass: boolean,
      year: number,
      batch: string              // 批次："本科批"
    },

    // 专业列表（详细信息）
    majors: Array<{
      majorCode: string,
      majorName: string,
      majorDescription: string,  // 专业简介
      planCount: number,         // 招生人数
      tuition: string,           // 学费
      studyYears: number,        // 学制
      remarks: string            // 备注
    }>,

    // 🆕 历年录取分数（5年）
    historicalScores: Array<{
      year: number,
      minScore: number,          // 最低分
      avgScore: number,          // 平均分
      maxScore: number,          // 最高分
      minRank: number,           // 最低位次
      avgRank: number,           // 平均位次
      maxRank: number,           // 最高位次
      enrollmentCount: number,   // 实际录取人数
      applicationCount: number   // 报考人数(如果有)
    }>,

    // 🆕 院校基本信息
    collegeInfo: {
      description: string,        // 院校简介
      advantageSubjects: string[],// 优势学科
      keyLaboratories: string[], // 重点实验室
      employmentRate: number,    // 就业率(0-100)
      graduateSchoolRate: number,// 深造率(0-100)
      website: string,           // 官网
      phone: string,             // 招生办电话
      address: string            // 地址
    }
  }
}
```

### 说明
- 此接口在用户**展开**专业组卡片时调用
- 返回完整的专业组信息、专业列表、历年分数、院校信息
- 用于展开状态的详细展示

---

## 3. 院校详细信息 🟡 P1（新增接口）

### 接口
```
GET /colleges/:collegeCode/detail
```

### 请求参数
```
collegeCode: string  // 院校代码
```

### 响应数据
```typescript
{
  code: 200,
  message: "success",
  data: {
    code: string,
    name: string,
    province: string,
    city: string,
    is985: boolean,
    is211: boolean,
    isDoubleFirstClass: boolean,
    type: string,                  // 院校类型
    description: string,           // 详细介绍
    foundedYear: number,           // 建校年份
    advantageSubjects: string[],   // 优势学科
    keyLaboratories: string[],     // 重点实验室
    facultyCount: number,          // 教职工人数
    studentCount: number,          // 在校生人数
    employmentRate: number,        // 就业率
    graduateSchoolRate: number,    // 深造率
    website: string,
    phone: string,
    address: string,
    images: string[]               // 校园图片URL数组
  }
}
```

### 说明
- 用于"查看完整院校信息"弹窗
- 可选功能，如果后端没有这些数据可以暂不实现

---

## 4. 专业详细信息 🟢 P2（新增接口）

### 接口
```
GET /majors/:majorCode/detail
```

### 请求参数
```
majorCode: string  // 专业代码
```

### 响应数据
```typescript
{
  code: 200,
  message: "success",
  data: {
    code: string,
    name: string,
    category: string,              // 学科门类
    description: string,           // 专业介绍
    courses: string[],             // 主要课程
    employmentDirections: string[],// 就业方向
    relatedMajors: string[],       // 相关专业
    degreeType: string             // 学位类型
  }
}
```

### 说明
- 用于专业详情查看
- 可选功能

---

## 5. 历年录取分数查询 🟡 P1（优化现有接口）

### 接口
```
GET /admission-scores/group/:groupId
```

### 请求参数
```
groupId: string
years?: number      // 查询最近几年，默认5年
```

### 响应数据
```typescript
{
  code: 200,
  message: "success",
  data: {
    groupId: string,
    collegeCode: string,
    collegeName: string,
    groupCode: string,
    groupName: string,
    scores: Array<{
      year: number,
      minScore: number,
      avgScore: number,
      maxScore: number,
      minRank: number,
      avgRank: number,
      maxRank: number,
      enrollmentCount: number,
      applicationCount: number    // 报考人数(可选)
    }>
  }
}
```

### 说明
- 专门用于获取某个专业组的历年分数
- 用于绘制分数走势图

---

## 6. 志愿表管理 🔴 P0

### 6.1 获取志愿表
```
GET /volunteer/table
```

### 响应
```typescript
{
  code: 200,
  message: "success",
  data: {
    totalCount: number,
    maxCount: 40,                // 最大志愿数
    volunteers: Array<{
      id: string,                // 志愿ID
      orderNum: number,          // 顺序号(1-40)
      collegeCode: string,
      collegeName: string,
      groupCode: string,
      groupName: string,
      groupId: string,           // 用于查询详情
      majors: Array<{
        orderNum: number,        // 专业顺序(1-6)
        majorCode: string,
        majorName: string
      }>,
      category: 'rush'|'stable'|'safe',  // 🆕 冲稳保分类
      isObeyAdjustment: boolean, // 是否服从调剂
      recentScore: {             // 🆕 最近一年分数(用于列表显示)
        year: number,
        minScore: number,
        minRank: number
      },
      createdAt: string
    }>
  }
}
```

### 6.2 添加志愿
```
POST /volunteer/table/add
```

### 请求
```typescript
{
  collegeCode: string,
  collegeName: string,
  groupCode: string,
  groupName: string,
  groupId: string,
  majors: Array<{
    orderNum: number,
    majorCode: string,
    majorName: string
  }>,
  isObeyAdjustment: boolean
}
```

### 响应
```typescript
{
  code: 200,
  message: "添加成功",
  data: {
    volunteerId: string,
    orderNum: number           // 系统自动分配的顺序号
  }
}
```

### 6.3 批量调整顺序
```
PUT /volunteer/table/reorder
```

### 请求
```typescript
{
  volunteers: Array<{
    id: string,
    orderNum: number           // 新的顺序号
  }>
}
```

### 6.4 删除志愿
```
DELETE /volunteer/table/:volunteerId
```

### 6.5 🆕 智能排序建议（可选）
```
POST /volunteer/table/optimize
```

### 请求
```typescript
{
  userScore: number,
  userRank: number,
  subjectType: string
}
```

### 响应
```typescript
{
  code: 200,
  message: "success",
  data: {
    optimizedOrder: Array<{
      volunteerId: string,
      suggestedOrderNum: number,
      category: 'rush'|'stable'|'safe',
      probability: number,       // 预估录取概率(0-1)
      reason: string             // 建议理由
    }>
  }
}
```

---

## 7. 录取概率预估 🟡 P1（新增接口）

### 接口
```
POST /admission-probability/calculate
```

### 请求
```typescript
{
  userScore: number,
  userRank: number,
  groupId: string,
  subjectType: string
}
```

### 响应
```typescript
{
  code: 200,
  message: "success",
  data: {
    probability: number,         // 录取概率(0-1)
    category: 'rush'|'stable'|'safe',
    suggestion: string,          // 文字建议
    historicalComparison: {
      higherThanPercent: number, // 你的分数高于历年XX%的录取分数
      safetyMargin: number,      // 分数余量(你的分数 - 历年最低分)
      rankComparison: number     // 位次对比
    }
  }
}
```

### 说明
- 根据用户分数和历年数据计算录取概率
- 用于专业组卡片显示"录取概率: 65%"
- 用于冲稳保自动分类

---

## 8. 专业组对比 🟢 P2（新增接口）

### 接口
```
POST /enrollment-plan/compare
```

### 请求
```typescript
{
  groupIds: string[]            // 最多3个专业组ID
}
```

### 响应
```typescript
{
  code: 200,
  message: "success",
  data: {
    groups: Array<{
      groupId: string,
      collegeCode: string,
      collegeName: string,
      groupCode: string,
      groupName: string,
      comparison: {
        planCount: number,
        avgTuition: number,
        avgScore: number,       // 近3年平均最低分
        scoreRange: [number, number],  // [最低分, 最高分]
        avgRank: number,
        employmentRate: number
      },
      historicalScores: Array<{
        year: number,
        minScore: number,
        minRank: number
      }>
    }>
  }
}
```

---

## 9. 收藏功能 🟢 P2（新增接口）

### 9.1 添加收藏
```
POST /favorites/add
Body: { groupId: string }
```

### 9.2 获取收藏列表
```
GET /favorites/list
```

### 9.3 删除收藏
```
DELETE /favorites/:groupId
```

---

## 10. 导出志愿表 🟡 P1（新增接口）

### 接口
```
GET /volunteer/table/export?format=pdf|excel
```

### 响应
```
文件流
Content-Type: application/pdf 或 application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

### 说明
- 导出用户的志愿表为PDF或Excel文件
- 包含：志愿顺序、院校、专业组、专业列表、历年分数等信息

---

## 11. 搜索选项获取（优化）

### 接口
```
GET /enrollment-plan/search/options?year=2025&province=江苏
```

### 响应
```typescript
{
  code: 200,
  message: "success",
  data: {
    colleges: string[],         // 所有院校名称
    majors: string[],           // 所有专业名称
    locations: string[],        // 所有地区
    subjectTypes: string[],     // 科目类型
    collegeTypes: string[],     // 院校类型
    subjectRequirements: string[] // 选科要求列表
  }
}
```

---

## 优先级总结

### 🔴 P0 - 必须实现（核心功能）
1. **优化招生计划搜索接口** - 添加 groupId、recentScores、更多筛选条件
2. **新增专业组详情接口** - 返回完整专业列表、历年分数、院校信息
3. **志愿表CRUD接口** - 增删改查、批量排序

### 🟡 P1 - 重要功能（提升体验）
4. **历年分数查询接口** - 专门用于图表展示
5. **录取概率预估接口** - 智能分类冲稳保
6. **院校详细信息接口** - 用于详情弹窗
7. **导出志愿表接口** - PDF/Excel导出

### 🟢 P2 - 可选功能（增强功能）
8. **专业详细信息接口** - 专业介绍
9. **专业组对比接口** - 多个专业组对比
10. **收藏功能接口** - 收藏专业组
11. **智能排序建议接口** - AI优化志愿顺序

---

## 数据字段说明

### 冲稳保分类算法建议
```typescript
// 基于用户分数和历年最低分
if (userScore >= historicalMinScore + 20) {
  category = 'safe'      // 保一保
} else if (userScore >= historicalMinScore - 10) {
  category = 'stable'    // 稳一稳
} else {
  category = 'rush'      // 冲一冲
}
```

### groupId 生成规则
建议格式: `{collegeCode}_{groupCode}_{year}_{province}`
例如: `10384_08_2025_江苏`

---

## 接口调用时机

| 场景 | 接口 | 说明 |
|------|------|------|
| 页面初始加载 | `/enrollment-plan/search` | 获取专业组列表 |
| 展开专业组卡片 | `/enrollment-plan/group/:groupId/detail` | 获取详细信息 |
| 点击"查看完整院校信息" | `/colleges/:collegeCode/detail` | 院校详情弹窗 |
| 页面初始加载 | `/volunteer/table` | 获取志愿表（右侧栏） |
| 点击"加入志愿表" | `/volunteer/table/add` | 添加志愿 |
| 拖拽调整顺序 | `/volunteer/table/reorder` | 批量更新顺序 |
| 加载专业组卡片 | `/admission-probability/calculate` | 计算录取概率（可批量） |
| 点击"对比" | `/enrollment-plan/compare` | 专业组对比 |
| 点击"导出" | `/volunteer/table/export` | 导出文件 |

---

## 性能优化建议

1. **缓存策略**
   - 搜索结果缓存5分钟
   - 筛选选项缓存1小时
   - 院校详情缓存30分钟
   - 历年分数缓存1天

2. **分页**
   - 每页默认20条
   - 支持用户选择: 10/20/50/100

3. **批量请求**
   - 录取概率计算支持批量（一次最多20个groupId）
   - 志愿表排序支持批量更新

4. **字段裁剪**
   - 列表接口只返回必要字段
   - 详情接口返回完整信息

---

## 联调说明

前端会先使用 mock 数据进行开发，后端接口开发完成后通知前端进行联调。

如有疑问请随时沟通！🚀
