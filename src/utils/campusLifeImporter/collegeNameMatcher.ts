/**
 * 院校名称匹配器
 * 负责将问卷中的学校名称匹配到数据库中的College记录
 */

import { Repository, Like } from 'typeorm';
import { College } from '../../models/College';

/**
 * 院校别名映射表
 */
const COLLEGE_ALIASES: Record<string, string[]> = {
  '南京大学': ['南大', 'NJU', '南京大学'],
  '东南大学': ['东大', 'SEU', '东南大学'],
  '湖南大学': ['湖大', 'HNU', '湖南大学'],
  '江西师范大学': ['江西师大', '江师', 'JXNU', '江西师范大学'],
  '上海海洋大学': ['海洋大学', 'SHOU', '上海海洋大学'],
  '吉林大学': ['吉大', 'JLU', '吉林大学'],
  '河海大学': ['河海', 'HHU', '河海大学'],
  '上海交通大学': ['上交', '交大', 'SJTU', '上海交通大学'],
  '北京大学': ['北大', 'PKU', '北京大学'],
  '清华大学': ['清华', 'THU', '清华大学'],
  '复旦大学': ['复旦', 'FDU', '复旦大学'],
  '浙江大学': ['浙大', 'ZJU', '浙江大学'],
  '中国科学技术大学': ['中科大', '科大', 'USTC', '中国科学技术大学'],
  '南开大学': ['南开', 'NKU', '南开大学'],
  '天津大学': ['天大', 'TJU', '天津大学'],
  '武汉大学': ['武大', 'WHU', '武汉大学'],
  '华中科技大学': ['华科', 'HUST', '华中科技大学'],
  '中山大学': ['中大', 'SYSU', '中山大学'],
  '四川大学': ['川大', 'SCU', '四川大学'],
  '西安交通大学': ['西交', '西交大', 'XJTU', '西安交通大学'],
  '哈尔滨工业大学': ['哈工大', 'HIT', '哈尔滨工业大学'],
  '北京航空航天大学': ['北航', 'BUAA', '北京航空航天大学'],
  '同济大学': ['同济', 'TJU', '同济大学'],
  '华东师范大学': ['华东师大', 'ECNU', '华东师范大学'],
  '北京师范大学': ['北师大', 'BNU', '北京师范大学'],
  '中国人民大学': ['人大', 'RUC', '中国人民大学'],
  '厦门大学': ['厦大', 'XMU', '厦门大学'],
  '山东大学': ['山大', 'SDU', '山东大学'],
  '重庆大学': ['重大', 'CQU', '重庆大学'],
  '大连理工大学': ['大工', 'DUT', '大连理工大学'],
  '西北工业大学': ['西工大', 'NPU', '西北工业大学'],
  '兰州大学': ['兰大', 'LZU', '兰州大学']
};

/**
 * 院校名称匹配器
 */
export class CollegeNameMatcher {
  constructor(private collegeRepo: Repository<College>) {}

  /**
   * 匹配院校
   * @param name 问卷中的学校名称
   * @returns College实体或null
   */
  async matchCollege(name: string): Promise<College | null> {
    // 标准化名称
    const normalizedName = this.normalizeName(name);

    console.log(`[CollegeNameMatcher] 尝试匹配: "${name}" -> "${normalizedName}"`);

    // 策略1: 精确匹配
    let college = await this.exactMatch(normalizedName);
    if (college) {
      console.log(`  ✓ 精确匹配成功: ${college.name}`);
      return college;
    }

    // 策略2: 简称匹配
    college = await this.shortNameMatch(normalizedName);
    if (college) {
      console.log(`  ✓ 简称匹配成功: ${college.name}`);
      return college;
    }

    // 策略3: 别名匹配
    college = await this.aliasMatch(normalizedName);
    if (college) {
      console.log(`  ✓ 别名匹配成功: ${college.name}`);
      return college;
    }

    // 策略4: 模糊匹配
    college = await this.fuzzyMatch(normalizedName);
    if (college) {
      console.log(`  ✓ 模糊匹配成功: ${college.name}`);
      return college;
    }

    // 策略5: 关键词匹配
    college = await this.keywordMatch(normalizedName);
    if (college) {
      console.log(`  ✓ 关键词匹配成功: ${college.name}`);
      return college;
    }

    console.log(`  ✗ 未找到匹配: "${name}"`);
    return null;
  }

  /**
   * 标准化名称
   */
  private normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, '') // 去除空格
      .replace(/（/g, '(')
      .replace(/）/g, ')');
  }

  /**
   * 策略1: 精确匹配
   */
  private async exactMatch(name: string): Promise<College | null> {
    return await this.collegeRepo.findOne({
      where: { name }
    });
  }

  /**
   * 策略2: 简称匹配
   * 例如："湖南大学长沙校区" -> "湖南大学"
   */
  private async shortNameMatch(name: string): Promise<College | null> {
    // 提取主体名称（去除校区、学院等后缀）
    const shortName = name
      .replace(/(.+)学院$/, '$1') // "XX大学XX学院" -> "XX大学"
      .replace(/(.+)(校区|分校|新校区|老校区)$/, '$1') // 去除校区
      .replace(/(.+)(本部|总部)$/, '$1'); // 去除本部

    if (shortName !== name) {
      const college = await this.collegeRepo.findOne({
        where: { name: shortName }
      });
      if (college) return college;
    }

    // 尝试提取"XX大学"部分
    const match = name.match(/(.+大学)/);
    if (match) {
      const universityName = match[1];
      const college = await this.collegeRepo.findOne({
        where: { name: universityName }
      });
      if (college) return college;
    }

    return null;
  }

  /**
   * 策略3: 别名匹配
   */
  private async aliasMatch(name: string): Promise<College | null> {
    // 遍历别名映射表
    for (const [fullName, aliases] of Object.entries(COLLEGE_ALIASES)) {
      if (aliases.some(alias => alias === name)) {
        const college = await this.collegeRepo.findOne({
          where: { name: fullName }
        });
        if (college) return college;
      }
    }

    return null;
  }

  /**
   * 策略4: 模糊匹配（使用LIKE）
   */
  private async fuzzyMatch(name: string): Promise<College | null> {
    // 尝试包含匹配
    const colleges = await this.collegeRepo.find({
      where: { name: Like(`%${name}%`) },
      take: 10
    });

    if (colleges.length === 0) return null;

    // 如果只有一个结果，直接返回
    if (colleges.length === 1) return colleges[0];

    // 多个结果，选择最相似的
    return this.selectBestMatch(name, colleges);
  }

  /**
   * 策略5: 关键词匹配
   * 提取关键词后匹配
   */
  private async keywordMatch(name: string): Promise<College | null> {
    // 提取关键词（地名+类型）
    // 例如："南京理工大学" -> "南京" + "理工"
    const keywords = this.extractKeywords(name);

    if (keywords.length < 2) return null;

    // 查找包含所有关键词的学校
    const colleges = await this.collegeRepo
      .createQueryBuilder('college')
      .where('college.name LIKE :kw1', { kw1: `%${keywords[0]}%` })
      .andWhere('college.name LIKE :kw2', { kw2: `%${keywords[1]}%` })
      .take(10)
      .getMany();

    if (colleges.length === 0) return null;
    if (colleges.length === 1) return colleges[0];

    return this.selectBestMatch(name, colleges);
  }

  /**
   * 提取关键词
   */
  private extractKeywords(name: string): string[] {
    const keywords: string[] = [];

    // 地名关键词
    const cities = ['北京', '上海', '天津', '重庆', '南京', '杭州', '武汉', '成都', '西安', '广州', '深圳', '长沙', '哈尔滨', '济南', '郑州', '合肥', '南昌', '福州', '太原', '石家庄', '沈阳', '长春', '兰州', '乌鲁木齐', '银川', '西宁', '呼和浩特', '南宁', '昆明', '贵阳', '海口', '拉萨'];

    for (const city of cities) {
      if (name.includes(city)) {
        keywords.push(city);
        break;
      }
    }

    // 类型关键词
    const types = ['理工', '师范', '财经', '政法', '医科', '农业', '林业', '海洋', '矿业', '石油', '地质', '交通', '航空', '航天', '电子', '科技'];

    for (const type of types) {
      if (name.includes(type)) {
        keywords.push(type);
        break;
      }
    }

    return keywords;
  }

  /**
   * 从多个候选中选择最佳匹配
   * 使用编辑距离算法
   */
  private selectBestMatch(target: string, candidates: College[]): College {
    let bestMatch = candidates[0];
    let minDistance = this.levenshteinDistance(target, candidates[0].name);

    for (let i = 1; i < candidates.length; i++) {
      const distance = this.levenshteinDistance(target, candidates[i].name);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = candidates[i];
      }
    }

    return bestMatch;
  }

  /**
   * 计算编辑距离（Levenshtein Distance）
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
      Array(len2 + 1).fill(0)
    );

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // 删除
            dp[i][j - 1] + 1,    // 插入
            dp[i - 1][j - 1] + 1 // 替换
          );
        }
      }
    }

    return dp[len1][len2];
  }

  /**
   * 批量匹配（用于预处理）
   */
  async batchMatch(names: string[]): Promise<Map<string, College | null>> {
    const results = new Map<string, College | null>();

    console.log(`[CollegeNameMatcher] 开始批量匹配 ${names.length} 所院校`);

    for (const name of names) {
      const college = await this.matchCollege(name);
      results.set(name, college);
    }

    const successCount = Array.from(results.values()).filter(c => c !== null).length;
    console.log(`[CollegeNameMatcher] 批量匹配完成: ${successCount}/${names.length} 成功`);

    return results;
  }
}
