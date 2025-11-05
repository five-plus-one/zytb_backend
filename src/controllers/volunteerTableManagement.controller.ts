import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { VolunteerTable } from '../models/VolunteerTable';
import { VolunteerBatch, VolunteerGroup, VolunteerMajor } from '../models/VolunteerNew';
import { ResponseUtil } from '../utils/response';
import { AuthRequest } from '../types';

export class VolunteerTableManagementController {
  private tableRepo = AppDataSource.getRepository(VolunteerTable);
  private batchRepo = AppDataSource.getRepository(VolunteerBatch);
  private groupRepo = AppDataSource.getRepository(VolunteerGroup);
  private majorRepo = AppDataSource.getRepository(VolunteerMajor);

  /**
   * 获取用户所有志愿表列表
   * GET /api/volunteer/tables
   */
  async getTablesList(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;

      const tables = await this.tableRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' }
      });

      // 获取每个志愿表的统计信息
      const tablesWithStats = await Promise.all(
        tables.map(async (table) => {
          // 获取该表的批次（通常只有一个）
          const batches = await this.batchRepo.find({
            where: { tableId: table.id },
            relations: ['groups']
          });

          const groupCount = batches.reduce((sum, batch) => sum + (batch.groups?.length || 0), 0);

          return {
            id: table.id,
            name: table.name,
            description: table.description || '',
            isCurrent: table.isCurrent,
            groupCount,
            createdAt: table.createdAt,
            updatedAt: table.updatedAt
          };
        })
      );

      // 找出当前激活的志愿表
      const currentTable = tables.find(t => t.isCurrent);

      return ResponseUtil.success(res, {
        tables: tablesWithStats,
        currentTableId: currentTable?.id || null
      });
    } catch (error: any) {
      console.error('❌ 获取志愿表列表失败:', error);
      return ResponseUtil.error(res, error.message || '获取志愿表列表失败');
    }
  }

  /**
   * 创建新志愿表
   * POST /api/volunteer/tables
   */
  async createTable(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name, description, copyFromTableId } = req.body;

      if (!name || name.trim().length === 0) {
        return ResponseUtil.badRequest(res, '志愿表名称不能为空');
      }

      // 检查用户已有的志愿表数量（限制最多10个）
      const count = await this.tableRepo.count({ where: { userId } });
      if (count >= 10) {
        return ResponseUtil.error(res, '志愿表数量已达上限（最多10个）', 400);
      }

      let newTable: VolunteerTable;

      if (copyFromTableId) {
        // 从现有志愿表复制
        const sourceTable = await this.tableRepo.findOne({
          where: { id: copyFromTableId, userId }
        });

        if (!sourceTable) {
          return ResponseUtil.error(res, '源志愿表不存在', 404);
        }

        // 创建新表
        newTable = this.tableRepo.create({
          userId,
          name,
          description: description || `从"${sourceTable.name}"复制`,
          isCurrent: false
        });
        await this.tableRepo.save(newTable);

        // 复制批次、专业组、专业数据
        await this.copyTableData(sourceTable.id, newTable.id);
      } else {
        // 创建空白志愿表
        newTable = this.tableRepo.create({
          userId,
          name,
          description: description || '',
          isCurrent: false
        });
        await this.tableRepo.save(newTable);

        // 创建默认批次
        const defaultBatch = this.batchRepo.create({
          userId,
          tableId: newTable.id,
          year: new Date().getFullYear(),
          batchType: '本科批',
          province: '江苏',
          subjectType: '物理类',
          score: 0,
          status: 'draft'
        });
        await this.batchRepo.save(defaultBatch);
      }

      return ResponseUtil.success(res, {
        tableId: newTable.id,
        isCurrent: newTable.isCurrent
      }, '创建成功');
    } catch (error: any) {
      console.error('❌ 创建志愿表失败:', error);
      return ResponseUtil.error(res, error.message || '创建志愿表失败');
    }
  }

  /**
   * 切换当前志愿表
   * PUT /api/volunteer/tables/:tableId/activate
   */
  async activateTable(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { tableId } = req.params;

      // 验证志愿表存在且属于当前用户
      const table = await this.tableRepo.findOne({
        where: { id: tableId, userId }
      });

      if (!table) {
        return ResponseUtil.error(res, '志愿表不存在', 404);
      }

      if (table.isCurrent) {
        return ResponseUtil.success(res, { currentTableId: tableId }, '该志愿表已是当前使用的');
      }

      // 在事务中切换当前表
      await AppDataSource.transaction(async (transactionalEntityManager) => {
        // 将当前用户的所有表设为非当前
        await transactionalEntityManager.update(
          VolunteerTable,
          { userId, isCurrent: true },
          { isCurrent: false }
        );

        // 将目标表设为当前
        await transactionalEntityManager.update(
          VolunteerTable,
          { id: tableId },
          { isCurrent: true }
        );
      });

      return ResponseUtil.success(res, {
        message: `已切换到志愿表：${table.name}`,
        currentTableId: tableId
      });
    } catch (error: any) {
      console.error('❌ 切换志愿表失败:', error);
      return ResponseUtil.error(res, error.message || '切换志愿表失败');
    }
  }

  /**
   * 重命名/更新志愿表
   * PATCH /api/volunteer/tables/:tableId
   */
  async updateTable(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { tableId } = req.params;
      const { name, description } = req.body;

      const table = await this.tableRepo.findOne({
        where: { id: tableId, userId }
      });

      if (!table) {
        return ResponseUtil.error(res, '志愿表不存在', 404);
      }

      if (name !== undefined) {
        if (!name || name.trim().length === 0) {
          return ResponseUtil.badRequest(res, '志愿表名称不能为空');
        }
        table.name = name.trim();
      }

      if (description !== undefined) {
        table.description = description;
      }

      await this.tableRepo.save(table);

      return ResponseUtil.success(res, {
        tableId: table.id,
        name: table.name,
        description: table.description
      }, '更新成功');
    } catch (error: any) {
      console.error('❌ 更新志愿表失败:', error);
      return ResponseUtil.error(res, error.message || '更新志愿表失败');
    }
  }

  /**
   * 删除志愿表
   * DELETE /api/volunteer/tables/:tableId
   */
  async deleteTable(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { tableId } = req.params;

      const table = await this.tableRepo.findOne({
        where: { id: tableId, userId }
      });

      if (!table) {
        return ResponseUtil.error(res, '志愿表不存在', 404);
      }

      // 不能删除当前激活的志愿表
      if (table.isCurrent) {
        return ResponseUtil.error(res, '不能删除当前使用的志愿表，请先切换到其他志愿表', 400);
      }

      // 删除志愿表（级联删除批次、专业组、专业）
      await this.tableRepo.remove(table);

      return ResponseUtil.success(res, null, '删除成功');
    } catch (error: any) {
      console.error('❌ 删除志愿表失败:', error);
      return ResponseUtil.error(res, error.message || '删除志愿表失败');
    }
  }

  /**
   * 复制志愿表
   * POST /api/volunteer/tables/:tableId/duplicate
   */
  async duplicateTable(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { tableId } = req.params;
      const { newName } = req.body;

      const sourceTable = await this.tableRepo.findOne({
        where: { id: tableId, userId }
      });

      if (!sourceTable) {
        return ResponseUtil.error(res, '源志愿表不存在', 404);
      }

      // 检查数量限制
      const count = await this.tableRepo.count({ where: { userId } });
      if (count >= 10) {
        return ResponseUtil.error(res, '志愿表数量已达上限（最多10个）', 400);
      }

      const name = newName || `${sourceTable.name}-副本`;

      // 创建新表
      const newTable = this.tableRepo.create({
        userId,
        name,
        description: `从"${sourceTable.name}"复制`,
        isCurrent: false
      });
      await this.tableRepo.save(newTable);

      // 复制数据
      await this.copyTableData(sourceTable.id, newTable.id);

      return ResponseUtil.success(res, {
        newTableId: newTable.id,
        name: newTable.name
      }, '复制成功');
    } catch (error: any) {
      console.error('❌ 复制志愿表失败:', error);
      return ResponseUtil.error(res, error.message || '复制志愿表失败');
    }
  }

  /**
   * 复制志愿表数据（批次、专业组、专业）
   * @param sourceTableId 源表ID
   * @param targetTableId 目标表ID
   */
  private async copyTableData(sourceTableId: string, targetTableId: string): Promise<void> {
    const sourceBatches = await this.batchRepo.find({
      where: { tableId: sourceTableId },
      relations: ['groups', 'groups.majors']
    });

    for (const sourceBatch of sourceBatches) {
      // 复制批次
      const newBatch = this.batchRepo.create({
        userId: sourceBatch.userId,
        tableId: targetTableId,
        year: sourceBatch.year,
        batchType: sourceBatch.batchType,
        province: sourceBatch.province,
        subjectType: sourceBatch.subjectType,
        score: sourceBatch.score,
        rank: sourceBatch.rank,
        status: 'draft', // 复制的表重置为草稿状态
        remarks: sourceBatch.remarks
      });
      await this.batchRepo.save(newBatch);

      // 复制专业组
      for (const sourceGroup of sourceBatch.groups || []) {
        const newGroup = this.groupRepo.create({
          batchId: newBatch.id,
          groupOrder: sourceGroup.groupOrder,
          collegeCode: sourceGroup.collegeCode,
          collegeName: sourceGroup.collegeName,
          groupCode: sourceGroup.groupCode,
          groupName: sourceGroup.groupName,
          subjectRequirement: sourceGroup.subjectRequirement,
          isObeyAdjustment: sourceGroup.isObeyAdjustment,
          admitProbability: sourceGroup.admitProbability,
          lastYearMinScore: sourceGroup.lastYearMinScore,
          lastYearMinRank: sourceGroup.lastYearMinRank,
          remarks: sourceGroup.remarks
        });
        await this.groupRepo.save(newGroup);

        // 复制专业
        for (const sourceMajor of sourceGroup.majors || []) {
          const newMajor = this.majorRepo.create({
            groupId: newGroup.id,
            majorOrder: sourceMajor.majorOrder,
            majorCode: sourceMajor.majorCode,
            majorName: sourceMajor.majorName,
            majorDirection: sourceMajor.majorDirection,
            planCount: sourceMajor.planCount,
            tuitionFee: sourceMajor.tuitionFee,
            duration: sourceMajor.duration,
            remarks: sourceMajor.remarks
          });
          await this.majorRepo.save(newMajor);
        }
      }
    }
  }
}
