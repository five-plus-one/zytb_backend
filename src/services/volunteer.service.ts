import { AppDataSource } from '../config/database';
import { Volunteer } from '../models/Volunteer';
import { College } from '../models/College';
import { Major } from '../models/Major';
import {
  VolunteerDto,
  VolunteerRecommendDto,
  VolunteerAnalyzeDto,
  VolunteerStatus,
  AdmitProbability,
  VolunteerType
} from '../types';
import config from '../config';
import { In } from 'typeorm';

export class VolunteerService {
  private volunteerRepository = AppDataSource.getRepository(Volunteer);
  private collegeRepository = AppDataSource.getRepository(College);
  private majorRepository = AppDataSource.getRepository(Major);

  // 获取我的志愿
  async getMyVolunteers(userId: string) {
    const volunteers = await this.volunteerRepository.find({
      where: { userId },
      relations: ['college', 'major'],
      order: { priority: 'ASC' }
    });

    // 获取状态和提交时间
    const status = volunteers.length > 0 ? volunteers[0].status : VolunteerStatus.DRAFT;
    const submittedAt = volunteers.length > 0 ? volunteers[0].submittedAt : null;

    return {
      userId,
      status,
      volunteers: volunteers.map(v => ({
        id: v.id,
        priority: v.priority,
        collegeId: v.collegeId,
        collegeName: v.college.name,
        collegeLogo: v.college.logo,
        majorId: v.majorId,
        majorName: v.major.name,
        majorCode: v.major.code,
        admitProbability: v.admitProbability || AdmitProbability.MEDIUM,
        minScore: v.college.minScore,
        avgScore: v.college.avgScore,
        isObeyAdjustment: v.isObeyAdjustment,
        remarks: v.remarks,
        createdAt: v.createdAt
      })),
      submittedAt,
      updatedAt: volunteers.length > 0 ? volunteers[0].updatedAt : null
    };
  }

  // 保存志愿(草稿)
  async saveVolunteers(userId: string, volunteers: VolunteerDto[]) {
    // 检查志愿数量
    if (volunteers.length > config.volunteer.maxVolunteerCount) {
      throw new Error(`超过最大志愿数 ${config.volunteer.maxVolunteerCount}`);
    }

    // 删除原有志愿
    await this.volunteerRepository.delete({ userId, status: VolunteerStatus.DRAFT });

    // 保存新志愿
    const entities = volunteers.map(v =>
      this.volunteerRepository.create({
        userId,
        collegeId: v.collegeId,
        majorId: v.majorId,
        priority: v.priority,
        isObeyAdjustment: v.isObeyAdjustment,
        remarks: v.remarks,
        status: VolunteerStatus.DRAFT
      })
    );

    await this.volunteerRepository.save(entities);

    return {
      userId,
      count: volunteers.length
    };
  }

  // 提交志愿
  async submitVolunteers(userId: string, volunteers: VolunteerDto[]) {
    // 检查是否在填报时间内
    const now = new Date();
    const startDate = new Date(config.volunteer.startDate);
    const endDate = new Date(config.volunteer.endDate);

    if (now < startDate || now > endDate) {
      throw new Error('不在志愿填报时间内');
    }

    // 先保存志愿
    await this.saveVolunteers(userId, volunteers);

    // 更新状态为已提交
    await this.volunteerRepository.update(
      { userId, status: VolunteerStatus.DRAFT },
      {
        status: VolunteerStatus.SUBMITTED,
        submittedAt: new Date()
      }
    );

    const result = await this.getMyVolunteers(userId);

    return result;
  }

  // 删除志愿
  async deleteVolunteer(userId: string, volunteerId: string) {
    const volunteer = await this.volunteerRepository.findOne({
      where: { id: volunteerId, userId }
    });

    if (!volunteer) {
      throw new Error('志愿不存在');
    }

    if (volunteer.status !== VolunteerStatus.DRAFT) {
      throw new Error('已提交的志愿无法删除');
    }

    await this.volunteerRepository.remove(volunteer);
  }

  // 志愿智能推荐
  async recommendVolunteers(data: VolunteerRecommendDto) {
    const { score, province, subjectType, rank, preference, count = 30 } = data;

    // 构建查询条件
    const where: any = {};

    if (preference?.province && preference.province.length > 0) {
      where.province = In(preference.province);
    }

    // 查询符合条件的院校
    let colleges = await this.collegeRepository.find({
      where,
      order: { rank: 'ASC' }
    });

    // 根据分数筛选并分类
    const recommended = [];

    for (const college of colleges) {
      if (recommended.length >= count) break;

      const scoreDiff = score - (college.minScore || 0);
      let type: string;
      let admitProbability: string;

      if (scoreDiff >= 20) {
        type = VolunteerType.STABLE;
        admitProbability = AdmitProbability.HIGH;
      } else if (scoreDiff >= 10) {
        type = VolunteerType.MODERATE;
        admitProbability = AdmitProbability.MEDIUM;
      } else {
        type = VolunteerType.BOLD;
        admitProbability = AdmitProbability.LOW;
      }

      // 获取该院校的热门专业
      const majors = await this.majorRepository.find({
        where: { isHot: true },
        take: 1
      });

      if (majors.length > 0) {
        recommended.push({
          type,
          collegeId: college.id,
          collegeName: college.name,
          majorId: majors[0].id,
          majorName: majors[0].name,
          minScore: college.minScore,
          avgScore: college.avgScore,
          scoreDiff,
          admitProbability,
          reason: `根据历年数据,录取概率${admitProbability === 'high' ? '较高' : admitProbability === 'medium' ? '适中' : '较低'}`
        });
      }
    }

    return {
      recommended,
      analysis: {
        scoreRank: `您的分数超过了全省 ${100 - (rank / 10000) * 100}% 的考生`,
        suggestion: '建议冲刺985院校,稳妥选择211院校'
      }
    };
  }

  // 志愿分析
  async analyzeVolunteers(data: VolunteerAnalyzeDto) {
    const { volunteers, userScore, userRank, province, subjectType } = data;

    const details = [];

    for (let i = 0; i < volunteers.length; i++) {
      const v = volunteers[i];
      const college = await this.collegeRepository.findOne({
        where: { id: v.collegeId }
      });

      if (!college) continue;

      const scoreDiff = userScore - (college.minScore || 0);
      let admitProbability: string;
      let riskLevel: string;
      let suggestion: string;

      if (scoreDiff >= 20) {
        admitProbability = AdmitProbability.HIGH;
        riskLevel = 'low';
        suggestion = '作为稳妥院校,录取概率很高';
      } else if (scoreDiff >= 10) {
        admitProbability = AdmitProbability.MEDIUM;
        riskLevel = 'medium';
        suggestion = '作为适中院校,录取概率较大';
      } else {
        admitProbability = AdmitProbability.LOW;
        riskLevel = 'high';
        suggestion = `作为冲刺院校,录取概率约 ${Math.max(10, 50 - Math.abs(scoreDiff) * 5)}%`;
      }

      details.push({
        priority: i + 1,
        collegeId: college.id,
        collegeName: college.name,
        admitProbability,
        scoreDiff,
        riskLevel,
        suggestion
      });
    }

    // 计算总体风险
    const highRiskCount = details.filter(d => d.riskLevel === 'high').length;
    const overallRisk =
      highRiskCount > volunteers.length * 0.5
        ? 'high'
        : highRiskCount > volunteers.length * 0.3
        ? 'medium'
        : 'low';

    return {
      overall: {
        riskLevel: overallRisk,
        suggestion: '志愿梯度设置较为合理,建议适当调整冲刺院校数量'
      },
      details
    };
  }
}
