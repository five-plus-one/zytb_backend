import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from 'typeorm';

/**
 * 智能建议缓存表
 * 用于缓存基于上下文生成的智能建议
 */
@Entity('session_suggestions')
@Index(['contextHash'])
@Index(['expiresAt'])
export class SessionSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  @Index()
  userId!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 36, nullable: true })
  sessionId?: string;

  @Column({ name: 'context_hash', type: 'varchar', length: 64 })
  @Index()
  contextHash!: string;

  @Column({ type: 'json', comment: '建议列表' })
  suggestions!: Array<{
    question: string;
    reasoning: string;
    priority: number;
    category: string;
  }>;

  @Column({ name: 'context_summary', type: 'text', nullable: true })
  contextSummary?: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  @Index()
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
