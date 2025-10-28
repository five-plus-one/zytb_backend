import config from '../config';

// 数据字典定义
const dictionaries = {
  college_type: [
    { value: 'comprehensive', label: '综合类', sort: 1 },
    { value: 'science', label: '理工类', sort: 2 },
    { value: 'normal', label: '师范类', sort: 3 },
    { value: 'agriculture', label: '农林类', sort: 4 },
    { value: 'medicine', label: '医药类', sort: 5 },
    { value: 'finance', label: '财经类', sort: 6 },
    { value: 'politics_law', label: '政法类', sort: 7 },
    { value: 'language', label: '语言类', sort: 8 },
    { value: 'art', label: '艺术类', sort: 9 },
    { value: 'sports', label: '体育类', sort: 10 },
    { value: 'military', label: '军事类', sort: 11 },
    { value: 'ethnic', label: '民族类', sort: 12 }
  ],
  college_level: [
    { value: '985', label: '985工程', sort: 1 },
    { value: '211', label: '211工程', sort: 2 },
    { value: 'double_first_class', label: '双一流', sort: 3 },
    { value: 'key', label: '省属重点', sort: 4 },
    { value: 'ordinary', label: '普通本科', sort: 5 },
    { value: 'vocational', label: '高职专科', sort: 6 }
  ],
  major_category: [
    { value: 'philosophy', label: '哲学', sort: 1 },
    { value: 'economics', label: '经济学', sort: 2 },
    { value: 'law', label: '法学', sort: 3 },
    { value: 'education', label: '教育学', sort: 4 },
    { value: 'literature', label: '文学', sort: 5 },
    { value: 'history', label: '历史学', sort: 6 },
    { value: 'science', label: '理学', sort: 7 },
    { value: 'engineering', label: '工学', sort: 8 },
    { value: 'agriculture', label: '农学', sort: 9 },
    { value: 'medicine', label: '医学', sort: 10 },
    { value: 'management', label: '管理学', sort: 11 },
    { value: 'art', label: '艺术学', sort: 12 }
  ],
  subject_type: [
    { value: 'physics', label: '物理类', sort: 1 },
    { value: 'history', label: '历史类', sort: 2 }
  ],
  volunteer_status: [
    { value: 'draft', label: '草稿', sort: 1 },
    { value: 'submitted', label: '已提交', sort: 2 },
    { value: 'confirmed', label: '已确认', sort: 3 },
    { value: 'admitted', label: '已录取', sort: 4 }
  ],
  admit_probability: [
    { value: 'high', label: '高', sort: 1 },
    { value: 'medium', label: '中', sort: 2 },
    { value: 'low', label: '低', sort: 3 }
  ]
};

// 省份城市数据
const provinces = [
  {
    code: '330000',
    name: '浙江省',
    cities: [
      { code: '330100', name: '杭州市' },
      { code: '330200', name: '宁波市' },
      { code: '330300', name: '温州市' },
      { code: '330400', name: '嘉兴市' },
      { code: '330500', name: '湖州市' },
      { code: '330600', name: '绍兴市' },
      { code: '330700', name: '金华市' },
      { code: '330800', name: '衢州市' },
      { code: '330900', name: '舟山市' },
      { code: '331000', name: '台州市' },
      { code: '331100', name: '丽水市' }
    ]
  },
  {
    code: '110000',
    name: '北京市',
    cities: [{ code: '110100', name: '北京市' }]
  },
  {
    code: '310000',
    name: '上海市',
    cities: [{ code: '310100', name: '上海市' }]
  }
  // 可以添加更多省份...
];

export class SystemService {
  // 获取省份列表
  getProvinces() {
    return provinces;
  }

  // 获取数据字典
  getDict(type: string) {
    const items = dictionaries[type as keyof typeof dictionaries];
    if (!items) {
      throw new Error('字典类型不存在');
    }

    return {
      type,
      items
    };
  }

  // 获取系统配置
  getConfig() {
    return {
      currentYear: config.volunteer.currentYear,
      volunteerStartDate: config.volunteer.startDate,
      volunteerEndDate: config.volunteer.endDate,
      maxVolunteerCount: config.volunteer.maxVolunteerCount,
      announcements: [
        {
          id: '1',
          title: '2024年志愿填报须知',
          content: '请考生务必在规定时间内完成志愿填报...',
          publishAt: '2024-06-01'
        }
      ]
    };
  }

  // 数据统计
  async getStatistics() {
    // TODO: 实际应该从数据库查询
    return {
      collegeCount: 2000,
      majorCount: 500,
      userCount: 100000,
      volunteerCount: 50000,
      todayVisit: 5000
    };
  }
}
