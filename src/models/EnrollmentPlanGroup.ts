import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany
} from 'typeorm';
import { EnrollmentPlan } from './EnrollmentPlan';
import { AdmissionScore } from './AdmissionScore';

/**
 * 专业组实体
 *
 * 目的：作为招生计划和历史分数的中间关联表
 *
 * 说明：
 * - 一个专业组对应多个招生计划（2025年的多个专业属于同一个组）
 * - 一个专业组对应多条历史分数记录（2021-2024年的数据）
 * - 通过 collegeCode + groupCode 唯一标识一个专业组
 */
@Entity('enrollment_plan_groups')
@Index(['collegeCode', 'groupCode', 'sourceProvince', 'subjectType'], { unique: true })
@Index(['collegeCode'])
@Index(['sourceProvince', 'subjectType'])
export class EnrollmentPlanGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 20, name: 'college_code' })
  @Index()
  collegeCode!: string;

  @Column({ length: 100, name: 'college_name' })
  collegeName!: string;

  @Column({ length: 50, name: 'group_code' })
  groupCode!: string;  // 标准化后的代码（无括号）

  @Column({ length: 50, nullable: true, name: 'group_code_raw' })
  groupCodeRaw?: string;  // 原始代码（可能有括号）

  @Column({ length: 100, nullable: true, name: 'group_name' })
  groupName?: string;

  @Column({ length: 50, name: 'source_province' })
  sourceProvince!: string;

  @Column({ length: 50, name: 'subject_type' })
  subjectType!: string;

  // 关联关系
  @OneToMany(() => EnrollmentPlan, plan => plan.group)
  enrollmentPlans?: EnrollmentPlan[];

  @OneToMany(() => AdmissionScore, score => score.group)
  admissionScores?: AdmissionScore[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
