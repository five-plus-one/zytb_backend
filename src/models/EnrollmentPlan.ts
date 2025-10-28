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

@Entity('enrollment_plans')
@Index(['year', 'sourceProvince', 'collegeCode'])
@Index(['year', 'sourceProvince', 'majorCode'])
export class EnrollmentPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 年份
  @Column({ type: 'int' })
  @Index()
  year!: number;

  // 生源地
  @Column({ length: 50, name: 'source_province' })
  @Index()
  sourceProvince!: string;

  // 科类
  @Column({ length: 50, name: 'subject_type' })
  @Index()
  subjectType!: string;

  // 批次
  @Column({ length: 50 })
  batch!: string;

  // 院校信息
  @Column({ length: 20, name: 'college_code' })
  @Index()
  collegeCode!: string;

  @Column({ length: 100, name: 'college_name' })
  collegeName!: string;

  // 院校专业组
  @Column({ length: 50, nullable: true, name: 'college_major_group_code' })
  collegeMajorGroupCode?: string;

  @Column({ length: 50, nullable: true, name: 'major_group_code' })
  majorGroupCode?: string;

  @Column({ length: 100, nullable: true, name: 'major_group_name' })
  majorGroupName?: string;

  // 选科要求
  @Column({ type: 'text', nullable: true, name: 'subject_requirements' })
  subjectRequirements?: string;

  // 专业信息
  @Column({ length: 50, name: 'major_code' })
  @Index()
  majorCode!: string;

  @Column({ length: 100, name: 'major_name' })
  majorName!: string;

  @Column({ type: 'text', nullable: true, name: 'major_remarks' })
  majorRemarks?: string;

  // 计划人数
  @Column({ type: 'int', name: 'plan_count' })
  planCount!: number;

  // 学制（年）
  @Column({ type: 'int', nullable: true, name: 'study_years' })
  studyYears?: number;

  // 学费（元/年）
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tuition?: number;

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
