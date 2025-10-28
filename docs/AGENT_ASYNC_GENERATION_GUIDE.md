# Agent 异步推荐生成 API 使用指南

## 问题背景

原先的推荐生成 API 采用同步方式，整个推荐生成过程需要较长时间（通常超过15秒），导致前端请求超时。

## 解决方案

采用**异步任务处理模式**：
1. 客户端调用生成接口，立即返回任务ID
2. 客户端通过轮询方式查询任务状态
3. 任务完成后，客户端获取推荐结果

---

## API 接口说明

### 1. 启动推荐生成任务

**接口**: `POST /api/agent/generate`

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "sessionId": "session-uuid",
  "count": 60
}
```

**响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": "task-uuid",
    "message": "Recommendation generation started",
    "statusUrl": "/api/agent/generate/status/task-uuid"
  }
}
```

---

### 2. 查询任务状态

**接口**: `GET /api/agent/generate/status/:taskId`

**请求头**:
```
Authorization: Bearer <token>
```

**响应 - 任务进行中**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": "task-uuid",
    "status": "processing",
    "progress": 10,
    "startedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**响应 - 任务完成**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": "task-uuid",
    "status": "completed",
    "progress": 100,
    "startedAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:00:25.000Z",
    "result": {
      "count": 60,
      "recommendations": [
        {
          "collegeId": "...",
          "collegeName": "...",
          "majorGroupCode": "...",
          "totalScore": 95.5,
          "admissionProbability": "high",
          "scoreCategory": "stable",
          // ... 更多字段
        }
      ]
    }
  }
}
```

**响应 - 任务失败**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "taskId": "task-uuid",
    "status": "failed",
    "progress": 10,
    "startedAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:00:05.000Z",
    "error": "错误信息"
  }
}
```

**任务状态说明**:
- `pending`: 任务已创建，等待执行
- `processing`: 任务正在执行中
- `completed`: 任务已完成，结果可用
- `failed`: 任务执行失败

---

## 前端集成指南

### React/Vue 示例代码

```typescript
// 1. 启动推荐生成
async function generateRecommendations(sessionId: string, count: number = 60) {
  try {
    const response = await fetch('/api/agent/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId, count })
    });

    const result = await response.json();

    if (result.code === 200) {
      const { taskId } = result.data;

      // 开始轮询任务状态
      return await pollTaskStatus(taskId);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('启动推荐生成失败:', error);
    throw error;
  }
}

// 2. 轮询任务状态
async function pollTaskStatus(taskId: string, maxAttempts: number = 60): Promise<any> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`/api/agent/generate/status/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.code === 200) {
        const taskData = result.data;

        // 更新进度条
        updateProgress(taskData.progress);

        if (taskData.status === 'completed') {
          // 任务完成，返回结果
          return taskData.result;
        } else if (taskData.status === 'failed') {
          // 任务失败
          throw new Error(taskData.error || '推荐生成失败');
        }

        // 任务还在进行中，等待2秒后继续轮询
        await sleep(2000);
        attempts++;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('查询任务状态失败:', error);
      throw error;
    }
  }

  throw new Error('任务超时，请稍后重试');
}

// 3. 辅助函数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateProgress(progress: number): void {
  // 更新前端进度条显示
  console.log(`推荐生成进度: ${progress}%`);
}

// 4. 使用示例
async function handleGenerate() {
  try {
    // 显示加载状态
    setLoading(true);
    setProgress(0);

    // 启动推荐生成
    const recommendations = await generateRecommendations(sessionId, 60);

    // 处理推荐结果
    console.log('推荐结果:', recommendations);
    setRecommendations(recommendations.recommendations);

    // 隐藏加载状态
    setLoading(false);
    setProgress(100);
  } catch (error) {
    console.error('推荐生成失败:', error);
    setLoading(false);
    showError('推荐生成失败，请稍后重试');
  }
}
```

---

## React Hooks 封装

```typescript
import { useState, useCallback } from 'react';

interface TaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
}

export function useAsyncGeneration() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (sessionId: string, count: number = 60) => {
    try {
      setLoading(true);
      setProgress(0);
      setError(null);

      // 启动任务
      const startResponse = await fetch('/api/agent/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, count })
      });

      const startResult = await startResponse.json();
      if (startResult.code !== 200) {
        throw new Error(startResult.message);
      }

      const { taskId } = startResult.data;

      // 轮询任务状态
      return await pollStatus(taskId);

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const pollStatus = async (taskId: string): Promise<any> => {
    const maxAttempts = 60; // 最多轮询60次（2分钟）
    let attempts = 0;

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`/api/agent/generate/status/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const statusResult = await statusResponse.json();
      if (statusResult.code !== 200) {
        throw new Error(statusResult.message);
      }

      const taskData: TaskStatus = statusResult.data;
      setProgress(taskData.progress);

      if (taskData.status === 'completed') {
        return taskData.result;
      } else if (taskData.status === 'failed') {
        throw new Error(taskData.error || '推荐生成失败');
      }

      // 等待2秒后继续轮询
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('任务超时');
  };

  return { generate, loading, progress, error };
}

// 使用示例
function RecommendationPage() {
  const { generate, loading, progress, error } = useAsyncGeneration();
  const [recommendations, setRecommendations] = useState([]);

  const handleGenerate = async () => {
    try {
      const result = await generate(sessionId, 60);
      setRecommendations(result.recommendations);
    } catch (err) {
      console.error('生成失败:', err);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? '生成中...' : '生成推荐'}
      </button>

      {loading && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
          <span>{progress}%</span>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {recommendations.length > 0 && (
        <div className="recommendations">
          {/* 渲染推荐列表 */}
        </div>
      )}
    </div>
  );
}
```

---

## Vue 3 Composition API 封装

```typescript
import { ref, Ref } from 'vue';

interface TaskStatus {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
}

export function useAsyncGeneration() {
  const loading: Ref<boolean> = ref(false);
  const progress: Ref<number> = ref(0);
  const error: Ref<string | null> = ref(null);

  const generate = async (sessionId: string, count: number = 60) => {
    try {
      loading.value = true;
      progress.value = 0;
      error.value = null;

      // 启动任务
      const startResponse = await fetch('/api/agent/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, count })
      });

      const startResult = await startResponse.json();
      if (startResult.code !== 200) {
        throw new Error(startResult.message);
      }

      const { taskId } = startResult.data;

      // 轮询任务状态
      return await pollStatus(taskId);

    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const pollStatus = async (taskId: string): Promise<any> => {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`/api/agent/generate/status/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const statusResult = await statusResponse.json();
      if (statusResult.code !== 200) {
        throw new Error(statusResult.message);
      }

      const taskData: TaskStatus = statusResult.data;
      progress.value = taskData.progress;

      if (taskData.status === 'completed') {
        return taskData.result;
      } else if (taskData.status === 'failed') {
        throw new Error(taskData.error || '推荐生成失败');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('任务超时');
  };

  return { generate, loading, progress, error };
}
```

---

## 用户体验优化建议

1. **显示进度条**: 在轮询期间显示进度条，让用户了解任务进度
2. **预估时间**: 根据进度显示预估剩余时间
3. **取消功能**: 提供取消按钮，允许用户中断长时间任务
4. **错误重试**: 如果任务失败，提供重试按钮
5. **后台运行**: 允许用户在生成期间浏览其他页面

```typescript
// 进度显示组件示例
function ProgressIndicator({ progress }: { progress: number }) {
  const estimatedTime = Math.ceil((100 - progress) / 4); // 粗略估算剩余秒数

  return (
    <div className="generation-progress">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="progress-text">
        正在生成推荐... {progress}%
      </p>
      {progress < 100 && (
        <p className="estimated-time">
          预计还需 {estimatedTime} 秒
        </p>
      )}
    </div>
  );
}
```

---

## 注意事项

1. **任务有效期**: 任务结果会在内存中保留30分钟，之后会被自动清理
2. **并发限制**: 每个用户同时只能有一个推荐生成任务
3. **轮询间隔**: 建议每2-3秒查询一次任务状态，避免过于频繁
4. **超时处理**: 如果超过2分钟仍未完成，建议提示用户稍后重试
5. **错误处理**: 处理网络错误、认证失败等异常情况

---

## 后端技术说明

### 任务存储

当前版本使用**内存存储**（Map）来管理任务状态，适用于单实例部署。

**生产环境建议**:
- 使用 Redis 存储任务状态，支持分布式部署
- 使用消息队列（如 RabbitMQ、Bull）处理任务
- 添加任务持久化，防止服务重启导致任务丢失

### 任务清理

任务完成后会在30分钟后自动清理，避免内存泄漏。

---

## 其他相关 API

### 获取当前会话
```
GET /api/agent/session/current
```

### 获取会话消息历史
```
GET /api/agent/session/:sessionId/messages?limit=100&offset=0
```

详细文档请参考 [API 测试文件](../api-test.http)

---

## 常见问题

### Q1: 为什么不使用 WebSocket 或 SSE？
A: 考虑到项目现有架构和实现复杂度，轮询方式更简单可靠。如果需要实时更新，可以考虑升级为 WebSocket。

### Q2: 任务失败后如何处理？
A: 前端应该提供重试按钮，允许用户重新启动推荐生成。同时记录错误信息，便于排查问题。

### Q3: 如何优化推荐生成性能？
A:
- 使用缓存存储频繁访问的数据
- 优化数据库查询，添加索引
- 考虑使用向量数据库加速相似度计算
- 分批处理候选集，提高并行度

---

## 更新日志

- **2024-01-XX**: 初始版本，支持异步推荐生成
- **未来计划**:
  - 支持 WebSocket 实时推送
  - 添加任务优先级队列
  - 支持分布式任务处理
