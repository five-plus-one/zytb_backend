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
import { VolunteerBatch } from './VolunteerNew';

/**
 * 志愿表实体
 * 用户可以创建多个志愿填报方案（如保守方案、激进方案）
 * 同一时间只有一个志愿表是当前使用的
 */
@Entity('volunteer_tables')
@Index(['userId', 'isCurrent'])
export class VolunteerTable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 100, comment: '志愿表名称' })
  name!: string;

  @Column({ type: 'text', nullable: true, comment: '志愿表描述' })
  description?: string;

  @Column({ type: 'boolean', default: false, name: 'is_current', comment: '是否为当前使用的志愿表' })
  @Index()
  isCurrent!: boolean;

  @OneToMany(() => VolunteerBatch, batch => batch.table)
  batches!: VolunteerBatch[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
