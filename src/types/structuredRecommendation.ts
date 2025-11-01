/**
 * 结构化推荐数据类型定义
 *
 * 目的：为前端提供清晰的、可直接渲染的数据结构
 * 避免 Markdown 格式，提供一键操作接口
 */

/**
 * 历年录取数据（单年）
 */
export interface YearlyAdmissionData {
  year: number;           // 年份
  minScore: number;       // 最低分
  avgScore?: number;      // 平均分
  maxScore?: number;      // 最高分
  minRank: number;        // 最低位次
  maxRank?: number;       // 最高位次
  planCount: number;      // 招生计划数
  actualAdmitted?: number; // 实际录取人数
}

/**
 * 专业信息
 */
export interface MajorInfo {
  majorId: string;        // 专业ID
  majorName: string;      // 专业名称
  majorCode?: string;     // 专业代码
  planCount: number;      // 招生计划数
  tuition?: number;       // 学费
  duration?: string;      // 学制（如 "4年"）
  degree?: string;        // 学位（如 "工学学士"）
  studyLocation?: string; // 办学地点
  remarks?: string;       // 备注（如专业要求）
}

/**
 * 专业组推荐（结构化）
 */
export interface StructuredGroupRecommendation {
  // ===== 基本信息 =====
  groupId: string;              // 专业组唯一标识
  collegeName: string;          // 院校名称
  collegeCode?: string;         // 院校代码
  collegeProvince?: string;     // 院校所在省份
  groupName: string;            // 专业组名称
  groupCode: string;            // 专业组代码

  // ===== 院校标签 =====
  is985: boolean;               // 是否985
  is211: boolean;               // 是否211
  isDoubleFirstClass: boolean;  // 是否双一流
  collegeType?: string;         // 院校类型（综合/理工/师范等）
  collegeLevel?: string;        // 办学层次

  // ===== 冲稳保分类 =====
  riskLevel: '冲' | '稳' | '保';     // 冲稳保分类
  probability: number;              // 录取概率 (0-100)
  confidence: number;               // 置信度 (0-100)
  adjustmentRisk: '高' | '中' | '低'; // 调剂风险

  // ===== 分数分析 =====
  scoreGap: number;                 // 分数差距（用户分数 - 历史平均）
  rankGap: number | null;           // 位次差距（历史平均位次 - 用户位次）
  userScore: number;                // 用户分数
  userRank: number;                 // 用户位次
  avgMinScore: number;              // 近3年平均最低分
  avgMinRank: number;               // 近3年平均最低位次

  // ===== 历年数据 =====
  historicalData: YearlyAdmissionData[]; // 历年录取数据（按年份降序）
  scoreVolatility?: number;         // 分数波动性（标准差）
  scoreTrend?: 'up' | 'down' | 'stable'; // 分数趋势

  // ===== 专业信息 =====
  majors: MajorInfo[];              // 包含的专业列表
  totalMajors: number;              // 专业总数
  totalPlanCount: number;           // 总招生计划数

  // ===== 推荐理由 =====
  recommendReasons: string[];       // 推荐理由列表
  warnings?: string[];              // 风险提示
  highlights?: string[];            // 亮点标签（如"王牌专业"、"就业率高"）

  // ===== 排序权重 =====
  rankScore: number;                // 综合排序分数（内部使用）
}

/**
 * 推荐摘要统计
 */
export interface RecommendationSummary {
  totalCount: number;        // 总推荐数
  rushCount: number;         // 冲一冲数量
  stableCount: number;       // 稳一稳数量
  safeCount: number;         // 保一保数量

  // 平均概率
  avgProbability: {
    rush: number;           // 冲区间平均概率
    stable: number;         // 稳区间平均概率
    safe: number;           // 保区间平均概率
  };

  // 院校分布
  distribution: {
    total985: number;       // 985院校数量
    total211: number;       // 211院校数量
    totalOthers: number;    // 其他院校数量
  };

  // 分数范围
  scoreRange: {
    min: number;            // 推荐中最低分
    max: number;            // 推荐中最高分
    userScore: number;      // 用户分数
  };

  // 概率分布
  probabilityDistribution: {
    veryLow: number;        // 0-15%
    low: number;            // 15-35%
    medium: number;         // 35-65%
    high: number;           // 65-90%
    veryHigh: number;       // 90-100%
  };
}

/**
 * 结构化推荐结果（完整）
 */
export interface StructuredRecommendationResult {
  // ===== 用户信息 =====
  userProfile: {
    score: number;
    rank: number;
    province: string;
    category: string;
    year: number;
  };

  // ===== 筛选偏好 =====
  preferences: {
    majorNames?: string[];
    collegeProvinces?: string[];
    collegeTypes?: string[];
    is985?: boolean;
    is211?: boolean;
    minPlanCount?: number;
  };

  // ===== 推荐结果 =====
  recommendations: {
    rush: StructuredGroupRecommendation[];      // 冲一冲（12个）
    stable: StructuredGroupRecommendation[];    // 稳一稳（20个）
    safe: StructuredGroupRecommendation[];      // 保一保（8个）
  };

  // ===== 统计摘要 =====
  summary: RecommendationSummary;

  // ===== 元数据 =====
  metadata: {
    timestamp: number;          // 生成时间戳
    version: string;            // 数据版本
    algorithm: string;          // 使用的算法版本
    dataSource: string;         // 数据来源
    filteredCount: number;      // 被过滤的推荐数量
  };
}

/**
 * 前端操作接口定义
 */
export interface RecommendationActions {
  // 一键添加到志愿表
  addToVolunteerTable: (groupId: string, position?: number) => Promise<{
    success: boolean;
    message: string;
    position: number;
  }>;

  // 批量添加（按冲稳保分类）
  addBatchToVolunteerTable: (category: 'rush' | 'stable' | 'safe', count: number) => Promise<{
    success: boolean;
    message: string;
    addedCount: number;
  }>;

  // 查看专业组详情
  viewGroupDetail: (groupId: string) => Promise<StructuredGroupRecommendation>;

  // 对比多个专业组
  compareGroups: (groupIds: string[]) => Promise<{
    groups: StructuredGroupRecommendation[];
    comparison: {
      field: string;
      values: any[];
    }[];
  }>;

  // 调整推荐（重新筛选）
  adjustRecommendation: (newPreferences: any) => Promise<StructuredRecommendationResult>;

  // 导出推荐结果
  exportRecommendation: (format: 'json' | 'excel' | 'pdf') => Promise<Blob>;
}

/**
 * 图表数据格式
 */
export interface ChartData {
  // 历年分数趋势图
  scoreTrendChart: {
    labels: number[];           // 年份
    datasets: {
      label: string;            // 数据集名称
      data: number[];           // 数据点
      color?: string;           // 颜色
    }[];
  };

  // 概率分布饼图
  probabilityPieChart: {
    labels: string[];           // 标签（冲/稳/保）
    data: number[];             // 数量
    colors: string[];           // 颜色
  };

  // 院校层次分布
  collegeLevelChart: {
    labels: string[];           // 985/211/其他
    data: number[];             // 数量
    colors: string[];           // 颜色
  };
}

/**
 * API 响应格式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
  requestId?: string;
}
