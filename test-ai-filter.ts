/**
 * 测试AI筛选功能并查找问题
 */

import { AppDataSource } from './src/config/database';
import { MajorFilterService } from './src/services/majorFilter.service';

async function testFilterWithLogs() {
  await AppDataSource.initialize();

  console.log('=== 测试AI筛选功能（带详细日志）===\n');

  const service = new MajorFilterService();

  // 测试1: 江苏省内985/211院校
  console.log('测试1: 筛选江苏省内985/211院校\n');

  const result = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 590,
    scoreRange: 30,
    collegeProvince: '江苏',
    pageNum: 1,
    pageSize: 20
  });

  console.log(`\n结果统计:`);
  console.log(`  总记录数: ${result.total}`);
  console.log(`  返回记录数: ${result.list.length}`);
  console.log(`  用户位次: ${result.userRank}`);

  if (result.list.length > 0) {
    console.log(`\n前10条记录:`);
    result.list.slice(0, 10).forEach((item: any, i: number) => {
      const tags = [];
      if ((item as any).college_is_985) tags.push('985');
      if ((item as any).college_is_211) tags.push('211');
      const tagStr = tags.length > 0 ? ` [${tags.join(',')}]` : '';
      console.log(`  ${i+1}. ${item.collegeName}${tagStr} - ${item.majorName}`);
    });
  }

  // 测试2: 直接查询数据库看985/211数据是否正确
  console.log('\n\n测试2: 直接查询985/211院校数据\n');

  const directQuery = await AppDataSource.query(`
    SELECT
      college_name,
      college_province,
      college_is_985,
      college_is_211,
      COUNT(*) as count
    FROM enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND subject_type = '物理类'
      AND college_province = '江苏'
      AND (college_is_985 = 1 OR college_is_211 = 1)
    GROUP BY college_name, college_province, college_is_985, college_is_211
    ORDER BY college_is_985 DESC, college_is_211 DESC
    LIMIT 10
  `);

  console.log(`找到 ${directQuery.length} 所985/211院校:`);
  directQuery.forEach((row: any) => {
    const tags = [];
    if (row.college_is_985) tags.push('985');
    if (row.college_is_211) tags.push('211');
    console.log(`  ${row.college_name} [${tags.join(',')}]: ${row.count}条记录`);
  });

  // 测试3: 检查筛选逻辑中的分数范围过滤
  console.log('\n\n测试3: 分析分数筛选逻辑\n');

  // 先获取未经分数筛选的结果
  const queryBuilder = AppDataSource.getRepository('EnrollmentPlan')
    .createQueryBuilder('ep')
    .where('ep.year = :year', { year: 2025 })
    .andWhere('ep.sourceProvince = :sourceProvince', { sourceProvince: '江苏' })
    .andWhere('ep.subjectType = :subjectType', { subjectType: '物理类' });

  // 获取江苏省院校列表
  const colleges = await AppDataSource.query(`
    SELECT name FROM colleges WHERE province = '江苏'
  `);
  const collegeNames = colleges.map((c: any) => c.name);

  queryBuilder.andWhere('ep.collegeName IN (:...collegeNames)', { collegeNames });

  const totalBeforeScore = await queryBuilder.getCount();
  console.log(`  分数筛选前的记录数: ${totalBeforeScore}`);

  // 检查这些记录中有多少985/211
  const elite985Before = await AppDataSource.query(`
    SELECT COUNT(*) as count
    FROM enrollment_plans
    WHERE year = 2025
      AND source_province = '江苏'
      AND subject_type = '物理类'
      AND college_name IN (?)
      AND college_is_985 = 1
  `, [collegeNames]);

  console.log(`  其中985院校记录: ${elite985Before[0].count}`);

  await AppDataSource.destroy();
}

testFilterWithLogs().catch(console.error);
