import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { College } from './College';

@Entity('admission_scores')
@Index(['year', 'sourceProvince', 'collegeName'])
@Index(['year', 'sourceProvince', 'majorName'])
@Index(['year', 'sourceProvince', 'subjectType'])
export class AdmissionScore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 生源地
  @Column({ length: 50, name: 'source_province' })
  @Index()
  sourceProvince!: string;

  // 学校
  @Column({ length: 100, name: 'college_name' })
  @Index()
  collegeName!: string;

  // 年份
  @Column({ type: 'int' })
  @Index()
  year!: number;

  // 专业
  @Column({ length: 100, name: 'major_name' })
  @Index()
  majorName!: string;

  // 专业组
  @Column({ length: 100, nullable: true, name: 'major_group' })
  majorGroup?: string;

  // 科类
  @Column({ length: 50, name: 'subject_type' })
  @Index()
  subjectType!: string;

  // 选科要求
  @Column({ type: 'text', nullable: true, name: 'subject_requirements' })
  subjectRequirements?: string;

  // 最低分
  @Column({ type: 'int', nullable: true, name: 'min_score' })
  minScore?: number;

  // 最低位次
  @Column({ type: 'int', nullable: true, name: 'min_rank' })
  minRank?: number;

  // ===== 新增：更完整的历史数据 =====
  // 平均分
  @Column({ type: 'int', nullable: true, name: 'avg_score' })
  avgScore?: number;

  // 最高分
  @Column({ type: 'int', nullable: true, name: 'max_score' })
  maxScore?: number;

  // 最高位次
  @Column({ type: 'int', nullable: true, name: 'max_rank' })
  maxRank?: number;

  // 招生计划数
  @Column({ type: 'int', nullable: true, name: 'plan_count' })
  planCount?: number;

  // ===== 新增：辅助计算字段（可预计算，不依赖用户）=====
  // 分数波动性（标准差）
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'score_volatility' })
  scoreVolatility?: number;

  // 专业热度指数 (0-100)
  @Column({ type: 'int', nullable: true, name: 'popularity_index' })
  popularityIndex?: number;

  // 院校代码
  @Column({ length: 20, nullable: true, name: 'college_code' })
  collegeCode?: string;

  // 专业组代码
  @Column({ length: 50, nullable: true, name: 'group_code' })
  groupCode?: string;

  // 专业组名称
  @Column({ length: 100, nullable: true, name: 'group_name' })
  groupName?: string;

  // 批次
  @Column({ length: 50, nullable: true })
  batch?: string;

  // 省份（院校所在省份）
  @Column({ length: 50, nullable: true })
  province?: string;

  // 城市（院校所在城市）
  @Column({ length: 50, nullable: true })
  city?: string;

  // 关联院校（可选，用于快速查询）
  @ManyToOne(() => College, { nullable: true })
  @JoinColumn({ name: 'college_id' })
  college?: College;

  @Column({ type: 'uuid', nullable: true, name: 'college_id' })
  collegeId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
