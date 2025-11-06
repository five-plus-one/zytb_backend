import { AppDataSource } from '../config/database';
import { VolunteerBatch, VolunteerGroup, VolunteerMajor } from '../models/VolunteerNew';
import { VolunteerTable } from '../models/VolunteerTable';
import { User } from '../models/User';
import { Repository } from 'typeorm';

export class VolunteerManagementService {
  private batchRepo: Repository<VolunteerBatch>;
  private groupRepo: Repository<VolunteerGroup>;
  private majorRepo: Repository<VolunteerMajor>;
  private tableRepo: Repository<VolunteerTable>;

  constructor() {
    this.batchRepo = AppDataSource.getRepository(VolunteerBatch);
    this.groupRepo = AppDataSource.getRepository(VolunteerGroup);
    this.majorRepo = AppDataSource.getRepository(VolunteerMajor);
    this.tableRepo = AppDataSource.getRepository(VolunteerTable);
  }

  /**
   * 获取用户的志愿批次列表
   */
  async getUserBatches(userId: string, year?: number) {
    const query = this.batchRepo.createQueryBuilder('batch')
      .where('batch.userId = :userId', { userId });

    if (year) {
      query.andWhere('batch.year = :year', { year });
    }

    query.orderBy('batch.year', 'DESC')
      .addOrderBy('batch.batchType', 'ASC');

    return await query.getMany();
  }

  /**
   * 获取志愿批次详情（包含所有专业组和专业）
   */
  async getBatchDetail(batchId: string) {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['user']
    });

    if (!batch) {
      throw new Error('志愿批次不存在');
    }

    const groups = await this.groupRepo.find({
      where: { batchId },
      order: { groupOrder: 'ASC' }
    });

    const groupsWithMajors = await Promise.all(
      groups.map(async (group) => {
        const majors = await this.majorRepo.find({
          where: { groupId: group.id },
          order: { majorOrder: 'ASC' }
        });
        return { ...group, majors };
      })
    );

    return {
      ...batch,
      groups: groupsWithMajors
    };
  }

  /**
   * 创建志愿批次
   * @param data.tableId - 志愿表ID（可选，不填则自动创建默认志愿表）
   */
  async createBatch(data: {
    userId: string;
    tableId?: string;
    year: number;
    batchType: string;
    province: string;
    subjectType: string;
    score: number;
    rank?: number;
  }) {
    // 验证用户是否存在
    const userRepo = AppDataSource.getRepository(User);
    const userExists = await userRepo
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId: data.userId })
      .getCount();

    if (userExists === 0) {
      throw new Error('用户不存在或未登录，请先登录后再创建志愿批次');
    }

    // ✅ 如果没有提供 tableId，自动创建或获取默认志愿表
    let tableId = data.tableId;

    if (!tableId) {
      // 检查用户是否已有当前使用的志愿表
      let table = await this.tableRepo.findOne({
        where: { userId: data.userId, isCurrent: true }
      });

      if (!table) {
        // 创建默认志愿表
        table = this.tableRepo.create({
          userId: data.userId,
          name: `${data.year}年志愿方案`,
          description: `${data.batchType}志愿填报方案`,
          isCurrent: true
        });
        await this.tableRepo.save(table);
        console.log(`✅ 自动为用户创建默认志愿表: ${table.name} (ID: ${table.id})`);
      }

      tableId = table.id;
    }

    // ✅ 创建批次时包含 tableId
    const batch = this.batchRepo.create({
      ...data,
      tableId
    });

    return await this.batchRepo.save(batch);
  }

  /**
   * 添加专业组到志愿表
   */
  async addVolunteerGroup(data: {
    batchId: string;
    groupOrder: number;
    collegeCode: string;
    collegeName: string;
    groupCode: string;
    groupName: string;
    subjectRequirement?: string;
    isObeyAdjustment?: boolean;
    admitProbability?: string;
    lastYearMinScore?: number;
    lastYearMinRank?: number;
    remarks?: string;
  }) {
    // 检查批次是否存在
    const batch = await this.batchRepo.findOne({ where: { id: data.batchId } });
    if (!batch) {
      throw new Error('志愿批次不存在');
    }

    // 检查该位置是否已有专业组
    const existing = await this.groupRepo.findOne({
      where: {
        batchId: data.batchId,
        groupOrder: data.groupOrder
      }
    });

    if (existing) {
      throw new Error(`第${data.groupOrder}个专业组位置已被占用`);
    }

    // 检查专业组数量是否超过40
    const count = await this.groupRepo.count({ where: { batchId: data.batchId } });
    if (count >= 40) {
      throw new Error('专业组数量已达上限（40个）');
    }

    const group = this.groupRepo.create(data);
    return await this.groupRepo.save(group);
  }

  /**
   * 添加专业到专业组
   */
  async addVolunteerMajor(data: {
    groupId: string;
    majorOrder: number;
    majorCode: string;
    majorName: string;
    majorDirection?: string;
    planCount?: number;
    tuitionFee?: number;
    duration?: number;
    remarks?: string;
  }) {
    // 检查专业组是否存在
    const group = await this.groupRepo.findOne({ where: { id: data.groupId } });
    if (!group) {
      throw new Error('专业组不存在');
    }

    // 检查该位置是否已有专业
    const existing = await this.majorRepo.findOne({
      where: {
        groupId: data.groupId,
        majorOrder: data.majorOrder
      }
    });

    if (existing) {
      throw new Error(`第${data.majorOrder}个专业位置已被占用`);
    }

    // 检查专业数量是否超过6
    const count = await this.majorRepo.count({ where: { groupId: data.groupId } });
    if (count >= 6) {
      throw new Error('专业数量已达上限（6个）');
    }

    const major = this.majorRepo.create(data);
    return await this.majorRepo.save(major);
  }

  /**
   * 删除专业组
   */
  async deleteVolunteerGroup(groupId: string) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new Error('专业组不存在');
    }

    // 删除专业组会级联删除其下的专业
    await this.groupRepo.remove(group);
  }

  /**
   * 删除专业
   */
  async deleteVolunteerMajor(majorId: string) {
    const major = await this.majorRepo.findOne({ where: { id: majorId } });
    if (!major) {
      throw new Error('专业不存在');
    }

    await this.majorRepo.remove(major);
  }

  /**
   * 调整专业组顺序
   */
  async reorderVolunteerGroup(groupId: string, newOrder: number) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new Error('专业组不存在');
    }

    if (newOrder < 1 || newOrder > 40) {
      throw new Error('专业组顺序必须在1-40之间');
    }

    const oldOrder = group.groupOrder;

    // 查找目标位置的专业组
    const targetGroup = await this.groupRepo.findOne({
      where: {
        batchId: group.batchId,
        groupOrder: newOrder
      }
    });

    // 如果目标位置有专业组，交换位置
    if (targetGroup) {
      targetGroup.groupOrder = oldOrder;
      await this.groupRepo.save(targetGroup);
    }

    group.groupOrder = newOrder;
    await this.groupRepo.save(group);

    return group;
  }

  /**
   * 调整专业顺序
   */
  async reorderVolunteerMajor(majorId: string, newOrder: number) {
    const major = await this.majorRepo.findOne({ where: { id: majorId } });
    if (!major) {
      throw new Error('专业不存在');
    }

    if (newOrder < 1 || newOrder > 6) {
      throw new Error('专业顺序必须在1-6之间');
    }

    const oldOrder = major.majorOrder;

    // 查找目标位置的专业
    const targetMajor = await this.majorRepo.findOne({
      where: {
        groupId: major.groupId,
        majorOrder: newOrder
      }
    });

    // 如果目标位置有专业，交换位置
    if (targetMajor) {
      targetMajor.majorOrder = oldOrder;
      await this.majorRepo.save(targetMajor);
    }

    major.majorOrder = newOrder;
    await this.majorRepo.save(major);

    return major;
  }

  /**
   * 更新专业组信息
   */
  async updateVolunteerGroup(groupId: string, data: Partial<VolunteerGroup>) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) {
      throw new Error('专业组不存在');
    }

    Object.assign(group, data);
    return await this.groupRepo.save(group);
  }

  /**
   * 更新专业信息
   */
  async updateVolunteerMajor(majorId: string, data: Partial<VolunteerMajor>) {
    const major = await this.majorRepo.findOne({ where: { id: majorId } });
    if (!major) {
      throw new Error('专业不存在');
    }

    Object.assign(major, data);
    return await this.majorRepo.save(major);
  }

  /**
   * 提交志愿表
   */
  async submitBatch(batchId: string) {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new Error('志愿批次不存在');
    }

    batch.status = 'submitted';
    batch.submittedAt = new Date();
    return await this.batchRepo.save(batch);
  }

  /**
   * 清空志愿表
   */
  async clearBatch(batchId: string) {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new Error('志愿批次不存在');
    }

    // 删除所有专业组（会级联删除专业）
    await this.groupRepo.delete({ batchId });

    return { success: true, message: '志愿表已清空' };
  }

  /**
   * 批量导入志愿（从推荐结果导入）
   */
  async batchImportVolunteers(batchId: string, groups: Array<{
    groupOrder: number;
    collegeCode: string;
    collegeName: string;
    groupCode: string;
    groupName: string;
    isObeyAdjustment: boolean;
    admitProbability?: string;
    majors: Array<{
      majorOrder: number;
      majorCode: string;
      majorName: string;
      majorDirection?: string;
    }>;
  }>) {
    const batch = await this.batchRepo.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new Error('志愿批次不存在');
    }

    const savedGroups = [];

    for (const groupData of groups) {
      const { majors, ...groupInfo } = groupData;

      const group = await this.addVolunteerGroup({
        batchId,
        ...groupInfo
      });

      const savedMajors = [];
      for (const majorData of majors) {
        const major = await this.addVolunteerMajor({
          groupId: group.id,
          ...majorData
        });
        savedMajors.push(major);
      }

      savedGroups.push({ ...group, majors: savedMajors });
    }

    return {
      success: true,
      message: `成功导入${savedGroups.length}个专业组`,
      groups: savedGroups
    };
  }
}
