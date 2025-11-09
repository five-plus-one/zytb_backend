import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

/**
 * 核心运算层 - 院校表
 * 用于高性能查询,包含预计算字段和冗余数据
 */
@Entity('core_colleges')
@Index(['province', 'city'])
@Index(['is985', 'is211'])
export class CoreCollege {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({ length: 100 })
  @Index()
  name!: string;

  @Column({ length: 20, nullable: true, unique: true })
  code?: string;

  // 基础信息
  @Column({ length: 50, name: 'province' })
  @Index()
  province!: string;

  @Column({ length: 50, name: 'city' })
  city!: string;

  @Column({ length: 50, nullable: true, name: 'college_type' })
  collegeType?: string;

  // 兼容旧字段：type 映射到 collegeType
  get type(): string | undefined {
    return this.collegeType;
  }

  @Column({ type: 'int', nullable: true })
  @Index()
  rank?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100, nullable: true })
  affiliation?: string;

  // 分类标识
  @Column({ type: 'boolean', default: false, name: 'is_985' })
  @Index()
  is985!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_211' })
  @Index()
  is211!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_double_first_class' })
  isDoubleFirstClass!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_world_class' })
  isWorldClass!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_art' })
  isArt!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_national_key' })
  isNationalKey!: boolean;

  @Column({ length: 50, nullable: true, name: 'key_level' })
  keyLevel?: string;

  @Column({ length: 50, nullable: true, name: 'education_level' })
  educationLevel?: string;

  // 学术指标
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'postgraduate_rate' })
  postgraduateRate?: number;

  @Column({ type: 'int', nullable: true, name: 'national_special_major_count' })
  nationalSpecialMajorCount?: number;

  @Column({ type: 'text', nullable: true, name: 'world_class_disciplines' })
  worldClassDisciplines?: string;

  // 基本统计
  @Column({ type: 'int', nullable: true, name: 'founded_year' })
  foundedYear?: number;

  @Column({ type: 'int', nullable: true, name: 'student_count' })
  studentCount?: number;

  @Column({ type: 'int', nullable: true, name: 'teacher_count' })
  teacherCount?: number;

  @Column({ type: 'int', nullable: true, name: 'academician_count' })
  academicianCount?: number;

  // 男女比例
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'female_ratio' })
  femaleRatio?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'male_ratio' })
  maleRatio?: number;

  // 联系信息
  @Column({ length: 100, nullable: true, name: 'admission_phone' })
  admissionPhone?: string;

  // 兼容旧字段：phone 映射到 admissionPhone
  get phone(): string | undefined {
    return this.admissionPhone;
  }

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ length: 255, nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  website?: string;

  // ===== 预计算字段 =====
  @Column({ type: 'int', nullable: true, name: 'avg_admission_score_recent_3years' })
  @Index()
  avgAdmissionScore3Years?: number;

  @Column({ type: 'int', nullable: true, name: 'min_rank_recent_3years' })
  minRank3Years?: number;

  @Column({ type: 'int', nullable: true, name: 'avg_admission_score_recent_year' })
  @Index()
  avgAdmissionScoreRecentYear?: number;

  @Column({ type: 'int', nullable: true, name: 'min_rank_recent_year' })
  minRankRecentYear?: number;

  @Column({ type: 'int', default: 0, name: 'hot_level' })
  @Index()
  hotLevel!: number;

  @Column({ length: 20, nullable: true, name: 'difficulty_level' })
  @Index()
  difficultyLevel?: string;

  // 校园生活评分(冗余)
  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'dorm_score' })
  dormScore?: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'canteen_score' })
  canteenScore?: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'transport_score' })
  transportScore?: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'study_environment_score' })
  studyEnvironmentScore?: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'overall_life_score' })
  overallLifeScore?: number;

  // 兼容旧模型字段
  @Column({ type: 'varchar', length: 50, nullable: true, comment: '院校等级' })
  level?: string;

  @Column({ type: 'int', nullable: true, name: 'min_score', comment: '最低分数' })
  minScore?: number;

  @Column({ type: 'int', nullable: true, name: 'avg_score', comment: '平均分数' })
  avgScore?: number;

  @Column({ type: 'int', nullable: true, name: 'key_discipline_count', comment: '重点学科数量' })
  keyDisciplineCount?: number;

  @Column({ type: 'json', nullable: true, comment: '院校特色' })
  features?: string[];

  @Column({ type: 'text', nullable: true, name: 'evaluation_result', comment: '评估结果' })
  evaluationResult?: string;

  // 统计信息
  @Column({ type: 'int', default: 0, name: 'major_count' })
  majorCount!: number;

  @Column({ type: 'int', default: 0, name: 'enrollment_province_count' })
  enrollmentProvinceCount!: number;

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
