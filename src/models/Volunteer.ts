import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';
import { College } from './College';
import { Major } from './Major';

/**
 * @deprecated 此模型已废弃，请使用新的志愿表系统
 *
 * 新系统架构（4层）：
 * - VolunteerTable（志愿表方案） - 支持多方案对比
 *   └─ VolunteerBatch（志愿批次） - 本科批/专科批
 *       └─ VolunteerGroup（专业组） - 最多40个
 *           └─ VolunteerMajor（专业） - 每组最多6个
 *
 * 请使用以下文件：
 * - 模型：src/models/VolunteerNew.ts (VolunteerBatch, VolunteerGroup, VolunteerMajor)
 * - 模型：src/models/VolunteerTable.ts (VolunteerTable)
 * - 服务：src/services/volunteerManagement.service.ts
 * - 控制器：src/controllers/volunteerCurrent.controller.ts
 * - AI工具：src/ai/tools/volunteerBatch.tool.ts
 *
 * 迁移时间：待定
 * 删除时间：待定
 */
@Entity('volunteers')
export class Volunteer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'college_id' })
  collegeId!: string;

  @ManyToOne(() => College)
  @JoinColumn({ name: 'college_id' })
  college!: College;

  @Column({ type: 'uuid', name: 'major_id' })
  majorId!: string;

  @ManyToOne(() => Major)
  @JoinColumn({ name: 'major_id' })
  major!: Major;

  @Column({ type: 'int' })
  priority!: number;

  @Column({ type: 'boolean', default: true, name: 'is_obey_adjustment' })
  isObeyAdjustment!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'admit_probability' })
  admitProbability?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  @Index()
  status!: string;

  @Column({ type: 'datetime', nullable: true, name: 'submitted_at' })
  submittedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
