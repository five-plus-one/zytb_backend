import 'reflect-metadata';
import { AppDataSource } from '../../src/config/database';
import { VolunteerGroup } from '../../src/models/VolunteerNew';
import { VolunteerBatch } from '../../src/models/VolunteerNew';
import { AdmissionScore } from '../../src/models/AdmissionScore';
import { AdmissionProbabilityService, GroupHistoricalData } from '../../src/services/admissionProbability.service';

/**
 * 重新计算所有现有志愿组的冲稳保分类
 *
 * 背景：旧版本使用简化算法存储了错误的冲稳保分类
 * 目标：使用统一的AdmissionProbabilityService重新计算并更新
 */

async function recalculateVolunteerGroupCategories() {
  console.log('🔄 开始重新计算志愿组的冲稳保分类...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const groupRepo = AppDataSource.getRepository(VolunteerGroup);
    const batchRepo = AppDataSource.getRepository(VolunteerBatch);
    const scoreRepo = AppDataSource.getRepository(AdmissionScore);
    const probabilityService = new AdmissionProbabilityService();

    // 获取所有志愿组
    const allGroups = await groupRepo.find({
      relations: ['batch']
    });

    console.log(`📊 找到 ${allGroups.length} 个志愿组需要重新计算\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const group of allGroups) {
      try {
        console.log(`\n处理: ${group.collegeName} ${group.groupCode}`);
        console.log(`  当前分类: ${group.admitProbability || '未知'}`);

        // 获取批次信息
        const batch = await batchRepo.findOne({
          where: { id: group.batchId }
        });

        if (!batch) {
          console.log(`  ⚠️  跳过：找不到批次信息`);
          skipCount++;
          continue;
        }

        if (!batch.score || batch.score === 0 || !batch.rank || batch.rank === 0) {
          console.log(`  ⚠️  跳过：批次缺少分数或位次 (score=${batch.score}, rank=${batch.rank})`);
          skipCount++;
          continue;
        }

        // 查询该专业组的历史分数（近3年）
        const historicalScores = await scoreRepo.find({
          where: {
            collegeCode: group.collegeCode,
            groupCode: group.groupCode,
            sourceProvince: batch.province,
            subjectType: batch.subjectType
          },
          order: { year: 'DESC' },
          take: 3
        });

        if (historicalScores.length === 0) {
          console.log(`  ⚠️  跳过：没有历史分数数据`);
          skipCount++;
          continue;
        }

        // 构建历史数据
        const groupHistory: GroupHistoricalData[] = historicalScores.map(score => ({
          year: score.year,
          minScore: score.minScore || 0,
          avgScore: score.avgScore,
          maxScore: score.maxScore,
          minRank: score.minRank || 0,
          maxRank: score.maxRank,
          planCount: score.planCount || 0
        }));

        // 使用统一的概率服务计算
        const result = probabilityService.calculateForGroup(
          batch.score,
          batch.rank,
          groupHistory
        );

        let newCategory: string;
        if (result.riskLevel === '冲') {
          newCategory = '冲';
        } else if (result.riskLevel === '保') {
          newCategory = '保';
        } else {
          newCategory = '稳';
        }

        console.log(`  📊 重新计算: probability=${result.probability}%, riskLevel=${result.riskLevel}`);
        console.log(`  ✏️  更新分类: ${group.admitProbability || '未知'} → ${newCategory}`);

        // 更新数据库
        await groupRepo.update(
          { id: group.id },
          { admitProbability: newCategory }
        );

        successCount++;

      } catch (error: any) {
        console.error(`  ❌ 错误: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n\n========================================');
    console.log('📊 重新计算完成统计:');
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ⚠️  跳过: ${skipCount}`);
    console.log(`  ❌ 失败: ${errorCount}`);
    console.log(`  📈 总计: ${allGroups.length}`);
    console.log('========================================\n');

  } catch (error: any) {
    console.error('❌ 脚本执行失败:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('✅ 数据库连接已关闭');
  }
}

// 执行脚本
recalculateVolunteerGroupCategories()
  .then(() => {
    console.log('\n✅ 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  });
