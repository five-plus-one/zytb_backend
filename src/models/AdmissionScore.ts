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
