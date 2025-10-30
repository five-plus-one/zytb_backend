/**
 * 测试修复后的985/211筛选功能
 */

import { AppDataSource } from './src/config/database';
import { MajorFilterService } from './src/services/majorFilter.service';

async function testFix() {
  await AppDataSource.initialize();

  console.log('=== 测试修复后的筛选功能 ===\n');

  const service = new MajorFilterService();

  const result = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 590,
    scoreRange: 30,
    collegeProvince: '江苏',
    pageNum: 1,
    pageSize: 10
  });

  console.log(`总记录数: ${result.total}`);
  console.log(`返回记录数: ${result.list.length}`);
  console.log(`用户位次: ${result.userRank}\n`);

  console.log('前10条记录（包含985/211标记）:');
  result.list.forEach((item, i) => {
    const tags = [];
    if (item.collegeIs985) tags.push('985');
    if (item.collegeIs211) tags.push('211');
    const tagStr = tags.length > 0 ? ` [${tags.join(',')}]` : '';
    console.log(`  ${i+1}. ${item.collegeName}${tagStr} (${item.collegeProvince || '?'} ${item.collegeCity || '?'}) - ${item.majorName}`);
  });

  const has985 = result.list.filter(item => item.collegeIs985).length;
  const has211 = result.list.filter(item => item.collegeIs211).length;

  console.log(`\n✅ 985院校记录: ${has985}`);
  console.log(`✅ 211院校记录: ${has211}`);

  await AppDataSource.destroy();
}

testFix().catch(console.error);
