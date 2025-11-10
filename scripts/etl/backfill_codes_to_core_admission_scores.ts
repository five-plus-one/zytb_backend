import { AppDataSource } from '../../src/config/database';

/**
 * 从 admission_scores 表回填 college_code 和 major_group_code 到 core_admission_scores
 */
async function backfillCodes() {
  console.log('🔄 === 回填 college_code 和 major_group_code ===\n');

  try {
    await AppDataSource.initialize();

    // 1. 检查当前状态
    console.log('1️⃣ 检查当前状态...');
    const beforeStats = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_code) as with_college_code,
        COUNT(major_group_code) as with_group_code
      FROM core_admission_scores
    `);
    console.log(`   总记录: ${beforeStats[0].total}`);
    console.log(`   有 college_code: ${beforeStats[0].with_college_code}`);
    console.log(`   有 major_group_code: ${beforeStats[0].with_group_code}\n`);

    // 2. 执行更新（基于院校名称、年份、专业名称、科类匹配）
    // 注意：两个表的 subject_type 格式不同！
    // admission_scores: "物理类", "历史类"
    // core_admission_scores: "physics", "history"
    console.log('2️⃣ 开始更新 college_code...');
    const updateCollegeCodeResult = await AppDataSource.query(`
      UPDATE core_admission_scores cas
      INNER JOIN admission_scores as_old ON
        cas.college_name COLLATE utf8mb4_unicode_ci = as_old.college_name COLLATE utf8mb4_unicode_ci
        AND cas.year = as_old.year
        AND (
          (cas.subject_type = 'physics' AND as_old.subject_type = '物理类')
          OR (cas.subject_type = 'history' AND as_old.subject_type = '历史类')
        )
        AND (cas.major_name COLLATE utf8mb4_unicode_ci = as_old.major_name COLLATE utf8mb4_unicode_ci
             OR (cas.major_name IS NULL AND as_old.major_name IS NULL))
      SET cas.college_code = as_old.college_code
      WHERE as_old.college_code IS NOT NULL
    `);
    console.log(`   ✅ 更新了 ${updateCollegeCodeResult.affectedRows} 条记录\n`);

    // 3. 执行更新 major_group_code (从 group_code)
    console.log('3️⃣ 开始更新 major_group_code...');
    const updateGroupCodeResult = await AppDataSource.query(`
      UPDATE core_admission_scores cas
      INNER JOIN admission_scores as_old ON
        cas.college_name COLLATE utf8mb4_unicode_ci = as_old.college_name COLLATE utf8mb4_unicode_ci
        AND cas.year = as_old.year
        AND (
          (cas.subject_type = 'physics' AND as_old.subject_type = '物理类')
          OR (cas.subject_type = 'history' AND as_old.subject_type = '历史类')
        )
        AND (cas.major_name COLLATE utf8mb4_unicode_ci = as_old.major_name COLLATE utf8mb4_unicode_ci
             OR (cas.major_name IS NULL AND as_old.major_name IS NULL))
      SET cas.major_group_code = as_old.group_code,
          cas.major_group_name = as_old.group_name
      WHERE as_old.group_code IS NOT NULL
    `);
    console.log(`   ✅ 更新了 ${updateGroupCodeResult.affectedRows} 条记录\n`);

    // 4. 检查更新后状态
    console.log('4️⃣ 检查更新后状态...');
    const afterStats = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_code) as with_college_code,
        COUNT(major_group_code) as with_group_code
      FROM core_admission_scores
    `);
    console.log(`   总记录: ${afterStats[0].total}`);
    console.log(`   有 college_code: ${afterStats[0].with_college_code} (+${afterStats[0].with_college_code - beforeStats[0].with_college_code})`);
    console.log(`   有 major_group_code: ${afterStats[0].with_group_code} (+${afterStats[0].with_group_code - beforeStats[0].with_group_code})\n`);

    // 5. 查看样例数据
    console.log('5️⃣ 查看江苏样例数据...');
    const samples = await AppDataSource.query(`
      SELECT college_name, year, subject_type, college_code, major_group_code, major_group_name
      FROM core_admission_scores
      WHERE source_province = '江苏' AND college_code IS NOT NULL
      LIMIT 5
    `);

    console.log('江苏省样例 (前5条):');
    samples.forEach((s: any, i: number) => {
      console.log(`\n${i + 1}. ${s.college_name} (${s.year}年)`);
      console.log(`   subject_type: ${s.subject_type}`);
      console.log(`   college_code: ${s.college_code}`);
      console.log(`   major_group_code: ${s.major_group_code || 'NULL'}`);
      console.log(`   major_group_name: ${s.major_group_name || 'NULL'}`);
    });

    console.log('\n\n✅ 回填完成！');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ 回填失败:', error);
    process.exit(1);
  }
}

backfillCodes();
