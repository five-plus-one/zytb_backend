import { AppDataSource } from '../../config/database';
import { AgentPreference } from '../../models/AgentPreference';
import { AgentSession } from '../../models/AgentSession';
import { getIndicatorById } from '../../config/indicators';

/**
 * 偏好指标管理服务
 * 负责用户偏好指标的增删改查和版本控制
 */

export interface PreferenceUpdate {
  indicatorId: string;
  value: any;
  confidence: number;
  extractionMethod: 'direct_question' | 'inference' | 'user_statement' | 'system_default';
  sourceMessageId?: string;
  extractionContext?: string;
}

export class PreferenceService {
  private preferenceRepo = AppDataSource.getRepository(AgentPreference);
  private sessionRepo = AppDataSource.getRepository(AgentSession);

  /**
   * 批量更新偏好指标
   */
  async batchUpdatePreferences(
    sessionId: string,
    userId: string,
    updates: PreferenceUpdate[]
  ): Promise<AgentPreference[]> {
    const results: AgentPreference[] = [];

    for (const update of updates) {
      const pref = await this.updatePreference(sessionId, userId, update);
      if (pref) {
        results.push(pref);
      }
    }

    // 更新会话的指标计数
    await this.updateSessionPreferenceCount(sessionId);

    return results;
  }

  /**
   * 更新单个偏好指标
   */
  async updatePreference(
    sessionId: string,
    userId: string,
    update: PreferenceUpdate
  ): Promise<AgentPreference | null> {
    const indicator = getIndicatorById(update.indicatorId);
    if (!indicator) {
      console.error(`Indicator ${update.indicatorId} not found`);
      return null;
    }

    // 查找是否已存在该指标
    const existing = await this.preferenceRepo.findOne({
      where: {
        sessionId,
        indicatorId: update.indicatorId,
        isLatest: true
      }
    });

    if (existing) {
      // 已存在,创建新版本

      // 1. 将旧版本标记为非最新
      existing.isLatest = false;
      await this.preferenceRepo.save(existing);

      // 2. 创建新版本
      const newVersion = this.preferenceRepo.create({
        sessionId,
        userId,
        indicatorId: update.indicatorId,
        indicatorName: indicator.name,
        indicatorType: indicator.type,
        category: indicator.category,
        value: update.value,
        confidence: update.confidence,
        extractionMethod: update.extractionMethod,
        sourceMessageId: update.sourceMessageId,
        extractionContext: update.extractionContext,
        version: existing.version + 1,
        isLatest: true
      });

      return await this.preferenceRepo.save(newVersion);
    } else {
      // 不存在,创建新记录
      const newPref = this.preferenceRepo.create({
        sessionId,
        userId,
        indicatorId: update.indicatorId,
        indicatorName: indicator.name,
        indicatorType: indicator.type,
        category: indicator.category,
        value: update.value,
        confidence: update.confidence,
        extractionMethod: update.extractionMethod,
        sourceMessageId: update.sourceMessageId,
        extractionContext: update.extractionContext,
        version: 1,
        isLatest: true
      });

      return await this.preferenceRepo.save(newPref);
    }
  }

  /**
   * 获取会话的所有最新偏好指标
   */
  async getSessionPreferences(sessionId: string): Promise<AgentPreference[]> {
    return await this.preferenceRepo.find({
      where: {
        sessionId,
        isLatest: true
      },
      order: {
        indicatorType: 'ASC', // core在前
        createdAt: 'ASC'
      }
    });
  }

  /**
   * 获取核心指标收集进度
   */
  async getCorePreferencesCount(sessionId: string): Promise<number> {
    return await this.preferenceRepo.count({
      where: {
        sessionId,
        indicatorType: 'core',
        isLatest: true
      }
    });
  }

  /**
   * 获取次要指标收集进度
   */
  async getSecondaryPreferencesCount(sessionId: string): Promise<number> {
    return await this.preferenceRepo.count({
      where: {
        sessionId,
        indicatorType: 'secondary',
        isLatest: true
      }
    });
  }

  /**
   * 获取指标的历史版本
   */
  async getPreferenceHistory(
    sessionId: string,
    indicatorId: string
  ): Promise<AgentPreference[]> {
    return await this.preferenceRepo.find({
      where: {
        sessionId,
        indicatorId
      },
      order: {
        version: 'ASC'
      }
    });
  }

  /**
   * 删除指标
   */
  async deletePreference(sessionId: string, indicatorId: string): Promise<boolean> {
    const result = await this.preferenceRepo.delete({
      sessionId,
      indicatorId
    });

    if (result.affected && result.affected > 0) {
      await this.updateSessionPreferenceCount(sessionId);
      return true;
    }

    return false;
  }

  /**
   * 更新会话的指标计数
   */
  private async updateSessionPreferenceCount(sessionId: string): Promise<void> {
    const coreCount = await this.getCorePreferencesCount(sessionId);
    const secondaryCount = await this.getSecondaryPreferencesCount(sessionId);

    await this.sessionRepo.update(
      { id: sessionId },
      {
        corePreferencesCount: coreCount,
        secondaryPreferencesCount: secondaryCount
      }
    );
  }

  /**
   * 获取指标按分类分组
   */
  async getPreferencesByCategory(sessionId: string): Promise<Record<string, AgentPreference[]>> {
    const preferences = await this.getSessionPreferences(sessionId);

    const grouped: Record<string, AgentPreference[]> = {};

    for (const pref of preferences) {
      if (!grouped[pref.category]) {
        grouped[pref.category] = [];
      }
      grouped[pref.category].push(pref);
    }

    return grouped;
  }

  /**
   * 获取决策权重(用于推荐计算)
   */
  async getDecisionWeights(sessionId: string): Promise<any> {
    const preferences = await this.getSessionPreferences(sessionId);

    // 提取关键权重指标
    const weights: any = {
      college: 33,
      major: 34,
      city: 33,
      employment: 50,
      furtherStudy: 50,
      interest: 50,
      prospect: 50
    };

    for (const pref of preferences) {
      // 解析value,如果是字符串则JSON.parse
      let value = pref.value;
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error(`Failed to parse preference value for ${pref.indicatorId}:`, value);
          continue;
        }
      }

      // 确保value是对象
      if (!value || typeof value !== 'object') {
        continue;
      }

      if (pref.indicatorId === 'CORE_01') {
        // 院校-专业-城市权重分配
        weights.college = value.college || 33;
        weights.major = value.major || 34;
        weights.city = value.city || 33;
      } else if (pref.indicatorId === 'CORE_02') {
        // 就业-深造权重分配
        weights.employment = value.employment || 50;
        weights.furtherStudy = value.furtherStudy || 50;
      } else if (pref.indicatorId === 'CORE_03') {
        // 兴趣-前景权重分配
        weights.interest = value.interest || 50;
        weights.prospect = value.prospect || 50;
      }
    }

    return weights;
  }

  /**
   * 验证偏好值的合法性
   */
  validatePreferenceValue(indicatorId: string, value: any): boolean {
    const indicator = getIndicatorById(indicatorId);
    if (!indicator) return false;

    const valueType = indicator.valueType.toString();

    if (valueType === 'ENUM' || valueType === 'enum') {
      return indicator.possibleValues?.includes(value) || false;
    }

    if (valueType === 'STRING_ARRAY' || valueType === 'string_array') {
      return Array.isArray(value) && value.every(v => typeof v === 'string');
    }

    if (valueType === 'NUMBER' || valueType === 'number') {
      return typeof value === 'number';
    }

    if (valueType === 'NUMBER_RANGE' || valueType === 'number_range') {
      return value && typeof value.min === 'number' && typeof value.max === 'number';
    }

    if (valueType === 'SCORE' || valueType === 'score') {
      return typeof value === 'number' && value >= 1 && value <= 5;
    }

    if (valueType === 'PERCENTAGE' || valueType === 'percentage') {
      return typeof value === 'number' && value >= 0 && value <= 100;
    }

    if (valueType === 'BOOLEAN' || valueType === 'boolean') {
      return typeof value === 'boolean';
    }

    if (valueType === 'WEIGHT_DISTRIBUTION' || valueType === 'weight_distribution') {
      if (typeof value !== 'object') return false;
      const sum = Object.values(value).reduce((a: number, b: any) => {
        return a + (typeof b === 'number' ? b : 0);
      }, 0);
      return Math.abs(sum - 100) < 1; // 允许1%的误差
    }

    return true;
  }

  /**
   * 获取推荐所需的偏好信息
   */
  async getPreferencesForRecommendation(sessionId: string): Promise<any> {
    const preferences = await this.getSessionPreferences(sessionId);
    const weights = await this.getDecisionWeights(sessionId);

    return {
      decisionWeights: weights,
      preferences
    };
  }
}
