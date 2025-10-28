/**
 * 志愿填报智能体 - 用户偏好指标配置
 *
 * 基于心理学模型和决策科学设计的指标体系
 * 包含30个核心指标和70个次要指标
 */

export enum IndicatorType {
  CORE = 'core',           // 核心指标(必须收集)
  SECONDARY = 'secondary'  // 次要指标(可选收集)
}

export enum ValueType {
  STRING = 'string',
  STRING_ARRAY = 'string_array',
  NUMBER = 'number',
  NUMBER_RANGE = 'number_range',
  PERCENTAGE = 'percentage',      // 百分比 0-100
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  SCORE = 'score',               // 1-5分评分
  WEIGHT_DISTRIBUTION = 'weight_distribution'  // 权重分配(总和100%)
}

export enum WeightLevel {
  CRITICAL = 1.0,      // 关键
  HIGH = 0.8,          // 高
  MEDIUM_HIGH = 0.6,   // 中高
  MEDIUM = 0.5,        // 中等
  MEDIUM_LOW = 0.3,    // 中低
  LOW = 0.2            // 低
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  description: string;
  type: IndicatorType;
  valueType: ValueType;
  weight: WeightLevel;
  category: string;
  extractionHints: string[];
  relatedQuestions: string[];
  inferencePatterns?: string[];
  possibleValues?: string[];
  valueRange?: { min?: number; max?: number };
  defaultValue?: any;
}

/**
 * ========================================
 * 30个核心指标
 * ========================================
 */
export const CORE_INDICATORS: Record<string, IndicatorDefinition> = {

  // ============ 决策维度权重 (3个) - 最核心 ============
  CORE_01: {
    id: 'CORE_01',
    name: '院校-专业-城市权重分配',
    description: '用户对院校、专业、城市三个维度的重视程度权重分配',
    type: IndicatorType.CORE,
    valueType: ValueType.WEIGHT_DISTRIBUTION,
    weight: WeightLevel.CRITICAL,
    category: '决策维度',
    extractionHints: ['更看重', '最重要', '优先', '第一位', '排序'],
    relatedQuestions: [
      '院校、专业、城市这三个因素，你觉得哪个最重要？',
      '如果让你给院校、专业、城市的重要性打分，总分100的话你会怎么分配？',
      '你是更看重学校名气、专业实力还是城市发展？'
    ],
    inferencePatterns: [
      '提到"学校牌子最重要" → 院校权重高',
      '提到"一定要学喜欢的专业" → 专业权重高',
      '提到"想去大城市发展" → 城市权重高'
    ],
    defaultValue: { college: 33, major: 34, city: 33 } // 默认均分
  },

  CORE_02: {
    id: 'CORE_02',
    name: '就业-深造权重分配',
    description: '本科毕业后就业与继续深造的倾向比例',
    type: IndicatorType.CORE,
    valueType: ValueType.WEIGHT_DISTRIBUTION,
    weight: WeightLevel.CRITICAL,
    category: '决策维度',
    extractionHints: ['就业', '读研', '深造', '工作', '考研', '保研'],
    relatedQuestions: [
      '你大学毕业后是打算直接工作还是继续读研？',
      '如果就业和深造各占一定比例，你的倾向是多少？',
      '就业和考研，你更倾向哪个？'
    ],
    inferencePatterns: [
      '提到"先工作赚钱" → 就业权重高',
      '提到"想搞科研/学术" → 深造权重高',
      '提到"还没想好" → 各50%'
    ],
    defaultValue: { employment: 50, furtherStudy: 50 }
  },

  CORE_03: {
    id: 'CORE_03',
    name: '兴趣-前景权重分配',
    description: '个人兴趣与就业前景的权衡比例',
    type: IndicatorType.CORE,
    valueType: ValueType.WEIGHT_DISTRIBUTION,
    weight: WeightLevel.CRITICAL,
    category: '决策维度',
    extractionHints: ['兴趣', '喜欢', '热爱', '前景', '就业', '赚钱'],
    relatedQuestions: [
      '你更看重做自己喜欢的事，还是选择就业前景好的？',
      '如果专业兴趣和就业前景有冲突，你会怎么选？',
      '兴趣和"钱途"，你觉得哪个更重要？'
    ],
    inferencePatterns: [
      '提到"做自己喜欢的" → 兴趣权重高',
      '提到"现实一点" → 前景权重高'
    ],
    defaultValue: { interest: 50, prospect: 50 }
  },

  // ============ 性格与思维模式 (5个) ============
  CORE_04: {
    id: 'CORE_04',
    name: 'MBTI人格类型',
    description: '用户的MBTI性格类型(16型人格)',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.HIGH,
    category: '性格思维',
    possibleValues: [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP',
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP',
      '未知'
    ],
    extractionHints: ['性格', '内向', '外向', '理性', '感性', '计划', '随性'],
    relatedQuestions: [
      '你是内向还是外向的人？',
      '做决定时你更依赖逻辑分析还是直觉感受？',
      '你是喜欢规划好一切，还是喜欢随机应变？',
      '你知道自己的MBTI类型吗？'
    ],
    inferencePatterns: [
      '提到喜欢独处、深度思考 → I(内向)',
      '提到喜欢社交、团队活动 → E(外向)',
      '提到数据、逻辑、分析 → T(思考型)',
      '提到情感、人际、价值观 → F(情感型)',
      '提到计划、有条理 → J(判断型)',
      '提到灵活、适应性 → P(感知型)'
    ]
  },

  CORE_05: {
    id: 'CORE_05',
    name: '思维偏向(文理倾向)',
    description: '思维模式偏文科还是理科',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.CRITICAL,
    category: '性格思维',
    possibleValues: ['明显偏理科', '偏理科', '文理均衡', '偏文科', '明显偏文科'],
    extractionHints: ['逻辑', '感性', '理性', '文字', '数字', '计算', '表达'],
    relatedQuestions: [
      '你觉得自己更擅长理性分析还是感性表达？',
      '你更喜欢处理数字数据还是文字内容？',
      '高中时你的理科和文科成绩如何？'
    ],
    inferencePatterns: [
      '提到数学好、逻辑强 → 偏理科',
      '提到语文好、写作好 → 偏文科'
    ]
  },

  CORE_06: {
    id: 'CORE_06',
    name: '学习风格(理论vs应用)',
    description: '偏好理论研究还是实践应用',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.HIGH,
    category: '性格思维',
    possibleValues: ['明显偏理论', '偏理论', '理论应用均衡', '偏应用', '明显偏应用'],
    extractionHints: ['理论', '应用', '实践', '动手', '研究', '原理'],
    relatedQuestions: [
      '你更喜欢学习理论知识还是动手实践？',
      '你是喜欢钻研原理的人，还是喜欢解决实际问题？',
      '更喜欢做研究还是做项目？'
    ],
    inferencePatterns: [
      '提到"想搞科研"、"钻研原理" → 偏理论',
      '提到"想做项目"、"解决问题" → 偏应用'
    ]
  },

  CORE_07: {
    id: 'CORE_07',
    name: '社交偏好',
    description: '对社交活动和团队合作的偏好程度',
    type: IndicatorType.CORE,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '性格思维',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['社交', '团队', '独立', '合作', '朋友'],
    relatedQuestions: [
      '你喜欢参加社团活动和社交吗？',
      '更喜欢团队合作还是独立工作？',
      '在学校你会积极参加集体活动吗？'
    ],
    inferencePatterns: [
      '提到喜欢社团、活动 → 高分',
      '提到喜欢安静、独处 → 低分'
    ]
  },

  CORE_08: {
    id: 'CORE_08',
    name: '压力承受能力',
    description: '对学业压力和竞争环境的承受能力',
    type: IndicatorType.CORE,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '性格思维',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['压力', '竞争', '卷', '紧张', '放松'],
    relatedQuestions: [
      '你能适应高强度的学习压力吗？',
      '对于"内卷"的学习氛围，你能接受吗？',
      '你是抗压能力强的人吗？'
    ],
    inferencePatterns: [
      '提到"不怕竞争"、"能扛住" → 高分',
      '提到"想轻松点"、"不想太卷" → 低分'
    ]
  },

  // ============ 专业方向 (6个) ============
  CORE_09: {
    id: 'CORE_09',
    name: '专业大类偏好',
    description: '对学科大类的偏好(可多选)',
    type: IndicatorType.CORE,
    valueType: ValueType.STRING_ARRAY,
    weight: WeightLevel.CRITICAL,
    category: '专业方向',
    possibleValues: [
      '哲学', '经济学', '法学', '教育学', '文学', '历史学',
      '理学', '工学', '农学', '医学', '管理学', '艺术学'
    ],
    extractionHints: ['专业', '学科', '领域', '方向'],
    relatedQuestions: [
      '你对哪些学科领域感兴趣？',
      '有没有明确想学的专业大类？'
    ],
    inferencePatterns: ['提到具体专业时推断大类']
  },

  CORE_10: {
    id: 'CORE_10',
    name: '具体专业意向',
    description: '明确想学的具体专业(可多选)',
    type: IndicatorType.CORE,
    valueType: ValueType.STRING_ARRAY,
    weight: WeightLevel.CRITICAL,
    category: '专业方向',
    extractionHints: ['专业', '想学', '感兴趣'],
    relatedQuestions: [
      '有没有特别想学的具体专业？',
      '你的专业目标是什么？'
    ],
    inferencePatterns: ['直接提到专业名称']
  },

  CORE_11: {
    id: 'CORE_11',
    name: '专业确定性',
    description: '对专业选择的确定程度',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.HIGH,
    category: '专业方向',
    possibleValues: ['非常确定', '比较确定', '有几个选择', '不太确定', '完全不确定'],
    extractionHints: ['确定', '明确', '犹豫', '纠结', '不知道'],
    relatedQuestions: [
      '你对自己要学的专业确定吗？',
      '会考虑转专业的可能性吗？'
    ],
    inferencePatterns: [
      '提到"一定要学XX" → 非常确定',
      '提到"还在考虑" → 不确定'
    ]
  },

  CORE_12: {
    id: 'CORE_12',
    name: '专业冷热偏好',
    description: '对热门专业和冷门专业的态度',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '专业方向',
    possibleValues: ['热门优先', '冷门也可以', '不在乎冷热', '偏好冷门'],
    extractionHints: ['热门', '冷门', '竞争', '人多', '小众'],
    relatedQuestions: [
      '你会倾向于选热门专业还是冷门专业？',
      '担心专业太热门竞争太大吗？'
    ],
    inferencePatterns: [
      '提到"跟着潮流走" → 热门优先',
      '提到"不想扎堆" → 偏好冷门'
    ]
  },

  CORE_13: {
    id: 'CORE_13',
    name: '是否服从专业调剂',
    description: '是否愿意接受专业调剂',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.CRITICAL,
    category: '专业方向',
    possibleValues: ['愿意服从', '看情况', '不愿意服从'],
    extractionHints: ['调剂', '服从', '退档'],
    relatedQuestions: [
      '你愿意服从专业调剂吗？',
      '如果不服从调剂可能退档，你怎么看？'
    ],
    inferencePatterns: [
      '提到"一定要录取" → 愿意服从',
      '提到"宁可复读" → 不愿意'
    ]
  },

  CORE_14: {
    id: 'CORE_14',
    name: '跨专业组风险接受度',
    description: '对同一专业组内可能被调剂到不匹配专业的风险接受度',
    type: IndicatorType.CORE,
    valueType: ValueType.SCORE,
    weight: WeightLevel.HIGH,
    category: '专业方向',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['调剂', '风险', '专业组', '接受'],
    relatedQuestions: [
      '如果一个专业组里有你喜欢的专业，也有你不太喜欢的，你会报吗？',
      '能接受被调剂到专业组内其他专业吗？'
    ],
    inferencePatterns: [
      '提到"只要能进这个学校" → 高分',
      '提到"不能接受不喜欢的专业" → 低分'
    ]
  },

  // ============ 院校偏好 (5个) ============
  CORE_15: {
    id: 'CORE_15',
    name: '院校层次要求',
    description: '对985/211/双一流等标签的要求',
    type: IndicatorType.CORE,
    valueType: ValueType.STRING_ARRAY,
    weight: WeightLevel.HIGH,
    category: '院校偏好',
    possibleValues: ['985工程', '211工程', '双一流', '双一流学科', '省属重点', '不限'],
    extractionHints: ['985', '211', '双一流', '名校'],
    relatedQuestions: [
      '你对985、211这些标签看重吗？',
      '一定要上名校吗？'
    ],
    inferencePatterns: ['提到学校层次']
  },

  CORE_16: {
    id: 'CORE_16',
    name: '院校类型偏好',
    description: '对院校类型的偏好',
    type: IndicatorType.CORE,
    valueType: ValueType.STRING_ARRAY,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '院校偏好',
    possibleValues: ['综合类', '理工类', '师范类', '财经类', '医药类', '农林类', '政法类', '艺术类', '语言类', '民族类'],
    extractionHints: ['院校类型', '综合', '理工', '师范'],
    relatedQuestions: [
      '你更喜欢综合性大学还是专业特色院校？'
    ],
    inferencePatterns: ['根据专业推断院校类型']
  },

  CORE_17: {
    id: 'CORE_17',
    name: '学校名气vs专业实力',
    description: '在学校名气和专业实力之间的权衡',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.CRITICAL,
    category: '院校偏好',
    possibleValues: ['学校名气优先', '专业实力优先', '两者均衡'],
    extractionHints: ['名气', '牌子', '专业排名', '学科实力'],
    relatedQuestions: [
      '如果一个是名校但专业一般，一个是双非但专业很强，你选哪个？',
      '你更看重学校牌子还是专业实力？'
    ],
    inferencePatterns: [
      '提到"就业时学校牌子很重要" → 名气优先',
      '提到"专业能力更重要" → 专业优先'
    ]
  },

  CORE_18: {
    id: 'CORE_18',
    name: '学术氛围重视度',
    description: '对学校学术科研氛围的重视程度',
    type: IndicatorType.CORE,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '院校偏好',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['学术', '科研', '学风'],
    relatedQuestions: [
      '你希望学校学术氛围浓厚吗？',
      '看重学校的科研实力吗？'
    ],
    inferencePatterns: ['提到科研、学术相关']
  },

  CORE_19: {
    id: 'CORE_19',
    name: '保研率重视度',
    description: '对学校保研机会的重视程度',
    type: IndicatorType.CORE,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '院校偏好',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['保研', '推免', '读研'],
    relatedQuestions: [
      '你看重学校的保研率吗？',
      '有没有保研的打算？'
    ],
    inferencePatterns: [
      '提到想读研 → 高分',
      '结合CORE_02深造权重判断'
    ]
  },

  // ============ 城市地域 (4个) ============
  CORE_20: {
    id: 'CORE_20',
    name: '目标城市/省份',
    description: '期望去的城市或省份(可多选)',
    type: IndicatorType.CORE,
    valueType: ValueType.STRING_ARRAY,
    weight: WeightLevel.HIGH,
    category: '城市地域',
    extractionHints: ['城市', '省份', '地区', '想去'],
    relatedQuestions: [
      '你想去哪些城市或省份上大学？',
      '有没有明确的地域偏好？'
    ],
    inferencePatterns: ['直接提到城市/省份名称']
  },

  CORE_21: {
    id: 'CORE_21',
    name: '城市级别偏好',
    description: '对城市发展水平的偏好',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '城市地域',
    possibleValues: ['一线城市', '新一线城市', '二线城市', '三线及以下', '不限'],
    extractionHints: ['大城市', '小城市', '发展'],
    relatedQuestions: [
      '你更想去大城市还是小城市？',
      '对城市的发展水平有要求吗？'
    ],
    inferencePatterns: [
      '提到就业机会、繁华 → 大城市',
      '提到安静、生活成本 → 小城市'
    ]
  },

  CORE_22: {
    id: 'CORE_22',
    name: '距离家乡远近',
    description: '期望学校离家的距离',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.MEDIUM,
    category: '城市地域',
    possibleValues: ['省内', '邻省', '跨省较远', '全国不限'],
    extractionHints: ['离家', '距离', '回家'],
    relatedQuestions: [
      '你希望学校离家近还是远？',
      '能接受离家很远吗？'
    ],
    inferencePatterns: [
      '提到经常回家 → 省内',
      '提到独立生活 → 不限'
    ]
  },

  CORE_23: {
    id: 'CORE_23',
    name: '未来工作城市规划',
    description: '毕业后期望的工作地点',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '城市地域',
    possibleValues: ['回本省', '留在大学所在地', '一线城市', '灵活不限'],
    extractionHints: ['工作', '留下', '回家', '发展'],
    relatedQuestions: [
      '你将来想在哪里工作？',
      '会考虑留在大学所在城市吗？'
    ],
    inferencePatterns: [
      '提到家乡发展 → 回本省',
      '提到大城市机会多 → 一线城市'
    ]
  },

  // ============ 就业与行业 (4个) ============
  CORE_24: {
    id: 'CORE_24',
    name: '目标行业领域',
    description: '期望从事的行业领域(可多选)',
    type: IndicatorType.CORE,
    valueType: ValueType.STRING_ARRAY,
    weight: WeightLevel.HIGH,
    category: '就业行业',
    possibleValues: [
      '互联网/IT', '金融', '教育', '医疗健康', '制造业',
      '能源电力', '建筑地产', '传媒广告', '法律', '咨询',
      '公务员/事业单位', '科研院所', '创业', '其他'
    ],
    extractionHints: ['行业', '工作', '职业'],
    relatedQuestions: [
      '你将来想在哪个行业工作？',
      '对什么领域的工作感兴趣？'
    ],
    inferencePatterns: ['提到具体公司或职业']
  },

  CORE_25: {
    id: 'CORE_25',
    name: '薪资期望水平',
    description: '毕业后期望的薪资范围(月薪)',
    type: IndicatorType.CORE,
    valueType: ValueType.NUMBER_RANGE,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '就业行业',
    extractionHints: ['薪资', '工资', '收入', '月薪'],
    relatedQuestions: [
      '对毕业后的薪资有什么期望？',
      '你觉得多少月薪比较理想？'
    ],
    inferencePatterns: [
      '提到经济压力 → 重视薪资',
      '提到钱不重要 → 不重视'
    ]
  },

  CORE_26: {
    id: 'CORE_26',
    name: '工作稳定性偏好',
    description: '对工作稳定性的偏好',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '就业行业',
    possibleValues: ['稳定优先(体制内)', '发展优先(高成长)', '创业挑战', '均衡'],
    extractionHints: ['稳定', '体制内', '公务员', '挑战', '发展'],
    relatedQuestions: [
      '你更看重工作的稳定性还是发展空间？',
      '对体制内的工作感兴趣吗？'
    ],
    inferencePatterns: [
      '提到"铁饭碗"、"考公" → 稳定优先',
      '提到"互联网"、"创业" → 发展优先'
    ]
  },

  CORE_27: {
    id: 'CORE_27',
    name: '实习机会重视度',
    description: '对在校期间实习机会的重视程度',
    type: IndicatorType.CORE,
    valueType: ValueType.SCORE,
    weight: WeightLevel.HIGH,
    category: '就业行业',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['实习', '实践', '工作经验'],
    relatedQuestions: [
      '你觉得大学期间的实习机会重要吗？',
      '希望学校能提供丰富的实习资源吗？'
    ],
    inferencePatterns: [
      '提到积累经验 → 高分',
      '结合就业权重判断'
    ]
  },

  // ============ 经济与成本 (3个) ============
  CORE_28: {
    id: 'CORE_28',
    name: '家庭经济条件',
    description: '家庭经济承受能力评估',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '经济成本',
    possibleValues: ['宽裕', '中等', '一般', '困难'],
    extractionHints: ['家庭', '经济', '负担', '压力', '困难'],
    relatedQuestions: [
      '家庭经济条件怎么样？',
      '学费和生活费会有压力吗？'
    ],
    inferencePatterns: [
      '提到贷款、兼职 → 一般/困难',
      '提到无所谓、不在乎 → 宽裕'
    ]
  },

  CORE_29: {
    id: 'CORE_29',
    name: '学费承受上限',
    description: '可接受的年学费上限',
    type: IndicatorType.CORE,
    valueType: ValueType.NUMBER_RANGE,
    weight: WeightLevel.MEDIUM,
    category: '经济成本',
    valueRange: { min: 0, max: 100000 },
    extractionHints: ['学费', '费用', '预算'],
    relatedQuestions: [
      '对学费有预算限制吗？',
      '能接受多高的学费？'
    ],
    inferencePatterns: ['结合家庭经济条件判断']
  },

  CORE_30: {
    id: 'CORE_30',
    name: '风险偏好',
    description: '填报志愿的风险承受能力',
    type: IndicatorType.CORE,
    valueType: ValueType.ENUM,
    weight: WeightLevel.CRITICAL,
    category: '志愿策略',
    possibleValues: ['保守型(稳妥为主)', '稳健型(冲稳保均衡)', '激进型(冲刺为主)'],
    extractionHints: ['冒险', '稳妥', '保险', '冲', '稳', '保'],
    relatedQuestions: [
      '你是更想冲一冲高分学校，还是求稳为主？',
      '能接受一定的录取风险吗？',
      '不想复读吧？'
    ],
    inferencePatterns: [
      '提到"不想复读" → 保守型',
      '提到"试试看" → 激进型'
    ]
  }
};

/**
 * ========================================
 * 70个次要指标
 * ========================================
 */
export const SECONDARY_INDICATORS: Record<string, IndicatorDefinition> = {

  // ============ 学习能力与习惯 (10个) ============
  SEC_01: {
    id: 'SEC_01',
    name: '自主学习能力',
    description: '自主学习和时间管理能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['自学', '自律', '时间管理'],
    relatedQuestions: ['你的自学能力怎么样？']
  },

  SEC_02: {
    id: 'SEC_02',
    name: '数学能力',
    description: '数学和逻辑推理能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['数学', '计算', '逻辑'],
    relatedQuestions: ['你的数学能力强吗？']
  },

  SEC_03: {
    id: 'SEC_03',
    name: '语言表达能力',
    description: '口头和书面表达能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['表达', '写作', '演讲'],
    relatedQuestions: ['你的语言表达能力怎么样？']
  },

  SEC_04: {
    id: 'SEC_04',
    name: '英语水平',
    description: '英语综合水平',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['英语', '外语'],
    relatedQuestions: ['你的英语水平如何？']
  },

  SEC_05: {
    id: 'SEC_05',
    name: '动手实践能力',
    description: '动手操作和实验能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['动手', '实验', '实践'],
    relatedQuestions: ['你的动手能力强吗？']
  },

  SEC_06: {
    id: 'SEC_06',
    name: '创新创造力',
    description: '创新思维和创造能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['创新', '创意', '创造'],
    relatedQuestions: ['你觉得自己有创新精神吗？']
  },

  SEC_07: {
    id: 'SEC_07',
    name: '团队协作能力',
    description: '团队合作和协调能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['团队', '合作', '协作'],
    relatedQuestions: ['你的团队合作能力怎么样？']
  },

  SEC_08: {
    id: 'SEC_08',
    name: '抗挫折能力',
    description: '面对失败和挫折的调整能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['挫折', '失败', '调整'],
    relatedQuestions: ['面对挫折你能很快调整吗？']
  },

  SEC_09: {
    id: 'SEC_09',
    name: '信息检索能力',
    description: '查找和筛选信息的能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '学习能力',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['搜索', '查资料', '信息'],
    relatedQuestions: ['你擅长自己查找资料吗？']
  },

  SEC_10: {
    id: 'SEC_10',
    name: '学习投入时间',
    description: '愿意投入学习的时间',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.ENUM,
    weight: WeightLevel.MEDIUM,
    category: '学习能力',
    possibleValues: ['非常努力', '比较努力', '一般', '相对轻松'],
    extractionHints: ['努力', '学习时间', '投入'],
    relatedQuestions: ['你是很努力学习的人吗？']
  },

  // ============ 职业发展细节 (10个) ============
  SEC_11: {
    id: 'SEC_11',
    name: '出国深造意向',
    description: '是否有出国留学打算',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '职业发展',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['出国', '留学', '海外'],
    relatedQuestions: ['有出国留学的打算吗？']
  },

  SEC_12: {
    id: 'SEC_12',
    name: '考公考编倾向',
    description: '对考公务员/事业编的倾向',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '职业发展',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['考公', '公务员', '事业编'],
    relatedQuestions: ['对考公务员感兴趣吗？']
  },

  SEC_13: {
    id: 'SEC_13',
    name: '创业意向',
    description: '是否有创业打算',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '职业发展',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['创业', '自己做', '老板'],
    relatedQuestions: ['有想过将来创业吗？']
  },

  SEC_14: {
    id: 'SEC_14',
    name: '职业资格证书需求',
    description: '是否需要考职业资格证书',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.BOOLEAN,
    weight: WeightLevel.MEDIUM_LOW,
    category: '职业发展',
    extractionHints: ['证书', '资格证', '执业'],
    relatedQuestions: ['需要考职业证书吗？']
  },

  SEC_15: {
    id: 'SEC_15',
    name: '工作地点灵活性',
    description: '对工作地点的灵活性要求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.ENUM,
    weight: WeightLevel.LOW,
    category: '职业发展',
    possibleValues: ['必须固定', '可以接受出差', '可以远程', '灵活'],
    extractionHints: ['出差', '远程', '工作地点'],
    relatedQuestions: ['能接受经常出差的工作吗？']
  },

  SEC_16: {
    id: 'SEC_16',
    name: '工作强度接受度',
    description: '对加班和高强度工作的接受度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '职业发展',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['加班', '强度', '996'],
    relatedQuestions: ['能接受高强度的工作吗？']
  },

  SEC_17: {
    id: 'SEC_17',
    name: '行业发展前景关注度',
    description: '对行业未来发展的关注程度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '职业发展',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['前景', '趋势', '未来'],
    relatedQuestions: ['你看重行业的发展前景吗？']
  },

  SEC_18: {
    id: 'SEC_18',
    name: '职业晋升重视度',
    description: '对职业晋升路径的重视度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '职业发展',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['晋升', '升职', '发展空间'],
    relatedQuestions: ['看重职业晋升空间吗？']
  },

  SEC_19: {
    id: 'SEC_19',
    name: '工作成就感需求',
    description: '对工作成就感的需求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '职业发展',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['成就感', '价值', '意义'],
    relatedQuestions: ['你需要从工作中获得成就感吗？']
  },

  SEC_20: {
    id: 'SEC_20',
    name: '工作生活平衡',
    description: '对工作生活平衡的重视度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '职业发展',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['平衡', '生活', '休息'],
    relatedQuestions: ['你看重工作生活平衡吗？']
  },

  // ============ 校园生活 (10个) ============
  SEC_21: {
    id: 'SEC_21',
    name: '宿舍条件重视度',
    description: '对宿舍环境的重视程度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['宿舍', '住宿', '空调'],
    relatedQuestions: ['宿舍条件对你重要吗？']
  },

  SEC_22: {
    id: 'SEC_22',
    name: '食堂质量关注度',
    description: '对食堂饮食的关注度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['食堂', '吃饭', '饮食'],
    relatedQuestions: ['在意食堂好不好吃吗？']
  },

  SEC_23: {
    id: 'SEC_23',
    name: '社团活动参与意愿',
    description: '参与社团活动的意愿',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['社团', '活动', '参加'],
    relatedQuestions: ['想参加社团活动吗？']
  },

  SEC_24: {
    id: 'SEC_24',
    name: '体育运动偏好',
    description: '对体育运动的兴趣',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['体育', '运动', '健身'],
    relatedQuestions: ['你喜欢运动吗？']
  },

  SEC_25: {
    id: 'SEC_25',
    name: '图书馆资源需求',
    description: '对图书馆和学习资源的需求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['图书馆', '自习', '学习'],
    relatedQuestions: ['经常去图书馆吗？']
  },

  SEC_26: {
    id: 'SEC_26',
    name: '校园环境美观度',
    description: '对校园景观的重视度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['校园', '环境', '美丽'],
    relatedQuestions: ['在意校园环境美不美吗？']
  },

  SEC_27: {
    id: 'SEC_27',
    name: '交通便利性需求',
    description: '对学校交通便利度的要求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['交通', '地铁', '方便'],
    relatedQuestions: ['在意学校交通方便吗？']
  },

  SEC_28: {
    id: 'SEC_28',
    name: '周边商业配套',
    description: '对学校周边商业的要求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['商圈', '购物', '周边'],
    relatedQuestions: ['希望学校周边繁华吗？']
  },

  SEC_29: {
    id: 'SEC_29',
    name: '兼职打工需求',
    description: '是否需要兼职机会',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.BOOLEAN,
    weight: WeightLevel.MEDIUM_LOW,
    category: '校园生活',
    extractionHints: ['兼职', '打工', '勤工俭学'],
    relatedQuestions: ['需要做兼职吗？']
  },

  SEC_30: {
    id: 'SEC_30',
    name: '校园文化氛围',
    description: '对校园文化活动的期望',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '校园生活',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['文化', '活动', '氛围'],
    relatedQuestions: ['喜欢文化活动丰富的学校吗？']
  },

  // ============ 地域文化适应 (10个) ============
  SEC_31: {
    id: 'SEC_31',
    name: '气候适应能力',
    description: '对不同气候的适应能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '地域适应',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['气候', '天气', '适应'],
    relatedQuestions: ['能适应不同气候吗？']
  },

  SEC_32: {
    id: 'SEC_32',
    name: '气候偏好',
    description: '对气候类型的偏好',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.ENUM,
    weight: WeightLevel.LOW,
    category: '地域适应',
    possibleValues: ['温暖湿润', '四季分明', '干燥', '寒冷', '炎热', '不限'],
    extractionHints: ['气候', '冷', '热', '潮湿'],
    relatedQuestions: ['喜欢什么样的气候？']
  },

  SEC_33: {
    id: 'SEC_33',
    name: '饮食适应能力',
    description: '对不同饮食口味的适应能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '地域适应',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['饮食', '口味', '适应'],
    relatedQuestions: ['能适应不同地方的口味吗？']
  },

  SEC_34: {
    id: 'SEC_34',
    name: '方言接受度',
    description: '对当地方言的接受程度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '地域适应',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['方言', '口音', '普通话'],
    relatedQuestions: ['担心方言问题吗？']
  },

  SEC_35: {
    id: 'SEC_35',
    name: '独立生活能力',
    description: '独立生活和自理能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '地域适应',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['独立', '自理', '照顾自己'],
    relatedQuestions: ['你的独立生活能力强吗？']
  },

  SEC_36: {
    id: 'SEC_36',
    name: '异地适应能力',
    description: '在陌生城市的适应能力',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '地域适应',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['适应', '陌生', '新环境'],
    relatedQuestions: ['能快速适应新环境吗？']
  },

  SEC_37: {
    id: 'SEC_37',
    name: '恋家程度',
    description: '对家人的依赖程度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '地域适应',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['恋家', '想家', '父母'],
    relatedQuestions: ['你恋家吗？']
  },

  SEC_38: {
    id: 'SEC_38',
    name: '城市生活节奏偏好',
    description: '对城市生活节奏的偏好',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.ENUM,
    weight: WeightLevel.LOW,
    category: '地域适应',
    possibleValues: ['快节奏', '慢节奏', '不限'],
    extractionHints: ['节奏', '快慢', '生活'],
    relatedQuestions: ['喜欢快节奏还是慢节奏？']
  },

  SEC_39: {
    id: 'SEC_39',
    name: '文化娱乐需求',
    description: '对城市文化娱乐的需求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '地域适应',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['娱乐', '文化', '休闲'],
    relatedQuestions: ['需要丰富的文化娱乐吗？']
  },

  SEC_40: {
    id: 'SEC_40',
    name: '生活成本敏感度',
    description: '对生活成本的敏感程度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '地域适应',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['生活费', '消费', '成本'],
    relatedQuestions: ['在意生活成本高低吗？']
  },

  // ============ 院校细节偏好 (10个) ============
  SEC_41: {
    id: 'SEC_41',
    name: '学校规模偏好',
    description: '对学校学生人数的偏好',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.ENUM,
    weight: WeightLevel.LOW,
    category: '院校细节',
    possibleValues: ['大规模', '中等规模', '小规模', '不限'],
    extractionHints: ['规模', '人数', '学生'],
    relatedQuestions: ['喜欢人多的学校吗？']
  },

  SEC_42: {
    id: 'SEC_42',
    name: '历史底蕴重视度',
    description: '对学校历史的重视度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['历史', '底蕴', '百年'],
    relatedQuestions: ['在意学校历史底蕴吗？']
  },

  SEC_43: {
    id: 'SEC_43',
    name: '国际化程度',
    description: '对学校国际化的期望',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['国际化', '留学生', '交流'],
    relatedQuestions: ['看重学校国际化吗？']
  },

  SEC_44: {
    id: 'SEC_44',
    name: '校友网络重视度',
    description: '对校友资源的重视度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['校友', '人脉', '资源'],
    relatedQuestions: ['看重校友资源吗？']
  },

  SEC_45: {
    id: 'SEC_45',
    name: '师资力量关注度',
    description: '对师资水平的关注度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['师资', '教授', '老师'],
    relatedQuestions: ['看重师资力量吗？']
  },

  SEC_46: {
    id: 'SEC_46',
    name: '科研平台资源',
    description: '对科研实验室的需求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['实验室', '科研', '平台'],
    relatedQuestions: ['需要好的科研平台吗？']
  },

  SEC_47: {
    id: 'SEC_47',
    name: '转专业政策关注度',
    description: '对转专业政策的关注度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['转专业', '换专业', '政策'],
    relatedQuestions: ['关心转专业政策吗？']
  },

  SEC_48: {
    id: 'SEC_48',
    name: '辅修双学位需求',
    description: '对辅修和双学位的需求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['双学位', '辅修', '跨专业'],
    relatedQuestions: ['想修双学位吗？']
  },

  SEC_49: {
    id: 'SEC_49',
    name: '学校排名关注度',
    description: '对各类排名的关注度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['排名', 'QS', '软科'],
    relatedQuestions: ['看重学校排名吗？']
  },

  SEC_50: {
    id: 'SEC_50',
    name: '男女比例关注度',
    description: '对学校男女比例的关注度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.LOW,
    category: '院校细节',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['男女比例', '性别'],
    relatedQuestions: ['在意男女比例吗？']
  },

  // ============ 专业深度偏好 (10个) ============
  SEC_51: {
    id: 'SEC_51',
    name: '课程设置重视度',
    description: '对课程内容的重视度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['课程', '内容', '学什么'],
    relatedQuestions: ['关心具体学什么课程吗？']
  },

  SEC_52: {
    id: 'SEC_52',
    name: '就业对口度要求',
    description: '对专业就业对口的要求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['对口', '就业', '专业相关'],
    relatedQuestions: ['要求专业对口就业吗？']
  },

  SEC_53: {
    id: 'SEC_53',
    name: '行业认可度重视度',
    description: '对专业在行业内认可度的重视度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['认可度', '业内', '口碑'],
    relatedQuestions: ['看重专业的行业认可度吗？']
  },

  SEC_54: {
    id: 'SEC_54',
    name: '专业发展前景',
    description: '对专业未来前景的关注度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.HIGH,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['前景', '未来', '趋势'],
    relatedQuestions: ['看重专业的发展前景吗？']
  },

  SEC_55: {
    id: 'SEC_55',
    name: '专业学习难度接受度',
    description: '对专业学习难度的接受度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['难度', '难学', '学习'],
    relatedQuestions: ['能接受学习难度大的专业吗？']
  },

  SEC_56: {
    id: 'SEC_56',
    name: '实践机会重视度',
    description: '对专业实践环节的重视度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_HIGH,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['实践', '实验', '项目'],
    relatedQuestions: ['看重实践机会吗？']
  },

  SEC_57: {
    id: 'SEC_57',
    name: '专业竞赛机会',
    description: '对学科竞赛的兴趣',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['竞赛', '比赛', '获奖'],
    relatedQuestions: ['对学科竞赛感兴趣吗？']
  },

  SEC_58: {
    id: 'SEC_58',
    name: '交叉学科兴趣',
    description: '对跨学科学习的兴趣',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['交叉', '跨学科', '多学科'],
    relatedQuestions: ['对交叉学科感兴趣吗？']
  },

  SEC_59: {
    id: 'SEC_59',
    name: '专业证书要求',
    description: '专业是否需要考证',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.BOOLEAN,
    weight: WeightLevel.MEDIUM_LOW,
    category: '专业深度',
    extractionHints: ['证书', '考证', '资格'],
    relatedQuestions: ['专业需要考很多证吗？']
  },

  SEC_60: {
    id: 'SEC_60',
    name: '专业就业率关注度',
    description: '对专业就业率的关注度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.HIGH,
    category: '专业深度',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['就业率', '好就业', '工作'],
    relatedQuestions: ['看重专业的就业率吗？']
  },

  // ============ 特殊需求与限制 (10个) ============
  SEC_61: {
    id: 'SEC_61',
    name: '身体条件限制',
    description: '是否有身体条件限制',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.BOOLEAN,
    weight: WeightLevel.MEDIUM,
    category: '特殊需求',
    extractionHints: ['色弱', '色盲', '身体', '限制'],
    relatedQuestions: ['有身体条件限制吗？']
  },

  SEC_62: {
    id: 'SEC_62',
    name: '特长发展需求',
    description: '是否有特长需要发展',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.STRING_ARRAY,
    weight: WeightLevel.MEDIUM_LOW,
    category: '特殊需求',
    possibleValues: ['体育', '艺术', '科技', '其他', '无'],
    extractionHints: ['特长', '爱好', '擅长'],
    relatedQuestions: ['有什么特长想继续发展吗？']
  },

  SEC_63: {
    id: 'SEC_63',
    name: '少数民族身份',
    description: '是否为少数民族',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.BOOLEAN,
    weight: WeightLevel.LOW,
    category: '特殊需求',
    extractionHints: ['少数民族', '民族'],
    relatedQuestions: ['你是少数民族吗？']
  },

  SEC_64: {
    id: 'SEC_64',
    name: '宗教信仰需求',
    description: '是否有宗教信仰需求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.BOOLEAN,
    weight: WeightLevel.LOW,
    category: '特殊需求',
    extractionHints: ['宗教', '信仰', '清真'],
    relatedQuestions: ['有宗教信仰需求吗？']
  },

  SEC_65: {
    id: 'SEC_65',
    name: '家人期望影响度',
    description: '父母期望的影响程度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM,
    category: '特殊需求',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['父母', '家人', '期望'],
    relatedQuestions: ['父母的意见影响大吗？']
  },

  SEC_66: {
    id: 'SEC_66',
    name: '地域限制原因',
    description: '是否有必须的地域限制',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.STRING,
    weight: WeightLevel.MEDIUM,
    category: '特殊需求',
    extractionHints: ['必须', '只能', '限制'],
    relatedQuestions: ['有必须去某地的原因吗？']
  },

  SEC_67: {
    id: 'SEC_67',
    name: '奖助学金需求',
    description: '是否需要奖助学金',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.BOOLEAN,
    weight: WeightLevel.MEDIUM_LOW,
    category: '特殊需求',
    extractionHints: ['奖学金', '助学金', '资助'],
    relatedQuestions: ['需要奖助学金支持吗？']
  },

  SEC_68: {
    id: 'SEC_68',
    name: '军训态度',
    description: '对军训的态度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.ENUM,
    weight: WeightLevel.LOW,
    category: '特殊需求',
    possibleValues: ['期待', '无所谓', '不喜欢'],
    extractionHints: ['军训'],
    relatedQuestions: ['对军训有什么想法？']
  },

  SEC_69: {
    id: 'SEC_69',
    name: '中外合作办学态度',
    description: '对中外合作项目的态度',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.ENUM,
    weight: WeightLevel.MEDIUM_LOW,
    category: '特殊需求',
    possibleValues: ['感兴趣', '可以考虑', '不考虑'],
    extractionHints: ['中外合作', '合作办学'],
    relatedQuestions: ['考虑中外合作办学吗？']
  },

  SEC_70: {
    id: 'SEC_70',
    name: '心理咨询需求',
    description: '对心理健康服务的需求',
    type: IndicatorType.SECONDARY,
    valueType: ValueType.SCORE,
    weight: WeightLevel.MEDIUM_LOW,
    category: '特殊需求',
    valueRange: { min: 1, max: 5 },
    extractionHints: ['心理', '咨询', '健康'],
    relatedQuestions: ['看重心理咨询服务吗？']
  }
};

/**
 * 所有指标的集合
 */
export const ALL_INDICATORS: Record<string, IndicatorDefinition> = {
  ...CORE_INDICATORS,
  ...SECONDARY_INDICATORS
};

/**
 * 根据ID获取指标定义
 */
export function getIndicatorById(id: string): IndicatorDefinition | undefined {
  return ALL_INDICATORS[id];
}

/**
 * 获取所有核心指标
 */
export function getCoreIndicators(): IndicatorDefinition[] {
  return Object.values(CORE_INDICATORS);
}

/**
 * 获取所有次要指标
 */
export function getSecondaryIndicators(): IndicatorDefinition[] {
  return Object.values(SECONDARY_INDICATORS);
}

/**
 * 根据分类获取指标
 */
export function getIndicatorsByCategory(category: string): IndicatorDefinition[] {
  return Object.values(ALL_INDICATORS).filter(ind => ind.category === category);
}

/**
 * 获取所有指标分类
 */
export function getAllCategories(): string[] {
  const categories = new Set(Object.values(ALL_INDICATORS).map(ind => ind.category));
  return Array.from(categories);
}
