import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Core Layer - 招生计划表（冗余设计，避免JOIN）
 * 直接存储院校和专业的冗余信息
 */
@Entity('core_enrollment_plans')
@Index(['year', 'sourceProvince', 'collegeId'])
@Index(['year', 'sourceProvince', 'majorCode'])
@Index(['collegeId', 'year'])
export class CoreEnrollmentPlan {
  @PrimaryColumn('uuid')
  id!: string;

  // 院校信息（UUID）
  @Column({ type: 'uuid', name: 'college_id' })
  @Index()
  collegeId!: string;

  // 专业ID（UUID，可选）
  @Column({ type: 'uuid', nullable: true, name: 'major_id' })
  @Index()
  majorId?: string;

  // ========== 冗余院校信息（避免JOIN） ==========
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

  @Column({ type: 'boolean', default: false, name: 'college_is_world_class' })
  collegeIsWorldClass!: boolean;

  // ========== 冗余专业信息（避免JOIN） ==========
  @Column({ length: 100, nullable: true, name: 'major_name' })
  majorName?: string;

  @Column({ length: 20, nullable: true, name: 'major_code' })
  @Index()
  majorCode?: string;

  @Column({ length: 50, nullable: true, name: 'major_category' })
  majorCategory?: string;

  // ========== 基本信息 ==========
  @Column({ type: 'int' })
  @Index()
  year!: number;

  @Column({ length: 50, name: 'source_province' })
  @Index()
  sourceProvince!: string;

  @Column({ length: 50, name: 'subject_type' })
  @Index()
  subjectType!: string;

  @Column({ length: 50 })
  batch!: string;

  @Column({ type: 'int', name: 'plan_count' })
  planCount!: number;

  @Column({ type: 'int', nullable: true, name: 'study_years' })
  studyYears?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tuition?: number;

  // ========== 专业组信息 ==========
  @Column({ length: 50, nullable: true, name: 'major_group_code' })
  majorGroupCode?: string;

  @Column({ length: 100, nullable: true, name: 'major_group_name' })
  majorGroupName?: string;

  @Column({ type: 'text', nullable: true, name: 'subject_requirements' })
  subjectRequirements?: string;

  @Column({ type: 'text', nullable: true, name: 'major_remarks' })
  majorRemarks?: string;

  // ========== 元数据 ==========
  @Column({ type: 'int', default: 1, name: 'data_version' })
  dataVersion!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_synced_at' })
  lastSyncedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;
}
