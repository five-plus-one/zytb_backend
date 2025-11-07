import { AppDataSource } from '../config/database';
import { CoreCollege } from '../models/core/CoreCollege';
import { CoreMajor } from '../models/core/CoreMajor';
import { EnrollmentPlanGroup } from '../models/EnrollmentPlanGroup';

/**
 * 实体提取服务
 * 从文本中识别院校、专业、专业组、城市等实体，并生成可点击链接
 */

export interface Entity {
  type: 'college' | 'major' | 'group' | 'city' | 'province';
  text: string;
  id?: string;
  code?: string;
  metadata?: any;
}

export interface EntityLink {
  type: string;
  text: string;
  start: number;
  end: number;
  data: any;
}

export class EntityExtractionService {
  private collegeRepo = AppDataSource.getRepository(CoreCollege);
  private majorRepo = AppDataSource.getRepository(CoreMajor);
  private groupRepo = AppDataSource.getRepository(EnrollmentPlanGroup);

  // 缓存常用数据
  private collegeCache: Map<string, CoreCollege> = new Map();
  private majorCache: Map<string, CoreMajor> = new Map();
  private provincesAndCities: Set<string> = new Set([
    '北京', '上海', '天津', '重庆',
    '广东', '广州', '深圳', '珠海', '汕头', '佛山', '韶关', '湛江', '肇庆', '江门', '茂名', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮',
    '江苏', '南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁',
    '浙江', '杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水',
    '山东', '济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽',
    '福建', '福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德',
    '湖北', '武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州',
    '湖南', '长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底',
    '河南', '郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店',
    '河北', '石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水',
    '山西', '太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁',
    '陕西', '西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛',
    '四川', '成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳',
    '安徽', '合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城',
    '江西', '南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶',
    '辽宁', '沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛',
    '吉林', '长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城',
    '黑龙江', '哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河', '牡丹江', '黑河', '绥化',
    '贵州', '贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁',
    '云南', '昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧',
    '甘肃', '兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南',
    '青海', '西宁',
    '海南', '海口', '三亚',
    '内蒙古', '呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布',
    '广西', '南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左',
    '西藏', '拉萨',
    '宁夏', '银川', '石嘴山', '吴忠', '固原', '中卫',
    '新疆', '乌鲁木齐', '克拉玛依',
    '香港', '澳门', '台湾'
  ]);

  /**
   * 初始化缓存
   */
  async initialize() {
    // 加载所有院校
    const colleges = await this.collegeRepo.find();
    colleges.forEach(college => {
      this.collegeCache.set(college.name, college);
      if (college.code) {
        this.collegeCache.set(college.code, college);
      }
    });

    // 加载所有专业
    const majors = await this.majorRepo.find();
    majors.forEach(major => {
      this.majorCache.set(major.name, major);
      if (major.code) {
        this.majorCache.set(major.code, major);
      }
    });
  }

  /**
   * 从文本中提取所有实体
   */
  async extractEntities(text: string): Promise<EntityLink[]> {
    const entities: EntityLink[] = [];

    // 1. 提取院校名称（包括专业组）
    // 匹配 "厦门大学08专业组" 或 "厦门大学"
    const collegeGroupPattern = /([^\s，。！？]+大学|[^\s，。！？]+学院|[^\s，。！？]+大学\([^\)]+\))(\d{2}专业组)?/g;
    let match;
    while ((match = collegeGroupPattern.exec(text)) !== null) {
      const fullText = match[0];
      const collegeName = match[1];
      const groupCode = match[2];

      // 检查是否是真实存在的院校
      const college = this.collegeCache.get(collegeName);
      if (college) {
        if (groupCode) {
          // 专业组
          const group = await this.groupRepo.findOne({
            where: {
              collegeName: collegeName,
              groupCode: groupCode.replace('专业组', '')
            }
          });

          if (group) {
            entities.push({
              type: 'group',
              text: fullText,
              start: match.index,
              end: match.index + fullText.length,
              data: {
                groupId: group.id,
                groupCode: group.groupCode,
                collegeName: group.collegeName,
                collegeCode: group.collegeCode
              }
            });
          }
        } else {
          // 院校
          entities.push({
            type: 'college',
            text: fullText,
            start: match.index,
            end: match.index + fullText.length,
            data: {
              collegeId: college.id,
              collegeName: college.name,
              collegeCode: college.code
            }
          });
        }
      }
    }

    // 2. 提取专业名称
    // 常见专业后缀
    const majorSuffixes = ['学', '工程', '技术', '科学', '管理', '设计', '艺术'];
    for (const [majorName, major] of this.majorCache.entries()) {
      if (majorName.length < 3) continue; // 过滤太短的名称

      const majorPattern = new RegExp(majorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      let majorMatch: RegExpExecArray | null = null;
      while ((majorMatch = majorPattern.exec(text)) !== null) {
        // 避免与已识别的实体重叠
        const matchStart = majorMatch.index;
        const matchEnd = majorMatch.index + majorName.length;
        const overlaps = entities.some(e =>
          (matchStart >= e.start && matchStart < e.end) ||
          (matchEnd > e.start && matchEnd <= e.end)
        );

        if (!overlaps) {
          entities.push({
            type: 'major',
            text: majorName,
            start: matchStart,
            end: matchEnd,
            data: {
              majorId: major.id,
              majorName: major.name,
              majorCode: major.code
            }
          });
        }
      }
    }

    // 3. 提取城市/省份
    for (const location of this.provincesAndCities) {
      const locationPattern = new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      let locationMatch: RegExpExecArray | null = null;
      while ((locationMatch = locationPattern.exec(text)) !== null) {
        // 避免与已识别的实体重叠
        const matchStart = locationMatch.index;
        const matchEnd = locationMatch.index + location.length;
        const overlaps = entities.some(e =>
          (matchStart >= e.start && matchStart < e.end) ||
          (matchEnd > e.start && matchEnd <= e.end)
        );

        if (!overlaps) {
          entities.push({
            type: 'city',
            text: location,
            start: matchStart,
            end: matchEnd,
            data: {
              location: location
            }
          });
        }
      }
    }

    // 按位置排序
    return entities.sort((a, b) => a.start - b.start);
  }

  /**
   * 将文本中的实体转换为带链接的格式
   * 返回包含实体标记的富文本
   */
  async markupEntities(text: string): Promise<{ text: string; entities: EntityLink[] }> {
    const entities = await this.extractEntities(text);

    // 从后往前替换，避免位置偏移
    let markedText = text;
    const reverseEntities = [...entities].reverse();

    for (const entity of reverseEntities) {
      const before = markedText.substring(0, entity.start);
      const after = markedText.substring(entity.end);

      // 使用特殊标记格式: [[entity:type:data]]text[[/entity]]
      const entityData = JSON.stringify(entity.data);
      const marked = `[[entity:${entity.type}:${Buffer.from(entityData).toString('base64')}]]${entity.text}[[/entity]]`;

      markedText = before + marked + after;
    }

    return {
      text: markedText,
      entities: entities
    };
  }

  /**
   * 解析标记文本，提取实体信息
   * 前端使用此格式渲染可点击的实体
   */
  parseMarkedText(markedText: string): Array<{ type: 'text' | 'entity'; content: string; entityData?: any }> {
    const segments: Array<{ type: 'text' | 'entity'; content: string; entityData?: any }> = [];
    const entityPattern = /\[\[entity:([^:]+):([^\]]+)\]\]([^\[]+)\[\[\/entity\]\]/g;

    let lastIndex = 0;
    let match;

    while ((match = entityPattern.exec(markedText)) !== null) {
      // 添加实体前的普通文本
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: markedText.substring(lastIndex, match.index)
        });
      }

      // 添加实体
      const entityType = match[1];
      const entityDataBase64 = match[2];
      const entityText = match[3];

      try {
        const entityData = JSON.parse(Buffer.from(entityDataBase64, 'base64').toString());
        segments.push({
          type: 'entity',
          content: entityText,
          entityData: {
            type: entityType,
            ...entityData
          }
        });
      } catch (e) {
        // 解析失败，当作普通文本
        segments.push({
          type: 'text',
          content: entityText
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余文本
    if (lastIndex < markedText.length) {
      segments.push({
        type: 'text',
        content: markedText.substring(lastIndex)
      });
    }

    return segments;
  }
}

export const entityExtractionService = new EntityExtractionService();
