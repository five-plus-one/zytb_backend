import { AppDataSource } from '../config/database';
import { VolunteerGroup, VolunteerMajor } from '../models/VolunteerNew';

/**
 * 志愿位置管理服务
 * 处理专业组和专业的位置插入、删除、调整逻辑
 */
export class VolunteerPositionService {
  private groupRepo = AppDataSource.getRepository(VolunteerGroup);
  private majorRepo = AppDataSource.getRepository(VolunteerMajor);

  /**
   * 在指定位置插入专业组
   * @param batchId 批次ID
   * @param targetPosition 目标位置 (1-40)，null则追加到末尾
   * @returns 实际分配的位置
   */
  async insertGroupAtPosition(batchId: string, targetPosition: number | null = null): Promise<number> {
    // 获取当前所有专业组
    const groups = await this.groupRepo.find({
      where: { batchId },
      order: { groupOrder: 'ASC' }
    });

    // 如果未指定位置，追加到末尾
    if (targetPosition === null) {
      return groups.length + 1;
    }

    // 验证位置合法性
    if (targetPosition < 1 || targetPosition > 40) {
      throw new Error('位置必须在1-40之间');
    }

    // 如果当前已有40个专业组，不能再插入
    if (groups.length >= 40) {
      throw new Error('志愿表已满，最多40个专业组');
    }

    // 将目标位置及之后的所有组位置+1
    await AppDataSource.createQueryBuilder()
      .update(VolunteerGroup)
      .set({ groupOrder: () => 'groupOrder + 1' })
      .where('batchId = :batchId', { batchId })
      .andWhere('groupOrder >= :position', { position: targetPosition })
      .execute();

    return targetPosition;
  }

  /**
   * 删除专业组后，后续组自动前移
   * @param batchId 批次ID
   * @param deletedPosition 被删除的位置
   */
  async removeGroupAndAdjust(batchId: string, deletedPosition: number): Promise<void> {
    // 将被删除位置之后的所有组位置-1
    await AppDataSource.createQueryBuilder()
      .update(VolunteerGroup)
      .set({ groupOrder: () => 'groupOrder - 1' })
      .where('batchId = :batchId', { batchId })
      .andWhere('groupOrder > :position', { position: deletedPosition })
      .execute();
  }

  /**
   * 将专业组从一个位置移动到另一个位置
   * @param batchId 批次ID
   * @param groupId 专业组ID
   * @param fromPosition 当前位置
   * @param toPosition 目标位置
   */
  async moveGroup(batchId: string, groupId: string, fromPosition: number, toPosition: number): Promise<void> {
    if (fromPosition === toPosition) {
      return; // 位置未变化
    }

    if (toPosition < 1 || toPosition > 40) {
      throw new Error('目标位置必须在1-40之间');
    }

    // 在事务中执行
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      if (fromPosition < toPosition) {
        // 向后移动：将 (fromPosition, toPosition] 区间的组位置-1
        await transactionalEntityManager.createQueryBuilder()
          .update(VolunteerGroup)
          .set({ groupOrder: () => 'groupOrder - 1' })
          .where('batchId = :batchId', { batchId })
          .andWhere('groupOrder > :from', { from: fromPosition })
          .andWhere('groupOrder <= :to', { to: toPosition })
          .execute();
      } else {
        // 向前移动：将 [toPosition, fromPosition) 区间的组位置+1
        await transactionalEntityManager.createQueryBuilder()
          .update(VolunteerGroup)
          .set({ groupOrder: () => 'groupOrder + 1' })
          .where('batchId = :batchId', { batchId })
          .andWhere('groupOrder >= :to', { to: toPosition })
          .andWhere('groupOrder < :from', { from: fromPosition })
          .execute();
      }

      // 更新目标组的位置
      await transactionalEntityManager.update(VolunteerGroup, groupId, {
        groupOrder: toPosition
      });
    });
  }

  /**
   * 批量调整专业组顺序
   * @param batchId 批次ID
   * @param reorders Array<{volunteerId, newPosition}>
   */
  async reorderGroups(batchId: string, reorders: Array<{ volunteerId: string; newPosition: number }>): Promise<void> {
    // 验证所有新位置的合法性
    const positions = reorders.map(r => r.newPosition);
    const uniquePositions = new Set(positions);

    if (positions.length !== uniquePositions.size) {
      throw new Error('新位置中存在重复');
    }

    if (positions.some(p => p < 1 || p > 40)) {
      throw new Error('所有位置必须在1-40之间');
    }

    // 在事务中执行
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      // 临时将所有要调整的组的位置设为负数（避免唯一约束冲突）
      for (let i = 0; i < reorders.length; i++) {
        await transactionalEntityManager.update(VolunteerGroup, reorders[i].volunteerId, {
          groupOrder: -(i + 1)
        });
      }

      // 更新为最终位置
      for (const reorder of reorders) {
        await transactionalEntityManager.update(VolunteerGroup, reorder.volunteerId, {
          groupOrder: reorder.newPosition
        });
      }
    });
  }

  /**
   * 在专业组内的指定位置插入专业
   * @param groupId 专业组ID
   * @param targetPosition 目标位置 (1-6)，null则追加到末尾
   * @returns 实际分配的位置
   */
  async insertMajorAtPosition(groupId: string, targetPosition: number | null = null): Promise<number> {
    // 获取当前所有专业
    const majors = await this.majorRepo.find({
      where: { groupId },
      order: { majorOrder: 'ASC' }
    });

    // 如果未指定位置，追加到末尾
    if (targetPosition === null) {
      return majors.length + 1;
    }

    // 验证位置合法性
    if (targetPosition < 1 || targetPosition > 6) {
      throw new Error('专业位置必须在1-6之间');
    }

    // 如果当前已有6个专业，不能再插入
    if (majors.length >= 6) {
      throw new Error('专业组已满，最多6个专业');
    }

    // 将目标位置及之后的所有专业位置+1
    await AppDataSource.createQueryBuilder()
      .update(VolunteerMajor)
      .set({ majorOrder: () => 'majorOrder + 1' })
      .where('groupId = :groupId', { groupId })
      .andWhere('majorOrder >= :position', { position: targetPosition })
      .execute();

    return targetPosition;
  }

  /**
   * 删除专业后，后续专业自动前移
   * @param groupId 专业组ID
   * @param deletedPosition 被删除的位置
   */
  async removeMajorAndAdjust(groupId: string, deletedPosition: number): Promise<void> {
    // 将被删除位置之后的所有专业位置-1
    await AppDataSource.createQueryBuilder()
      .update(VolunteerMajor)
      .set({ majorOrder: () => 'majorOrder - 1' })
      .where('groupId = :groupId', { groupId })
      .andWhere('majorOrder > :position', { position: deletedPosition })
      .execute();
  }

  /**
   * 批量调整专业顺序
   * @param groupId 专业组ID
   * @param reorders Array<{majorId, newPosition}>
   */
  async reorderMajors(groupId: string, reorders: Array<{ majorId: string; newPosition: number }>): Promise<void> {
    // 验证所有新位置的合法性
    const positions = reorders.map(r => r.newPosition);
    const uniquePositions = new Set(positions);

    if (positions.length !== uniquePositions.size) {
      throw new Error('新位置中存在重复');
    }

    if (positions.some(p => p < 1 || p > 6)) {
      throw new Error('所有专业位置必须在1-6之间');
    }

    // 在事务中执行
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      // 临时将所有要调整的专业的位置设为负数
      for (let i = 0; i < reorders.length; i++) {
        await transactionalEntityManager.update(VolunteerMajor, reorders[i].majorId, {
          majorOrder: -(i + 1)
        });
      }

      // 更新为最终位置
      for (const reorder of reorders) {
        await transactionalEntityManager.update(VolunteerMajor, reorder.majorId, {
          majorOrder: reorder.newPosition
        });
      }
    });
  }

  /**
   * 获取专业组的当前数量
   * @param batchId 批次ID
   * @returns 专业组数量
   */
  async getGroupCount(batchId: string): Promise<number> {
    return await this.groupRepo.count({ where: { batchId } });
  }

  /**
   * 获取专业组内的专业数量
   * @param groupId 专业组ID
   * @returns 专业数量
   */
  async getMajorCount(groupId: string): Promise<number> {
    return await this.majorRepo.count({ where: { groupId } });
  }
}

export const volunteerPositionService = new VolunteerPositionService();
