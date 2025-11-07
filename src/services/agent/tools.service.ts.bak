import { AppDataSource } from '../../config/database';
import { College } from '../../models/College';
import { Major } from '../../models/Major';
import { AdmissionScore } from '../../models/AdmissionScore';
import { ScoreRanking } from '../../models/ScoreRanking';
import { Volunteer } from '../../models/Volunteer';
import { Like, Between } from 'typeorm';

/**
 * AI 工具服务
 * 提供各种查询功能供 AI Function Calling 使用
 */

export interface SearchCollegeParams {
  keyword?: string;
  province?: string;
  type?: string;
  is985?: boolean;
  is211?: boolean;
  isDoubleFirstClass?: boolean;
  minRank?: number;
  maxRank?: number;
  limit?: number;
}

export interface SearchMajorParams {
  keyword?: string;
  category?: string;
  subCategory?: string;
  degree?: string;
  limit?: number;
}

export interface RecommendCollegesParams {
  score: number;
  province: string;
  subjectType: string;
  rank?: number;
  limit?: number;
}

export interface AdmissionScoreQuery {
  collegeId?: string;
  collegeName?: string;
  province: string;
  subjectType: string;
  years?: number;
}

export class ToolsService {
  private collegeRepo = AppDataSource.getRepository(College);
  private majorRepo = AppDataSource.getRepository(Major);
  private admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);
  private scoreRankingRepo = AppDataSource.getRepository(ScoreRanking);
  private volunteerRepo = AppDataSource.getRepository(Volunteer);

  /**
   * 工具1: 搜索院校信息
   */
  async searchCollege(params: SearchCollegeParams): Promise<any[]> {
    const {
      keyword,
      province,
      type,
      is985,
      is211,
      isDoubleFirstClass,
      minRank,
      maxRank,
      limit = 10
    } = params;

    const query = this.collegeRepo.createQueryBuilder('college');

    if (keyword) {
      query.where(
        '(college.name LIKE :keyword OR college.code LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    if (province) {
      query.andWhere('college.province = :province', { province });
    }

    if (type) {
      query.andWhere('college.type = :type', { type });
    }

    if (is985 !== undefined) {
      query.andWhere('college.is985 = :is985', { is985 });
    }
    if (is211 !== undefined) {
      query.andWhere('college.is211 = :is211', { is211 });
    }
    if (isDoubleFirstClass !== undefined) {
      query.andWhere('college.isDoubleFirstClass = :isDoubleFirstClass', {
        isDoubleFirstClass
      });
    }

    if (minRank !== undefined) {
      query.andWhere('college.rank >= :minRank', { minRank });
    }
    if (maxRank !== undefined) {
      query.andWhere('college.rank <= :maxRank', { maxRank });
    }

    query.orderBy('college.rank', 'ASC').take(limit);

    const colleges = await query.getMany();

    return colleges.map(c => ({
      id: c.id,
      name: c.name,
      province: c.province,
      city: c.city,
      type: c.type,
      rank: c.rank,
      is985: c.is985,
      is211: c.is211,
      isDoubleFirstClass: c.isDoubleFirstClass,
      nationalSpecialMajorCount: c.nationalSpecialMajorCount,
      postgraduateRate: c.postgraduateRate,
      description: c.description?.substring(0, 200)
    }));
  }

  /**
   * 工具2: 搜索专业信息
   */
  async searchMajor(params: SearchMajorParams): Promise<any[]> {
    const { keyword, category, subCategory, degree, limit = 10 } = params;

    const query = this.majorRepo.createQueryBuilder('major');

    if (keyword) {
      query.where('(major.name LIKE :keyword OR major.description LIKE :keyword)', {
        keyword: `%${keyword}%`
      });
    }

    if (category) {
      query.andWhere('major.category = :category', { category });
    }

    if (subCategory) {
      query.andWhere('major.subCategory = :subCategory', { subCategory });
    }

    if (degree) {
      query.andWhere('major.degree = :degree', { degree });
    }

    query.take(limit);

    const majors = await query.getMany();

    return majors.map(m => ({
      id: m.id,
      name: m.name,
      code: m.code,
      category: m.category,
      subCategory: m.subCategory,
      degree: m.degree,
      degreeType: m.degreeType,
      years: m.years,
      requiredSubjects: m.requiredSubjects,
      employmentRate: m.employmentRate,
      avgSalary: m.avgSalary,
      description: m.description?.substring(0, 200)
    }));
  }

  /**
   * 工具3: 根据分数推荐院校
   */
  async recommendCollegesByScore(params: RecommendCollegesParams): Promise<any[]> {
    const { score, province, subjectType, limit = 20 } = params;

    const currentYear = new Date().getFullYear();
    const query = this.admissionScoreRepo
      .createQueryBuilder('score')
      .leftJoinAndSelect('score.college', 'college')
      .where('score.sourceProvince = :province', { province })
      .andWhere('score.subjectType = :subjectType', { subjectType })
      .andWhere('score.year = :year', { year: currentYear - 1 })
      .andWhere('score.minScore IS NOT NULL');

    const scoreRange = {
      min: score - 30,
      max: score + 15
    };

    query
      .andWhere('score.minScore BETWEEN :min AND :max', scoreRange)
      .orderBy('score.minScore', 'DESC')
      .take(limit);

    const admissionScores = await query.getMany();

    return admissionScores.map(s => {
      const scoreDiff = score - (s.minScore || 0);
      let category: 'bold' | 'moderate' | 'stable';
      let probability: 'high' | 'medium' | 'low';

      if (scoreDiff >= 10) {
        category = 'stable';
        probability = 'high';
      } else if (scoreDiff >= 0) {
        category = 'moderate';
        probability = 'medium';
      } else {
        category = 'bold';
        probability = 'low';
      }

      return {
        collegeId: s.college?.id,
        collegeName: s.college?.name,
        province: s.college?.province,
        city: s.college?.city,
        type: s.college?.type,
        is985: s.college?.is985,
        is211: s.college?.is211,
        minScore: s.minScore,
        scoreDifference: scoreDiff,
        category,
        probability,
        year: s.year
      };
    });
  }

  /**
   * 工具4: 查询历年录取分数线
   */
  async getAdmissionScores(params: AdmissionScoreQuery): Promise<any[]> {
    const { collegeId, collegeName, province, subjectType, years = 3 } = params;

    const query = this.admissionScoreRepo
      .createQueryBuilder('score')
      .leftJoinAndSelect('score.college', 'college')
      .where('score.sourceProvince = :province', { province })
      .andWhere('score.subjectType = :subjectType', { subjectType });

    if (collegeId) {
      query.andWhere('score.collegeId = :collegeId', { collegeId });
    } else if (collegeName) {
      query.andWhere('college.name LIKE :name', { name: `%${collegeName}%` });
    } else {
      throw new Error('必须提供 collegeId 或 collegeName');
    }

    const currentYear = new Date().getFullYear();
    query
      .andWhere('score.year >= :startYear', { startYear: currentYear - years })
      .orderBy('score.year', 'DESC')
      .addOrderBy('score.batch', 'ASC');

    const scores = await query.getMany();

    return scores.map(s => ({
      collegeName: s.college?.name,
      year: s.year,
      province: s.sourceProvince,
      batch: s.batch,
      subjectType: s.subjectType,
      minScore: s.minScore,
      minRank: s.minRank
    }));
  }

  /**
   * 工具5: 查询分数对应的排名
   */
  async getScoreRank(score: number, province: string, subjectType: string): Promise<any> {
    const currentYear = new Date().getFullYear();

    const ranking = await this.scoreRankingRepo.findOne({
      where: {
        year: currentYear,
        province,
        subjectType,
        score
      }
    });

    if (ranking) {
      return {
        score: ranking.score,
        rank: ranking.rank,
        province: ranking.province,
        subjectType: ranking.subjectType,
        year: ranking.year
      };
    }

    const nearbyRankings = await this.scoreRankingRepo.find({
      where: {
        year: currentYear,
        province,
        subjectType,
        score: Between(score - 5, score + 5)
      },
      order: {
        score: 'DESC'
      },
      take: 1
    });

    if (nearbyRankings.length > 0) {
      const r = nearbyRankings[0];
      return {
        score: r.score,
        rank: r.rank,
        province: r.province,
        subjectType: r.subjectType,
        year: r.year,
        note: '未找到精确匹配，返回最接近的分数'
      };
    }

    return null;
  }

  /**
   * 工具6: 查询城市信息
   */
  async getCityInfo(cityName: string): Promise<any> {
    const colleges = await this.collegeRepo.find({
      where: {
        city: Like(`%${cityName}%`)
      },
      take: 10
    });

    const total985 = colleges.filter(c => c.is985).length;
    const total211 = colleges.filter(c => c.is211).length;
    const totalDoubleFirstClass = colleges.filter(c => c.isDoubleFirstClass).length;

    return {
      city: cityName,
      totalColleges: colleges.length,
      total985,
      total211,
      totalDoubleFirstClass,
      colleges: colleges.map(c => ({
        name: c.name,
        type: c.type,
        rank: c.rank,
        is985: c.is985,
        is211: c.is211
      }))
    };
  }

  /**
   * 工具7: 查询院校详细信息
   */
  async getCollegeDetail(collegeId: string): Promise<any> {
    const college = await this.collegeRepo.findOne({
      where: { id: collegeId }
    });

    if (!college) {
      throw new Error('院校不存在');
    }

    return {
      id: college.id,
      name: college.name,
      code: college.code,
      province: college.province,
      city: college.city,
      type: college.type,
      rank: college.rank,
      is985: college.is985,
      is211: college.is211,
      isDoubleFirstClass: college.isDoubleFirstClass,
      worldClassDisciplines: college.worldClassDisciplines,
      nationalSpecialMajorCount: college.nationalSpecialMajorCount,
      postgraduateRate: college.postgraduateRate,
      address: college.address,
      website: college.website,
      admissionPhone: college.admissionPhone,
      email: college.email,
      description: college.description,
      evaluationResult: college.evaluationResult
    };
  }

  /**
   * 工具8: 查询专业详细信息
   */
  async getMajorDetail(majorId: string): Promise<any> {
    const major = await this.majorRepo.findOne({
      where: { id: majorId }
    });

    if (!major) {
      throw new Error('专业不存在');
    }

    return {
      id: major.id,
      name: major.name,
      code: major.code,
      category: major.category,
      subCategory: major.subCategory,
      discipline: major.discipline,
      degree: major.degree,
      degreeType: major.degreeType,
      years: major.years,
      requiredSubjects: major.requiredSubjects,
      employmentRate: major.employmentRate,
      avgSalary: major.avgSalary,
      description: major.description,
      courses: major.courses,
      career: major.career
    };
  }

  /**
   * 工具9: 获取用户当前志愿表
   */
  async getUserVolunteers(userId: string): Promise<any[]> {
    const volunteers = await this.volunteerRepo.find({
      where: { userId },
      relations: ['college', 'major'],
      order: { priority: 'ASC' }
    });

    return volunteers.map(v => ({
      id: v.id,
      priority: v.priority,
      collegeId: v.college?.id,
      collegeName: v.college?.name,
      majorId: v.major?.id,
      majorName: v.major?.name,
      isObeyAdjustment: v.isObeyAdjustment,
      admitProbability: v.admitProbability,
      createdAt: v.createdAt
    }));
  }

  /**
   * 工具10: 删除志愿
   */
  async deleteVolunteer(userId: string, volunteerId: string): Promise<boolean> {
    const volunteer = await this.volunteerRepo.findOne({
      where: { id: volunteerId, userId }
    });

    if (!volunteer) {
      throw new Error('志愿不存在或无权限删除');
    }

    await this.volunteerRepo.remove(volunteer);

    // 重新排序剩余志愿
    const remainingVolunteers = await this.volunteerRepo.find({
      where: { userId },
      order: { priority: 'ASC' }
    });

    for (let i = 0; i < remainingVolunteers.length; i++) {
      remainingVolunteers[i].priority = i + 1;
    }

    await this.volunteerRepo.save(remainingVolunteers);

    return true;
  }

  /**
   * 工具11: 调整志愿顺序
   */
  async reorderVolunteer(
    userId: string,
    volunteerId: string,
    newPriority: number
  ): Promise<any[]> {
    const volunteer = await this.volunteerRepo.findOne({
      where: { id: volunteerId, userId }
    });

    if (!volunteer) {
      throw new Error('志愿不存在或无权限修改');
    }

    const oldPriority = volunteer.priority;

    if (oldPriority === newPriority) {
      return await this.getUserVolunteers(userId);
    }

    const allVolunteers = await this.volunteerRepo.find({
      where: { userId },
      order: { priority: 'ASC' }
    });

    if (newPriority < oldPriority) {
      for (const v of allVolunteers) {
        if (v.priority >= newPriority && v.priority < oldPriority) {
          v.priority += 1;
        }
      }
    } else {
      for (const v of allVolunteers) {
        if (v.priority > oldPriority && v.priority <= newPriority) {
          v.priority -= 1;
        }
      }
    }

    volunteer.priority = newPriority;

    await this.volunteerRepo.save(allVolunteers);

    return await this.getUserVolunteers(userId);
  }

  /**
   * 工具12: 添加志愿到志愿表
   */
  async addVolunteer(
    userId: string,
    collegeId: string,
    majorId: string,
    priority?: number,
    isObeyAdjustment: boolean = true
  ): Promise<any> {
    if (!priority) {
      const count = await this.volunteerRepo.count({ where: { userId } });
      priority = count + 1;
    }

    const college = await this.collegeRepo.findOne({ where: { id: collegeId } });
    const major = await this.majorRepo.findOne({ where: { id: majorId } });

    if (!college || !major) {
      throw new Error('院校或专业不存在');
    }

    const volunteer = this.volunteerRepo.create({
      userId,
      collegeId,
      majorId,
      priority,
      isObeyAdjustment
    });

    const saved = await this.volunteerRepo.save(volunteer);

    return {
      id: saved.id,
      priority: saved.priority,
      collegeName: college.name,
      majorName: major.name,
      isObeyAdjustment: saved.isObeyAdjustment
    };
  }
}
