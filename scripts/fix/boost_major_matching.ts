#!/usr/bin/env ts-node
/**
 * 提升专业匹配率 - 通过major_group_name模糊匹配
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function boostMajorMatching() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🚀 提升专业匹配率\n');
  console.log('=' + '='.repeat(80) + '\n');

  try {
    // 1. 检查当前状态
    console.log('1️⃣  检查当前状态:\n');

    const [current]: any = await conn.query(`
      SELECT
        COUNT(*) as total,
        COUNT(major_name) as with_major_name,
        COUNT(major_group_name) as with_group_name,
        COUNT(CASE WHEN major_name IS NULL AND major_group_name IS NOT NULL THEN 1 END) as group_only
      FROM cleaned_admission_scores
    `);

    console.log(`   总记录: ${current[0].total.toLocaleString()}`);
    console.log(`   有major_name: ${current[0].with_major_name.toLocaleString()} (${Math.round(current[0].with_major_name * 100 / current[0].total)}%)`);
    console.log(`   有major_group_name: ${current[0].with_group_name.toLocaleString()} (${Math.round(current[0].with_group_name * 100 / current[0].total)}%)`);
    console.log(`   只有专业组名: ${current[0].group_only.toLocaleString()}\n`);

    // 2. 从admission_scores表获取更多数据
    console.log('2️⃣  从admission_scores表获取更多专业名称...\n');

    // 2.1 通过ID直接匹配（最精确）
    const [byId]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      INNER JOIN admission_scores a ON c.id COLLATE utf8mb4_unicode_ci = a.id
      SET
        c.major_name = a.major_name
      WHERE c.major_name IS NULL AND a.major_name IS NOT NULL
    `);
    console.log(`   ✅ 通过ID匹配: ${byId.affectedRows} 条`);

    // 2.2 通过院校+年份+省份+专业组匹配
    const [byGroup]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      INNER JOIN core_colleges col ON c.cleaned_college_id = col.id
      INNER JOIN admission_scores a ON
        a.college_name COLLATE utf8mb4_unicode_ci = col.name
        AND a.year = c.year
        AND a.province COLLATE utf8mb4_unicode_ci = c.source_province
        AND a.major_group COLLATE utf8mb4_unicode_ci = c.major_group_name
      SET c.major_name = a.major_name
      WHERE c.major_name IS NULL
        AND c.major_group_name IS NOT NULL
        AND a.major_name IS NOT NULL
    `);
    console.log(`   ✅ 通过专业组匹配: ${byGroup.affectedRows} 条`);

    // 2.3 如果major_group_name本身就是专业名，直接使用
    const [direct]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      SET c.major_name = c.major_group_name
      WHERE c.major_name IS NULL
        AND c.major_group_name IS NOT NULL
        AND c.major_group_name NOT LIKE '%(%'
        AND c.major_group_name NOT LIKE '（%'
        AND LENGTH(c.major_group_name) > 3
    `);
    console.log(`   ✅ 直接使用专业组名: ${direct.affectedRows} 条\n`);

    // 3. 匹配major_id
    console.log('3️⃣  匹配major_id...\n');

    // 3.1 精确匹配
    const [exact]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      INNER JOIN cleaned_majors m ON c.major_name COLLATE utf8mb4_unicode_ci = m.standard_name
      SET c.cleaned_major_id = m.id
      WHERE c.cleaned_major_id IS NULL
        AND c.major_name IS NOT NULL
    `);
    console.log(`   ✅ 精确匹配: ${exact.affectedRows} 条`);

    // 3.2 去除括号后匹配
    const [fuzzy1]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      INNER JOIN cleaned_majors m ON
        TRIM(SUBSTRING_INDEX(c.major_name, '（', 1)) COLLATE utf8mb4_unicode_ci = m.standard_name
        OR TRIM(SUBSTRING_INDEX(c.major_name, '(', 1)) COLLATE utf8mb4_unicode_ci = m.standard_name
      SET c.cleaned_major_id = m.id
      WHERE c.cleaned_major_id IS NULL
        AND c.major_name IS NOT NULL
    `);
    console.log(`   ✅ 去括号匹配: ${fuzzy1.affectedRows} 条`);

    // 3.3 包含匹配（major_name包含cleaned_majors.standard_name）
    const [fuzzy2]: any = await conn.query(`
      UPDATE cleaned_admission_scores c
      INNER JOIN cleaned_majors m ON c.major_name LIKE CONCAT('%', m.standard_name, '%')
      SET c.cleaned_major_id = m.id
      WHERE c.cleaned_major_id IS NULL
        AND c.major_name IS NOT NULL
        AND LENGTH(m.standard_name) >= 4
    `);
    console.log(`   ✅ 包含匹配: ${fuzzy2.affectedRows} 条\n`);

    // 4. 检查提升后的结果
    console.log('4️⃣  检查提升后的结果:\n');

    const [after]: any = await conn.query(`
      SELECT
        COUNT(*) as total,
        COUNT(major_name) as with_major_name,
        COUNT(cleaned_major_id) as with_major_id
      FROM cleaned_admission_scores
    `);

    console.log(`   总记录: ${after[0].total.toLocaleString()}`);
    console.log(`   有major_name: ${after[0].with_major_name.toLocaleString()} (${Math.round(after[0].with_major_name * 100 / after[0].total)}%)`);
    console.log(`   有major_id: ${after[0].with_major_id.toLocaleString()} (${Math.round(after[0].with_major_id * 100 / after[0].total)}%)\n`);

    const improvement = Math.round(after[0].with_major_name * 100 / after[0].total) - Math.round(current[0].with_major_name * 100 / current[0].total);
    console.log(`   📈 提升: +${improvement}%\n`);

    // 5. 同步cleaned_majors到core_majors
    console.log('5️⃣  同步cleaned_majors到core_majors...\n');

    await conn.query(`
      INSERT INTO core_majors (
        id, name, code, discipline, category,
        study_years, employment_rate, description,
        data_version, last_synced_at
      )
      SELECT
        m.id,
        m.standard_name as name,
        m.code,
        m.discipline,
        m.category,
        m.study_years,
        m.employment_rate,
        m.description,
        1 as data_version,
        NOW() as last_synced_at
      FROM cleaned_majors m
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        code = VALUES(code),
        discipline = VALUES(discipline),
        category = VALUES(category),
        last_synced_at = NOW()
    `);

    const [majorCount]: any = await conn.query('SELECT COUNT(*) as count FROM core_majors');
    console.log(`   ✅ 同步完成: ${majorCount[0].count.toLocaleString()} 个专业\n`);

    // 6. 重新同步到Core层
    console.log('6️⃣  重新同步admission_scores到Core层...\n');

    await conn.query('TRUNCATE TABLE core_admission_scores');

    await conn.query(`
      INSERT INTO core_admission_scores (
        id, college_id, college_name, major_id, major_name,
        year, source_province, batch, subject_type,
        min_score, avg_score, max_score, min_rank,
        plan_count,
        data_version, last_synced_at
      )
      SELECT
        s.id,
        s.cleaned_college_id as college_id,
        c.name as college_name,
        s.cleaned_major_id as major_id,
        s.major_name,
        s.year,
        s.source_province,
        s.batch,
        s.subject_type,
        s.min_score,
        s.avg_score,
        s.max_score,
        s.min_rank,
        s.plan_count,
        1 as data_version,
        NOW() as last_synced_at
      FROM cleaned_admission_scores s
      LEFT JOIN core_colleges c ON s.cleaned_college_id = c.id
    `);

    const [coreCount]: any = await conn.query(`
      SELECT
        COUNT(*) as total,
        COUNT(major_id) as with_id,
        COUNT(major_name) as with_name
      FROM core_admission_scores
    `);

    console.log(`   ✅ 同步完成: ${coreCount[0].total.toLocaleString()} 条`);
    console.log(`      - 有major_id: ${coreCount[0].with_id.toLocaleString()} (${Math.round(coreCount[0].with_id * 100 / coreCount[0].total)}%)`);
    console.log(`      - 有major_name: ${coreCount[0].with_name.toLocaleString()} (${Math.round(coreCount[0].with_name * 100 / coreCount[0].total)}%)\n`);

    // 7. 重新生成院校-专业关联
    console.log('7️⃣  重新生成院校-专业关联...\n');

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('DELETE FROM core_college_major_relations');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    await conn.query(`
      INSERT INTO core_college_major_relations (
        id,
        college_id,
        college_name,
        major_id,
        major_name,
        first_offered_year,
        latest_offered_year,
        province_count,
        data_version,
        last_synced_at,
        created_at
      )
      SELECT
        UUID() as id,
        s.college_id,
        s.college_name,
        s.major_id,
        s.major_name,
        MIN(s.year) as first_offered_year,
        MAX(s.year) as latest_offered_year,
        COUNT(DISTINCT s.source_province) as province_count,
        1 as data_version,
        NOW() as last_synced_at,
        NOW() as created_at
      FROM core_admission_scores s
      WHERE s.college_id IS NOT NULL
        AND s.major_id IS NOT NULL
        AND s.college_name IS NOT NULL
        AND s.major_name IS NOT NULL
      GROUP BY s.college_id, s.major_id, s.college_name, s.major_name
    `);

    const [relCount]: any = await conn.query('SELECT COUNT(*) as count FROM core_college_major_relations');
    console.log(`   ✅ 生成 ${relCount[0].count.toLocaleString()} 条关联\n`);

    // 8. 更新统计
    console.log('8️⃣  更新统计信息...\n');

    await conn.query(`
      UPDATE core_colleges c
      SET c.major_count = (
        SELECT COUNT(DISTINCT r.major_id)
        FROM core_college_major_relations r
        WHERE r.college_id = c.id
      ),
      c.enrollment_province_count = (
        SELECT COUNT(DISTINCT s.source_province)
        FROM core_admission_scores s
        WHERE s.college_id = c.id
      )
    `);

    console.log('   ✅ 统计信息更新完成\n');

    console.log('=' + '='.repeat(80) + '\n');
    console.log('✅ 专业匹配率提升完成!\n');

  } catch (error) {
    console.error('\n❌ 失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

boostMajorMatching().catch(console.error);
