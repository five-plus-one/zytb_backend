/**
 * 查看前20条到底是什么
 */

import { AppDataSource } from './src/config/database';
import { MajorFilterService } from './src/services/majorFilter.service';

async function checkFirst20() {
  await AppDataSource.initialize();

  console.log('=== 检查返回的前20条记录 ===\n');

  const service = new MajorFilterService();

  const result = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 633,
    scoreRange: 50,
    collegeProvince: '江苏',
    pageNum: 1,
    pageSize: 20
  });

  console.log(`总记录: ${result.total}`);
  console.log(`返回: ${result.list.length}\n`);

  console.log('前20条记录:');
  result.list.forEach((p, i) => {
    const tags = [];
    if (p.collegeIs985) tags.push('985');
    if (p.collegeIs211) tags.push('211');
    const tagStr = tags.length > 0 ? ` [${tags.join(',')}]` : '';
    const historyInfo = p.historicalScores && p.historicalScores.length > 0
      ? ` (有历史数据: ${p.historicalScores[0].minScore}分)`
      : ' (无历史数据)';
    console.log(`  ${i+1}. ${p.collegeName}${tagStr} - ${p.majorName}${historyInfo}`);
  });

  // 检查苏州大学在哪里
  console.log('\n\n查找苏州大学的位置...\n');

  for (let page = 1; page <= 20; page++) {
    const pageResult = await service.filterMajors({
      year: 2025,
      sourceProvince: '江苏',
      subjectType: '物理类',
      score: 633,
      scoreRange: 50,
      collegeProvince: '江苏',
      pageNum: page,
      pageSize: 20
    });

    const szdxRecords = pageResult.list.filter(p => p.collegeName.includes('苏州大学'));
    if (szdxRecords.length > 0) {
      console.log(`在第${page}页找到苏州大学！`);
      szdxRecords.forEach(p => {
        const tags = [];
        if (p.collegeIs985) tags.push('985');
        if (p.collegeIs211) tags.push('211');
        console.log(`  ${p.collegeName} [${tags.join(',')}] - ${p.majorName}`);
      });
      break;
    }
  }

  await AppDataSource.destroy();
}

checkFirst20().catch(console.error);
