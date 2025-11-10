import { AppDataSource } from '../../src/config/database';

/**
 * 从 enrollment_plans 表回填 college_code 和 major_group_code 到 core_enrollment_plans
 */
async function backfillCodesToEnrollmentPlans() {
  console.log('🔄 === 回填 college_code 和 major_group_code 到 core_enrollment_plans ===\n');

  try {
    await AppDataSource.initialize();

    // 1. 检查旧表是否有 enrollment_plans
    const oldTableExists = await AppDataSource.query(`
      SHOW TABLES LIKE 'enrollment_plans'
    `);

    if (oldTableExists.length === 0) {
      console.log('❌ enrollment_plans 表不存在');
      process.exit(1);
    }

    // 2. 检查旧表结构
    const oldColumns = await AppDataSource.query(`DESCRIBE enrollment_plans`);
    const hasCollegeCode = oldColumns.some((col: any) => col.Field === 'college_code');
    const hasMajorGroupCode = oldColumns.some((col: any) => col.Field === 'major_group_code');

    console.log(`1️⃣ 检查旧表结构...`);
    console.log(`   有 college_code: ${hasCollegeCode}`);
    console.log(`   有 major_group_code: ${hasMajorGroupCode}\n`);

    if (!hasCollegeCode && !hasMajorGroupCode) {
      console.log('⚠️  旧表没有 code 字段，无法回填');
      process.exit(0);
    }

    // 3. 检查当前状态
    console.log('2️⃣ 检查当前状态...');
    const beforeStats = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_code) as with_college_code,
        COUNT(major_group_code) as with_group_code
      FROM core_enrollment_plans
    `);
    console.log(`   总记录: ${beforeStats[0].total}`);
    console.log(`   有 college_code: ${beforeStats[0].with_college_code}`);
    console.log(`   有 major_group_code: ${beforeStats[0].with_group_code}\n`);

    // 4. 执行更新 college_code (已经有了，跳过)
    console.log('3️⃣ college_code 已经全部填充，跳过更新\n');

    // 5. 执行更新 major_group_code
    if (hasMajorGroupCode) {
      console.log('4️⃣ 开始更新 major_group_code...');
      const updateGroupCodeResult = await AppDataSource.query(`
        UPDATE core_enrollment_plans cep
        INNER JOIN enrollment_plans ep_old ON
          cep.college_name COLLATE utf8mb4_unicode_ci = ep_old.college_name COLLATE utf8mb4_unicode_ci
          AND cep.year = ep_old.year
          AND (
            (cep.subject_type = 'physics' AND ep_old.subject_type = '物理类')
            OR (cep.subject_type = 'history' AND ep_old.subject_type = '历史类')
          )
          AND (cep.major_name COLLATE utf8mb4_unicode_ci = ep_old.major_name COLLATE utf8mb4_unicode_ci
               OR (cep.major_name IS NULL AND ep_old.major_name IS NULL))
        SET cep.major_group_code = ep_old.major_group_code,
            cep.major_group_name = ep_old.major_group_name
        WHERE ep_old.major_group_code IS NOT NULL
      `);
      console.log(`   ✅ 更新了 ${updateGroupCodeResult.affectedRows} 条记录\n`);
    }

    // 6. 检查更新后状态
    console.log('5️⃣ 检查更新后状态...');
    const afterStats = await AppDataSource.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_code) as with_college_code,
        COUNT(major_group_code) as with_group_code
      FROM core_enrollment_plans
    `);
    console.log(`   总记录: ${afterStats[0].total}`);
    console.log(`   有 college_code: ${afterStats[0].with_college_code} (+${afterStats[0].with_college_code - beforeStats[0].with_college_code})`);
    console.log(`   有 major_group_code: ${afterStats[0].with_group_code} (+${afterStats[0].with_group_code - beforeStats[0].with_group_code})\n`);

    // 7. 查看样例数据
    console.log('6️⃣ 查看江苏样例数据...');
    const samples = await AppDataSource.query(`
      SELECT college_name, year, subject_type, college_code, major_group_code, major_group_name
      FROM core_enrollment_plans
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

backfillCodesToEnrollmentPlans();
