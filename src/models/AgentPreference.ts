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
import { AgentSession } from './AgentSession';
import { User } from './User';

/**
 * 智能体用户偏好指标表
 * 记录用户的100个偏好指标
 */
@Entity('agent_preferences')
@Index(['sessionId', 'indicatorId'])
@Index(['userId', 'indicatorType'])
export class AgentPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 36 })
  @Index()
  sessionId!: string;

  @ManyToOne(() => AgentSession)
  @JoinColumn({ name: 'session_id' })
  session?: AgentSession;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // ========== 指标标识 ==========
  @Column({ name: 'indicator_id', type: 'varchar', length: 20, comment: '指标ID (如 CORE_01)' })
  indicatorId!: string;

  @Column({ name: 'indicator_name', type: 'varchar', length: 100, comment: '指标名称' })
  indicatorName!: string;

  @Column({
    name: 'indicator_type',
    type: 'enum',
    enum: ['core', 'secondary'],
    comment: '指标类型'
  })
  @Index()
  indicatorType!: string;

  @Column({ type: 'varchar', length: 50, comment: '指标分类' })
  category!: string;

  // ========== 指标值 ==========
  @Column({
    type: 'json',
    comment: '指标值(支持多种类型: string, number, array, object等)'
  })
  value!: any;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 1.0,
    comment: '置信度 0.00-1.00'
  })
  confidence!: number;

  // ========== 提取方式 ==========
  @Column({
    name: 'extraction_method',
    type: 'enum',
    enum: ['direct_question', 'inference', 'user_statement', 'system_default'],
    comment: '提取方式'
  })
  extractionMethod!: string;

  @Column({ name: 'source_message_id', type: 'varchar', length: 36, nullable: true, comment: '来源消息ID' })
  sourceMessageId?: string;

  @Column({ name: 'extraction_context', type: 'text', nullable: true, comment: '提取时的上下文' })
  extractionContext?: string;

  // ========== 版本控制 ==========
  @Column({ type: 'int', default: 1, comment: '版本号(指标可能多次更新)' })
  version!: number;

  @Column({ name: 'is_latest', type: 'boolean', default: true, comment: '是否为最新版本' })
  @Index()
  isLatest!: boolean;

  // ========== 时间戳 ==========
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
