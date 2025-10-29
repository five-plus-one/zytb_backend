import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';

/**
 * 志愿填报批次表
 * 用户可以有多个批次的志愿（如本科批、专科批）
 */
@Entity('volunteer_batches')
export class VolunteerBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'varchar', length: 50, comment: '批次类型：本科批、专科批' })
  batchType!: string;

  @Column({ type: 'varchar', length: 50, comment: '省份' })
  province!: string;

  @Column({ type: 'varchar', length: 20, comment: '科类：物理类、历史类' })
  subjectType!: string;

  @Column({ type: 'int', comment: '考生分数' })
  score!: number;

  @Column({ type: 'int', nullable: true, comment: '考生位次' })
  rank?: number;

  @Column({ type: 'varchar', length: 20, default: 'draft', comment: '状态：draft草稿、submitted已提交、locked锁定' })
  @Index()
  status!: string;

  @Column({ type: 'datetime', nullable: true, name: 'submitted_at' })
  submittedAt?: Date;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remarks?: string;

  @OneToMany(() => VolunteerGroup, group => group.batch)
  groups!: VolunteerGroup[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

/**
 * 志愿专业组表
 * 江苏新高考：本科批可填40个专业组
 */
@Entity('volunteer_groups')
export class VolunteerGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'batch_id' })
  @Index()
  batchId!: string;

  @ManyToOne(() => VolunteerBatch, batch => batch.groups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch!: VolunteerBatch;

  @Column({ type: 'int', comment: '专业组排序：1-40' })
  @Index()
  groupOrder!: number;

  @Column({ type: 'varchar', length: 100, comment: '院校代码' })
  collegeCode!: string;

  @Column({ type: 'varchar', length: 255, comment: '院校名称' })
  collegeName!: string;

  @Column({ type: 'varchar', length: 100, comment: '专业组代码' })
  groupCode!: string;

  @Column({ type: 'varchar', length: 255, comment: '专业组名称' })
  groupName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '选科要求' })
  subjectRequirement?: string;

  @Column({ type: 'boolean', default: true, name: 'is_obey_adjustment', comment: '是否服从调剂' })
  isObeyAdjustment!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'admit_probability', comment: '录取概率：冲、稳、保' })
  admitProbability?: string;

  @Column({ type: 'int', nullable: true, comment: '去年最低录取分' })
  lastYearMinScore?: number;

  @Column({ type: 'int', nullable: true, comment: '去年最低录取位次' })
  lastYearMinRank?: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remarks?: string;

  @OneToMany(() => VolunteerMajor, major => major.group)
  majors!: VolunteerMajor[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

/**
 * 志愿专业表
 * 每个专业组可填6个专业
 */
@Entity('volunteer_majors')
export class VolunteerMajor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'group_id' })
  @Index()
  groupId!: string;

  @ManyToOne(() => VolunteerGroup, group => group.majors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group!: VolunteerGroup;

  @Column({ type: 'int', comment: '专业排序：1-6' })
  @Index()
  majorOrder!: number;

  @Column({ type: 'varchar', length: 100, comment: '专业代码' })
  majorCode!: string;

  @Column({ type: 'varchar', length: 255, comment: '专业名称' })
  majorName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '专业方向' })
  majorDirection?: string;

  @Column({ type: 'int', nullable: true, comment: '计划招生人数' })
  planCount?: number;

  @Column({ type: 'int', nullable: true, comment: '学费（元/年）' })
  tuitionFee?: number;

  @Column({ type: 'int', nullable: true, comment: '学制（年）' })
  duration?: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
