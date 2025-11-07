import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

/**
 * 核心运算层 - 专业表
 * 预计算字段避免实时聚合
 */
@Entity('core_majors')
@Index(['category'])
@Index(['discipline'])
export class CoreMajor {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({ length: 100 })
  @Index()
  name!: string;

  @Column({ length: 20, unique: true, nullable: true })
  code?: string;

  // 学科分类
  @Column({ length: 50, nullable: true })
  @Index()
  discipline?: string;

  @Column({ length: 50 })
  @Index()
  category!: string;

  @Column({ length: 50, nullable: true, name: 'sub_category' })
  subCategory?: string;

  // 培养信息
  @Column({ length: 50, nullable: true, name: 'degree_type' })
  degreeType?: string;

  @Column({ type: 'int', default: 4, name: 'study_years' })
  studyYears!: number;

  @Column({ type: 'json', nullable: true, name: 'required_subjects' })
  requiredSubjects?: any;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // 就业信息(冗余)
  @Column({ type: 'int', nullable: true, name: 'avg_salary', comment: '平均薪资' })
  avgSalary?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'employment_rate', comment: '就业率' })
  employmentRate?: number;

  @Column({ type: 'json', nullable: true, name: 'career_fields', comment: '职业领域' })
  careerFields?: any;

  // 预计算字段
  @Column({ type: 'int', default: 0, name: 'hot_level', comment: '热度指数(0-100)' })
  @Index()
  hotLevel!: number;

  // 兼容旧字段：isHot基于hotLevel计算
  get isHot(): boolean {
    return this.hotLevel >= 60;
  }

  @Column({ type: 'int', default: 0, name: 'college_count', comment: '开设院校数' })
  collegeCount!: number;

  @Column({ type: 'int', nullable: true, name: 'avg_admission_score', comment: '平均录取分' })
  avgAdmissionScore?: number;

  // 向量搜索字段
  @Column({ type: 'json', nullable: true, name: 'embedding_vector', comment: '向量嵌入' })
  embeddingVector?: number[];

  // 详细信息字段（兼容旧模型）
  @Column({ type: 'json', nullable: true, comment: '课程列表' })
  courses?: string[];

  @Column({ type: 'json', nullable: true, comment: '职业前景' })
  career?: string[];

  @Column({ type: 'json', nullable: true, comment: '技能要求' })
  skills?: string[];

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '学位类型' })
  degree?: string;

  @Column({ type: 'int', nullable: true, comment: '学制年数' })
  years?: number;

  @Column({ type: 'json', nullable: true, name: 'advantage_colleges', comment: '优势院校列表' })
  advantageColleges?: string[];

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
