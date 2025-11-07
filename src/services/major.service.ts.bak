import { AppDataSource } from '../config/database';
import { Major } from '../models/Major';
import { College } from '../models/College';
import { MajorQueryDto } from '../types';
import { validatePageParams, calculatePagination } from '../utils/validator';
import { Like } from 'typeorm';
import { EmbeddingService } from './embedding.service';

export class MajorService {
  private majorRepository = AppDataSource.getRepository(Major);
  private collegeRepository = AppDataSource.getRepository(College);
  private embeddingService = new EmbeddingService();

  // 获取专业列表
  async getMajorList(query: MajorQueryDto) {
    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);

    // 构建查询条件
    const where: any = {};

    if (query.keyword) {
      where.name = Like(`%${query.keyword}%`);
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.subCategory) {
      where.subCategory = query.subCategory;
    }

    if (query.degree) {
      where.degree = query.degree;
    }

    if (query.hot !== undefined) {
      where.isHot = query.hot;
    }

    // 排序
    const orderField = query.sortField || 'name';
    const orderDirection = query.sortOrder === 'desc' ? 'DESC' : 'ASC';

    const [list, total] = await this.majorRepository.findAndCount({
      where,
      order: { [orderField]: orderDirection },
      skip: (pageNum - 1) * pageSize,
      take: pageSize
    });

    return {
      list,
      ...calculatePagination(total, pageNum, pageSize)
    };
  }

  // 获取专业详情
  async getMajorDetail(id: string) {
    const major = await this.majorRepository.findOne({
      where: { id }
    });

    if (!major) {
      throw new Error('专业不存在');
    }

    // TODO: 添加开设该专业的顶尖院校和相关专业
    return {
      ...major,
      topColleges: [],
      relatedMajors: []
    };
  }

  // 获取专业开设院校
  async getMajorColleges(id: string, query: any) {
    const major = await this.majorRepository.findOne({
      where: { id },
      relations: ['advantageColleges']
    });

    if (!major) {
      throw new Error('专业不存在');
    }

    const { pageNum, pageSize } = validatePageParams(query.pageNum, query.pageSize);
    const advantageColleges = major.advantageColleges || [];

    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const list = advantageColleges.slice(start, end);

    return {
      majorId: id,
      majorName: major.name,
      list,
      ...calculatePagination(advantageColleges.length, pageNum, pageSize)
    };
  }

  /**
   * 为专业生成嵌入向量
   * @param majorId 专业ID
   */
  async generateMajorEmbedding(majorId: string): Promise<void> {
    const major = await this.majorRepository.findOne({ where: { id: majorId } });
    if (!major) {
      throw new Error('专业不存在');
    }

    // 生成嵌入文本
    const embeddingText = this.embeddingService.generateMajorEmbeddingText(major);

    // 生成嵌入向量
    const embeddingVector = await this.embeddingService.generateEmbedding(embeddingText);

    // 保存
    await this.majorRepository.update(majorId, {
      embeddingText,
      embeddingVector
    });
  }

  /**
   * 批量生成所有专业的嵌入向量
   */
  async generateAllMajorEmbeddings(): Promise<void> {
    const majors = await this.majorRepository.find();

    console.log(`开始为 ${majors.length} 个专业生成嵌入向量...`);

    for (const major of majors) {
      try {
        await this.generateMajorEmbedding(major.id);
        console.log(`✓ 已生成专业 ${major.name} 的嵌入向量`);
      } catch (error: any) {
        console.error(`✗ 生成专业 ${major.name} 嵌入向量失败:`, error.message);
      }
    }

    console.log('所有专业嵌入向量生成完成');
  }

  /**
   * 计算用户与专业的匹配度
   * @param userPreferences 用户偏好
   * @param majorId 专业ID（可选，如果不提供则返回所有专业的匹配度）
   */
  async calculateMajorMatch(
    userPreferences: {
      interests?: string[];
      careerGoals?: string[];
      skills?: string[];
      subjects?: string[];
      industryPreferences?: string[];
    },
    majorId?: string
  ): Promise<any> {
    // 生成用户偏好的嵌入向量
    const userText = this.embeddingService.generateUserPreferenceText(userPreferences);
    const userEmbedding = await this.embeddingService.generateEmbedding(userText);

    if (userEmbedding.length === 0) {
      throw new Error('无法生成用户偏好嵌入向量，请检查配置');
    }

    // 如果指定了专业ID，只计算该专业的匹配度
    if (majorId) {
      const major = await this.majorRepository.findOne({
        where: { id: majorId },
        relations: ['advantageColleges']
      });

      if (!major) {
        throw new Error('专业不存在');
      }

      // 如果专业没有嵌入向量，先生成
      if (!major.embeddingVector || major.embeddingVector.length === 0) {
        await this.generateMajorEmbedding(majorId);
        const updatedMajor = await this.majorRepository.findOne({
          where: { id: majorId },
          relations: ['advantageColleges']
        });
        major.embeddingVector = updatedMajor!.embeddingVector;
      }

      const matchScore = this.embeddingService.cosineSimilarity(
        userEmbedding,
        major.embeddingVector!
      );

      return {
        major,
        matchScore: Math.round(matchScore * 100),
        matchLevel: this.getMatchLevel(matchScore)
      };
    }

    // 获取所有有嵌入向量的专业
    const majors = await this.majorRepository.find({
      relations: ['advantageColleges']
    });

    // 计算每个专业的匹配度
    const results = majors
      .filter(major => major.embeddingVector && major.embeddingVector.length > 0)
      .map(major => {
        const matchScore = this.embeddingService.cosineSimilarity(
          userEmbedding,
          major.embeddingVector!
        );

        return {
          major,
          matchScore: Math.round(matchScore * 100),
          matchLevel: this.getMatchLevel(matchScore)
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return results;
  }

  /**
   * 获取匹配等级
   * @param score 匹配分数 (0-1)
   */
  private getMatchLevel(score: number): string {
    if (score >= 0.8) return '非常匹配';
    if (score >= 0.6) return '较为匹配';
    if (score >= 0.4) return '一般匹配';
    return '匹配度较低';
  }

  /**
   * 添加专业优势院校关联
   * @param majorId 专业ID
   * @param collegeIds 院校ID数组
   */
  async addAdvantageColleges(majorId: string, collegeIds: string[]): Promise<void> {
    const major = await this.majorRepository.findOne({
      where: { id: majorId },
      relations: ['advantageColleges']
    });

    if (!major) {
      throw new Error('专业不存在');
    }

    const colleges = await this.collegeRepository.findByIds(collegeIds);

    if (colleges.length === 0) {
      throw new Error('未找到任何有效的院校');
    }

    major.advantageColleges = [...(major.advantageColleges || []), ...colleges];
    await this.majorRepository.save(major);
  }
}
