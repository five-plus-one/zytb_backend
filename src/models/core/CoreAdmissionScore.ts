import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { CoreCollege } from './CoreCollege';

/**
 * 核心运算层 - 录取分数表
 * 完全冗余设计,避免JOIN查询
 */
@Entity('core_admission_scores')
@Index(['collegeId', 'year'])
@Index(['year', 'sourceProvince', 'subjectType'])
@Index(['minScore', 'maxScore'])
export class CoreAdmissionScore {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  // UUID外键
  @Column('varchar', { length: 36, name: 'college_id' })
  @Index()
  collegeId!: string;

  @ManyToOne(() => CoreCollege)
  @JoinColumn({ name: 'college_id' })
  college?: CoreCollege;

  @Column('varchar', { length: 36, nullable: true, name: 'major_id' })
  majorId?: string;

  // 冗余院校信息(避免JOIN)
  @Column({ length: 100, name: 'college_name' })
  collegeName!: string;

  @Column({ length: 20, nullable: true, name: 'college_code' })
  collegeCode?: string;

  @Column({ length: 50, nullable: true, name: 'college_province' })
  collegeProvince?: string;

  @Column({ length: 50, nullable: true, name: 'college_city' })
  collegeCity?: string;

  @Column({ type: 'boolean', default: false, name: 'college_is_985' })
  collegeIs985!: boolean;

  @Column({ type: 'boolean', default: false, name: 'college_is_211' })
  collegeIs211!: boolean;

  @Column({ type: 'boolean', default: false, name: 'college_is_double_first_class' })
  collegeIsDoubleFirstClass!: boolean;

  @Column({ length: 50, nullable: true, name: 'college_type' })
  collegeType?: string;

  // 冗余专业信息
  @Column({ length: 100, nullable: true, name: 'major_name' })
  majorName?: string;

  @Column({ length: 20, nullable: true, name: 'major_code' })
  majorCode?: string;

  @Column({ length: 50, nullable: true, name: 'major_category' })
  majorCategory?: string;

  @Column({ length: 50, nullable: true, name: 'major_discipline' })
  majorDiscipline?: string;

  @Column({ length: 50, nullable: true, name: 'major_group' })
  majorGroup?: string;

  // 基本信息
  @Column({ type: 'int', name: 'year' })
  @Index()
  year!: number;

  @Column({ length: 50, name: 'source_province' })
  @Index()
  sourceProvince!: string;

  @Column({ length: 50, name: 'subject_type' })
  @Index()
  subjectType!: string;

  @Column({ length: 50, nullable: true })
  batch?: string;

  // 分数数据
  @Column({ type: 'int', nullable: true, name: 'min_score' })
  @Index()
  minScore?: number;

  @Column({ type: 'int', nullable: true, name: 'min_rank' })
  @Index()
  minRank?: number;

  @Column({ type: 'int', nullable: true, name: 'avg_score' })
  avgScore?: number;

  @Column({ type: 'int', nullable: true, name: 'max_score' })
  maxScore?: number;

  @Column({ type: 'int', nullable: true, name: 'max_rank' })
  maxRank?: number;

  @Column({ type: 'int', nullable: true, name: 'plan_count' })
  planCount?: number;

  // 专业组信息
  @Column({ length: 50, nullable: true, name: 'major_group_code' })
  majorGroupCode?: string;

  @Column({ length: 100, nullable: true, name: 'major_group_name' })
  majorGroupName?: string;

  @Column({ type: 'text', nullable: true, name: 'subject_requirements' })
  subjectRequirements?: string;

  // 预计算字段
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'score_volatility' })
  scoreVolatility?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'rank_volatility' })
  rankVolatility?: number;

  @Column({ length: 20, nullable: true, name: 'difficulty_level' })
  difficultyLevel?: string;

  @Column({ type: 'int', nullable: true })
  competitiveness?: number;

  // 元数据
  @Column({ type: 'int', default: 1, name: 'data_version' })
  dataVersion!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_synced_at' })
  lastSyncedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
