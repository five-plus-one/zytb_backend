/**
 * 答案解析器
 * 使用规则和AI解析问卷答案，提取结构化信息
 */

import { CleanedCsvRow } from './csvParser';

/**
 * 解析后的结构化数据
 */
export interface ParsedAnswers {
  // 住宿条件
  dormStyle?: string;
  hasAirConditioner?: boolean;
  hasIndependentBathroom?: boolean;
  bathroomDistance?: string;

  // 学习环境
  hasMorningSelfStudy?: boolean;
  hasEveningSelfStudy?: boolean;
  hasOvernightStudyRoom?: boolean;

  // 食堂
  canteenPriceLevel?: string;
  canteenHasIssues?: boolean;

  // 交通
  hasSubway?: boolean;
  inUrbanArea?: boolean;
  toCityTime?: string;

  // 设施
  hasWashingMachine?: boolean;
  campusWifiQuality?: string;
  campusWifiSpeed?: string;
  hasPowerCutoff?: boolean;
  powerCutoffTime?: string;
  hasNetworkCutoff?: boolean;
  networkCutoffTime?: string;
  hotWaterTime?: string;

  // 运动
  hasMorningRun?: boolean;
  runningRequirement?: string;
  canRideEbike?: boolean;
  ebikeChargingLocation?: string;
  sharedBikeAvailability?: string;
  sharedBikeTypes?: string;

  // 商业
  supermarketQuality?: string;
  supermarketDescription?: string;
  expressDeliveryPolicy?: string;

  // 门禁
  dormCurfewTime?: string;
  schoolGatePolicy?: string;
  checkDormitory?: boolean;
  lateReturnPolicy?: string;

  // 其他
  holidayDuration?: string;
  hasMiniSemester?: boolean;
  miniSemesterDuration?: string;
  canOrderTakeout?: boolean;
  takeoutPickupDistance?: string;
  canBringComputer?: boolean;
  powerLimitDescription?: string;
  campusCardDescription?: string;
  bankCardIssued?: boolean;
}

/**
 * 答案解析器类
 */
export class AnswerParser {
  /**
   * 解析问卷答案
   */
  parseAnswers(row: CleanedCsvRow): ParsedAnswers {
    return {
      // Q1: 宿舍类型
      dormStyle: this.parseDormStyle(row.q1),

      // Q2: 空调
      hasAirConditioner: this.parseBoolean(row.q2, ['有', '是', '都有', '教室和宿舍都有']),

      // Q3: 独立卫浴
      ...this.parseBathroom(row.q3),

      // Q4: 早晚自习
      ...this.parseSelfStudy(row.q4),

      // Q5: 晨跑
      hasMorningRun: this.parseBoolean(row.q5, ['有', '是', '需要', '必须']),

      // Q6: 跑步要求
      runningRequirement: this.cleanText(row.q6),

      // Q7: 假期时长
      holidayDuration: this.cleanText(row.q7),
      ...this.parseMiniSemester(row.q7),

      // Q8: 外卖
      ...this.parseTakeout(row.q8),

      // Q9: 交通
      ...this.parseTransport(row.q9),

      // Q10: 洗衣机
      hasWashingMachine: this.parseBoolean(row.q10, ['有', '是', '宿舍楼下', '楼下']),

      // Q11: 校园网
      ...this.parseCampusWifi(row.q11),

      // Q12: 断电断网
      ...this.parsePowerCutoff(row.q12),

      // Q13: 食堂
      ...this.parseCanteen(row.q13),

      // Q14: 热水
      hotWaterTime: this.cleanText(row.q14),

      // Q15: 电瓶车
      ...this.parseEbike(row.q15),

      // Q16: 限电
      powerLimitDescription: this.cleanText(row.q16),

      // Q17: 通宵自习
      hasOvernightStudyRoom: this.parseBoolean(row.q17, ['有', '能', '可以', '图书馆']),

      // Q18: 带电脑
      canBringComputer: this.parseBoolean(row.q18, ['能', '可以', '允许', '没限制'], ['不能', '不可以', '不允许']),

      // Q19: 校园卡
      campusCardDescription: this.cleanText(row.q19),

      // Q20: 银行卡
      bankCardIssued: this.parseBoolean(row.q20, ['会', '有', '发']),

      // Q21: 超市
      ...this.parseSupermarket(row.q21),

      // Q22: 快递
      expressDeliveryPolicy: this.cleanText(row.q22),

      // Q23: 共享单车
      ...this.parseSharedBike(row.q23),

      // Q24: 门禁
      ...this.parseGatePolicy(row.q24),

      // Q25: 查寝/晚归
      ...this.parseLateReturn(row.q25)
    };
  }

  /**
   * Q1: 解析宿舍类型
   */
  private parseDormStyle(answer: string): string {
    if (!answer) return '未知';

    answer = answer.toLowerCase();

    if (answer.includes('上床下桌')) return '上床下桌';
    if (answer.includes('上下铺')) return '上下铺';
    if (answer.includes('混合') || answer.includes('有些')) return '混合';

    // 根据数字推断
    if (answer.includes('1') || answer.includes('一')) return '上床下桌';
    if (answer.includes('2') || answer.includes('二')) return '上下铺或混合';

    return '未知';
  }

  /**
   * Q3: 解析独立卫浴
   */
  private parseBathroom(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    const hasIndependent = this.parseBoolean(answer, ['有', '独立', '独卫']);
    let distance = '';

    // 提取距离信息
    if (!hasIndependent) {
      if (answer.includes('楼下') || answer.includes('隔壁')) {
        distance = '楼下';
      } else if (answer.includes('几步')) {
        distance = '几步路';
      } else {
        // 提取数字距离
        const match = answer.match(/(\d+\.?\d*)\s*(km|m|公里|米)/i);
        if (match) {
          distance = `${match[1]}${match[2]}`;
        }
      }
    }

    return {
      hasIndependentBathroom: hasIndependent,
      bathroomDistance: distance || answer
    };
  }

  /**
   * Q4: 解析早晚自习
   */
  private parseSelfStudy(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    return {
      hasMorningSelfStudy: answer.includes('早自习') || answer.includes('早'),
      hasEveningSelfStudy: answer.includes('晚自习') || answer.includes('晚') || answer.includes('大一')
    };
  }

  /**
   * Q7: 解析小学期
   */
  private parseMiniSemester(answer: string): Partial<ParsedAnswers> {
    const hasMini = answer.includes('小学期');
    let duration = '';

    if (hasMini) {
      const match = answer.match(/小学期.{0,5}(\d+)\s*(周|天|星期)/);
      if (match) {
        duration = `${match[1]}${match[2]}`;
      }
    }

    return {
      hasMiniSemester: hasMini,
      miniSemesterDuration: duration
    };
  }

  /**
   * Q8: 解析外卖
   */
  private parseTakeout(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    const canOrder = this.parseBoolean(answer, ['允许', '可以', '能'], ['不允许', '不可以', '不能']);

    let distance = '';
    if (canOrder !== false) {
      if (answer.includes('楼下') || answer.includes('门口')) {
        distance = '楼下';
      } else {
        const match = answer.match(/(\d+\.?\d*)\s*(km|m|公里|米)/i);
        if (match) {
          distance = `${match[1]}${match[2]}`;
        }
      }
    }

    return {
      canOrderTakeout: canOrder,
      takeoutPickupDistance: distance || answer
    };
  }

  /**
   * Q9: 解析交通
   */
  private parseTransport(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    const hasSubway = answer.includes('地铁');
    const inUrban = answer.includes('市区') || answer.includes('市中心') || answer.includes('便利');

    let toCityTime = '';
    const timeMatch = answer.match(/(\d+)\s*(小时|分钟|min)/);
    if (timeMatch) {
      toCityTime = `${timeMatch[1]}${timeMatch[2]}`;
    }

    return {
      hasSubway,
      inUrbanArea: inUrban,
      toCityTime
    };
  }

  /**
   * Q11: 解析校园网
   */
  private parseCampusWifi(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    let quality = '一般';
    if (answer.includes('很好') || answer.includes('不错') || answer.includes('快')) {
      quality = '很好';
    } else if (answer.includes('差') || answer.includes('慢') || answer.includes('贵')) {
      quality = '较差';
    }

    // 提取速度
    let speed = '';
    const speedMatch = answer.match(/(\d+)\s*(M|mbps|Mbps|千兆|兆)/i);
    if (speedMatch) {
      speed = `${speedMatch[1]}${speedMatch[2]}`;
    }

    return {
      campusWifiQuality: quality,
      campusWifiSpeed: speed
    };
  }

  /**
   * Q12: 解析断电断网
   */
  private parsePowerCutoff(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    const hasPowerCutoff = !answer.includes('不断电');
    const hasNetworkCutoff = answer.includes('断网');

    let powerTime = '';
    let networkTime = '';

    // 提取断电时间
    const timeMatch = answer.match(/(\d{1,2}[:：点]\d{0,2})/);
    if (timeMatch) {
      const time = timeMatch[1].replace('点', ':').replace('：', ':');
      if (hasPowerCutoff && !hasNetworkCutoff) {
        powerTime = time;
      } else if (hasNetworkCutoff) {
        networkTime = time;
      }
    }

    return {
      hasPowerCutoff,
      powerCutoffTime: powerTime,
      hasNetworkCutoff,
      networkCutoffTime: networkTime
    };
  }

  /**
   * Q13: 解析食堂
   */
  private parseCanteen(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    let priceLevel = '一般';
    if (answer.includes('便宜') || answer.includes('不贵')) {
      priceLevel = '便宜';
    } else if (answer.includes('贵')) {
      priceLevel = '较贵';
    }

    const hasIssues = answer.includes('异物') || answer.includes('吃出');

    return {
      canteenPriceLevel: priceLevel,
      canteenHasIssues: hasIssues
    };
  }

  /**
   * Q15: 解析电瓶车
   */
  private parseEbike(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    const canRide = this.parseBoolean(answer, ['可以', '能', '允许']);

    let chargingLocation = '';
    if (canRide) {
      if (answer.includes('车棚') || answer.includes('宿舍楼下')) {
        chargingLocation = answer.includes('车棚') ? '车棚' : '宿舍楼下';
      }
    }

    return {
      canRideEbike: canRide,
      ebikeChargingLocation: chargingLocation
    };
  }

  /**
   * Q21: 解析超市
   */
  private parseSupermarket(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    let quality = '一般';
    if (answer.includes('好') || answer.includes('不错')) {
      quality = '好';
    } else if (answer.includes('小') || answer.includes('贵')) {
      quality = '差';
    }

    return {
      supermarketQuality: quality,
      supermarketDescription: answer
    };
  }

  /**
   * Q23: 解析共享单车
   */
  private parseSharedBike(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    let availability = '一般';
    if (answer.includes('多') || answer.includes('丰富')) {
      availability = '丰富';
    } else if (answer.includes('少') || answer.includes('没') || answer.includes('无')) {
      availability = '少';
    }

    // 提取品牌
    const brands: string[] = [];
    if (answer.includes('哈啰') || answer.includes('哈罗')) brands.push('哈啰');
    if (answer.includes('青桔')) brands.push('青桔');
    if (answer.includes('美团')) brands.push('美团');
    if (answer.includes('滴滴')) brands.push('滴滴');

    return {
      sharedBikeAvailability: availability,
      sharedBikeTypes: brands.join('、') || answer
    };
  }

  /**
   * Q24: 解析门禁
   */
  private parseGatePolicy(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    // 提取宿舍门禁时间
    let curfewTime = '';
    const timeMatch = answer.match(/(\d{1,2}[:：点]\d{0,2})/);
    if (timeMatch) {
      curfewTime = timeMatch[1].replace('点', ':').replace('：', ':');
    }

    return {
      dormCurfewTime: curfewTime,
      schoolGatePolicy: answer
    };
  }

  /**
   * Q25: 解析查寝/晚归
   */
  private parseLateReturn(answer: string): Partial<ParsedAnswers> {
    if (!answer) return {};

    const checks = answer.includes('查') || answer.includes('查寝');

    return {
      checkDormitory: checks,
      lateReturnPolicy: answer
    };
  }

  /**
   * 辅助：解析布尔值
   */
  private parseBoolean(
    text: string,
    positiveKeywords: string[],
    negativeKeywords: string[] = []
  ): boolean | undefined {
    if (!text) return undefined;

    const lowerText = text.toLowerCase();

    // 检查否定关键词
    for (const keyword of negativeKeywords) {
      if (lowerText.includes(keyword)) return false;
    }

    // 检查肯定关键词
    for (const keyword of positiveKeywords) {
      if (lowerText.includes(keyword)) return true;
    }

    return undefined;
  }

  /**
   * 辅助：清理文本
   */
  private cleanText(text: string): string {
    if (!text) return '';
    return text.trim().substring(0, 200); // 限制长度
  }
}
