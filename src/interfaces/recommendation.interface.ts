/**
 * 智能推荐相关的接口定义
 */

import { ProbabilityResult } from '../services/admissionProbability.service';

/**
 * 专业信息
 */
export interface MajorInfo {
  majorCode: string;
  majorName: string;
  majorDirection?: string;
  planCount: number;
  tuition?: number;
  studyYears?: number;
  remarks?: string;
}

/**
 * 专业组推荐结果
 */
export interface GroupRecommendation {
  // ===== 基本信息 =====
  collegeCode: string;
  collegeName: string;
  collegeProvince?: string;
  collegeCity?: string;
  is985: boolean;
  is211: boolean;
  isDoubleFirstClass: boolean;

  groupCode: string;
  groupName?: string;
  subjectRequirements?: string;

  // ===== 专业列表 =====
  majors: MajorInfo[];
  totalMajors: number;
  totalPlanCount: number;

  // ===== 录取分析（实时计算）=====
  probability: number;              // 录取概率 0-100
  riskLevel: '冲' | '稳' | '保';    // 冲稳保分类
  adjustmentRisk: '高' | '中' | '低'; // 调剂风险
  confidence: number;               // 置信度 0-100

  // ===== 分数差距 =====
  scoreGap: number;                 // 分数差距
  rankGap: number | null;           // 位次差距

  // ===== 历史数据 =====
  historicalScores: Array<{
    year: number;
    minScore: number;
    avgScore?: number;
    maxScore?: number;
    minRank: number;
    maxRank?: number;
    planCount: number;
  }>;

  // ===== 推荐理由 =====
  recommendReasons: string[];

  // ===== 排序分数（内部使用）=====
  rankScore: number;
}

/**
 * 智能推荐结果
 */
export interface SmartRecommendationResult {
  // ===== 分类推荐 =====
  rush: GroupRecommendation[];      // 冲区间（录取概率 < 35%）
  stable: GroupRecommendation[];    // 稳区间（录取概率 35-70%）
  safe: GroupRecommendation[];      // 保区间（录取概率 > 70%）

  // ===== 统计信息 =====
  summary: {
    totalCount: number;
    rushCount: number;
    stableCount: number;
    safeCount: number;

    // 平均概率
    avgProbability: {
      rush: number;
      stable: number;
      safe: number;
    };

    // 院校层级分布
    distribution: {
      total985: number;
      total211: number;
      totalOthers: number;
    };
  };

  // ===== 用户档案（用于计算的）=====
  userProfile: {
    score: number;
    rank: number;
    province: string;
    category: string;
    year: number;
  };

  // ===== 应用的偏好 =====
  appliedPreferences: {
    majors?: string[];
    majorCategories?: string[];
    locations?: string[];
    collegeTypes?: string[];
    maxTuition?: number;
  };
}

/**
 * 用户偏好配置
 */
export interface UserPreferences {
  // 专业偏好
  majors?: string[];              // 具体专业名称（如：计算机科学与技术）
  majorCategories?: string[];     // 专业大类（如：计算机类）
  majorKeywords?: string[];       // 专业关键词（如：计算机、软件）

  // 地理偏好
  locations?: string[];           // 省份（如：江苏、上海）
  cities?: string[];              // 城市（如：南京、苏州）
  excludeLocations?: string[];    // 排除的省份

  // 院校类型偏好
  collegeTypes?: string[];        // 985、211、双一流
  excludeColleges?: string[];     // 排除的院校

  // 经济约束
  maxTuition?: number;            // 最高学费
  acceptCooperation?: boolean;    // 是否接受中外合作办学

  // 就业导向
  preferHighEmployment?: boolean; // 偏好就业率高的专业
  preferHighSalary?: boolean;     // 偏好薪资高的专业

  // 数量控制
  rushCount?: number;             // 冲区间数量（默认12）
  stableCount?: number;           // 稳区间数量（默认20）
  safeCount?: number;             // 保区间数量（默认8）
}

/**
 * 排序权重配置
 */
export interface RankingWeights {
  collegeLevelWeight: number;     // 院校层级权重（默认30）
  majorMatchWeight: number;       // 专业契合度权重（默认25）
  locationWeight: number;         // 地理位置权重（默认20）
  employmentWeight: number;       // 就业数据权重（默认15）
  probabilityWeight: number;      // 概率适中性权重（默认10）
}
