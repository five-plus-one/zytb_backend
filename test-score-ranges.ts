/**
 * 测试不同scoreRange对985/211院校查询的影响
 */

import { AppDataSource } from './src/config/database';
import { MajorFilterService } from './src/services/majorFilter.service';

async function testScoreRanges() {
  await AppDataSource.initialize();

  console.log('=== 模拟AI查询：江苏省内985/211院校 ===\n');

  const service = new MajorFilterService();

  // 测试不同的scoreRange
  const testCases = [
    { name: 'scoreRange=30（默认）', scoreRange: 30 },
    { name: 'scoreRange=50（推荐）', scoreRange: 50 },
    { name: 'scoreRange=80（扩大）', scoreRange: 80 },
    { name: 'scoreRange=200（不限）', scoreRange: 200 }
  ];

  for (const test of testCases) {
    console.log(`\n${test.name}:`);

    const result = await service.filterMajors({
      year: 2025,
      sourceProvince: '江苏',
      subjectType: '物理类',
      score: 590,
      scoreRange: test.scoreRange,
      collegeProvince: '江苏',
      pageSize: 20
    });

    const has985 = result.list.filter(item => item.collegeIs985).length;
    const has211 = result.list.filter(item => item.collegeIs211).length;

    console.log(`  总记录: ${result.total}`);
    console.log(`  返回: ${result.list.length}`);
    console.log(`  985院校: ${has985}`);
    console.log(`  211院校: ${has211}`);

    if (has985 > 0 || has211 > 0) {
      console.log('  前5所985/211院校:');
      result.list
        .filter(item => item.collegeIs985 || item.collegeIs211)
        .slice(0, 5)
        .forEach((item, i) => {
          const tags = [];
          if (item.collegeIs985) tags.push('985');
          if (item.collegeIs211) tags.push('211');
          console.log(`    ${i + 1}. ${item.collegeName} [${tags.join(',')}] - ${item.majorName}`);
        });
    } else {
      console.log('  ❌ 未找到985/211院校');
    }
  }

  await AppDataSource.destroy();
}

testScoreRanges().catch(console.error);
