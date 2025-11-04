import { AppDataSource } from '../config/database';
import { EnrollmentPlanGroup } from '../models/EnrollmentPlanGroup';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';

export class EnrollmentPlanGroupService {
  private groupRepo = AppDataSource.getRepository(EnrollmentPlanGroup);
  private enrollmentPlanRepo = AppDataSource.getRepository(EnrollmentPlan);
  private admissionScoreRepo = AppDataSource.getRepository(AdmissionScore);

  /**
   * 查询专业组详细信息（包含历年分数）
   * @param collegeCode 院校代码
   * @param groupCode 专业组代码
   * @param sourceProvince 生源省份
   * @param subjectType 科类
   */
  async getGroupDetail(
    collegeCode: string,
    groupCode: string,
    sourceProvince: string,
    subjectType: string
  ) {
    // 查询专业组基本信息
    const group = await this.groupRepo.findOne({
      where: {
        collegeCode,
        groupCode,
        sourceProvince,
        subjectType
      }
    });

    if (!group) {
      return null;
    }

    // 查询该专业组的招生计划（最新年份）
    const enrollmentPlans = await this.enrollmentPlanRepo
      .createQueryBuilder('ep')
      .where('ep.groupId = :groupId', { groupId: group.id })
      .orderBy('ep.year', 'DESC')
      .getMany();

    // 查询该专业组的历年录取分数
    const admissionScores = await this.admissionScoreRepo
      .createQueryBuilder('as')
      .where('as.groupId = :groupId', { groupId: group.id })
      .orderBy('as.year', 'DESC')
      .getMany();

    return {
      group: {
        id: group.id,
        collegeCode: group.collegeCode,
        collegeName: group.collegeName,
        groupCode: group.groupCode,
        groupCodeRaw: group.groupCodeRaw,
        groupName: group.groupName,
        sourceProvince: group.sourceProvince,
        subjectType: group.subjectType
      },
      enrollmentPlans: enrollmentPlans.map(ep => ({
        year: ep.year,
        majorCode: ep.majorCode,
        majorName: ep.majorName,
        planCount: ep.planCount,
        tuition: ep.tuition,
        studyYears: ep.studyYears,
        subjectRequirements: ep.subjectRequirements,
        remarks: ep.majorRemarks
      })),
      admissionScores: admissionScores.map(as => ({
        year: as.year,
        minScore: as.minScore,
        avgScore: as.avgScore,
        maxScore: as.maxScore,
        minRank: as.minRank,
        maxRank: as.maxRank,
        planCount: as.planCount
      })),
      statistics: {
        totalYears: admissionScores.length,
        avgMinScore: admissionScores.length > 0
          ? Math.round(admissionScores.reduce((sum, as) => sum + (as.minScore || 0), 0) / admissionScores.length)
          : 0,
        avgMinRank: admissionScores.length > 0 && admissionScores[0].minRank
          ? Math.round(admissionScores.reduce((sum, as) => sum + (as.minRank || 0), 0) / admissionScores.length)
          : 0,
        latestYear: admissionScores.length > 0 ? admissionScores[0].year : null,
        totalMajors: enrollmentPlans.length > 0 ? enrollmentPlans[0].planCount : 0
      }
    };
  }

  /**
   * 查询某个学校的所有专业组招生计划
   * @param collegeCode 院校代码
   * @param sourceProvince 生源省份
   * @param subjectType 科类
   * @param year 招生年份（默认2025）
   */
  async getCollegeGroups(
    collegeCode: string,
    sourceProvince: string,
    subjectType: string,
    year: number = 2025
  ) {
    // 查询该院校的所有专业组
    const groups = await this.groupRepo
      .createQueryBuilder('epg')
      .where('epg.collegeCode = :collegeCode', { collegeCode })
      .andWhere('epg.sourceProvince = :sourceProvince', { sourceProvince })
      .andWhere('epg.subjectType = :subjectType', { subjectType })
      .getMany();

    // 为每个专业组查询招生计划和历年分数统计
    const result = await Promise.all(
      groups.map(async (group) => {
        // 查询该年的招生计划数量
        const plans = await this.enrollmentPlanRepo
          .createQueryBuilder('ep')
          .where('ep.groupId = :groupId', { groupId: group.id })
          .andWhere('ep.year = :year', { year })
          .getMany();

        // 查询历年分数统计
        const scores = await this.admissionScoreRepo
          .createQueryBuilder('as')
          .select('COUNT(as.id)', 'count')
          .addSelect('AVG(as.minScore)', 'avgMinScore')
          .addSelect('AVG(as.minRank)', 'avgMinRank')
          .where('as.groupId = :groupId', { groupId: group.id })
          .getRawOne();

        const totalPlanCount = plans.reduce((sum, p) => sum + (p.planCount || 0), 0);

        return {
          groupId: group.id,
          groupCode: group.groupCode,
          groupName: group.groupName,
          majors: plans.map(p => ({
            majorCode: p.majorCode,
            majorName: p.majorName,
            planCount: p.planCount,
            tuition: p.tuition,
            studyYears: p.studyYears
          })),
          totalMajors: plans.length,
          totalPlanCount,
          historicalDataYears: parseInt(scores?.count || '0'),
          avgMinScore: scores?.avgMinScore ? Math.round(scores.avgMinScore) : 0,
          avgMinRank: scores?.avgMinRank ? Math.round(scores.avgMinRank) : 0
        };
      })
    );

    return {
      collegeCode,
      collegeName: groups[0]?.collegeName,
      sourceProvince,
      subjectType,
      year,
      groups: result
    };
  }

  /**
   * 根据group_id查询专业组详情
   */
  async getGroupById(groupId: string) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId }
    });

    if (!group) {
      return null;
    }

    return this.getGroupDetail(
      group.collegeCode,
      group.groupCode,
      group.sourceProvince,
      group.subjectType
    );
  }
}
