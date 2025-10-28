# 招生计划模块快速开始指南

## 5分钟快速体验

### 步骤 1: 安装依赖
```bash
npm install
```

### 步骤 2: 配置数据库
编辑 `.env` 文件：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=volunteer_system
```

### 步骤 3: 启动开发服务器
```bash
npm run dev
```

服务器会自动同步数据库表结构，创建 `enrollment_plans` 表。

### 步骤 4: 生成示例数据
打开新的终端窗口：
```bash
npm run create-enrollment-sample
```

生成的文件位置: `./data/enrollment_plans_sample.xlsx`

### 步骤 5: 导入示例数据
```bash
npm run import-enrollment-plans ./data/enrollment_plans_sample.xlsx
```

你会看到类似的输出：
```
开始导入招生计划数据...
Excel 文件路径: E:\...\data\enrollment_plans_sample.xlsx
读取到 8 条数据
数据库连接成功
新增: 2024 北京大学 - 计算机科学与技术
新增: 2024 北京大学 - 软件工程
...
导入完成!
成功: 8 条
失败: 0 条
```

### 步骤 6: 测试API
服务器应该在 `http://localhost:3000` 运行。

#### 6.1 获取招生计划列表
```bash
curl "http://localhost:3000/api/enrollment-plan/list?year=2024&sourceProvince=浙江省"
```

#### 6.2 按院校查询
```bash
curl "http://localhost:3000/api/enrollment-plan/college/10001?year=2024&sourceProvince=浙江省"
```

#### 6.3 获取统计信息
```bash
curl "http://localhost:3000/api/enrollment-plan/statistics/overview?year=2024&sourceProvince=浙江省"
```

#### 6.4 获取可用年份
```bash
curl "http://localhost:3000/api/enrollment-plan/options/years"
```

#### 6.5 通过院校API查询招生计划
首先需要有院校数据，假设院校ID为 `xxx-xxx-xxx`:
```bash
curl "http://localhost:3000/api/college/xxx-xxx-xxx/plan?year=2024&province=浙江省"
```

## 常见场景示例

### 场景 1: 搜索包含"计算机"的专业
```bash
curl "http://localhost:3000/api/enrollment-plan/list?keyword=计算机&year=2024"
```

### 场景 2: 查看北京大学的所有招生专业
```bash
curl "http://localhost:3000/api/enrollment-plan/college/10001"
```

### 场景 3: 查看物理类本科一批的招生计划
```bash
curl "http://localhost:3000/api/enrollment-plan/list?subjectType=物理类&batch=本科一批&year=2024"
```

### 场景 4: 获取浙江省2024年的招生统计
```bash
curl "http://localhost:3000/api/enrollment-plan/statistics/overview?year=2024&sourceProvince=浙江省"
```

## 使用自己的数据

### 准备Excel文件
创建一个Excel文件，包含以下列（表头必须完全一致）：

| 列名 | 示例值 | 必填 |
|------|--------|------|
| 年份 | 2024 | ✅ |
| 生源地 | 浙江省 | ✅ |
| 科类 | 物理类 | ✅ |
| 批次 | 本科一批 | ✅ |
| 院校代码 | 10001 | ✅ |
| 院校名称 | 北京大学 | ✅ |
| 院校专业组代码 | PKU01 | ❌ |
| 专业组代码 | 001 | ❌ |
| 专业组名称 | 计算机类 | ❌ |
| 选科要求 | 物理+化学 | ❌ |
| 专业代码 | 080901 | ✅ |
| 专业名称 | 计算机科学与技术 | ✅ |
| 专业备注 | 国家重点学科 | ❌ |
| 计划人数 | 50 | ✅ |
| 学制 | 4 | ❌ |
| 学费 | 5000 | ❌ |

### 导入数据
```bash
npm run import-enrollment-plans /path/to/your/data.xlsx
```

## 在前端应用中使用

### JavaScript/TypeScript 示例

```javascript
// 创建一个服务类
class EnrollmentPlanService {
  private baseUrl = 'http://localhost:3000/api/enrollment-plan';

  // 获取招生计划列表
  async getList(params) {
    const query = new URLSearchParams(params);
    const response = await fetch(`${this.baseUrl}/list?${query}`);
    return response.json();
  }

  // 按院校查询
  async getByCollege(collegeCode, year, province) {
    const query = new URLSearchParams({ year, sourceProvince: province });
    const response = await fetch(`${this.baseUrl}/college/${collegeCode}?${query}`);
    return response.json();
  }

  // 获取统计信息
  async getStatistics(year, province) {
    const query = new URLSearchParams({ year, sourceProvince: province });
    const response = await fetch(`${this.baseUrl}/statistics/overview?${query}`);
    return response.json();
  }
}

// 使用示例
const service = new EnrollmentPlanService();

// 获取2024年浙江省物理类的招生计划
const result = await service.getList({
  year: 2024,
  sourceProvince: '浙江省',
  subjectType: '物理类',
  pageNum: 1,
  pageSize: 20
});

console.log(result.data.list);
```

### React 示例

```jsx
import { useState, useEffect } from 'react';

function EnrollmentPlanList() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(
        'http://localhost:3000/api/enrollment-plan/list?year=2024&sourceProvince=浙江省'
      );
      const result = await response.json();
      setPlans(result.data.list);
    } catch (error) {
      console.error('获取招生计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <h2>招生计划列表</h2>
      <table>
        <thead>
          <tr>
            <th>院校名称</th>
            <th>专业名称</th>
            <th>计划人数</th>
            <th>学费</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(plan => (
            <tr key={plan.id}>
              <td>{plan.collegeName}</td>
              <td>{plan.majorName}</td>
              <td>{plan.planCount}</td>
              <td>¥{plan.tuition}/年</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Vue 示例

```vue
<template>
  <div>
    <h2>招生计划列表</h2>
    <div v-if="loading">加载中...</div>
    <table v-else>
      <thead>
        <tr>
          <th>院校名称</th>
          <th>专业名称</th>
          <th>计划人数</th>
          <th>学费</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="plan in plans" :key="plan.id">
          <td>{{ plan.collegeName }}</td>
          <td>{{ plan.majorName }}</td>
          <td>{{ plan.planCount }}</td>
          <td>¥{{ plan.tuition }}/年</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      plans: [],
      loading: true
    };
  },
  mounted() {
    this.fetchPlans();
  },
  methods: {
    async fetchPlans() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/enrollment-plan/list?year=2024&sourceProvince=浙江省'
        );
        const result = await response.json();
        this.plans = result.data.list;
      } catch (error) {
        console.error('获取招生计划失败:', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

## 故障排查

### 问题 1: 数据库连接失败
**错误信息**: `Error: connect ECONNREFUSED`

**解决方法**:
1. 确认MySQL服务已启动
2. 检查 `.env` 文件中的数据库配置
3. 确认端口号正确（默认3306或3307）

### 问题 2: 导入时提示文件不存在
**错误信息**: `文件不存在: /path/to/file.xlsx`

**解决方法**:
1. 使用绝对路径
2. 确认文件路径正确
3. 检查文件扩展名（必须是.xlsx或.xls）

### 问题 3: API返回空数组
**情况**: 接口正常返回，但 `data.list` 为空

**解决方法**:
1. 确认已导入数据
2. 检查查询条件是否过于严格
3. 尝试不带筛选条件查询：`/api/enrollment-plan/list`

### 问题 4: 院校API查询不到招生计划
**情况**: `/api/college/:id/plan` 返回空数组

**解决方法**:
1. 确认院校表中该院校有 `code` 字段
2. 招生计划表中的 `collegeCode` 要与院校的 `code` 匹配
3. 或者在导入时会自动关联 `collegeId`

## 下一步

- 📖 查看完整的 [API文档](./ENROLLMENT_PLAN_API.md)
- 📥 查看详细的 [导入指南](../scripts/ENROLLMENT_PLAN_IMPORT_GUIDE.md)
- 📊 查看 [开发总结](./ENROLLMENT_PLAN_SUMMARY.md)

## 获取帮助

如遇到问题，请：
1. 查看服务器日志
2. 查看浏览器控制台
3. 确认数据库中有数据
4. 参考API文档检查请求参数

祝你使用愉快！🎉
