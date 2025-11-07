import { AppDataSource } from '../config/database';
import { CoreCollege } from '../models/core/CoreCollege';
import { CoreAdmissionScore } from '../models/core/CoreAdmissionScore';
import { CoreMajor } from '../models/core/CoreMajor';
import { CoreCampusLife } from '../models/core/CoreCampusLife';
import { FindOptionsWhere, Like, Between, In, Repository } from 'typeorm';

/**
 * 核心层数据访问服务
 * 提供高性能的UUID查询接口
 */
export class CoreRepositoryService {
  private coreCollegeRepo: Repository<CoreCollege>;
  private coreAdmissionScoreRepo: Repository<CoreAdmissionScore>;
  private coreMajorRepo: Repository<CoreMajor>;
  private coreCampusLifeRepo: Repository<CoreCampusLife>;

  constructor() {
    this.coreCollegeRepo = AppDataSource.getRepository(CoreCollege);
    this.coreAdmissionScoreRepo = AppDataSource.getRepository(CoreAdmissionScore);
    this.coreMajorRepo = AppDataSource.getRepository(CoreMajor);
    this.coreCampusLifeRepo = AppDataSource.getRepository(CoreCampusLife);
  }

  /**
   * 根据ID查询院校（UUID精确查询）
   */
  async getCollegeById(id: string): Promise<CoreCollege | null> {
    return await this.coreCollegeRepo.findOne({ where: { id } });
  }

  /**
   * 根据名称精确查询院校
   */
  async getCollegeByName(name: string): Promise<CoreCollege | null> {
    return await this.coreCollegeRepo.findOne({ where: { name } });
  }

  /**
   * 查询院校列表（支持多种过滤条件）
   */
  async getColleges(options: {
    province?: string;
    city?: string;
    is985?: boolean;
    is211?: boolean;
    minHotLevel?: number;
    difficultyLevel?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: CoreCollege[]; total: number }> {
    const where: FindOptionsWhere<CoreCollege> = {};

    if (options.province) where.province = options.province;
    if (options.city) where.city = options.city;
    if (options.is985 !== undefined) where.is985 = options.is985;
    if (options.is211 !== undefined) where.is211 = options.is211;
    if (options.difficultyLevel) where.difficultyLevel = options.difficultyLevel;

    const queryBuilder = this.coreCollegeRepo.createQueryBuilder('college');

    if (options.province) queryBuilder.andWhere('college.province = :province', { province: options.province });
    if (options.city) queryBuilder.andWhere('college.city = :city', { city: options.city });
    if (options.is985 !== undefined) queryBuilder.andWhere('college.is_985 = :is985', { is985: options.is985 });
    if (options.is211 !== undefined) queryBuilder.andWhere('college.is_211 = :is211', { is211: options.is211 });
    if (options.minHotLevel) queryBuilder.andWhere('college.hot_level >= :minHotLevel', { minHotLevel: options.minHotLevel });
    if (options.difficultyLevel) queryBuilder.andWhere('college.difficulty_level = :difficultyLevel', { difficultyLevel: options.difficultyLevel });

    queryBuilder.orderBy('college.hot_level', 'DESC');

    if (options.limit) queryBuilder.take(options.limit);
    if (options.offset) queryBuilder.skip(options.offset);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * 根据院校ID查询录取分数（UUID查询，无需JOIN）
   */
  async getAdmissionScoresByCollegeId(
    collegeId: string,
    options?: {
      year?: number;
      province?: string;
      subjectType?: string;
    }
  ): Promise<CoreAdmissionScore[]> {
    const where: FindOptionsWhere<CoreAdmissionScore> = { collegeId };

    if (options?.year) where.year = options.year;
    if (options?.province) where.sourceProvince = options.province;
    if (options?.subjectType) where.subjectType = options.subjectType;

    return await this.coreAdmissionScoreRepo.find({
      where,
      order: { year: 'DESC', minScore: 'DESC' }
    });
  }

  /**
   * 根据专业ID查询录取分数
   */
  async getAdmissionScoresByMajorId(majorId: string): Promise<CoreAdmissionScore[]> {
    return await this.coreAdmissionScoreRepo.find({
      where: { majorId },
      order: { year: 'DESC', minScore: 'DESC' }
    });
  }

  /**
   * 根据院校ID查询校园生活信息
   */
  async getCampusLifeByCollegeId(collegeId: string): Promise<CoreCampusLife | null> {
    return await this.coreCampusLifeRepo.findOne({ where: { collegeId } });
  }

  /**
   * 搜索院校（支持名称模糊匹配）
   */
  async searchColleges(keyword: string, limit: number = 20): Promise<CoreCollege[]> {
    return await this.coreCollegeRepo.find({
      where: { name: Like(`%${keyword}%`) },
      order: { hotLevel: 'DESC' },
      take: limit
    });
  }

  /**
   * 获取热门院校（按热度排序）
   */
  async getHotColleges(limit: number = 50): Promise<CoreCollege[]> {
    return await this.coreCollegeRepo.find({
      order: { hotLevel: 'DESC' },
      take: limit
    });
  }

  /**
   * 根据分数范围查询可报考院校
   */
  async getCollegesByScoreRange(
    minScore: number,
    maxScore: number,
    province: string,
    subjectType: string
  ): Promise<CoreCollege[]> {
    // 使用子查询找到分数范围内的院校ID
    const scoreRecords = await this.coreAdmissionScoreRepo.find({
      where: {
        minScore: Between(minScore - 30, maxScore + 30),
        sourceProvince: province,
        subjectType: subjectType
      },
      select: ['collegeId'],
      order: { minScore: 'DESC' }
    });

    const collegeIds = [...new Set(scoreRecords.map(s => s.collegeId))];

    if (collegeIds.length === 0) return [];

    return await this.coreCollegeRepo.find({
      where: { id: In(collegeIds) },
      order: { hotLevel: 'DESC' }
    });
  }

  /**
   * 获取985/211院校列表
   */
  async getTopColleges(options: {
    is985?: boolean;
    is211?: boolean;
    province?: string;
  }): Promise<CoreCollege[]> {
    const where: FindOptionsWhere<CoreCollege> = {};

    if (options.is985) where.is985 = true;
    if (options.is211) where.is211 = true;
    if (options.province) where.province = options.province;

    return await this.coreCollegeRepo.find({
      where,
      order: { hotLevel: 'DESC', avgAdmissionScore3Years: 'DESC' }
    });
  }
}
