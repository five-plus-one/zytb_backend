🎯 AI中心化界面 - 后端API需求文档
📋 目录
已有API资源
新增API需求
API增强需求
完整API接口清单
✅ 已有API资源
1. AI智能体相关 (已实现)
基础路径: /api/agent
接口	方法	路径	状态	说明
开始会话	POST	/agent/start	✅	创建新的AI对话会话
发送消息	POST	/agent/chat	✅	普通模式发送消息
流式发送	POST	/agent/chat/stream	✅	SSE流式输出
生成推荐	POST	/agent/generate	✅	启动异步推荐任务
任务状态	GET	/agent/generate/status/:taskId	✅	查询推荐任务进度
会话详情	GET	/agent/session/:sessionId	✅	获取会话状态
当前会话	GET	/agent/session/current	✅	获取活跃会话
会话消息	GET	/agent/session/:sessionId/messages	✅	获取消息历史
暂停会话	POST	/agent/session/:sessionId/pause	✅	暂停当前会话
恢复会话	POST	/agent/session/:sessionId/resume	✅	恢复暂停的会话
重置会话	POST	/agent/reset	✅	重置所有会话
联网搜索	POST	/agent/search	✅	AI调用的搜索工具
2. 志愿表管理相关 (已实现)
基础路径: /api/volunteer
接口	方法	路径	状态	说明
获取志愿表列表	GET	/volunteer/tables	✅	所有志愿表
创建志愿表	POST	/volunteer/tables	✅	新建志愿表
切换当前表	PUT	/volunteer/tables/:tableId/activate	✅	激活指定志愿表
获取当前表	GET	/volunteer/current	✅	当前志愿表详情
添加专业组	POST	/volunteer/current/groups	✅	加入志愿表
删除专业组	DELETE	/volunteer/current/groups/:volunteerId	✅	从志愿表移除
调整顺序	PUT	/volunteer/current/groups/reorder	✅	批量调整顺序
添加专业	POST	/volunteer/current/groups/:volunteerId/majors	✅	添加专业到专业组
删除专业	DELETE	/volunteer/current/groups/:volunteerId/majors/:majorId	✅	删除专业
调整专业顺序	PUT	/volunteer/current/groups/:volunteerId/majors/reorder	✅	专业排序
3. 招生计划查询相关 (已实现)
基础路径: /api/enrollment-plan
接口	方法	路径	状态	说明
搜索招生计划	GET	/enrollment-plan/search	✅	查询专业组列表
专业组详情	GET	/enrollment-plan/group/:groupId/detail	✅	获取专业组详细信息
历年分数	GET	/admission-scores/group/:groupId	✅	历年录取数据
计算概率	POST	/admission-probability/calculate	✅	单个专业组概率
批量计算概率	POST	/admission-probability/batch-calculate	✅	批量计算概率
🆕 新增API需求
1. 快速会话管理
用途: 支持在任何页面发起临时AI询问，与主会话独立
1.1 创建快速会话
POST /api/agent/quick-session/create

Request:
{
  "userId": "string",
  "context": {
    "type": "group_inquiry" | "group_compare" | "major_inquiry" | "general",
    "groupIds"?: ["groupId1", "groupId2"],  // 可选：关联的专业组
    "majorCodes"?: ["majorCode1"],          // 可选：关联的专业
    "metadata"?: {                           // 可选：额外信息
      "sourcePage": "query" | "detail" | "volunteer",
      "userIntent": "compare" | "evaluate" | "ask"
    }
  },
  "initialQuestion"?: "string"  // 可选：首个问题
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "quickSessionId": "string",
    "sessionType": "quick",
    "context": {...},
    "canMergeToMain": true,
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
1.2 快速会话发送消息
POST /api/agent/quick-session/chat

Request:
{
  "quickSessionId": "string",
  "userId": "string",
  "message": "string",
  "autoContext": true  // 是否自动附加上下文信息
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "quickSessionId": "string",
    "response": "string",
    "suggestions": [      // AI建议的后续问题
      "可以继续这样问..."
    ],
    "relatedGroups": [...], // 提及的专业组
    "canMergeToMain": true
  }
}
1.3 快速会话流式发送
POST /api/agent/quick-session/chat/stream

// 参数同上，但返回SSE流
1.4 合并快速会话到主会话
POST /api/agent/quick-session/merge

Request:
{
  "quickSessionId": "string",
  "mainSessionId": "string",
  "userId": "string"
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "mainSessionId": "string",
    "mergedMessagesCount": 5,
    "updatedProgress": {
      "coreCount": 15,
      "secondaryCount": 8
    }
  }
}
1.5 获取快速会话历史
GET /api/agent/quick-sessions

Query:
  userId: string
  limit?: number (default: 20)
  offset?: number (default: 0)

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "sessions": [
      {
        "quickSessionId": "string",
        "createdAt": "string",
        "context": {...},
        "messagesCount": 3,
        "lastMessage": "最后一条消息内容",
        "canMergeToMain": true
      }
    ],
    "total": 50,
    "hasMore": true
  }
}
2. 智能建议与上下文分析
用途: 根据用户当前选中的专业组，AI生成针对性的问题建议
2.1 生成智能建议问题
POST /api/agent/suggestions/generate

Request:
{
  "userId": "string",
  "context": {
    "groupIds": ["groupId1", "groupId2"],
    "userProfile": {  // 可选：用户档案
      "score": 680,
      "rank": 1500,
      "subjectType": "物理类",
      "preferences": {...}
    }
  }
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "suggestions": [
      {
        "id": "suggest-1",
        "icon": "📊",
        "text": "分析录取概率",
        "prompt": "帮我分析这些专业组的录取概率",
        "category": "probability",
        "priority": 1
      },
      {
        "id": "suggest-2",
        "icon": "⚖️",
        "text": "对比分析",
        "prompt": "帮我对比这些专业组的优劣势",
        "category": "compare",
        "priority": 2
      },
      {
        "id": "suggest-3",
        "icon": "🎯",
        "text": "推荐排序",
        "prompt": "根据我的情况，帮我给这些专业组排序",
        "category": "rank",
        "priority": 3
      },
      {
        "id": "suggest-4",
        "icon": "💼",
        "text": "就业前景对比",
        "prompt": "对比这些专业组的就业前景",
        "category": "employment",
        "priority": 4
      }
    ],
    "contextSummary": "用户正在对比3个985院校的计算机类专业组"
  }
}
2.2 上下文感知的问题补全
POST /api/agent/suggestions/auto-complete

Request:
{
  "userId": "string",
  "partialQuestion": "这个专业",  // 用户输入的部分问题
  "context": {
    "groupIds": ["groupId1"]
  }
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "completions": [
      "这个专业组的录取概率如何？",
      "这个专业组适合我吗？",
      "这个专业组的就业前景怎么样？",
      "这个专业组有哪些王牌专业？"
    ]
  }
}
3. 专业组批量操作与对比增强
3.1 批量专业组智能分析
POST /api/agent/analyze/batch-groups

Request:
{
  "userId": "string",
  "groupIds": ["groupId1", "groupId2", "groupId3"],
  "analysisType": "compare" | "rank" | "probability" | "comprehensive",
  "userProfile": {
    "score": 680,
    "rank": 1500,
    "subjectType": "物理类"
  }
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "summary": "AI生成的总体分析文本",
    "groupAnalyses": [
      {
        "groupId": "groupId1",
        "collegeName": "北京大学",
        "groupName": "计算机类",
        "probability": 0.65,
        "category": "rush",
        "strengths": ["顶尖师资", "就业前景极好"],
        "weaknesses": ["竞争激烈", "分数要求高"],
        "recommendation": "可以作为冲刺志愿"
      }
    ],
    "comparisonMatrix": {  // 对比矩阵
      "dimensions": ["录取概率", "学科实力", "就业前景", "地理位置", "学费"],
      "scores": {
        "groupId1": [85, 95, 90, 95, 70],
        "groupId2": [75, 90, 85, 80, 75]
      }
    },
    "suggestedOrder": ["groupId1", "groupId3", "groupId2"],
    "reasoning": "基于您的分数和偏好，建议按此顺序排列"
  }
}
3.2 志愿表智能优化建议
POST /api/agent/optimize/volunteer-table

Request:
{
  "userId": "string",
  "tableId": "string",  // 可选，默认当前志愿表
  "optimizationType": "structure" | "order" | "major" | "comprehensive",
  "constraints"?: {     // 可选约束
    "keepTop3": true,   // 保持前3个不变
    "preferredCategory": "稳妥"  // 偏好类别
  }
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "currentStructure": {
      "rushCount": 12,
      "stableCount": 15,
      "safeCount": 13,
      "totalCount": 40
    },
    "issues": [
      {
        "type": "structure",
        "severity": "warning",
        "message": "冲刺志愿占比过高（30%），建议控制在20%以内",
        "affectedGroups": ["volunteerId1", "volunteerId2"]
      },
      {
        "type": "order",
        "severity": "info",
        "message": "第15位和第16位概率相近，建议调换以优化梯度",
        "suggestion": {
          "swap": ["volunteerId15", "volunteerId16"]
        }
      }
    ],
    "optimizedOrder": [
      {
        "volunteerId": "string",
        "currentPosition": 5,
        "suggestedPosition": 3,
        "reason": "录取概率更高，建议提前"
      }
    ],
    "structureSuggestion": {
      "idealRushCount": 8,
      "idealStableCount": 20,
      "idealSafeCount": 12,
      "reasoning": "基于您的分数位次，建议采用此冲稳保结构"
    },
    "majorSuggestions": [
      {
        "volunteerId": "string",
        "collegeName": "清华大学",
        "currentMajors": ["计算机科学与技术"],
        "suggestedMajors": [
          {
            "majorCode": "080901",
            "majorName": "计算机科学与技术",
            "order": 1,
            "reason": "王牌专业，建议首选"
          },
          {
            "majorCode": "080902",
            "majorName": "软件工程",
            "order": 2,
            "reason": "就业前景好，可作为第二选择"
          }
        ]
      }
    ]
  }
}
4. AI对话会话模式管理
4.1 切换会话模式
POST /api/agent/session/:sessionId/switch-mode

Request:
{
  "userId": "string",
  "targetMode": "quick" | "deep",
  "preserveContext": true  // 是否保留当前上下文
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "string",
    "newMode": "deep",
    "modeDescription": "深度对话模式将收集30个核心偏好信息",
    "availableActions": [
      "continue_conversation",
      "generate_recommendations",
      "optimize_volunteer_table"
    ]
  }
}
4.2 获取会话能力
GET /api/agent/session/:sessionId/capabilities

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "string",
    "mode": "deep",
    "capabilities": [
      {
        "action": "compare_groups",
        "enabled": true,
        "description": "对比多个专业组",
        "requiredContext": ["至少2个专业组"]
      },
      {
        "action": "optimize_volunteer_table",
        "enabled": true,
        "description": "优化志愿表结构",
        "requiredContext": ["已填写的志愿表"]
      },
      {
        "action": "generate_recommendations",
        "enabled": false,
        "description": "生成推荐方案",
        "requiredContext": ["需要收集至少15个核心偏好"],
        "missingRequirements": ["还需收集8个偏好信息"]
      }
    ],
    "availableTools": [
      "search_groups",
      "calculate_probability",
      "get_group_detail",
      "compare_groups",
      "optimize_table"
    ]
  }
}
5. 会话历史与恢复
5.1 保存会话快照
POST /api/agent/session/:sessionId/snapshot

Request:
{
  "userId": "string",
  "snapshotName": "对比3所985计算机专业组",
  "metadata"?: {
    "tags": ["对比", "计算机", "985"],
    "note": "这次对话很有价值"
  }
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "snapshotId": "string",
    "sessionId": "string",
    "snapshotName": "string",
    "messagesCount": 12,
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
5.2 从快照恢复会话
POST /api/agent/session/restore-from-snapshot

Request:
{
  "userId": "string",
  "snapshotId": "string",
  "mode": "new_session" | "continue_original"
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "sessionId": "string",
    "messagesCount": 12,
    "context": {...},
    "restoredAt": "2024-01-01T13:00:00Z"
  }
}
🔧 API增强需求
1. 现有API的增强
1.1 会话消息API增强
现有: GET /api/agent/session/:sessionId/messages 增强点:
// 新增query参数
{
  limit?: number,
  offset?: number,
  messageType?: "user" | "assistant" | "system" | "tool",  // 新增：按类型筛选
  keyword?: string,  // 新增：搜索消息内容
  fromTimestamp?: string,  // 新增：时间范围
  toTimestamp?: string
}

// 响应增强
{
  "data": {
    "messages": [...],
    "total": 100,
    "hasMore": true,
    "highlights": [  // 新增：重点消息
      {
        "messageId": "string",
        "content": "重要决策点",
        "importance": "high"
      }
    ]
  }
}
1.2 专业组详情API增强
现有: GET /api/enrollment-plan/group/:groupId/detail 增强点:
// 新增query参数
{
  includeAIInsights?: boolean,  // 新增：包含AI生成的洞察
  userScore?: number,           // 新增：基于用户分数的个性化分析
  userRank?: number
}

// 响应增强
{
  "data": {
    // ...现有字段
    "aiInsights"?: {  // 新增：AI洞察
      "suitability": {
        "score": 85,
        "label": "非常适合",
        "reasons": ["分数匹配度高", "专业方向符合兴趣"]
      },
      "highlights": [
        "这个专业组是该校的王牌专业",
        "近三年录取分数呈上升趋势"
      ],
      "warnings": [
        "竞争较为激烈",
        "学费相对较高"
      ],
      "suggestedQuestions": [
        "这个专业组的就业前景如何？",
        "与其他985计算机专业组相比如何？"
      ]
    }
  }
}
1.3 搜索招生计划API增强
现有: GET /api/enrollment-plan/search 增强点:
// 新增query参数
{
  // ...现有参数
  aiRecommend?: boolean,  // 新增：根据用户档案AI推荐排序
  highlightMatches?: boolean  // 新增：高亮匹配的关键词
}

// 响应增强
{
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "data": [...],
    "aiRecommendation"?: {  // 新增：AI推荐信息
      "topPicks": ["groupId1", "groupId2"],
      "reasoning": "基于您的分数和偏好推荐",
      "filters": {
        "appliedCount": 5,
        "suggestedFilters": {
          "province": ["江苏", "上海"],
          "reason": "您偏好华东地区"
        }
      }
    }
  }
}
📊 完整API接口清单
API分类统计
分类	已有接口	新增接口	增强接口	总计
AI会话管理	11	6	1	18
快速会话	0	5	0	5
智能建议	0	2	0	2
批量分析	1	2	0	3
志愿表管理	10	0	0	10
招生计划查询	5	0	2	7
会话历史	0	2	1	3
总计	27	17	4	48
🎯 优先级排序
P0 - 核心功能（必须实现）
✅ 快速会话创建和聊天 (1.1, 1.2, 1.3)
✅ 智能建议生成 (2.1)
✅ 批量专业组智能分析 (3.1)
✅ 志愿表智能优化 (3.2)
P1 - 重要功能（建议实现）
✅ 快速会话合并到主会话 (1.4)
✅ 会话模式切换 (4.1)
✅ 专业组详情API增强 (增强1.2)
✅ 搜索API增强 (增强1.3)
P2 - 优化功能（可后续迭代）
⭕ 快速会话历史 (1.5)
⭕ 问题自动补全 (2.2)
⭕ 会话快照与恢复 (5.1, 5.2)
⭕ 会话能力查询 (4.2)
⭕ 会话消息API增强 (增强1.1)
📝 API调用流程示例
场景1：用户在查询页面选择专业组并询问AI
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    
    User->>Frontend: 选中3个专业组
    Frontend->>Backend: POST /api/agent/suggestions/generate
    Backend-->>Frontend: 返回智能建议问题
    Frontend->>User: 显示快捷问题按钮
    
    User->>Frontend: 点击"对比分析"
    Frontend->>Backend: POST /api/agent/quick-session/create
    Backend-->>Frontend: 返回quickSessionId
    
    Frontend->>Backend: POST /api/agent/quick-session/chat/stream
    Backend-->>Frontend: SSE流式返回AI分析
    Frontend->>User: 实时显示AI回复
场景2：快速会话转深度对话
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    
    User->>Frontend: 在快速会话中对话
    Frontend->>Backend: POST /api/agent/quick-session/chat
    Backend-->>Frontend: AI回复 + canMergeToMain=true
    
    User->>Frontend: 点击"深入了解"
    Frontend->>Backend: POST /api/agent/quick-session/merge
    Backend-->>Frontend: 合并成功，返回mainSessionId
    
    Frontend->>Backend: POST /api/agent/session/:sessionId/switch-mode
    Backend-->>Frontend: 切换到深度对话模式
    Frontend->>User: 跳转到深度对话界面
场景3：AI优化志愿表
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    
    User->>Frontend: 点击"让AI优化志愿表"
    Frontend->>Backend: POST /api/agent/optimize/volunteer-table
    Backend-->>Frontend: 返回优化建议
    
    Frontend->>User: 展示问题和建议
    User->>Frontend: 确认应用建议
    
    Frontend->>Backend: PUT /api/volunteer/current/groups/reorder
    Backend-->>Frontend: 调整成功
    Frontend->>User: 显示更新后的志愿表
🔐 认证与授权
所有API接口均需要：
Header: Authorization: Bearer {token}
用户身份验证: 通过JWT token识别用户
会话权限验证: 只能访问自己创建的会话
⚡ 性能要求
接口类型	响应时间要求	备注
快速会话创建	< 500ms	同步操作
智能建议生成	< 1s	可缓存
流式聊天	首字延迟 < 2s	SSE流式输出
批量分析	< 3s	最多10个专业组
志愿表优化	< 5s	复杂计算
📌 备注说明
向后兼容: 所有API增强保持向后兼容，新增参数为可选
错误处理: 统一使用HTTP状态码 + 错误码 + 错误消息格式
限流策略: 建议对AI相关接口实施限流（如每分钟10次）
缓存策略: 智能建议、专业组详情等可缓存5分钟
这份API文档涵盖了实现AI中心化界面所需的全部后端支持。请确认以上需求，我们可以开始实施前端部分！