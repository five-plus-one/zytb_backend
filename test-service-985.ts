/**
 * 测试MajorFilterService能否返回985/211院校
 */

import { AppDataSource } from './src/config/database';
import { MajorFilterService } from './src/services/majorFilter.service';

async function testService() {
  await AppDataSource.initialize();

  console.log('=== 测试MajorFilterService ===\n');

  const service = new MajorFilterService();

  // 测试1: 查询江苏省内所有院校，分数590，范围200
  console.log('测试1: 查询江苏省内所有院校 (score=590, range=200, pageSize=100)\n');

  const result1 = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 590,
    scoreRange: 200,
    collegeProvince: '江苏',
    pageNum: 1,
    pageSize: 100
  });

  console.log(`总记录数: ${result1.total}`);
  console.log(`返回记录数: ${result1.list.length}`);

  const count985 = result1.list.filter(p => p.collegeIs985).length;
  const count211 = result1.list.filter(p => p.collegeIs211).length;

  console.log(`985院校: ${count985}`);
  console.log(`211院校: ${count211}`);

  if (count985 > 0 || count211 > 0) {
    console.log('\n✅ 找到985/211院校！');
    console.log('\n前10个985/211专业:');
    result1.list
      .filter(p => p.collegeIs985 || p.collegeIs211)
      .slice(0, 10)
      .forEach((p, i) => {
        const tags = [];
        if (p.collegeIs985) tags.push('985');
        if (p.collegeIs211) tags.push('211');
        console.log(`  ${i+1}. ${p.collegeName} [${tags.join(',')}] - ${p.majorName}`);
      });
  } else {
    console.log('\n❌ 未找到985/211院校！');
    console.log('\n返回的院校列表（前10个）:');
    result1.list.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i+1}. ${p.collegeName} - ${p.majorName} (985=${p.collegeIs985}, 211=${p.collegeIs211})`);
    });
  }

  // 测试2: 查询更多页
  console.log('\n\n测试2: 查询第2页\n');

  const result2 = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 590,
    scoreRange: 200,
    collegeProvince: '江苏',
    pageNum: 2,
    pageSize: 100
  });

  const count985_p2 = result2.list.filter(p => p.collegeIs985).length;
  const count211_p2 = result2.list.filter(p => p.collegeIs211).length;

  console.log(`第2页 - 985院校: ${count985_p2}, 211院校: ${count211_p2}`);

  if (count985_p2 > 0 || count211_p2 > 0) {
    console.log('\n✅ 第2页找到985/211院校！');
    result2.list
      .filter(p => p.collegeIs985 || p.collegeIs211)
      .slice(0, 5)
      .forEach((p, i) => {
        const tags = [];
        if (p.collegeIs985) tags.push('985');
        if (p.collegeIs211) tags.push('211');
        console.log(`  ${i+1}. ${p.collegeName} [${tags.join(',')}] - ${p.majorName}`);
      });
  }

  await AppDataSource.destroy();
}

testService().catch(console.error);
