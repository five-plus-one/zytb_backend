import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('colleges')
export class College {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 基础信息
  @Column({ length: 100 })
  @Index()
  name!: string;

  @Column({ length: 100, nullable: true, name: 'new_name' })
  newName?: string;

  @Column({ length: 20, nullable: true, unique: true })
  code?: string;

  @Column({ type: 'int', nullable: true })
  @Index()
  rank?: number;

  @Column({ length: 50 })
  @Index()
  province!: string;

  @Column({ length: 50 })
  city!: string;

  @Column({ length: 50, nullable: true })
  type?: string;

  @Column({ length: 100, nullable: true, name: 'affiliation' })
  affiliation?: string;

  // 分类标识
  @Column({ type: 'boolean', default: false, name: 'is_985' })
  is985!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_211' })
  is211!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_world_class' })
  isWorldClass!: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_art' })
  isArt!: boolean;

  @Column({ length: 50, nullable: true, name: 'key_level' })
  keyLevel?: string; // 国重/省重

  @Column({ length: 50, nullable: true, name: 'education_level' })
  educationLevel?: string; // 本科/专科

  @Column({ type: 'boolean', default: false, name: 'is_double_first_class' })
  isDoubleFirstClass!: boolean;

  // 学术指标
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'postgraduate_rate' })
  postgraduateRate?: number; // 保研率

  @Column({ type: 'int', nullable: true, name: 'national_special_major_count' })
  nationalSpecialMajorCount?: number;

  @Column({ type: 'int', nullable: true, name: 'province_special_major_count' })
  provinceSpecialMajorCount?: number;

  @Column({ type: 'boolean', default: false, name: 'is_national_key' })
  isNationalKey!: boolean;

  @Column({ type: 'text', nullable: true, name: 'world_class_disciplines' })
  worldClassDisciplines?: string; // 世界一流学科

  // 基本信息
  @Column({ type: 'int', nullable: true, name: 'founded_year' })
  foundedYear?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'female_ratio' })
  femaleRatio?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'male_ratio' })
  maleRatio?: number;

  // 联系信息
  @Column({ length: 100, nullable: true, name: 'admission_phone' })
  admissionPhone?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ length: 255, nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  website?: string;

  // 评估和介绍
  @Column({ type: 'text', nullable: true, name: 'evaluation_result' })
  evaluationResult?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // 原有字段保留
  @Column({ length: 100, nullable: true })
  level?: string;

  @Column({ length: 50, nullable: true })
  nature?: string;

  @Column({ length: 100, nullable: true })
  department?: string;

  @Column({ type: 'text', nullable: true })
  logo?: string;

  @Column({ type: 'text', nullable: true })
  banner?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'int', nullable: true, name: 'min_score' })
  minScore?: number;

  @Column({ type: 'int', nullable: true, name: 'avg_score' })
  avgScore?: number;

  @Column({ type: 'int', nullable: true, name: 'max_score' })
  maxScore?: number;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'int', default: 0, name: 'hot_level' })
  hotLevel!: number;

  @Column({ type: 'int', nullable: true })
  area?: number;

  @Column({ type: 'int', nullable: true, name: 'student_count' })
  studentCount?: number;

  @Column({ type: 'int', nullable: true, name: 'teacher_count' })
  teacherCount?: number;

  @Column({ type: 'int', nullable: true, name: 'academician_count' })
  academicianCount?: number;

  @Column({ type: 'int', nullable: true, name: 'key_discipline_count' })
  keyDisciplineCount?: number;

  @Column({ type: 'json', nullable: true })
  features?: string[];

  @Column({ type: 'json', nullable: true, name: 'admission_data' })
  admissionData?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
