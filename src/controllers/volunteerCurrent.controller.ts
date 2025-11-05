import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { VolunteerTable } from '../models/VolunteerTable';
import { VolunteerBatch, VolunteerGroup, VolunteerMajor } from '../models/VolunteerNew';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { ResponseUtil } from '../utils/response';
import { AuthRequest } from '../types';
import { volunteerPositionService } from '../services/volunteerPosition.service';

export class VolunteerCurrentController {
  private tableRepo = AppDataSource.getRepository(VolunteerTable);
  private batchRepo = AppDataSource.getRepository(VolunteerBatch);
  private groupRepo = AppDataSource.getRepository(VolunteerGroup);
  private majorRepo = AppDataSource.getRepository(VolunteerMajor);
  private planRepo = AppDataSource.getRepository(EnrollmentPlan);
  private scoreRepo = AppDataSource.getRepository(AdmissionScore);

  /**
   * 获取当前志愿表的当前批次（辅助方法）
   */
  private async getCurrentBatch(userId: string): Promise<{ table: VolunteerTable; batch: VolunteerBatch } | null> {
    const table = await this.tableRepo.findOne({
      where: { userId, isCurrent: true }
    });

    if (!table) {
      return null;
    }

    let batch = await this.batchRepo.findOne({
      where: { tableId: table.id },
      order: { createdAt: 'DESC' }
    });

    // 如果没有批次，创建默认批次
    if (!batch) {
      batch = this.batchRepo.create({
        userId,
        tableId: table.id,
        year: new Date().getFullYear(),
        batchType: '本科批',
        province: '江苏',
        subjectType: '物理类',
        score: 0,
        status: 'draft'
      });
      await this.batchRepo.save(batch);
    }

    return { table, batch };
  }

  /**
   * 获取当前志愿表的完整内容
   * GET /api/volunteer/current
   */
  async getCurrent(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const result = await this.getCurrentBatch(userId);
      if (!result) {
        return ResponseUtil.error(res, '请先创建志愿表', 404);
      }

      const { table, batch } = result;

      // 查询所有专业组和专业
      const groups = await this.groupRepo.find({
        where: { batchId: batch.id },
        relations: ['majors'],
        order: { groupOrder: 'ASC' }
      });

      // 丰富每个专业组的数据
      const groupsWithDetails = await Promise.all(
        groups.map(async (group) => {
          // 查询最近分数
          const recentScore = await this.scoreRepo.findOne({
            where: { collegeCode: group.collegeCode, groupCode: group.groupCode },
            order: { year: 'DESC' }
          });

          // 计算分类
          let category: 'rush' | 'stable' | 'safe' = 'stable';
          if (recentScore && batch.score) {
            const diff = batch.score - (recentScore.minScore || 0);
            if (diff >= 20) category = 'safe';
            else if (diff < -10) category = 'rush';
          }

          return {
            id: group.id,
            groupOrder: group.groupOrder,
            collegeCode: group.collegeCode,
            collegeName: group.collegeName,
            groupCode: group.groupCode,
            groupName: group.groupName,
            subjectRequirement: group.subjectRequirement,
            isObeyAdjustment: group.isObeyAdjustment,
            majors: group.majors.sort((a, b) => a.majorOrder - b.majorOrder).map(m => ({
              id: m.id,
              majorOrder: m.majorOrder,
              majorCode: m.majorCode,
              majorName: m.majorName,
              planCount: m.planCount,
              tuitionFee: m.tuitionFee,
              duration: m.duration
            })),
            category,
            recentScore: recentScore ? {
              year: recentScore.year,
              minScore: recentScore.minScore,
              minRank: recentScore.minRank
            } : null,
            remarks: group.remarks,
            createdAt: group.createdAt
          };
        })
      );

      // 统计
      const stats = {
        totalGroups: groups.length,
        maxGroups: 40,
        rushCount: groupsWithDetails.filter(g => g.category === 'rush').length,
        stableCount: groupsWithDetails.filter(g => g.category === 'stable').length,
        safeCount: groupsWithDetails.filter(g => g.category === 'safe').length
      };

      return ResponseUtil.success(res, {
        tableInfo: {
          id: table.id,
          name: table.name,
          description: table.description,
          isCurrent: table.isCurrent
        },
        batchInfo: {
          id: batch.id,
          year: batch.year,
          province: batch.province,
          score: batch.score,
          rank: batch.rank,
          batchType: batch.batchType,
          subjectType: batch.subjectType,
          status: batch.status
        },
        groups: groupsWithDetails,
        stats
      });
    } catch (error: any) {
      console.error('❌ 获取当前志愿表失败:', error);
      return ResponseUtil.error(res, error.message || '获取当前志愿表失败');
    }
  }

  /**
   * 更新当前志愿表的批次信息
   * PUT /api/volunteer/current/batch
   */
  async updateBatch(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { year, province, score, rank, batchType, subjectType } = req.body;

      const result = await this.getCurrentBatch(userId);
      if (!result) {
        return ResponseUtil.error(res, '请先创建志愿表', 404);
      }

      const { batch } = result;

      // 更新批次信息
      if (year !== undefined) batch.year = year;
      if (province !== undefined) batch.province = province;
      if (score !== undefined) batch.score = score;
      if (rank !== undefined) batch.rank = rank;
      if (batchType !== undefined) batch.batchType = batchType;
      if (subjectType !== undefined) batch.subjectType = subjectType;

      await this.batchRepo.save(batch);

      return ResponseUtil.success(res, {
        batchId: batch.id,
        year: batch.year,
        province: batch.province,
        score: batch.score,
        rank: batch.rank
      }, '更新成功');
    } catch (error: any) {
      console.error('❌ 更新批次信息失败:', error);
      return ResponseUtil.error(res, error.message || '更新批次信息失败');
    }
  }

  /**
   * 向当前志愿表添加专业组
   * POST /api/volunteer/current/groups
   */
  async addGroup(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const {
        groupId, collegeCode, collegeName, groupCode, groupName,
        subjectRequirement, targetPosition, isObeyAdjustment, majors
      } = req.body;

      if (!collegeCode || !groupCode) {
        return ResponseUtil.badRequest(res, '缺少必要参数');
      }

      const result = await this.getCurrentBatch(userId);
      if (!result) {
        return ResponseUtil.error(res, '请先创建志愿表', 404);
      }

      const { batch } = result;

      // 检查是否已存在相同的专业组
      const existing = await this.groupRepo.findOne({
        where: {
          batchId: batch.id,
          collegeCode,
          groupCode
        }
      });

      if (existing) {
        return ResponseUtil.error(res, '该专业组已在志愿表中', 400);
      }

      // 计算插入位置
      const position = await volunteerPositionService.insertGroupAtPosition(
        batch.id,
        targetPosition || null
      );

      // 创建专业组
      const newGroup = this.groupRepo.create({
        batchId: batch.id,
        groupOrder: position,
        collegeCode,
        collegeName,
        groupCode,
        groupName,
        subjectRequirement: subjectRequirement || '',
        isObeyAdjustment: isObeyAdjustment !== undefined ? isObeyAdjustment : true
      });
      await this.groupRepo.save(newGroup);

      // 如果提供了专业列表，同时添加专业
      if (majors && Array.isArray(majors) && majors.length > 0) {
        const majorEntities = majors
          .slice(0, 6)
          .filter(major => major.majorCode && major.majorName) // 过滤掉无效的专业
          .map((major, index) =>
            this.majorRepo.create({
              groupId: newGroup.id,
              majorOrder: index + 1,
              majorCode: major.majorCode,
              majorName: major.majorName,
              planCount: major.planCount || 0,
              tuitionFee: major.tuitionFee || 0,
              duration: major.duration || 4
            })
          );

        if (majorEntities.length > 0) {
          await this.majorRepo.save(majorEntities);
        }
      }

      return ResponseUtil.success(res, {
        volunteerId: newGroup.id,
        groupOrder: position,
        message: `已添加到第${position}个志愿`
      });
    } catch (error: any) {
      console.error('❌ 添加专业组失败:', error);
      return ResponseUtil.error(res, error.message || '添加专业组失败');
    }
  }

  /**
   * 删除专业组
   * DELETE /api/volunteer/current/groups/:volunteerId
   */
  async deleteGroup(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { volunteerId } = req.params;

      const group = await this.groupRepo.findOne({
        where: { id: volunteerId },
        relations: ['batch']
      });

      if (!group) {
        return ResponseUtil.error(res, '专业组不存在', 404);
      }

      // 验证权限
      if (group.batch.userId !== userId) {
        return ResponseUtil.error(res, '无权限删除', 403);
      }

      const deletedPosition = group.groupOrder;
      const batchId = group.batchId;

      // 删除专业组
      await this.groupRepo.remove(group);

      // 调整后续专业组的位置
      await volunteerPositionService.removeGroupAndAdjust(batchId, deletedPosition);

      return ResponseUtil.success(res, null, '删除成功，后续志愿自动前移');
    } catch (error: any) {
      console.error('❌ 删除专业组失败:', error);
      return ResponseUtil.error(res, error.message || '删除专业组失败');
    }
  }

  /**
   * 批量调整专业组顺序
   * PUT /api/volunteer/current/groups/reorder
   */
  async reorderGroups(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { reorders } = req.body;

      if (!reorders || !Array.isArray(reorders) || reorders.length === 0) {
        return ResponseUtil.badRequest(res, '请提供调整方案');
      }

      const result = await this.getCurrentBatch(userId);
      if (!result) {
        return ResponseUtil.error(res, '请先创建志愿表', 404);
      }

      await volunteerPositionService.reorderGroups(result.batch.id, reorders);

      return ResponseUtil.success(res, null, '调整成功');
    } catch (error: any) {
      console.error('❌ 调整专业组顺序失败:', error);
      return ResponseUtil.error(res, error.message || '调整专业组顺序失败');
    }
  }

  /**
   * 修改专业组设置
   * PATCH /api/volunteer/current/groups/:volunteerId
   */
  async updateGroup(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { volunteerId } = req.params;
      const { isObeyAdjustment, remarks } = req.body;

      const group = await this.groupRepo.findOne({
        where: { id: volunteerId },
        relations: ['batch']
      });

      if (!group) {
        return ResponseUtil.error(res, '专业组不存在', 404);
      }

      if (group.batch.userId !== userId) {
        return ResponseUtil.error(res, '无权限修改', 403);
      }

      if (isObeyAdjustment !== undefined) {
        group.isObeyAdjustment = isObeyAdjustment;
      }

      if (remarks !== undefined) {
        group.remarks = remarks;
      }

      await this.groupRepo.save(group);

      return ResponseUtil.success(res, null, '更新成功');
    } catch (error: any) {
      console.error('❌ 更新专业组失败:', error);
      return ResponseUtil.error(res, error.message || '更新专业组失败');
    }
  }

  /**
   * 向专业组添加专业
   * POST /api/volunteer/current/groups/:volunteerId/majors
   */
  async addMajor(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { volunteerId } = req.params;
      const { majorCode, majorName, targetPosition, planCount, tuitionFee, duration } = req.body;

      if (!majorCode || !majorName) {
        return ResponseUtil.badRequest(res, '缺少必要参数');
      }

      const group = await this.groupRepo.findOne({
        where: { id: volunteerId },
        relations: ['batch']
      });

      if (!group) {
        return ResponseUtil.error(res, '专业组不存在', 404);
      }

      if (group.batch.userId !== userId) {
        return ResponseUtil.error(res, '无权限操作', 403);
      }

      // 计算插入位置
      const position = await volunteerPositionService.insertMajorAtPosition(
        volunteerId,
        targetPosition || null
      );

      const newMajor = this.majorRepo.create({
        groupId: volunteerId,
        majorOrder: position,
        majorCode,
        majorName,
        planCount,
        tuitionFee,
        duration
      });
      await this.majorRepo.save(newMajor);

      return ResponseUtil.success(res, {
        majorId: newMajor.id,
        majorOrder: position
      });
    } catch (error: any) {
      console.error('❌ 添加专业失败:', error);
      return ResponseUtil.error(res, error.message || '添加专业失败');
    }
  }

  /**
   * 删除专业
   * DELETE /api/volunteer/current/groups/:volunteerId/majors/:majorId
   */
  async deleteMajor(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { volunteerId, majorId } = req.params;

      const major = await this.majorRepo.findOne({
        where: { id: majorId, groupId: volunteerId },
        relations: ['group', 'group.batch']
      });

      if (!major) {
        return ResponseUtil.error(res, '专业不存在', 404);
      }

      if (major.group.batch.userId !== userId) {
        return ResponseUtil.error(res, '无权限删除', 403);
      }

      const deletedPosition = major.majorOrder;
      const groupId = major.groupId;

      await this.majorRepo.remove(major);
      await volunteerPositionService.removeMajorAndAdjust(groupId, deletedPosition);

      return ResponseUtil.success(res, null, '删除成功');
    } catch (error: any) {
      console.error('❌ 删除专业失败:', error);
      return ResponseUtil.error(res, error.message || '删除专业失败');
    }
  }

  /**
   * 批量设置专业组的专业
   * PUT /api/volunteer/current/groups/:volunteerId/majors
   */
  async setMajors(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { volunteerId } = req.params;
      const { majors } = req.body;

      if (!majors || !Array.isArray(majors)) {
        return ResponseUtil.badRequest(res, '请提供专业列表');
      }

      if (majors.length > 6) {
        return ResponseUtil.error(res, '最多只能设置6个专业', 400);
      }

      const group = await this.groupRepo.findOne({
        where: { id: volunteerId },
        relations: ['batch', 'majors']
      });

      if (!group) {
        return ResponseUtil.error(res, '专业组不存在', 404);
      }

      if (group.batch.userId !== userId) {
        return ResponseUtil.error(res, '无权限操作', 403);
      }

      // 在事务中删除旧专业并创建新专业
      await AppDataSource.transaction(async (transactionalEntityManager) => {
        // 删除所有旧专业
        if (group.majors && group.majors.length > 0) {
          await transactionalEntityManager.remove(group.majors);
        }

        // 创建新专业
        const newMajors = majors.map((major, index) =>
          this.majorRepo.create({
            groupId: volunteerId,
            majorOrder: index + 1,
            majorCode: major.majorCode,
            majorName: major.majorName,
            planCount: major.planCount,
            tuitionFee: major.tuitionFee,
            duration: major.duration
          })
        );
        await transactionalEntityManager.save(newMajors);
      });

      return ResponseUtil.success(res, null, '设置成功');
    } catch (error: any) {
      console.error('❌ 批量设置专业失败:', error);
      return ResponseUtil.error(res, error.message || '批量设置专业失败');
    }
  }

  /**
   * 调整专业顺序
   * PUT /api/volunteer/current/groups/:volunteerId/majors/reorder
   */
  async reorderMajors(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { volunteerId } = req.params;
      const { reorders } = req.body;

      if (!reorders || !Array.isArray(reorders) || reorders.length === 0) {
        return ResponseUtil.badRequest(res, '请提供调整方案');
      }

      const group = await this.groupRepo.findOne({
        where: { id: volunteerId },
        relations: ['batch']
      });

      if (!group) {
        return ResponseUtil.error(res, '专业组不存在', 404);
      }

      if (group.batch.userId !== userId) {
        return ResponseUtil.error(res, '无权限操作', 403);
      }

      await volunteerPositionService.reorderMajors(volunteerId, reorders);

      return ResponseUtil.success(res, null, '调整成功');
    } catch (error: any) {
      console.error('❌ 调整专业顺序失败:', error);
      return ResponseUtil.error(res, error.message || '调整专业顺序失败');
    }
  }
}
