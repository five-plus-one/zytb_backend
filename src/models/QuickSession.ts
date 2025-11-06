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
import { AgentSession } from './AgentSession';

/**
 * 快速会话表
 * 用于处理独立的、临时性的对话（如快速查询专业组、对比等）
 */
@Entity('quick_sessions')
@Index(['userId', 'createdAt'])
export class QuickSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'main_session_id', type: 'varchar', length: 36, nullable: true })
  @Index()
  mainSessionId?: string;

  @ManyToOne(() => AgentSession, { nullable: true })
  @JoinColumn({ name: 'main_session_id' })
  mainSession?: AgentSession;

  @Column({
    name: 'session_type',
    type: 'enum',
    enum: ['group_inquiry', 'group_compare', 'major_inquiry', 'general']
  })
  sessionType!: 'group_inquiry' | 'group_compare' | 'major_inquiry' | 'general';

  @Column({ type: 'json', nullable: true, comment: '上下文信息(groupIds, majorCodes, metadata)' })
  context?: {
    groupIds?: string[];
    majorCodes?: string[];
    metadata?: Record<string, any>;
  };

  @Column({ name: 'total_messages', type: 'int', default: 0 })
  totalMessages!: number;

  @Column({ name: 'is_merged', type: 'boolean', default: false })
  @Index()
  isMerged!: boolean;

  @Column({ name: 'can_merge_to_main', type: 'boolean', default: true })
  canMergeToMain!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
