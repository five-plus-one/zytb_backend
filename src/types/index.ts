import { Request } from 'express';

// 扩展 Express Request 类型
export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    userId: string;
    username: string;
  };
}

// 统一响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

// 分页参数
export interface PageParams {
  pageNum: number;
  pageSize: number;
}

// 分页响应
export interface PageResponse<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

// 用户相关类型
export interface UserRegisterDto {
  username: string;
  password: string;
  nickname: string;
  phone: string;
  email?: string;
}

export interface UserLoginDto {
  username: string;
  password: string;
}

export interface UserUpdateDto {
  nickname?: string;
  avatar?: string;
  email?: string;
  realName?: string;
  idCard?: string;
  province?: string;
  city?: string;
  school?: string;
  examScore?: number;
  subjectType?: string;
}

// 院校相关类型
export interface CollegeQueryDto extends PageParams {
  keyword?: string;
  province?: string;
  city?: string;
  type?: string;
  level?: string;
  nature?: string;
  minScore?: number;
  maxScore?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// 专业相关类型
export interface MajorQueryDto extends PageParams {
  keyword?: string;
  category?: string;
  subCategory?: string;
  degree?: string;
  hot?: boolean;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// 志愿相关类型
export interface VolunteerDto {
  priority: number;
  collegeId: string;
  majorId: string;
  isObeyAdjustment: boolean;
  remarks?: string;
}

export interface VolunteerRecommendDto {
  score: number;
  province: string;
  subjectType: string;
  rank: number;
  preference?: {
    province?: string[];
    collegeType?: string[];
    majorCategory?: string[];
    cityLevel?: string[];
    isObeyAdjustment?: boolean;
  };
  count?: number;
}

export interface VolunteerAnalyzeDto {
  volunteers: Array<{
    collegeId: string;
    majorId: string;
  }>;
  userScore: number;
  userRank: number;
  province: string;
  subjectType: string;
}

// 枚举类型
export enum SubjectType {
  PHYSICS = 'physics',
  HISTORY = 'history'
}

export enum VolunteerStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  ADMITTED = 'admitted'
}

export enum AdmitProbability {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum VolunteerType {
  STABLE = 'stable',
  MODERATE = 'moderate',
  BOLD = 'bold'
}
