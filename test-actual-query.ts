/**
 * 用实际的AI查询参数测试
 */

import { AppDataSource } from './src/config/database';
import { MajorFilterService } from './src/services/majorFilter.service';

async function testActualQuery() {
  await AppDataSource.initialize();

  console.log('=== 使用AI实际参数测试 ===\n');

  const service = new MajorFilterService();

  // AI第一次查询的参数
  console.log('测试1: score=633, scoreRange=50\n');

  const result1 = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 633,
    scoreRange: 50,
    collegeProvince: '江苏',
    pageNum: 1,
    pageSize: 20
  });

  console.log(`总记录: ${result1.total}`);
  console.log(`返回: ${result1.list.length}`);

  const count985_1 = result1.list.filter(p => p.collegeIs985).length;
  const count211_1 = result1.list.filter(p => p.collegeIs211).length;

  console.log(`985院校: ${count985_1}`);
  console.log(`211院校: ${count211_1}`);

  if (count985_1 === 0 && count211_1 === 0) {
    console.log('\n❌ 第一次查询未找到985/211\n');
    console.log('返回的院校:');
    result1.list.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i+1}. ${p.collegeName} - ${p.majorName}`);
    });
  }

  // AI第二次查询
  console.log('\n\n测试2: score=633, scoreRange=100\n');

  const result2 = await service.filterMajors({
    year: 2025,
    sourceProvince: '江苏',
    subjectType: '物理类',
    score: 633,
    scoreRange: 100,
    collegeProvince: '江苏',
    pageNum: 1,
    pageSize: 20
  });

  console.log(`总记录: ${result2.total}`);
  console.log(`返回: ${result2.list.length}`);

  const count985_2 = result2.list.filter(p => p.collegeIs985).length;
  const count211_2 = result2.list.filter(p => p.collegeIs211).length;

  console.log(`985院校: ${count985_2}`);
  console.log(`211院校: ${count211_2}`);

  if (count985_2 === 0 && count211_2 === 0) {
    console.log('\n❌ 第二次查询未找到985/211\n');
  }

  // 测试3: 看看985/211院校的历史分数到底是多少
  console.log('\n\n测试3: 检查985/211院校的实际历史分数\n');

  const check985 = await AppDataSource.query(`
    SELECT
      ep.college_name,
      ep.major_name,
      aso.year,
      aso.min_score,
      ABS(aso.min_score - 633) as score_diff
    FROM enrollment_plans ep
    LEFT JOIN admission_scores aso ON
      ep.source_province = aso.source_province AND
      ep.college_name = aso.college_name AND
      ep.major_name = aso.major_name AND
      ep.subject_type = aso.subject_type AND
      aso.year < 2025
    WHERE ep.year = 2025
      AND ep.source_province = '江苏'
      AND ep.subject_type = '物理类'
      AND ep.college_province = '江苏'
      AND (ep.college_is_985 = 1 OR ep.college_is_211 = 1)
      AND aso.min_score IS NOT NULL
    ORDER BY score_diff ASC
    LIMIT 20
  `);

  console.log('985/211院校历史分数（最接近633分的20个）:');
  check985.forEach((row: any) => {
    console.log(`  ${row.college_name} - ${row.major_name} (${row.year}年): 最低分=${row.min_score}, 分差=${row.score_diff}`);
  });

  await AppDataSource.destroy();
}

testActualQuery().catch(console.error);
