import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from 'typeorm';

/**
 * 会话快照表
 * 保存会话的完整状态，用于历史回溯和恢复
 */
@Entity('session_snapshots')
@Index(['userId', 'createdAt'])
export class SessionSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 36 })
  @Index()
  sessionId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  @Index()
  userId!: string;

  @Column({ name: 'snapshot_name', type: 'varchar', length: 255 })
  snapshotName!: string;

  @Column({ name: 'messages_count', type: 'int', default: 0 })
  messagesCount!: number;

  @Column({ name: 'snapshot_data', type: 'json', comment: '完整会话数据' })
  snapshotData!: {
    session: any;
    messages: any[];
    preferences: any[];
    recommendations?: any[];
  };

  @Column({ type: 'json', nullable: true, comment: '元数据(tags, note等)' })
  metadata?: {
    tags?: string[];
    note?: string;
    [key: string]: any;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
