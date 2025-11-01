# 前端组件设计方案

## 概述

为志愿推荐系统设计交互式前端组件，替代 Markdown 文本展示，提供更好的用户体验。

---

## 组件架构

```
RecommendationView (页面)
  ├── UserProfileInput (用户信息输入)
  ├── PreferencesFilter (偏好筛选)
  ├── RecommendationSummary (统计摘要)
  ├── RecommendationTabs (冲稳保分类tabs)
  │   ├── RecommendationList (推荐列表)
  │   │   └── RecommendationCard (推荐卡片) *N
  ├── RecommendationCharts (数据可视化)
  │   ├── ProbabilityPieChart (概率分布饼图)
  │   ├── CollegeLevelChart (院校层次分布)
  │   └── ScoreTrendChart (分数趋势图)
  └── ActionBar (操作栏)
      ├── ExportButton (导出Excel)
      ├── CompareButton (对比专业组)
      └── AddBatchButton (批量添加)
```

---

## 1. UserProfileInput - 用户信息输入

### 功能
- 输入分数、位次、省份、科类
- 实时验证
- 快速填充（从历史记录）

### 组件 Props

```typescript
interface UserProfileInputProps {
  value: UserProfile;
  onChange: (profile: UserProfile) => void;
  provinces: string[];
  categories: string[];
}

interface UserProfile {
  score: number;
  rank: number;
  province: string;
  category: string;
  year: number;
}
```

### UI 设计

```
┌─────────────────────────────────────────────┐
│  填写您的基本信息                            │
├─────────────────────────────────────────────┤
│  分数: [____620____]  位次: [____8500____]  │
│  省份: [江苏 ▼]       科类: [物理类 ▼]      │
│  年份: [2025 ▼]                             │
│                                             │
│  [历史记录: 上次填报 (620分 8500位)]         │
│                                             │
│              [开始推荐]                      │
└─────────────────────────────────────────────┘
```

### 示例代码 (Vue 3)

```vue
<template>
  <div class="user-profile-input">
    <h2>填写您的基本信息</h2>

    <div class="form-row">
      <div class="form-field">
        <label>分数</label>
        <input
          v-model.number="localProfile.score"
          type="number"
          placeholder="请输入分数"
          @blur="validateScore"
        />
        <span class="error" v-if="errors.score">{{ errors.score }}</span>
      </div>

      <div class="form-field">
        <label>位次</label>
        <input
          v-model.number="localProfile.rank"
          type="number"
          placeholder="请输入位次"
          @blur="validateRank"
        />
        <span class="error" v-if="errors.rank">{{ errors.rank }}</span>
      </div>
    </div>

    <div class="form-row">
      <div class="form-field">
        <label>省份</label>
        <select v-model="localProfile.province">
          <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
        </select>
      </div>

      <div class="form-field">
        <label>科类</label>
        <select v-model="localProfile.category">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
    </div>

    <button class="primary-btn" @click="onSubmit" :disabled="!isValid">
      开始推荐
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<UserProfileInputProps>();
const emit = defineEmits<{
  (e: 'change', value: UserProfile): void;
  (e: 'submit'): void;
}>();

const localProfile = ref({ ...props.value });
const errors = ref<Record<string, string>>({});

const isValid = computed(() => {
  return localProfile.value.score > 0 &&
         localProfile.value.rank > 0 &&
         localProfile.value.province &&
         localProfile.value.category;
});

const validateScore = () => {
  if (localProfile.value.score < 0 || localProfile.value.score > 750) {
    errors.value.score = '分数应在0-750之间';
  } else {
    delete errors.value.score;
  }
};

const onSubmit = () => {
  if (isValid.value) {
    emit('change', localProfile.value);
    emit('submit');
  }
};
</script>
```

---

## 2. RecommendationCard - 推荐卡片

### 功能
- 展示单个专业组信息
- 一键添加到志愿表
- 查看详情
- 展开/收起历年数据

### 组件 Props

```typescript
interface RecommendationCardProps {
  group: StructuredGroupRecommendation;
  onAddToVolunteer: (groupId: string) => Promise<void>;
  onViewDetail: (groupId: string) => void;
}
```

### UI 设计

```
┌────────────────────────────────────────────────┐
│ 🏆 南京大学                     [冲] 28%        │
│ 985工程  双一流  计算机类                       │
├────────────────────────────────────────────────┤
│ 📊 分数分析                                     │
│   • 您的分数: 620分 (排名 8500位)               │
│   • 近3年平均最低分: 628分 (排名 7300位)         │
│   • 分数差: -8.5分  位次差: -1200位             │
│                                                │
│ 💡 推荐理由                                     │
│   ✓ 您的分数比该专业组近3年平均最低分低8.5分     │
│   ✓ 985工程院校，综合实力强                     │
│   ✓ 计算机科学与技术为王牌专业                   │
│                                                │
│ ⚠️  风险提示                                    │
│   • 调剂风险中等，建议合理选择专业顺序           │
│                                                │
│ 📈 历年数据 [展开 ▼]                            │
│                                                │
│ [加入志愿表]  [查看详情]  [对比]                │
└────────────────────────────────────────────────┘
```

### 展开历年数据

```
┌────────────────────────────────────────────────┐
│ 📈 历年数据 [收起 ▲]                            │
├────────┬──────┬──────┬──────┬──────┬──────────┤
│ 年份   │最低分│平均分│最高分│最低位次│招生计划 │
├────────┼──────┼──────┼──────┼──────┼──────────┤
│ 2024   │ 630  │ 635  │ 642  │ 7200 │   50     │
│ 2023   │ 628  │ 633  │ 640  │ 7350 │   48     │
│ 2022   │ 625  │ 630  │ 638  │ 7500 │   45     │
└────────┴──────┴──────┴──────┴──────┴──────────┘
│ 趋势: ↗ 上升                                    │
└────────────────────────────────────────────────┘
```

### 示例代码 (React)

```typescript
import React, { useState } from 'react';
import { StructuredGroupRecommendation } from '../types';

interface Props {
  group: StructuredGroupRecommendation;
  onAddToVolunteer: (groupId: string) => Promise<void>;
  onViewDetail: (groupId: string) => void;
}

export const RecommendationCard: React.FC<Props> = ({
  group,
  onAddToVolunteer,
  onViewDetail
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddToVolunteer = async () => {
    setLoading(true);
    try {
      await onAddToVolunteer(group.groupId);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case '冲': return 'bg-orange-500';
      case '稳': return 'bg-blue-500';
      case '保': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="recommendation-card border rounded-lg p-4 mb-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold flex items-center gap-2">
            {group.is985 && <span>🏆</span>}
            {group.is211 && !group.is985 && <span>🏅</span>}
            {group.collegeName}
          </h3>
          <div className="flex gap-2 mt-2">
            {group.highlights?.map((h, i) => (
              <span key={i} className="text-sm px-2 py-1 bg-blue-100 rounded">
                {h}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded text-white ${getRiskColor(group.riskLevel)}`}>
            {group.riskLevel}
          </span>
          <div className="text-2xl font-bold mt-2">{group.probability}%</div>
          <div className="text-sm text-gray-500">录取概率</div>
        </div>
      </div>

      {/* Score Analysis */}
      <div className="mb-3 p-3 bg-gray-50 rounded">
        <h4 className="font-semibold mb-2">📊 分数分析</h4>
        <div className="text-sm space-y-1">
          <div>您的分数: {group.userScore}分 (排名 {group.userRank}位)</div>
          <div>近3年平均最低分: {group.avgMinScore}分 (排名 {group.avgMinRank}位)</div>
          <div className="flex gap-4">
            <span className={group.scoreGap > 0 ? 'text-green-600' : 'text-red-600'}>
              分数差: {group.scoreGap > 0 ? '+' : ''}{group.scoreGap}分
            </span>
            <span className={group.rankGap && group.rankGap > 0 ? 'text-green-600' : 'text-red-600'}>
              位次差: {group.rankGap}位
            </span>
          </div>
        </div>
      </div>

      {/* Recommend Reasons */}
      <div className="mb-3">
        <h4 className="font-semibold mb-2">💡 推荐理由</h4>
        <ul className="text-sm space-y-1">
          {group.recommendReasons.map((reason, i) => (
            <li key={i} className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* Warnings */}
      {group.warnings && group.warnings.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-500">
          {group.warnings.map((warning, i) => (
            <div key={i} className="text-sm text-yellow-800">{warning}</div>
          ))}
        </div>
      )}

      {/* Historical Data */}
      <div className="mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="font-semibold text-blue-600 hover:underline"
        >
          📈 历年数据 {expanded ? '▲' : '▼'}
        </button>

        {expanded && (
          <table className="w-full mt-2 text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">年份</th>
                <th className="p-2">最低分</th>
                <th className="p-2">平均分</th>
                <th className="p-2">最高分</th>
                <th className="p-2">最低位次</th>
                <th className="p-2">计划数</th>
              </tr>
            </thead>
            <tbody>
              {group.historicalData.map((year) => (
                <tr key={year.year} className="border-t">
                  <td className="p-2 text-center">{year.year}</td>
                  <td className="p-2 text-center">{year.minScore}</td>
                  <td className="p-2 text-center">{year.avgScore || '-'}</td>
                  <td className="p-2 text-center">{year.maxScore || '-'}</td>
                  <td className="p-2 text-center">{year.minRank}</td>
                  <td className="p-2 text-center">{year.planCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleAddToVolunteer}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '添加中...' : '加入志愿表'}
        </button>
        <button
          onClick={() => onViewDetail(group.groupId)}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
        >
          查看详情
        </button>
      </div>
    </div>
  );
};
```

---

## 3. RecommendationTabs - 分类标签页

### 功能
- 切换冲/稳/保三个分类
- 显示每个分类的数量
- 平滑过渡动画

### UI 设计

```
┌──────────────────────────────────────────────┐
│ [冲一冲 12] [稳一稳 20] [保一保 8]            │
│ ───────────                                  │
│                                              │
│ (当前选中分类的推荐卡片列表)                  │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 4. RecommendationCharts - 数据可视化

### 4.1 概率分布饼图

```
        冲稳保分布
   ┌──────────────────┐
   │                  │
   │      ╱─────╲     │
   │    ╱         ╲   │
   │   │  稳 50%  │  │
   │   │          │  │
   │    ╲  冲 30% ╱   │
   │      ╲─────╱     │
   │       保 20%     │
   │                  │
   └──────────────────┘
```

### 4.2 院校层次分布

```
院校层次分布
    985     211     其他
    ██      ████    ██████
    8个     15个     17个
```

### 4.3 分数趋势图

```
  650│                     • (南大 2024)
     │                   •
  640│                 •
     │               •
  630│             •   • (南理工 2024)
     │           •   •
  620│         •   •
     │       •   •
  610│─────────────────────────
     2022   2023   2024

  ── 南京大学
  ── 南京理工大学
```

### 示例代码 (Vue 3 + Chart.js)

```vue
<template>
  <div class="recommendation-charts">
    <div class="chart-row">
      <div class="chart-container">
        <h3>概率分布</h3>
        <Pie :data="probabilityChartData" :options="pieOptions" />
      </div>

      <div class="chart-container">
        <h3>院校层次</h3>
        <Bar :data="collegeLevelChartData" :options="barOptions" />
      </div>
    </div>

    <div class="chart-full">
      <h3>分数趋势</h3>
      <Line :data="scoreTrendChartData" :options="lineOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Pie, Bar, Line } from 'vue-chartjs';
import { ChartData } from '../types';

const props = defineProps<{
  chartData: ChartData;
}>();

const probabilityChartData = computed(() => ({
  labels: props.chartData.probabilityPieChart.labels,
  datasets: [{
    data: props.chartData.probabilityPieChart.data,
    backgroundColor: props.chartData.probabilityPieChart.colors
  }]
}));

// 类似地定义 collegeLevelChartData 和 scoreTrendChartData
</script>
```

---

## 5. ActionBar - 操作栏

### 功能
- 导出 Excel
- 批量添加到志愿表
- 对比专业组
- 筛选和排序

### UI 设计

```
┌────────────────────────────────────────────────┐
│ [导出Excel] [批量添加] [对比选中(0)]            │
│                                                │
│ 排序: [推荐度 ▼]  筛选: [全部 ▼]               │
└────────────────────────────────────────────────┘
```

---

## 6. 完整页面布局

```
┌─────────────────────────────────────────────────┐
│  志愿推荐 - 智能填报系统                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  UserProfileInput                       │   │
│  │  (用户信息输入)                          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  PreferencesFilter                      │   │
│  │  (偏好筛选)                              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  RecommendationSummary                  │   │
│  │  总共 40 个推荐 | 冲12 稳20 保8         │   │
│  │  985: 8个 | 211: 15个 | 其他: 17个     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  RecommendationCharts                   │   │
│  │  (图表可视化)                            │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  ActionBar                              │   │
│  │  [导出Excel] [批量添加] [对比]          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  RecommendationTabs                     │   │
│  │  [冲一冲 12] [稳一稳 20] [保一保 8]     │   │
│  │  ───────────                            │   │
│  │                                         │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │  RecommendationCard              │ │   │
│  │  └───────────────────────────────────┘ │   │
│  │  ┌───────────────────────────────────┐ │   │
│  │  │  RecommendationCard              │ │   │
│  │  └───────────────────────────────────┘ │   │
│  │  ...                                   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 交互流程

### 1. 初次使用流程

```
用户打开页面
   ↓
填写基本信息 (UserProfileInput)
   ↓
选择偏好 (PreferencesFilter) [可选]
   ↓
点击"开始推荐"
   ↓
显示加载动画 (Loading)
   ↓
展示推荐结果 (RecommendationTabs + Cards)
   ↓
查看图表 (RecommendationCharts)
   ↓
操作: 加入志愿表 / 查看详情 / 导出Excel
```

### 2. 添加到志愿表流程

```
点击"加入志愿表"
   ↓
显示确认对话框
"确认将【南京大学-计算机类】添加到志愿表第1位吗?"
   ↓
用户确认
   ↓
调用 API: POST /api/volunteer/add
   ↓
显示成功提示 "已添加到志愿表第1位"
   ↓
卡片右上角显示 "✓ 已添加"
```

### 3. 批量添加流程

```
点击"批量添加"
   ↓
显示批量添加对话框
┌─────────────────────────────────┐
│  批量添加到志愿表                │
├─────────────────────────────────┤
│  选择分类:                       │
│  ☑ 冲一冲 (前6个)                │
│  ☑ 稳一稳 (前10个)               │
│  ☑ 保一保 (前4个)                │
│                                 │
│  [取消] [确认添加 (20个)]        │
└─────────────────────────────────┘
   ↓
确认后批量调用 API
   ↓
显示进度条
   ↓
完成后显示 "已成功添加20个专业组到志愿表"
```

---

## 响应式设计

### 桌面端 (≥ 1024px)
- 每行显示2个推荐卡片
- 图表并排显示
- 侧边栏显示志愿表

### 平板端 (768px - 1023px)
- 每行显示1个推荐卡片
- 图表堆叠显示

### 移动端 (< 768px)
- 每行显示1个推荐卡片
- 简化图表
- 底部导航栏

---

## 性能优化

1. **虚拟滚动**: 推荐列表使用虚拟滚动，只渲染可见区域
2. **懒加载**: 历年数据在展开时才渲染
3. **防抖**: 筛选和搜索使用防抖
4. **缓存**: 推荐结果缓存到 localStorage
5. **分页加载**: 每次加载10个卡片，滚动到底部加载更多

---

## 无障碍支持

- 所有按钮支持键盘操作
- 合理的 Tab 顺序
- ARIA 标签
- 高对比度模式
- 屏幕阅读器支持

---

## 下一步

1. ✅ 完成结构化数据 API
2. ✅ 编写 API 文档
3. ⏳ 实现前端组件
4. ⏳ 整体联调测试
5. ⏳ 用户体验优化
