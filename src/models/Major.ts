import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { College } from './College';

@Entity('majors')
export class Major {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  @Index()
  name!: string;

  @Column({ length: 20, unique: true, nullable: true })
  code?: string;

  // 学科门类字段
  @Column({ length: 50, nullable: true })
  @Index()
  discipline?: string; // 学科（如：工学、理学、文学等）

  @Column({ length: 50 })
  @Index()
  category!: string; // 门类（如：计算机类、电子信息类等）

  @Column({ length: 50, nullable: true, name: 'sub_category' })
  subCategory?: string;

  // 匹配学科（高中学科选考要求）
  @Column({ type: 'json', nullable: true, name: 'required_subjects' })
  requiredSubjects?: string[]; // 如：["物理", "化学"]

  @Column({ length: 20, nullable: true })
  degree?: string;

  @Column({ length: 50, nullable: true, name: 'degree_type' })
  degreeType?: string;

  @Column({ type: 'int', default: 4 })
  years!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // 培养对象
  @Column({ type: 'text', nullable: true, name: 'training_objective' })
  trainingObjective?: string; // 培养对象描述

  @Column({ type: 'boolean', default: false, name: 'is_hot' })
  isHot!: boolean;

  @Column({ type: 'json', nullable: true })
  tags?: string[];

  @Column({ type: 'int', nullable: true, name: 'avg_salary' })
  avgSalary?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'employment_rate' })
  employmentRate?: number;

  // 主修课程
  @Column({ type: 'json', nullable: true })
  courses?: string[]; // 主修课程列表

  @Column({ type: 'json', nullable: true })
  skills?: string[];

  // 职业发展方向
  @Column({ type: 'text', nullable: true })
  career?: string; // 职业及发展方向描述

  @Column({ type: 'json', nullable: true, name: 'career_fields' })
  careerFields?: string[]; // 职业领域列表

  @Column({ type: 'json', nullable: true, name: 'salary_trend' })
  salaryTrend?: any;

  // 嵌入向量用于匹配度计算
  @Column({ type: 'json', nullable: true, name: 'embedding_vector' })
  embeddingVector?: number[]; // 专业描述的嵌入向量

  @Column({ type: 'text', nullable: true, name: 'embedding_text' })
  embeddingText?: string; // 用于生成嵌入向量的文本

  // 优势院校关联
  @ManyToMany(() => College)
  @JoinTable({
    name: 'major_advantage_colleges',
    joinColumn: { name: 'major_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'college_id', referencedColumnName: 'id' }
  })
  advantageColleges?: College[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
