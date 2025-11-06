import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { AgentSession } from './AgentSession';

/**
 * Claude API Content Block 类型定义
 */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; tool_use_id: string; content: string | any[]; is_error?: boolean };

/**
 * 智能体消息表
 * 记录会话中的每一条消息
 */
@Entity('agent_messages')
@Index(['sessionId', 'createdAt'])
export class AgentMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'varchar', length: 36 })
  @Index()
  sessionId!: string;

  @ManyToOne(() => AgentSession)
  @JoinColumn({ name: 'session_id' })
  session?: AgentSession;

  // ========== 消息内容 ==========
  @Column({
    type: 'enum',
    enum: ['user', 'assistant', 'system'],
    comment: '消息角色'
  })
  role!: string;

  @Column({ type: 'text', comment: '消息内容（纯文本，用于兼容和搜索）' })
  content!: string;

  // ========== 结构化内容块（新增）==========
  @Column({
    name: 'content_blocks',
    type: 'json',
    nullable: true,
    comment: 'Claude API原始内容块(支持text、tool_use、tool_result等类型)'
  })
  contentBlocks?: ContentBlock[];

  // ========== 结构化数据 ==========
  @Column({
    name: 'extracted_data',
    type: 'json',
    nullable: true,
    comment: '从消息中提取的结构化数据'
  })
  extractedData?: any;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: ['chat', 'preference_update', 'recommendation', 'system_notification'],
    default: 'chat',
    comment: '消息类型'
  })
  messageType!: string;

  // ========== 元数据 ==========
  @Column({
    type: 'json',
    nullable: true,
    comment: '消息元数据(如LLM参数、处理时间等)'
  })
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
    confidence?: number;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
