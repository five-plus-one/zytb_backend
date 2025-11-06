import { AppDataSource } from '../config/database';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { Major } from '../models/Major';
import { Repository } from 'typeorm';

export class MajorInfoService {
  private enrollmentPlanRepo: Repository<EnrollmentPlan>;
  private admissionScoreRepo: Repository<AdmissionScore>;
  private majorRepo: Repository<Major>;

  constructor() {
    this.enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);
    this.admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);
    this.majorRepo = AppDataSource.getRepository(Major);
  }

  /**
   * 查询专业详细信息
   */
  async getMajorDetail(majorName: string) {
    const major = await this.majorRepo.findOne({
      where: { name: majorName }
    });

    if (!major) {
      return {
        majorName,
        found: false,
        message: '未找到该专业信息'
      };
    }

    return {
      found: true,
      ...major
    };
  }

  /**
   * 查询专业组信息（某院校的某个专业组）
   */
  async getGroupInfo(params: {
    year: number;
    sourceProvince: string;
    subjectType: string;
    collegeCode?: string;
    collegeName?: string;
    groupCode: string;
  }) {
    const query = this.enrollmentPlanRepo.createQueryBuilder('plan')
      .leftJoinAndSelect('plan.college', 'college')
      .where('plan.year = :year', { year: params.year })
      .andWhere('plan.sourceProvince = :sourceProvince', { sourceProvince: params.sourceProvince })
      .andWhere('plan.subjectType = :subjectType', { subjectType: params.subjectType })
      .andWhere('plan.majorGroupCode = :groupCode', { groupCode: params.groupCode });

    if (params.collegeCode) {
      query.andWhere('plan.collegeCode = :collegeCode', { collegeCode: params.collegeCode });
    }

    if (params.collegeName) {
      query.andWhere('plan.collegeName LIKE :collegeName', { collegeName: `%${params.collegeName}%` });
    }

    const plans = await query.getMany();

    if (plans.length === 0) {
      return {
        found: false,
        message: '未找到该专业组信息'
      };
    }

    // 获取历史录取分数
    const collegeName = plans[0].collegeName;
    const majorGroupName = plans[0].majorGroupName;

    const historicalScores = await this.admissionScoreRepo.find({
      where: {
        collegeName,
        majorGroup: majorGroupName,
        sourceProvince: params.sourceProvince,
        subjectType: params.subjectType
      },
      order: { year: 'DESC' },
      take: 3
    });

    return {
      found: true,
      collegeName: plans[0].collegeName,
      collegeCode: plans[0].collegeCode,
      groupCode: plans[0].majorGroupCode,
      groupName: plans[0].majorGroupName,
      subjectRequirements: plans[0].subjectRequirements,
      totalPlanCount: plans.reduce((sum, p) => sum + (p.planCount || 0), 0),
      majors: plans.map(p => ({
        majorCode: p.majorCode,
        majorName: p.majorName,
        majorRemarks: p.majorRemarks,
        planCount: p.planCount,
        tuition: p.tuition,
        studyYears: p.studyYears
      })),
      historicalScores: historicalScores.map(s => ({
        year: s.year,
        minScore: s.minScore,
        minRank: s.minRank
      }))
    };
  }

  /**
   * 查询某个专业在不同院校的开设情况
   */
  async getMajorInColleges(params: {
    year: number;
    sourceProvince: string;
    subjectType: string;
    majorName: string;
    scoreRange?: { min: number; max: number };
  }) {
    const query = this.enrollmentPlanRepo.createQueryBuilder('plan')
      .leftJoinAndSelect('plan.college', 'college')
      .where('plan.year = :year', { year: params.year })
      .andWhere('plan.sourceProvince = :sourceProvince', { sourceProvince: params.sourceProvince })
      .andWhere('plan.subjectType = :subjectType', { subjectType: params.subjectType })
      .andWhere('plan.majorName LIKE :majorName', { majorName: `%${params.majorName}%` });

    const plans = await query.getMany();

    // 获取每个专业的历史录取分数
    const plansWithScores = await Promise.all(
      plans.map(async (plan) => {
        const scores = await this.admissionScoreRepo.findOne({
          where: {
            year: params.year - 1,
            collegeName: plan.collegeName,
            majorName: plan.majorName,
            sourceProvince: params.sourceProvince,
            subjectType: params.subjectType
          }
        });

        return {
          ...plan,
          lastYearScore: scores ? {
            minScore: scores.minScore,
            minRank: scores.minRank
          } : null
        };
      })
    );

    // 如果指定了分数范围，进行过滤
    let filteredPlans = plansWithScores;
    if (params.scoreRange) {
      filteredPlans = plansWithScores.filter(p => {
        if (!p.lastYearScore) return false;
        const minScore = p.lastYearScore.minScore || 0;
        return minScore >= params.scoreRange!.min && minScore <= params.scoreRange!.max;
      });
    }

    return {
      totalCount: filteredPlans.length,
      plans: filteredPlans.map(p => ({
        collegeName: p.collegeName,
        collegeCode: p.collegeCode,
        groupCode: p.majorGroupCode,
        groupName: p.majorGroupName,
        majorCode: p.majorCode,
        majorName: p.majorName,
        majorRemarks: p.majorRemarks,
        planCount: p.planCount,
        tuition: p.tuition,
        studyYears: p.studyYears,
        lastYearScore: p.lastYearScore
      }))
    };
  }

  /**
   * 对比多个专业组
   */
  async compareGroups(params: {
    year: number;
    sourceProvince: string;
    subjectType: string;
    groups: Array<{
      collegeCode?: string;
      collegeName?: string;
      groupCode: string;
    }>;
  }) {
    const comparisons = await Promise.all(
      params.groups.map(async (g) => {
        const groupInfo = await this.getGroupInfo({
          year: params.year,
          sourceProvince: params.sourceProvince,
          subjectType: params.subjectType,
          collegeCode: g.collegeCode,
          collegeName: g.collegeName,
          groupCode: g.groupCode
        });

        return groupInfo;
      })
    );

    return {
      compareCount: params.groups.length,
      comparisons
    };
  }
}
