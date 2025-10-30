/**
 * 查看分页后的前20所院校是哪些
 */

import { AppDataSource } from './src/config/database';
import { MajorFilterService } from './src/services/majorFilter.service';

async function checkPaginationResults() {
  await AppDataSource.initialize();

  console.log('=== 查看分页结果中的院校 ===\n');

  const service = new MajorFilterService();

  const result = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 590,
    scoreRange: 200,
    collegeProvince: '江苏',
    pageNum: 1,
    pageSize: 20
  });

  console.log(`\n总共${result.total}条记录`);
  console.log(`返回${result.list.length}条\n`);

  console.log('前20条记录:');
  result.list.forEach((item, i) => {
    const tags = [];
    if (item.collegeIs985) tags.push('985');
    if (item.collegeIs211) tags.push('211');
    const tagStr = tags.length > 0 ? ` [${tags.join(',')}]` : '';
    console.log(`  ${i+1}. ${item.collegeName}${tagStr} - ${item.majorName}`);
  });

  // 查看985/211院校在第几页
  console.log('\n\n查找985/211院校位置:');

  for (let page = 1; page <= 10; page++) {
    const pageResult = await service.filterMajors({
      year: 2025,
      sourceProvince: '江苏',
      subjectType: '物理类',
      score: 590,
      scoreRange: 200,
      collegeProvince: '江苏',
      pageNum: page,
      pageSize: 20
    });

    const has985 = pageResult.list.filter(item => item.collegeIs985).length;
    const has211 = pageResult.list.filter(item => item.collegeIs211).length;

    if (has985 > 0 || has211 > 0) {
      console.log(`\n第${page}页: 找到 ${has985} 条985记录, ${has211} 条211记录`);
      pageResult.list
        .filter(item => item.collegeIs985 || item.collegeIs211)
        .forEach((item, i) => {
          const tags = [];
          if (item.collegeIs985) tags.push('985');
          if (item.collegeIs211) tags.push('211');
          console.log(`  ${item.collegeName} [${tags.join(',')}] - ${item.majorName}`);
        });
      break;
    }
  }

  await AppDataSource.destroy();
}

checkPaginationResults().catch(console.error);
