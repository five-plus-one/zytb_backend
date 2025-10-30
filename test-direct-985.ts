/**
 * 简化测试：直接筛选985/211院校，不用查询所有院校
 */

import { AppDataSource } from './src/config/database';
import { MajorFilterService } from './src/services/majorFilter.service';

async function testDirect985() {
  await AppDataSource.initialize();

  console.log('=== 测试直接筛选985/211院校 ===\n');

  const service = new MajorFilterService();

  // 修改筛选条件，只查询是985或211的院校
  const result = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 590,
    scoreRange: 200,
    collegeName: '南京大学',  // 指定院校名
    pageSize: 10
  });

  console.log(`\n找到南京大学: ${result.total} 条记录`);
  console.log(`返回: ${result.list.length} 条\n`);

  result.list.forEach((item, i) => {
    const tags = [];
    if (item.collegeIs985) tags.push('985');
    if (item.collegeIs211) tags.push('211');
    console.log(`  ${i+1}. ${item.collegeName} [${tags.join(',')}] - ${item.majorName}`);
  });

  // 测试东南大学
  const result2 = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 590,
    scoreRange: 200,
    collegeName: '东南大学',
    pageSize: 10
  });

  console.log(`\n找到东南大学: ${result2.total} 条记录`);
  console.log(`返回: ${result2.list.length} 条\n`);

  result2.list.forEach((item, i) => {
    const tags = [];
    if (item.collegeIs985) tags.push('985');
    if (item.collegeIs211) tags.push('211');
    console.log(`  ${i+1}. ${item.collegeName} [${tags.join(',')}] - ${item.majorName}`);
  });

  await AppDataSource.destroy();
}

testDirect985().catch(console.error);
