/**
 * 对话历史管理服务
 */

import { Message } from './agent.service';

export interface ConversationSession {
  sessionId: string;
  userId?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    userInfo?: any;
    context?: any;
  };
}

/**
 * 对话会话管理器
 * 注意：当前使用内存存储，生产环境建议使用Redis
 */
export class ConversationManager {
  private static instance: ConversationManager;
  private sessions: Map<string, ConversationSession> = new Map();
  private maxSessionAge = 24 * 60 * 60 * 1000; // 24小时

  private constructor() {
    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000); // 每小时清理一次
  }

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  /**
   * 创建新会话
   */
  createSession(userId?: string, metadata?: any): string {
    const sessionId = this.generateSessionId();
    const session: ConversationSession = {
      sessionId,
      userId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata
    };

    this.sessions.set(sessionId, session);
    console.log(`✅ 创建新会话: ${sessionId}`);

    return sessionId;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): ConversationSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - session.updatedAt > this.maxSessionAge) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * 更新会话消息
   */
  updateSession(sessionId: string, messages: Message[]): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    session.messages = messages;
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);

    return true;
  }

  /**
   * 添加消息到会话
   */
  addMessage(sessionId: string, message: Message): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    session.messages.push(message);
    session.updatedAt = Date.now();
    this.sessions.set(sessionId, session);

    return true;
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 获取用户的所有会话
   */
  getUserSessions(userId: string): ConversationSession[] {
    const userSessions: ConversationSession[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    }

    return userSessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let count = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > this.maxSessionAge) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    if (count > 0) {
      console.log(`🧹 清理了 ${count} 个过期会话`);
    }
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * 获取会话统计
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(
        s => Date.now() - s.updatedAt < 60 * 60 * 1000 // 1小时内活跃
      ).length
    };
  }
}
