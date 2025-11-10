import { AppDataSource } from '../../src/config/database';

async function compareTableData() {
  console.log('🔍 === 对比两个表的数据 ===\n');

  try {
    await AppDataSource.initialize();

    // 检查 admission_scores
    console.log('=== admission_scores 样例 ===');
    const oldSamples = await AppDataSource.query(`
      SELECT college_name, year, major_name, subject_type, college_code, group_code
      FROM admission_scores
      WHERE source_province = '江苏' AND college_code IS NOT NULL
      LIMIT 3
    `);

    oldSamples.forEach((s: any, i: number) => {
      console.log(`\n${i + 1}.`);
      console.log(`  college_name: "${s.college_name}"`);
      console.log(`  year: ${s.year}`);
      console.log(`  major_name: "${s.major_name}"`);
      console.log(`  subject_type: "${s.subject_type}"`);
      console.log(`  college_code: "${s.college_code}"`);
      console.log(`  group_code: "${s.group_code}"`);
    });

    // 检查 core_admission_scores
    console.log('\n\n=== core_admission_scores 样例 ===');
    const coreSamples = await AppDataSource.query(`
      SELECT college_name, year, major_name, subject_type, college_code, major_group_code
      FROM core_admission_scores
      WHERE source_province = '江苏'
      LIMIT 3
    `);

    coreSamples.forEach((s: any, i: number) => {
      console.log(`\n${i + 1}.`);
      console.log(`  college_name: "${s.college_name}"`);
      console.log(`  year: ${s.year}`);
      console.log(`  major_name: "${s.major_name}"`);
      console.log(`  subject_type: "${s.subject_type}"`);
      console.log(`  college_code: ${s.college_code}`);
      console.log(`  major_group_code: ${s.major_group_code}`);
    });

    // 查找匹配的院校
    console.log('\n\n=== 查找共同院校 ===');
    const commonColleges = await AppDataSource.query(`
      SELECT DISTINCT cas.college_name, COUNT(*) as count_core,
             (SELECT COUNT(*) FROM admission_scores WHERE college_name = cas.college_name) as count_old
      FROM core_admission_scores cas
      WHERE cas.source_province = '江苏'
      AND EXISTS (
        SELECT 1 FROM admission_scores as_old
        WHERE as_old.college_name COLLATE utf8mb4_unicode_ci = cas.college_name COLLATE utf8mb4_unicode_ci
        AND as_old.source_province = '江苏'
      )
      GROUP BY cas.college_name
      LIMIT 10
    `);

    console.log(`找到 ${commonColleges.length} 个共同院校:`);
    commonColleges.forEach((c: any) => {
      console.log(`  ${c.college_name}: core=${c.count_core}, old=${c.count_old}`);
    });

    // 检查 subject_type 值
    console.log('\n\n=== subject_type 值对比 ===');

    const oldSubjectTypes = await AppDataSource.query(`
      SELECT DISTINCT subject_type FROM admission_scores WHERE source_province = '江苏'
    `);
    console.log('admission_scores 的 subject_type:');
    oldSubjectTypes.forEach((s: any) => console.log(`  - "${s.subject_type}"`));

    const coreSubjectTypes = await AppDataSource.query(`
      SELECT DISTINCT subject_type FROM core_admission_scores WHERE source_province = '江苏'
    `);
    console.log('\ncore_admission_scores 的 subject_type:');
    coreSubjectTypes.forEach((s: any) => console.log(`  - "${s.subject_type}"`));

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ 对比失败:', error);
    process.exit(1);
  }
}

compareTableData();
