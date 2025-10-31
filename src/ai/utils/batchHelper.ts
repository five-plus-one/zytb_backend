/**
 * 志愿批次自动管理辅助工具
 */
import { VolunteerManagementService } from '../../services/volunteerManagement.service';
import { ToolExecutionContext } from '../tools/base';

export interface BatchInfo {
  batchId: string;
  year: number;
  province: string;
  subjectType: string;
  score: number;
  rank?: number;
  isNewBatch: boolean;  // 是否是新创建的批次
}

export class BatchHelper {
  private volunteerService = new VolunteerManagementService();

  /**
   * 确保用户有志愿批次,如果没有则自动创建
   * @param context 工具执行上下文,必须包含userId
   * @param batchParams 批次参数(如果需要创建新批次)
   * @returns 批次信息
   */
  async ensureBatchExists(
    context?: ToolExecutionContext,
    batchParams?: {
      year: number;
      province: string;
      subjectType: string;
      score: number;
      rank?: number;
      batchType?: string;
    }
  ): Promise<BatchInfo> {
    if (!context || !context.userId) {
      throw new Error('用户未登录，请先登录后再操作');
    }

    const userId = context.userId;

    // 1. 查询用户是否已有批次
    const currentYear = batchParams?.year || new Date().getFullYear();
    const batches = await this.volunteerService.getUserBatches(userId, currentYear);

    // 2. 如果已有批次,返回第一个(默认使用本科批次或最新的批次)
    if (batches && batches.length > 0) {
      // 优先返回本科批次
      const undergraduateBatch = batches.find(b => b.batchType === '本科批');
      const batch = undergraduateBatch || batches[0];

      return {
        batchId: batch.id,
        year: batch.year,
        province: batch.province,
        subjectType: batch.subjectType,
        score: batch.score,
        rank: batch.rank || undefined,
        isNewBatch: false
      };
    }

    // 3. 如果没有批次,且提供了参数,则创建新批次
    if (batchParams) {
      const newBatch = await this.volunteerService.createBatch({
        userId,
        year: batchParams.year,
        batchType: batchParams.batchType || '本科批',
        province: batchParams.province,
        subjectType: batchParams.subjectType,
        score: batchParams.score,
        rank: batchParams.rank
      });

      return {
        batchId: newBatch.id,
        year: newBatch.year,
        province: newBatch.province,
        subjectType: newBatch.subjectType,
        score: newBatch.score,
        rank: newBatch.rank || undefined,
        isNewBatch: true
      };
    }

    // 4. 如果没有批次且没有提供参数,抛出错误引导用户
    throw new Error(
      '您还没有创建志愿批次。请先告诉我您的基本信息（年份、省份、科类、分数、位次），我会为您自动创建批次。' +
      '\n例如："我是2025年江苏物理类考生，分数600分，位次5000"'
    );
  }

  /**
   * 从用户消息或context中提取批次参数
   * 这个方法可以在未来扩展,从对话历史中提取用户的分数、省份等信息
   */
  async extractBatchParamsFromContext(
    context?: ToolExecutionContext
  ): Promise<{
    year: number;
    province: string;
    subjectType: string;
    score: number;
    rank?: number;
  } | null> {
    // TODO: 未来可以从conversation history中提取用户信息
    // 目前返回null,要求工具显式传递参数
    return null;
  }
}
