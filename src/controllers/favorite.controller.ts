import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Favorite } from '../models/Favorite';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { AdmissionScore } from '../models/AdmissionScore';
import { ResponseUtil } from '../utils/response';
import { AuthRequest } from '../types';

export class FavoriteController {
  private favoriteRepo = AppDataSource.getRepository(Favorite);
  private planRepo = AppDataSource.getRepository(EnrollmentPlan);
  private scoreRepo = AppDataSource.getRepository(AdmissionScore);

  /**
   * 添加收藏
   * POST /api/favorites/add
   */
  async addFavorite(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId, note } = req.body;

      if (!groupId) {
        return ResponseUtil.badRequest(res, '请提供groupId');
      }

      // 解析groupId
      const parts = groupId.split('_');
      if (parts.length < 4) {
        return ResponseUtil.badRequest(res, '无效的groupId格式');
      }

      const [collegeCode, groupCode, year, province] = parts;

      // 检查是否已收藏
      const existing = await this.favoriteRepo.findOne({
        where: { userId, groupId }
      });

      if (existing) {
        return ResponseUtil.error(res, '已收藏该专业组', 400);
      }

      // 获取专业组信息
      const plan = await this.planRepo.findOne({
        where: {
          collegeCode,
          majorGroupCode: groupCode,
          year: parseInt(year),
          sourceProvince: province
        }
      });

      if (!plan) {
        return ResponseUtil.error(res, '专业组不存在', 404);
      }

      // 创建收藏
      const favorite = this.favoriteRepo.create({
        userId,
        groupId,
        collegeCode,
        collegeName: plan.collegeName,
        groupCode,
        groupName: plan.majorGroupName,
        year: parseInt(year),
        province,
        note
      });

      await this.favoriteRepo.save(favorite);

      return ResponseUtil.success(res, {
        favoriteId: favorite.id,
        groupId: favorite.groupId
      }, '收藏成功');
    } catch (error: any) {
      console.error('❌ 添加收藏失败:', error);
      return ResponseUtil.error(res, error.message || '添加收藏失败');
    }
  }

  /**
   * 获取收藏列表
   * GET /api/favorites/list
   */
  async getFavoriteList(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { page = 1, pageSize = 20 } = req.query;

      // 查询收藏
      const [favorites, total] = await this.favoriteRepo.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize)
      });

      // 并行获取每个收藏的详细信息
      const favoritesWithDetails = await Promise.all(
        favorites.map(async (favorite) => {
          // 获取当前年份的招生计划
          const plans = await this.planRepo.find({
            where: {
              collegeCode: favorite.collegeCode,
              majorGroupCode: favorite.groupCode,
              year: favorite.year,
              sourceProvince: favorite.province
            }
          });

          // 获取近2年录取分数
          const recentScores = await this.scoreRepo
            .createQueryBuilder('score')
            .where('score.collegeCode = :collegeCode', { collegeCode: favorite.collegeCode })
            .andWhere('score.groupCode = :groupCode', { groupCode: favorite.groupCode })
            .andWhere('score.year >= :startYear', { startYear: favorite.year - 2 })
            .orderBy('score.year', 'DESC')
            .limit(2)
            .getMany();

          // 计算总招生人数和平均学费
          const totalPlanCount = plans.reduce((sum, p) => sum + (p.planCount || 0), 0);
          const avgTuition = plans.length > 0
            ? Math.round(plans.reduce((sum, p) => sum + (p.tuition || 0), 0) / plans.length)
            : 0;

          return {
            favoriteId: favorite.id,
            groupId: favorite.groupId,
            collegeCode: favorite.collegeCode,
            collegeName: favorite.collegeName,
            groupCode: favorite.groupCode,
            groupName: favorite.groupName,
            year: favorite.year,
            province: favorite.province,
            note: favorite.note,
            totalPlanCount,
            avgTuition,
            majorsCount: plans.length,
            recentScores: recentScores.map(s => ({
              year: s.year,
              minScore: s.minScore,
              minRank: s.minRank
            })),
            createdAt: favorite.createdAt
          };
        })
      );

      return ResponseUtil.success(res, {
        list: favoritesWithDetails,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      });
    } catch (error: any) {
      console.error('❌ 获取收藏列表失败:', error);
      return ResponseUtil.error(res, error.message || '获取收藏列表失败');
    }
  }

  /**
   * 删除收藏
   * DELETE /api/favorites/:groupId
   */
  async deleteFavorite(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId } = req.params;

      const favorite = await this.favoriteRepo.findOne({
        where: { userId, groupId }
      });

      if (!favorite) {
        return ResponseUtil.error(res, '收藏不存在', 404);
      }

      await this.favoriteRepo.remove(favorite);

      return ResponseUtil.success(res, null, '删除成功');
    } catch (error: any) {
      console.error('❌ 删除收藏失败:', error);
      return ResponseUtil.error(res, error.message || '删除收藏失败');
    }
  }

  /**
   * 检查是否已收藏
   * GET /api/favorites/check/:groupId
   */
  async checkFavorite(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { groupId } = req.params;

      const favorite = await this.favoriteRepo.findOne({
        where: { userId, groupId }
      });

      return ResponseUtil.success(res, {
        isFavorited: !!favorite,
        favoriteId: favorite?.id || null
      });
    } catch (error: any) {
      console.error('❌ 检查收藏失败:', error);
      return ResponseUtil.error(res, error.message || '检查收藏失败');
    }
  }
}
