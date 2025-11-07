/**
 * 评分计算器
 * 根据解析后的答案计算各项评分
 */

import { ParsedAnswers } from './answerParser';

/**
 * 计算后的评分
 */
export interface CalculatedScores {
  dormScore: number; // 宿舍条件评分 (0-5)
  canteenQualityScore: number; // 食堂质量评分 (0-5)
  transportScore: number; // 交通便利性评分 (0-5)
  studyEnvironmentScore: number; // 学习环境评分 (0-5)
  expressDeliveryConvenience: number; // 快递便利性评分 (0-5)
}

/**
 * 评分计算器类
 */
export class ScoreCalculator {
  /**
   * 计算所有评分
   */
  calculateAllScores(parsed: ParsedAnswers): CalculatedScores {
    return {
      dormScore: this.calculateDormScore(parsed),
      canteenQualityScore: this.calculateCanteenScore(parsed),
      transportScore: this.calculateTransportScore(parsed),
      studyEnvironmentScore: this.calculateStudyEnvironmentScore(parsed),
      expressDeliveryConvenience: this.calculateExpressDeliveryScore(parsed)
    };
  }

  /**
   * 计算宿舍条件评分 (对应 SEC_21)
   * 满分5分
   */
  private calculateDormScore(data: ParsedAnswers): number {
    let score = 1.0; // 基础分

    // 上床下桌 +1分
    if (data.dormStyle === '上床下桌') {
      score += 1.0;
    } else if (data.dormStyle === '混合') {
      score += 0.5;
    }

    // 有空调 +1.5分
    if (data.hasAirConditioner === true) {
      score += 1.5;
    }

    // 独立卫浴 +1.5分，否则根据距离打分
    if (data.hasIndependentBathroom === true) {
      score += 1.5;
    } else if (data.bathroomDistance) {
      if (data.bathroomDistance.includes('楼下') || data.bathroomDistance.includes('几步')) {
        score += 0.8;
      } else if (this.extractDistance(data.bathroomDistance) < 100) {
        score += 0.5;
      }
    }

    // 有洗衣机 +0.5分
    if (data.hasWashingMachine === true) {
      score += 0.5;
    }

    // 不断电 +0.5分
    if (data.hasPowerCutoff === false) {
      score += 0.5;
    }

    return Math.min(5, Math.max(0, score));
  }

  /**
   * 计算食堂评分 (对应 SEC_22)
   * 满分5分
   */
  private calculateCanteenScore(data: ParsedAnswers): number {
    let score = 3.0; // 基础分

    // 价格因素
    if (data.canteenPriceLevel === '便宜') {
      score += 1.0;
    } else if (data.canteenPriceLevel === '一般') {
      score += 0.5;
    } else if (data.canteenPriceLevel === '较贵' || data.canteenPriceLevel === '很贵') {
      score -= 0.5;
    }

    // 质量因素
    if (data.canteenHasIssues === true) {
      score -= 1.5; // 有异物严重扣分
    } else {
      score += 0.5; // 没问题加分
    }

    return Math.min(5, Math.max(1, score));
  }

  /**
   * 计算交通便利性评分 (对应 SEC_27)
   * 满分5分
   */
  private calculateTransportScore(data: ParsedAnswers): number {
    let score = 0;

    // 在市区 +2分
    if (data.inUrbanArea === true) {
      score += 2.0;
    } else {
      score += 0.5; // 不在市区基础分
    }

    // 有地铁 +2分
    if (data.hasSubway === true) {
      score += 2.0;
    } else {
      score += 0.5; // 没地铁但可能有公交
    }

    // 到市区时间
    if (data.toCityTime) {
      const timeMatch = data.toCityTime.match(/(\d+)/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1]);
        if (data.toCityTime.includes('小时')) {
          // 转换为分钟
          const totalMinutes = minutes * 60;
          if (totalMinutes <= 30) {
            score += 1.0;
          } else if (totalMinutes <= 60) {
            score += 0.5;
          }
        } else if (data.toCityTime.includes('分')) {
          if (minutes <= 30) {
            score += 1.0;
          } else if (minutes <= 60) {
            score += 0.5;
          }
        }
      }
    }

    return Math.min(5, Math.max(1, score));
  }

  /**
   * 计算学习环境评分 (对应 SEC_25)
   * 满分5分
   */
  private calculateStudyEnvironmentScore(data: ParsedAnswers): number {
    let score = 2.0; // 基础分（默认有图书馆）

    // 有通宵自习室 +1.5分
    if (data.hasOvernightStudyRoom === true) {
      score += 1.5;
    }

    // 校园网质量
    if (data.campusWifiQuality === '很好') {
      score += 1.0;
    } else if (data.campusWifiQuality === '一般') {
      score += 0.5;
    }

    // 不断网 +0.5分
    if (data.hasNetworkCutoff === false) {
      score += 0.5;
    }

    // 无早晚自习（更自由）+0.5分
    if (data.hasMorningSelfStudy === false && data.hasEveningSelfStudy === false) {
      score += 0.5;
    }

    return Math.min(5, Math.max(1, score));
  }

  /**
   * 计算快递便利性评分
   * 满分5分
   */
  private calculateExpressDeliveryScore(data: ParsedAnswers): number {
    let score = 3.0; // 基础分

    if (!data.expressDeliveryPolicy) return score;

    const policy = data.expressDeliveryPolicy.toLowerCase();

    // 送到宿舍 +2分
    if (policy.includes('宿舍') || policy.includes('送到')) {
      score += 2.0;
    }
    // 到校内快递点 +1分
    else if (policy.includes('校内') || policy.includes('快递点')) {
      score += 1.0;
    }
    // 需要去校外 -1分
    else if (policy.includes('校外') || policy.includes('校门外')) {
      score -= 1.0;
    }

    return Math.min(5, Math.max(1, score));
  }

  /**
   * 辅助：从文本中提取距离（米）
   */
  private extractDistance(text: string): number {
    if (!text) return 9999;

    // 匹配 "500m"、"1.2km" 等
    const kmMatch = text.match(/(\d+\.?\d*)\s*km/i);
    if (kmMatch) {
      return parseFloat(kmMatch[1]) * 1000;
    }

    const mMatch = text.match(/(\d+\.?\d*)\s*m/i);
    if (mMatch) {
      return parseFloat(mMatch[1]);
    }

    // 关键词判断
    if (text.includes('楼下') || text.includes('几步')) {
      return 10;
    }

    return 9999;
  }
}

/**
 * 聚合多份答卷的解析结果
 */
export class AnswerAggregator {
  /**
   * 聚合多份解析结果
   */
  aggregate(parsedList: ParsedAnswers[]): ParsedAnswers {
    if (parsedList.length === 0) {
      return {};
    }

    if (parsedList.length === 1) {
      return parsedList[0];
    }

    // 对于布尔值，取众数
    // 对于文本值，取第一个非空值或合并
    return {
      dormStyle: this.mode(parsedList.map(p => p.dormStyle)),
      hasAirConditioner: this.modeBool(parsedList.map(p => p.hasAirConditioner)),
      hasIndependentBathroom: this.modeBool(parsedList.map(p => p.hasIndependentBathroom)),
      bathroomDistance: this.first(parsedList.map(p => p.bathroomDistance)),

      hasMorningSelfStudy: this.modeBool(parsedList.map(p => p.hasMorningSelfStudy)),
      hasEveningSelfStudy: this.modeBool(parsedList.map(p => p.hasEveningSelfStudy)),
      hasOvernightStudyRoom: this.modeBool(parsedList.map(p => p.hasOvernightStudyRoom)),

      canteenPriceLevel: this.mode(parsedList.map(p => p.canteenPriceLevel)),
      canteenHasIssues: this.modeBool(parsedList.map(p => p.canteenHasIssues)),

      hasSubway: this.modeBool(parsedList.map(p => p.hasSubway)),
      inUrbanArea: this.modeBool(parsedList.map(p => p.inUrbanArea)),
      toCityTime: this.first(parsedList.map(p => p.toCityTime)),

      hasWashingMachine: this.modeBool(parsedList.map(p => p.hasWashingMachine)),
      campusWifiQuality: this.mode(parsedList.map(p => p.campusWifiQuality)),
      campusWifiSpeed: this.first(parsedList.map(p => p.campusWifiSpeed)),
      hasPowerCutoff: this.modeBool(parsedList.map(p => p.hasPowerCutoff)),
      powerCutoffTime: this.first(parsedList.map(p => p.powerCutoffTime)),
      hasNetworkCutoff: this.modeBool(parsedList.map(p => p.hasNetworkCutoff)),
      networkCutoffTime: this.first(parsedList.map(p => p.networkCutoffTime)),
      hotWaterTime: this.first(parsedList.map(p => p.hotWaterTime)),

      hasMorningRun: this.modeBool(parsedList.map(p => p.hasMorningRun)),
      runningRequirement: this.first(parsedList.map(p => p.runningRequirement)),
      canRideEbike: this.modeBool(parsedList.map(p => p.canRideEbike)),
      ebikeChargingLocation: this.first(parsedList.map(p => p.ebikeChargingLocation)),
      sharedBikeAvailability: this.mode(parsedList.map(p => p.sharedBikeAvailability)),
      sharedBikeTypes: this.merge(parsedList.map(p => p.sharedBikeTypes)),

      supermarketQuality: this.mode(parsedList.map(p => p.supermarketQuality)),
      supermarketDescription: this.first(parsedList.map(p => p.supermarketDescription)),
      expressDeliveryPolicy: this.first(parsedList.map(p => p.expressDeliveryPolicy)),

      dormCurfewTime: this.first(parsedList.map(p => p.dormCurfewTime)),
      schoolGatePolicy: this.first(parsedList.map(p => p.schoolGatePolicy)),
      checkDormitory: this.modeBool(parsedList.map(p => p.checkDormitory)),
      lateReturnPolicy: this.first(parsedList.map(p => p.lateReturnPolicy)),

      holidayDuration: this.first(parsedList.map(p => p.holidayDuration)),
      hasMiniSemester: this.modeBool(parsedList.map(p => p.hasMiniSemester)),
      miniSemesterDuration: this.first(parsedList.map(p => p.miniSemesterDuration)),
      canOrderTakeout: this.modeBool(parsedList.map(p => p.canOrderTakeout)),
      takeoutPickupDistance: this.first(parsedList.map(p => p.takeoutPickupDistance)),
      canBringComputer: this.modeBool(parsedList.map(p => p.canBringComputer)),
      powerLimitDescription: this.first(parsedList.map(p => p.powerLimitDescription)),
      campusCardDescription: this.first(parsedList.map(p => p.campusCardDescription)),
      bankCardIssued: this.modeBool(parsedList.map(p => p.bankCardIssued))
    };
  }

  /**
   * 取众数（字符串）
   */
  private mode(values: (string | undefined)[]): string | undefined {
    const filtered = values.filter(v => v !== undefined) as string[];
    if (filtered.length === 0) return undefined;

    const counts = new Map<string, number>();
    for (const val of filtered) {
      counts.set(val, (counts.get(val) || 0) + 1);
    }

    let maxCount = 0;
    let result: string | undefined;
    for (const [val, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        result = val;
      }
    }

    return result;
  }

  /**
   * 取众数（布尔值）
   */
  private modeBool(values: (boolean | undefined)[]): boolean | undefined {
    const filtered = values.filter(v => v !== undefined) as boolean[];
    if (filtered.length === 0) return undefined;

    const trueCount = filtered.filter(v => v === true).length;
    const falseCount = filtered.filter(v => v === false).length;

    if (trueCount > falseCount) return true;
    if (falseCount > trueCount) return false;
    return filtered[0]; // 相等时取第一个
  }

  /**
   * 取第一个非空值
   */
  private first(values: (string | undefined)[]): string | undefined {
    return values.find(v => v !== undefined && v.trim() !== '');
  }

  /**
   * 合并多个值（用顿号分隔，去重）
   */
  private merge(values: (string | undefined)[]): string | undefined {
    const filtered = values
      .filter(v => v !== undefined && v.trim() !== '') as string[];

    if (filtered.length === 0) return undefined;

    // 去重
    const unique = Array.from(new Set(filtered));
    return unique.join('、');
  }
}

/**
 * 计算数据可靠性 (0-100)
 * 基于答卷数量
 */
export function calculateReliability(answerCount: number): number {
  // 1份答卷 50分，每多1份 +10分，上限100分
  return Math.min(100, 50 + (answerCount - 1) * 10);
}
