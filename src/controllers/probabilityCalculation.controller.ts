import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { AdmissionScore } from '../models/AdmissionScore';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { ResponseUtil } from '../utils/response';

export class ProbabilityCalculationController {
  private scoreRepo = AppDataSource.getRepository(AdmissionScore);
  private planRepo = AppDataSource.getRepository(EnrollmentPlan);

  /**
   * 计算录取概率
   * POST /api/admission-probability/calculate
   */
  async calculateProbability(req: Request, res: Response) {
    try {
      const { userScore, userRank, groupId, subjectType } = req.body;

      if (!userScore || !groupId) {
        return ResponseUtil.badRequest(res, '缺少必要参数');
      }

      let collegeCode: string;
      let groupCode: string;

      // 判断groupId格式
      if (groupId.includes('-') && groupId.length === 36) {
        // UUID格式 - 查询获取collegeCode和groupCode
        console.log(`📊 使用UUID查询录取概率: ${groupId}`);

        const plan = await this.planRepo.findOne({
          where: { groupId }
        });

        if (!plan) {
          return ResponseUtil.error(res, '专业组不存在', 404);
        }

        collegeCode = plan.collegeCode;
        groupCode = plan.majorGroupCode || '';
      } else {
        // 自定义格式 - 直接解析
        console.log(`📊 使用自定义格式查询录取概率: ${groupId}`);

        const parts = groupId.split('_');
        if (parts.length < 2) {
          return ResponseUtil.badRequest(res, '无效的groupId格式');
        }

        collegeCode = parts[0];
        groupCode = parts[1];
      }

      // 查询历年录取分数（最近5年）
      const historicalScores = await this.scoreRepo
        .createQueryBuilder('score')
        .where('score.collegeCode = :collegeCode', { collegeCode })
        .andWhere('score.groupCode = :groupCode', { groupCode })
        .orderBy('score.year', 'DESC')
        .limit(5)
        .getMany();

      if (historicalScores.length === 0) {
        return ResponseUtil.success(res, {
          probability: 0.5,
          category: 'stable',
          suggestion: '暂无历年数据，无法准确预估',
          historicalComparison: {
            higherThanPercent: 50,
            safetyMargin: 0,
            rankComparison: 0
          }
        });
      }

      // 计算概率
      const higherYears = historicalScores.filter(s => userScore >= (s.minScore || 0)).length;
      const baseProb = higherYears / historicalScores.length;

      // 计算位次因子
      let rankFactor = 1.0;
      if (userRank) {
        const avgMinRank = historicalScores.reduce((sum, s) => sum + (s.minRank || 0), 0) / historicalScores.length;
        const rankDiff = avgMinRank - userRank;
        rankFactor = rankDiff > 0 ? 1.2 : 0.8;
      }

      // 最终概率
      let probability = Math.min(Math.max(baseProb * rankFactor, 0), 1);

      // 分类
      let category: 'rush' | 'stable' | 'safe';
      if (probability < 0.35) {
        category = 'rush';
      } else if (probability < 0.9) {
        category = 'stable';
      } else {
        category = 'safe';
      }

      // 计算分数余量
      const avgMinScore = historicalScores.reduce((sum, s) => sum + (s.minScore || 0), 0) / historicalScores.length;
      const safetyMargin = Math.round(userScore - avgMinScore);

      // 生成建议
      let suggestion = '';
      if (category === 'rush') {
        suggestion = '冲一冲：录取概率较低，作为冲刺志愿可以尝试';
      } else if (category === 'stable') {
        suggestion = '稳一稳：录取概率适中，推荐填报';
      } else {
        suggestion = '保一保：录取概率较高，可作为保底志愿';
      }

      const result = {
        probability: Math.round(probability * 100) / 100,
        category,
        suggestion,
        historicalComparison: {
          higherThanPercent: Math.round(baseProb * 100),
          safetyMargin,
          rankComparison: userRank && historicalScores[0] ? Math.round((historicalScores[0].minRank || 0) - userRank) : 0
        }
      };

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Calculate probability error:', error);
      ResponseUtil.error(res, error.message);
    }
  }
}
