/**
 * 测试修复后的筛选逻辑
 */

import { MajorFilterService } from './src/services/majorFilter.service';
import { AppDataSource } from './src/config/database';

async function testFilter() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const service = new MajorFilterService();

    // 测试1：江苏省内院校筛选
    console.log('=== 测试1：筛选江苏省内院校（不限专业） ===');
    const result1 = await service.filterMajors({
      year: 2025,
      sourceProvince: '江苏',
      subjectType: '物理类',
      score: 590,
      scoreRange: 30,
      collegeProvince: '江苏', // 关键参数
      pageNum: 1,
      pageSize: 10
    });

    console.log(`用户位次: ${result1.userRank}`);
    console.log(`找到 ${result1.list.length} 个专业`);
    console.log('前10个专业:');
    result1.list.forEach((p, i) => {
      console.log(`${i+1}. ${p.collegeName} - ${p.majorName}`);
      if (p.historicalScores && p.historicalScores.length > 0) {
        console.log(`   2024年最低分: ${p.historicalScores[0].minScore}`);
      }
    });

    // 测试2：江苏省内+专业方向筛选
    console.log('\n=== 测试2：筛选江苏省内的"软件"相关专业 ===');
    const result2 = await service.filterMajors({
      year: 2025,
      sourceProvince: '江苏',
      subjectType: '物理类',
      score: 590,
      scoreRange: 30,
      collegeProvince: '江苏',
      majorDirection: '软件',
      pageNum: 1,
      pageSize: 10
    });

    console.log(`找到 ${result2.list.length} 个软件相关专业`);
    result2.list.forEach((p, i) => {
      console.log(`${i+1}. ${p.collegeName} - ${p.majorName}`);
    });

    // 测试3：不限省份，查找"电子"相关专业
    console.log('\n=== 测试3：不限省份，查找"电子"相关专业 ===');
    const result3 = await service.filterMajors({
      year: 2025,
      sourceProvince: '江苏',
      subjectType: '物理类',
      score: 590,
      scoreRange: 30,
      majorDirection: '电子',
      pageNum: 1,
      pageSize: 10
    });

    console.log(`找到 ${result3.list.length} 个电子相关专业`);
    result3.list.forEach((p, i) => {
      console.log(`${i+1}. ${p.collegeName} - ${p.majorName}`);
    });

    console.log('\n✅ 测试完成');
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
    console.error(error.stack);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

testFilter();
