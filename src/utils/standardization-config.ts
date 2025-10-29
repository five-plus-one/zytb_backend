/**
 * 数据标准化配置
 * 定义标准化表结构和字段映射规则
 */

export interface StandardCollegeInfo {
  // 标准院校代码（唯一标识）
  standardCode: string;
  // 标准院校名称（主名称）
  standardName: string;
  // 院校别名列表
  aliases: string[];
  // 省份
  province: string;
  // 城市
  city: string;
  // 院校类型
  type?: string;
  // 标签
  is985?: boolean;
  is211?: boolean;
  isDoubleFirstClass?: boolean;
}

export interface StandardMajorInfo {
  // 标准专业代码
  standardCode: string;
  // 标准专业名称
  standardName: string;
  // 专业别名列表
  aliases: string[];
  // 专业大类
  category?: string;
  // 学科门类
  discipline?: string;
}

/**
 * 数据标准化配置
 */
export const StandardizationConfig = {
  // 院校名称标准化映射规则
  collegeNameMapping: {
    // 去除后缀规则
    suffixToRemove: ['（徐州）', '(徐州)', '（苏州校区）', '(苏州校区)'],

    // 替换规则
    replacements: [
      { from: '中国人民解放军', to: '' },
      { from: '解放军', to: '' },
    ],

    // 完全别名映射
    aliases: {
      '南京大学金陵学院': '南京大学',
      '东南大学成贤学院': '东南大学',
      '中国矿业大学(徐州)': '中国矿业大学',
      '中国矿业大学（徐州）': '中国矿业大学',
    } as Record<string, string>
  },

  // 专业名称标准化映射规则
  majorNameMapping: {
    // 去除后缀规则
    suffixToRemove: ['（中外合作办学）', '(中外合作办学)', '（师范）', '(师范)'],

    // 替换规则
    replacements: [
      { from: '计算机科学与技术类', to: '计算机类' },
      { from: '电子信息工程类', to: '电子信息类' },
    ]
  },

  // 省份名称标准化
  provinceMapping: {
    '江苏省': '江苏',
    '广东省': '广东',
    '浙江省': '浙江',
    // 可以继续添加
  } as Record<string, string>
};

/**
 * 字段补全配置
 * 定义哪些表的哪些字段需要从其他表补全
 */
export const FieldCompletionConfig = {
  // enrollment_plans表需要补全的字段
  enrollmentPlans: {
    // 从colleges表补全
    fromColleges: {
      matchField: 'collegeName', // enrollment_plans中的字段
      targetField: 'name', // colleges中的字段
      fieldsToComplete: [
        { source: 'province', target: 'collegeProvince' },
        { source: 'city', target: 'collegeCity' },
        { source: 'is985', target: 'collegeIs985' },
        { source: 'is211', target: 'collegeIs211' },
      ]
    }
  },

  // colleges表需要补全的字段
  colleges: {
    // 从enrollment_plans表补全code
    fromEnrollmentPlans: {
      matchField: 'name',
      targetField: 'collegeName',
      fieldsToComplete: [
        { source: 'collegeCode', target: 'code' }
      ]
    }
  },

  // admission_scores表需要补全的字段
  admissionScores: {
    fromColleges: {
      matchField: 'collegeName',
      targetField: 'name',
      fieldsToComplete: [
        { source: 'province', target: 'collegeProvince' },
        { source: 'code', target: 'collegeCode' }
      ]
    }
  }
};
