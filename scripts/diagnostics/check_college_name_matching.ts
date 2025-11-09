#!/usr/bin/env ts-node
/**
 * 院校名称匹配诊断脚本
 * 检查各层数据中院校名称的匹配情况,特别是985/211院校
 */
import { AppDataSource } from '../../src/config/database';

async function diagnoseCollegeNameMatching() {
  console.log('\n🔍 === 院校名称匹配诊断 ===\n');

  await AppDataSource.initialize();

  // 1. 检查顶尖院校在各表中的名称
  console.log('📊 检查985院校在各表中的存在情况:\n');

  const top985 = ['清华大学', '北京大学', '南京大学', '东南大学', '复旦大学', '浙江大学', '上海交通大学', '中国科学技术大学'];

  for (const collegeName of top985) {
    console.log(`\n🏛️  ${collegeName}:`);

    // 在colleges表中
    const inColleges = await AppDataSource.query(`
      SELECT id, name, code FROM colleges WHERE name LIKE ?
    `, [`%${collegeName}%`]);
    console.log(`  colleges表: ${inColleges.length > 0 ? '✅ ' + inColleges[0].name : '❌ 不存在'}`);

    // 在core_colleges表中
    const inCoreColleges = await AppDataSource.query(`
      SELECT id, name, code FROM core_colleges WHERE name LIKE ?
    `, [`%${collegeName}%`]);
    console.log(`  core_colleges表: ${inCoreColleges.length > 0 ? '✅ ' + inCoreColleges[0].name : '❌ 不存在'}`);

    // 在admission_scores表中
    const inAdmissionScores = await AppDataSource.query(`
      SELECT DISTINCT college_name, COUNT(*) as cnt FROM admission_scores WHERE college_name LIKE ? GROUP BY college_name
    `, [`%${collegeName}%`]);
    console.log(`  admission_scores表: ${inAdmissionScores.length > 0 ? '✅ ' + inAdmissionScores[0].college_name + ` (${inAdmissionScores[0].cnt}条)` : '❌ 不存在'}`);

    // 在core_admission_scores表中
    const inCoreAdmissionScores = await AppDataSource.query(`
      SELECT DISTINCT college_name, COUNT(*) as cnt FROM core_admission_scores WHERE college_name LIKE ? GROUP BY college_name
    `, [`%${collegeName}%`]);
    console.log(`  core_admission_scores表: ${inCoreAdmissionScores.length > 0 ? '✅ ' + inCoreAdmissionScores[0].college_name + ` (${inCoreAdmissionScores[0].cnt}条)` : '❌ 不存在'}`);
  }

  // 2. 检查数据源情况
  console.log('\n\n📈 数据源统计:\n');

  const admissionSourceProvinces = await AppDataSource.query(`
    SELECT DISTINCT source_province FROM admission_scores
  `);
  console.log(`admission_scores 源省份: ${admissionSourceProvinces.map((r: any) => r.source_province).join(', ')}`);

  const admissionYears = await AppDataSource.query(`
    SELECT DISTINCT year FROM admission_scores ORDER BY year DESC
  `);
  console.log(`admission_scores 年份: ${admissionYears.map((r: any) => r.year).join(', ')}`);

  const coreSourceProvinces = await AppDataSource.query(`
    SELECT DISTINCT source_province FROM core_admission_scores
  `);
  console.log(`core_admission_scores 源省份: ${coreSourceProvinces.map((r: any) => r.source_province).join(', ')}`);

  const coreYears = await AppDataSource.query(`
    SELECT DISTINCT year FROM core_admission_scores ORDER BY year DESC
  `);
  console.log(`core_admission_scores 年份: ${coreYears.map((r: any) => r.year).join(', ')}`);

  // 3. 检查名称映射表
  console.log('\n\n🗺️  名称映射表情况:\n');

  const mappingCount = await AppDataSource.query(`
    SELECT COUNT(*) as cnt FROM entity_college_name_mappings
  `);
  console.log(`entity_college_name_mappings 记录数: ${mappingCount[0].cnt}`);

  if (mappingCount[0].cnt > 0) {
    const sampleMappings = await AppDataSource.query(`
      SELECT * FROM entity_college_name_mappings LIMIT 5
    `);
    console.log('\n示例映射:');
    sampleMappings.forEach((m: any) => {
      console.log(`  ${m.raw_name} → ${m.standard_name} (source: ${m.source_table})`);
    });
  }

  // 4. 检查colleges表中的数据完整性
  console.log('\n\n📊 colleges表数据完整性:\n');

  const collegeDataCompleteness = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN female_ratio IS NOT NULL THEN 1 ELSE 0 END) as has_gender,
      SUM(CASE WHEN postgraduate_rate IS NOT NULL THEN 1 ELSE 0 END) as has_postgrad,
      SUM(CASE WHEN \`rank\` IS NOT NULL THEN 1 ELSE 0 END) as has_rank,
      SUM(CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END) as has_description,
      SUM(CASE WHEN key_discipline_count IS NOT NULL THEN 1 ELSE 0 END) as has_discipline_count
    FROM colleges
  `);

  const stats = collegeDataCompleteness[0];
  console.log(`总院校数: ${stats.total}`);
  console.log(`男女比例完整度: ${(stats.has_gender / stats.total * 100).toFixed(1)}%`);
  console.log(`保研率完整度: ${(stats.has_postgrad / stats.total * 100).toFixed(1)}%`);
  console.log(`排名完整度: ${(stats.has_rank / stats.total * 100).toFixed(1)}%`);
  console.log(`描述完整度: ${(stats.has_description / stats.total * 100).toFixed(1)}%`);
  console.log(`重点学科数完整度: ${(stats.has_discipline_count / stats.total * 100).toFixed(1)}%`);

  // 5. 检查campus_life数据关联
  console.log('\n\n🏕️  校园生活数据关联情况:\n');

  const campusLifeStats = await AppDataSource.query(`
    SELECT COUNT(*) as cnt FROM college_campus_life
  `);
  console.log(`college_campus_life 总记录数: ${campusLifeStats[0].cnt}`);

  const coreCampusLifeStats = await AppDataSource.query(`
    SELECT COUNT(*) as cnt FROM core_campus_life
  `);
  console.log(`core_campus_life 总记录数: ${coreCampusLifeStats[0].cnt}`);

  // 检查985院校的校园生活数据
  const top985CampusLife = await AppDataSource.query(`
    SELECT
      c.name,
      CASE WHEN ccl.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_campus_life
    FROM colleges c
    LEFT JOIN college_campus_life ccl ON c.id = ccl.college_id
    WHERE c.is_985 = 1
    ORDER BY c.name
    LIMIT 10
  `);

  console.log('\n985院校校园生活数据(前10):');
  top985CampusLife.forEach((r: any) => {
    console.log(`  ${r.name}: ${r.has_campus_life === 'YES' ? '✅' : '❌'}`);
  });

  await AppDataSource.destroy();

  console.log('\n✅ 诊断完成\n');
}

diagnoseCollegeNameMatching().catch(console.error);
