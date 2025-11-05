import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { VolunteerBatch, VolunteerGroup, VolunteerMajor } from '../models/VolunteerNew';
import { AuthRequest } from '../types';
import { ResponseUtil } from '../utils/response';
import { AdmissionScore } from '../models/AdmissionScore';
import ExcelJS from 'exceljs';

export class VolunteerTableController {
  private batchRepo = AppDataSource.getRepository(VolunteerBatch);
  private groupRepo = AppDataSource.getRepository(VolunteerGroup);
  private majorRepo = AppDataSource.getRepository(VolunteerMajor);
  private scoreRepo = AppDataSource.getRepository(AdmissionScore);

  /**
   * 获取志愿表
   * GET /api/volunteer/table
   */
  async getVolunteerTable(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      // 查询用户的志愿表批次（获取最新的一个）
      const batch = await this.batchRepo.findOne({
        where: { userId },
        relations: ['groups', 'groups.majors'],
        order: { createdAt: 'DESC' }
      });

      if (!batch) {
        return ResponseUtil.success(res, {
          totalCount: 0,
          maxCount: 40,
          volunteers: []
        });
      }

      // 获取每个专业组的最近分数和分类
      const volunteersWithDetails = await Promise.all(
        batch.groups.map(async (group) => {
          // 查询最近一年分数
          const recentScore = await this.scoreRepo.findOne({
            where: {
              collegeCode: group.collegeCode,
              groupCode: group.groupCode
            },
            order: { year: 'DESC' }
          });

          // 根据用户分数计算分类
          let category: 'rush' | 'stable' | 'safe' = 'stable';
          if (recentScore && batch.score) {
            const diff = batch.score - (recentScore.minScore || 0);
            if (diff >= 20) category = 'safe';
            else if (diff < -10) category = 'rush';
          }

          return {
            id: group.id,
            orderNum: group.groupOrder,
            collegeCode: group.collegeCode,
            collegeName: group.collegeName,
            groupCode: group.groupCode,
            groupName: group.groupName,
            groupId: `${group.collegeCode}_${group.groupCode}_${batch.year}_${batch.province}`,
            majors: group.majors.map(m => ({
              orderNum: m.majorOrder,
              majorCode: m.majorCode,
              majorName: m.majorName
            })),
            category,
            isObeyAdjustment: group.isObeyAdjustment,
            recentScore: recentScore ? {
              year: recentScore.year,
              minScore: recentScore.minScore,
              minRank: recentScore.minRank
            } : null,
            createdAt: group.createdAt.toISOString()
          };
        })
      );

      ResponseUtil.success(res, {
        totalCount: batch.groups.length,
        maxCount: 40,
        volunteers: volunteersWithDetails.sort((a, b) => a.orderNum - b.orderNum)
      });
    } catch (error: any) {
      console.error('Get volunteer table error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 添加志愿
   * POST /api/volunteer/table/add
   */
  async addVolunteer(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { collegeCode, collegeName, groupCode, groupName, groupId, majors, isObeyAdjustment } = req.body;

      // 获取或创建批次
      let batch = await this.batchRepo.findOne({
        where: { userId },
        relations: ['groups'],
        order: { createdAt: 'DESC' }
      });

      if (!batch) {
        // 创建新批次
        batch = this.batchRepo.create({
          userId,
          year: new Date().getFullYear(),
          batchType: '本科批',
          province: '江苏',
          subjectType: '物理类',
          score: 0,
          status: 'draft'
        });
        await this.batchRepo.save(batch);
      }

      // 检查是否已满40个
      if (batch.groups && batch.groups.length >= 40) {
        return ResponseUtil.error(res, '志愿表已满，最多40个', 400);
      }

      // 计算新的顺序号
      const maxOrder = batch.groups?.length > 0
        ? Math.max(...batch.groups.map(g => g.groupOrder))
        : 0;

      // 创建志愿组
      const volunteerGroup = this.groupRepo.create({
        batchId: batch.id,
        groupOrder: maxOrder + 1,
        collegeCode,
        collegeName,
        groupCode,
        groupName,
        isObeyAdjustment: isObeyAdjustment ?? true
      });

      await this.groupRepo.save(volunteerGroup);

      // 创建志愿专业
      if (majors && majors.length > 0) {
        const volunteerMajors = majors.map((major: any) =>
          this.majorRepo.create({
            groupId: volunteerGroup.id,
            majorOrder: major.orderNum,
            majorCode: major.majorCode,
            majorName: major.majorName
          })
        );
        await this.majorRepo.save(volunteerMajors);
      }

      ResponseUtil.success(res, {
        volunteerId: volunteerGroup.id,
        orderNum: volunteerGroup.groupOrder
      }, '添加成功');
    } catch (error: any) {
      console.error('Add volunteer error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 批量调整顺序
   * PUT /api/volunteer/table/reorder
   */
  async reorderVolunteers(req: AuthRequest, res: Response) {
    try {
      const { volunteers } = req.body;

      if (!volunteers || !Array.isArray(volunteers)) {
        return ResponseUtil.badRequest(res, '参数错误');
      }

      // 批量更新
      await Promise.all(
        volunteers.map(async (v: any) => {
          await this.groupRepo.update(v.id, { groupOrder: v.orderNum });
        })
      );

      ResponseUtil.success(res, null, '调整成功');
    } catch (error: any) {
      console.error('Reorder volunteers error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 删除志愿
   * DELETE /api/volunteer/table/:volunteerId
   */
  async deleteVolunteer(req: AuthRequest, res: Response) {
    try {
      const { volunteerId } = req.params;
      const userId = req.userId!;

      // 验证权限
      const volunteer = await this.groupRepo.findOne({
        where: { id: volunteerId },
        relations: ['batch']
      });

      if (!volunteer) {
        return ResponseUtil.error(res, '志愿不存在', 404);
      }

      if (volunteer.batch.userId !== userId) {
        return ResponseUtil.error(res, '无权限删除', 403);
      }

      await this.groupRepo.remove(volunteer);

      ResponseUtil.success(res, null, '删除成功');
    } catch (error: any) {
      console.error('Delete volunteer error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 导出志愿表
   * GET /api/volunteer/table/export?format=excel
   */
  async exportVolunteerTable(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { format = 'excel' } = req.query;

      // 查询用户的志愿表批次
      const batch = await this.batchRepo.findOne({
        where: { userId },
        relations: ['groups', 'groups.majors'],
        order: { createdAt: 'DESC' }
      });

      if (!batch || batch.groups.length === 0) {
        return ResponseUtil.error(res, '志愿表为空，无法导出', 400);
      }

      // 获取每个专业组的详细信息
      const volunteersWithDetails = await Promise.all(
        batch.groups.sort((a, b) => a.groupOrder - b.groupOrder).map(async (group) => {
          // 查询最近分数
          const recentScore = await this.scoreRepo.findOne({
            where: { collegeCode: group.collegeCode, groupCode: group.groupCode },
            order: { year: 'DESC' }
          });

          return {
            orderNum: group.groupOrder,
            collegeName: group.collegeName,
            groupName: group.groupName,
            majors: group.majors
              .sort((a, b) => a.majorOrder - b.majorOrder)
              .map(m => m.majorName)
              .join('、'),
            subjectRequirement: group.subjectRequirement || '',
            isObeyAdjustment: group.isObeyAdjustment ? '是' : '否',
            recentMinScore: recentScore?.minScore || '--',
            recentMinRank: recentScore?.minRank || '--',
            recentYear: recentScore?.year || '--'
          };
        })
      );

      if (format === 'excel') {
        // 创建Excel工作簿
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('志愿表');

        // 设置表头
        worksheet.columns = [
          { header: '志愿序号', key: 'orderNum', width: 10 },
          { header: '院校名称', key: 'collegeName', width: 30 },
          { header: '专业组名称', key: 'groupName', width: 25 },
          { header: '专业列表', key: 'majors', width: 50 },
          { header: '选科要求', key: 'subjectRequirement', width: 20 },
          { header: '是否服从调剂', key: 'isObeyAdjustment', width: 15 },
          { header: '去年最低分', key: 'recentMinScore', width: 12 },
          { header: '去年最低位次', key: 'recentMinRank', width: 15 },
          { header: '年份', key: 'recentYear', width: 10 }
        ];

        // 设置表头样式
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // 添加数据
        volunteersWithDetails.forEach(volunteer => {
          const row = worksheet.addRow(volunteer);
          row.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        // 添加标题行（在第一行之前插入）
        worksheet.spliceRows(1, 0, []);
        worksheet.getRow(1).values = ['志愿填报表'];
        worksheet.mergeCells('A1:I1');
        worksheet.getRow(1).font = { bold: true, size: 16 };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 30;

        // 添加考生信息行
        worksheet.spliceRows(2, 0, []);
        worksheet.getRow(2).values = [
          `高考分数: ${batch.score || '未填写'}    位次: ${batch.rank || '未填写'}    批次: ${batch.batchType}    科类: ${batch.subjectType}    年份: ${batch.year}`
        ];
        worksheet.mergeCells('A2:I2');
        worksheet.getRow(2).alignment = { vertical: 'middle', horizontal: 'left' };
        worksheet.getRow(2).height = 25;

        // 设置响应头
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${encodeURIComponent('志愿表_' + new Date().toISOString().split('T')[0])}.xlsx`
        );

        // 写入响应
        await workbook.xlsx.write(res);
        res.end();
      } else {
        return ResponseUtil.error(res, '不支持的导出格式', 400);
      }
    } catch (error: any) {
      console.error('❌ 导出志愿表失败:', error);
      return ResponseUtil.error(res, error.message || '导出志愿表失败');
    }
  }

  /**
   * 智能优化志愿顺序
   * POST /api/volunteer/table/optimize
   */
  async optimizeVolunteerOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { userScore, userRank, subjectType } = req.body;

      if (!userScore) {
        return ResponseUtil.badRequest(res, '请提供用户分数');
      }

      // 查询用户的志愿表批次
      const batch = await this.batchRepo.findOne({
        where: { userId },
        relations: ['groups', 'groups.majors'],
        order: { createdAt: 'DESC' }
      });

      if (!batch || batch.groups.length === 0) {
        return ResponseUtil.error(res, '志愿表为空，无法优化', 400);
      }

      // 为每个志愿计算录取概率和分类
      const volunteersWithProbability = await Promise.all(
        batch.groups.map(async (group) => {
          // 查询历年分数
          const historicalScores = await this.scoreRepo
            .createQueryBuilder('score')
            .where('score.collegeCode = :collegeCode', { collegeCode: group.collegeCode })
            .andWhere('score.groupCode = :groupCode', { groupCode: group.groupCode })
            .orderBy('score.year', 'DESC')
            .limit(5)
            .getMany();

          if (historicalScores.length === 0) {
            return {
              volunteerId: group.id,
              currentOrderNum: group.groupOrder,
              collegeName: group.collegeName,
              groupName: group.groupName,
              category: 'stable' as 'rush' | 'stable' | 'safe',
              probability: 0.5,
              reason: '暂无历年分数数据'
            };
          }

          // 计算概率
          const higherYears = historicalScores.filter(s => userScore >= (s.minScore || 0)).length;
          const baseProb = higherYears / historicalScores.length;

          // 位次因子
          let rankFactor = 1.0;
          if (userRank) {
            const avgMinRank = historicalScores.reduce((sum, s) => sum + (s.minRank || 0), 0) / historicalScores.length;
            const rankDiff = avgMinRank - userRank;
            rankFactor = rankDiff > 0 ? 1.2 : 0.8;
          }

          const probability = Math.min(Math.max(baseProb * rankFactor, 0), 1);

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

          // 生成建议理由
          let reason = '';
          if (category === 'rush') {
            reason = `录取概率${Math.round(probability * 100)}%，分数余量${safetyMargin}分，建议作为冲刺志愿`;
          } else if (category === 'stable') {
            reason = `录取概率${Math.round(probability * 100)}%，分数余量${safetyMargin}分，推荐稳妥填报`;
          } else {
            reason = `录取概率${Math.round(probability * 100)}%，分数余量${safetyMargin}分，可作为保底志愿`;
          }

          return {
            volunteerId: group.id,
            currentOrderNum: group.groupOrder,
            collegeName: group.collegeName,
            groupName: group.groupName,
            category,
            probability: Math.round(probability * 100) / 100,
            reason
          };
        })
      );

      // 按照冲稳保和概率排序
      // 规则：冲刺志愿(rush)排前面，稳妥志愿(stable)中间，保底志愿(safe)后面
      // 同类别内按概率从高到低排序（冲刺除外，冲刺按概率从低到高）
      const categoryOrder = { 'rush': 1, 'stable': 2, 'safe': 3 };

      const optimizedVolunteers = volunteersWithProbability.sort((a, b) => {
        // 先按分类排序
        if (categoryOrder[a.category] !== categoryOrder[b.category]) {
          return categoryOrder[a.category] - categoryOrder[b.category];
        }

        // 同类别内排序
        if (a.category === 'rush') {
          // 冲刺志愿：概率从低到高（最冲的在最前面）
          return a.probability - b.probability;
        } else {
          // 稳妥和保底：概率从高到低（更有把握的在前面）
          return b.probability - a.probability;
        }
      });

      // 分配新的顺序号
      const optimizedOrder = optimizedVolunteers.map((volunteer, index) => ({
        volunteerId: volunteer.volunteerId,
        currentOrderNum: volunteer.currentOrderNum,
        suggestedOrderNum: index + 1,
        category: volunteer.category,
        probability: volunteer.probability,
        reason: volunteer.reason,
        collegeName: volunteer.collegeName,
        groupName: volunteer.groupName
      }));

      return ResponseUtil.success(res, {
        optimizedOrder,
        summary: {
          rushCount: optimizedOrder.filter(v => v.category === 'rush').length,
          stableCount: optimizedOrder.filter(v => v.category === 'stable').length,
          safeCount: optimizedOrder.filter(v => v.category === 'safe').length,
          suggestion: '建议将志愿按照"冲-稳-保"的顺序排列，确保录取机会最大化'
        }
      }, '优化成功');
    } catch (error: any) {
      console.error('❌ 优化志愿顺序失败:', error);
      return ResponseUtil.error(res, error.message || '优化志愿顺序失败');
    }
  }
}
