import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { AgentSession } from './AgentSession';
import { User } from './User';
import { College } from './College';
import { Major } from './Major';

/**
 * 智能体推荐志愿记录表
 * 记录推荐过程中的志愿及其评分
 */
@Entity('agent_recommendations')
@Index(['sessionId', 'phase', 'rank'])
@Index(['userId', 'phase'])
export class AgentRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 36 })
  @Index()
  sessionId!: string;

  @ManyToOne(() => AgentSession)
  @JoinColumn({ name: 'session_id' })
  session?: AgentSession;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // ========== 推荐阶段 ==========
  @Column({
    type: 'enum',
    enum: ['initial', 'refined', 'final'],
    comment: '推荐阶段: initial-初步推荐(2倍), refined-精炼后, final-最终确定'
  })
  phase!: string;

  // ========== 院校和专业 ==========
  @Column({ name: 'college_id', type: 'varchar', length: 36 })
  collegeId!: string;

  @ManyToOne(() => College)
  @JoinColumn({ name: 'college_id' })
  college?: College;

  @Column({ name: 'college_name', type: 'varchar', length: 100, comment: '院校名称(冗余)' })
  collegeName!: string;

  @Column({ name: 'major_id', type: 'varchar', length: 36, nullable: true })
  majorId?: string;

  @ManyToOne(() => Major)
  @JoinColumn({ name: 'major_id' })
  major?: Major;

  @Column({ name: 'major_name', type: 'varchar', length: 100, nullable: true, comment: '专业名称(冗余)' })
  majorName?: string;

  @Column({ name: 'major_group_code', type: 'varchar', length: 50, nullable: true, comment: '专业组代码' })
  majorGroupCode?: string;

  @Column({ name: 'major_group_name', type: 'varchar', length: 100, nullable: true, comment: '专业组名称' })
  majorGroupName?: string;

  // ========== 匹配评分 ==========
  @Column({
    name: 'total_score',
    type: 'decimal',
    precision: 8,
    scale: 2,
    comment: '总匹配分数(加权计算后)'
  })
  totalScore!: number;

  @Column({ type: 'int', comment: '排名(在当前phase中)' })
  rank!: number;

  @Column({
    name: 'score_category',
    type: 'enum',
    enum: ['bold', 'moderate', 'stable'],
    comment: '分数类别: bold-冲刺, moderate-适中, stable-稳妥'
  })
  scoreCategory!: string;

  // ========== 历史分数适配度分析 ==========
  @Column({
    name: 'admission_probability',
    type: 'json',
    comment: '录取概率分析'
  })
  admissionProbability!: {
    probability: string;         // 'high' | 'medium' | 'low'
    historicalMinScore: number;  // 历年最低分
    historicalAvgScore: number;  // 历年平均分
    scoreDifference: number;     // 分数差值(用户分数 - 历年最低分)
    rankDifference?: number;     // 位次差值
    years: number;               // 参考年份数
    trend: string;               // 'rising' | 'stable' | 'falling' - 分数线趋势
  };

  // ========== 专业组调剂风险 ==========
  @Column({
    name: 'major_adjustment_risk',
    type: 'json',
    nullable: true,
    comment: '专业组内调剂风险分析'
  })
  majorAdjustmentRisk?: {
    riskLevel: string;           // 'low' | 'medium' | 'high'
    majorsInGroup: number;       // 专业组内专业数量
    matchedMajors: number;       // 匹配用户偏好的专业数
    unmatchedMajors: string[];   // 不匹配的专业列表
    adjustmentProbability: number; // 被调剂概率 0-1
    riskDescription: string;     // 风险描述
  };

  // ========== 各维度得分 ==========
  @Column({
    name: 'dimension_scores',
    type: 'json',
    comment: '各维度得分详情'
  })
  dimensionScores!: {
    collegeScore: number;        // 院校维度得分
    majorScore: number;          // 专业维度得分
    cityScore: number;           // 城市维度得分
    employmentScore: number;     // 就业维度得分
    costScore: number;           // 成本维度得分
    personalityFitScore: number; // 性格匹配度
    [key: string]: number;       // 其他指标得分
  };

  // ========== 匹配原因 ==========
  @Column({
    name: 'matching_reasons',
    type: 'json',
    comment: '推荐理由(用于展示给用户)'
  })
  matchingReasons!: string[];

  @Column({
    name: 'risk_warnings',
    type: 'json',
    nullable: true,
    comment: '风险提示'
  })
  riskWarnings?: string[];

  // ========== 权重信息 ==========
  @Column({
    type: 'json',
    comment: '计算时使用的权重'
  })
  weights!: {
    college: number;
    major: number;
    city: number;
    [key: string]: number;
  };

  // ========== 用户操作 ==========
  @Column({
    name: 'user_action',
    type: 'enum',
    enum: ['none', 'kept', 'removed', 'reordered', 'favorited'],
    default: 'none',
    comment: '用户操作'
  })
  userAction!: string;

  @Column({ name: 'user_feedback', type: 'text', nullable: true, comment: '用户反馈' })
  userFeedback?: string;

  @Column({ name: 'final_rank', type: 'int', nullable: true, comment: '用户最终排序' })
  finalRank?: number;

  // ========== 时间戳 ==========
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
