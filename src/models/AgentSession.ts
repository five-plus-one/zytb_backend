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
import { User } from './User';

/**
 * 智能体会话表
 * 记录用户与智能体的完整对话会话
 */
@Entity('agent_sessions')
@Index(['userId', 'status'])
export class AgentSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // ========== 基本信息 ==========
  @Column({ type: 'varchar', length: 50, comment: '省份' })
  province!: string;

  @Column({ name: 'exam_score', type: 'int', comment: '高考分数' })
  examScore!: number;

  @Column({ name: 'score_rank', type: 'int', nullable: true, comment: '分数位次' })
  scoreRank?: number;

  @Column({ name: 'subject_type', type: 'varchar', length: 20, comment: '科目类型(物理/历史)' })
  subjectType!: string;

  // ========== 会话状态 ==========
  @Column({
    type: 'enum',
    enum: ['init', 'core_preferences', 'secondary_preferences', 'generating', 'refining', 'completed'],
    default: 'init',
    comment: '当前阶段'
  })
  stage!: string;

  @Column({
    type: 'enum',
    enum: ['quick', 'deep'],
    default: 'deep',
    comment: '会话模式'
  })
  mode!: 'quick' | 'deep';

  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'completed'],
    default: 'active',
    comment: '会话状态'
  })
  @Index()
  status!: string;

  // ========== 进度追踪 ==========
  @Column({ name: 'core_preferences_count', type: 'int', default: 0, comment: '已收集核心指标数量' })
  corePreferencesCount!: number;

  @Column({ name: 'secondary_preferences_count', type: 'int', default: 0, comment: '已收集次要指标数量' })
  secondaryPreferencesCount!: number;

  @Column({ name: 'total_messages', type: 'int', default: 0, comment: '总消息数' })
  totalMessages!: number;

  // ========== 推荐结果 ==========
  @Column({
    name: 'initial_recommendations',
    type: 'json',
    nullable: true,
    comment: '初步推荐结果(2倍数量)'
  })
  initialRecommendations?: any;

  @Column({
    name: 'final_volunteers',
    type: 'json',
    nullable: true,
    comment: '最终志愿表'
  })
  finalVolunteers?: any;

  // ========== 决策权重 (关键) ==========
  @Column({
    name: 'decision_weights',
    type: 'json',
    nullable: true,
    comment: '用户的核心决策权重: {college, major, city, employment, furtherStudy, interest, prospect}'
  })
  decisionWeights?: {
    college: number;          // 院校权重 0-100
    major: number;            // 专业权重 0-100
    city: number;             // 城市权重 0-100
    employment: number;       // 就业权重 0-100
    furtherStudy: number;     // 深造权重 0-100
    interest: number;         // 兴趣权重 0-100
    prospect: number;         // 前景权重 0-100
  };

  // ========== 时间戳 ==========
  @Column({ name: 'last_active_at', type: 'datetime', comment: '最后活跃时间' })
  lastActiveAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
