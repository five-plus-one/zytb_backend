#!/usr/bin/env ts-node
/**
 * 检查旧表中的专业信息并创建修复方案
 */
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function diagnoseAndFix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🔍 诊断专业信息并创建修复方案\n');
  console.log('=' + '='.repeat(80) + '\n');

  try {
    // 1. 检查admission_scores表（旧表）
    console.log('1️⃣  检查admission_scores表（旧表）:\n');

    const [oldScores]: any = await conn.query(`
      SELECT * FROM admission_scores LIMIT 5
    `);

    console.log('   样例数据:');
    oldScores.forEach((row: any, idx: number) => {
      console.log(`\n   记录 ${idx + 1}:`);
      console.log(`     college_name: ${row.college_name}`);
      console.log(`     major_name: ${row.major_name || '(NULL)'}`);
      console.log(`     major_group: ${row.major_group || '(NULL)'}`);
      console.log(`     year: ${row.year}, province: ${row.province}`);
    });

    const [oldCount]: any = await conn.query('SELECT COUNT(*) as count, COUNT(major_name) as with_major FROM admission_scores');
    console.log(`\n   总记录数: ${oldCount[0].count.toLocaleString()}`);
    console.log(`   有major_name: ${oldCount[0].with_major.toLocaleString()} (${Math.round(oldCount[0].with_major * 100 / oldCount[0].count)}%)\n`);

    // 2. 检查raw_csv_admission_scores
    console.log('2️⃣  检查raw_csv_admission_scores表:\n');

    const [rawCount]: any = await conn.query('SELECT COUNT(*) as count FROM raw_csv_admission_scores');
    console.log(`   总记录数: ${rawCount[0].count.toLocaleString()}\n`);

    if (rawCount[0].count > 0) {
      const [rawSample]: any = await conn.query('SELECT * FROM raw_csv_admission_scores LIMIT 3');
      console.log('   样例数据:');
      rawSample.forEach((row: any, idx: number) => {
        console.log(`\n   记录 ${idx + 1}:`);
        Object.keys(row).forEach(key => {
          if (key.includes('major') || key.includes('专业') || key === 'college_name' || key.includes('college')) {
            console.log(`     ${key}: ${row[key]}`);
          }
        });
      });
    }

    // 3. 检查cleaned_admission_scores是否需要添加major_name字段
    console.log('\n\n3️⃣  检查cleaned_admission_scores表结构:\n');

    const [cleanedCols]: any = await conn.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'cleaned_admission_scores'
      ORDER BY ORDINAL_POSITION
    `);

    const hasMajorName = cleanedCols.some((c: any) => c.COLUMN_NAME === 'major_name');
    console.log(`   是否有major_name字段: ${hasMajorName ? '✅ 是' : '❌ 否'}\n`);

    // 4. 提供修复方案
    console.log('4️⃣  修复方案:\n');

    if (!hasMajorName) {
      console.log('   ✅ 方案1: 在cleaned_admission_scores表中添加major_name字段');
      console.log('   ✅ 方案2: 从admission_scores（旧表）迁移major_name到cleaned_admission_scores');
      console.log('   ✅ 方案3: 通过major_name匹配cleaned_majors表获取major_id');
      console.log('   ✅ 方案4: 重新同步到Core层\n');
    }

    // 5. 检查enrollment_plans的college_id问题
    console.log('5️⃣  检查enrollment_plans表:\n');

    const [plansCheck]: any = await conn.query(`
      SELECT
        COUNT(*) as total,
        COUNT(college_id) as with_college_id,
        COUNT(college_name) as with_college_name
      FROM enrollment_plans
    `);

    console.log(`   总记录数: ${plansCheck[0].total.toLocaleString()}`);
    console.log(`   有college_id: ${plansCheck[0].with_college_id.toLocaleString()}`);
    console.log(`   有college_name: ${plansCheck[0].with_college_name.toLocaleString()}\n`);

    if (plansCheck[0].with_college_name > 0 && plansCheck[0].with_college_id === 0) {
      console.log('   ⚠️  发现问题: 所有记录都有college_name但没有college_id');
      console.log('   ✅ 修复方案: 通过college_name匹配core_colleges表获取college_id\n');
    }

    console.log('=' + '='.repeat(80) + '\n');
    console.log('✅ 诊断完成\n');

  } catch (error) {
    console.error('\n❌ 诊断失败:', error);
    throw error;
  } finally {
    await conn.end();
  }
}

diagnoseAndFix().catch(console.error);
