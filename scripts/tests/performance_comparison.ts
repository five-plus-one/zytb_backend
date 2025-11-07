#!/usr/bin/env ts-node
/**
 * 性能对比测试：旧表 vs Core层
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

interface PerformanceResult {
  operation: string;
  legacyTime: number;
  coreTime: number;
  improvement: string;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  console.log('\n🚀 三层架构性能对比测试\n');
  console.log('=' .repeat(80));

  const results: PerformanceResult[] = [];

  // 测试1: 按名称查询院校
  console.log('\n📊 测试1: 按名称查询院校');
  {
    const collegeName = '北京大学';

    // 旧方式：字符串模糊匹配
    const start1 = Date.now();
    await conn.query('SELECT * FROM colleges WHERE name LIKE ?', [`%${collegeName}%`]);
    const legacyTime = Date.now() - start1;

    // 新方式：精确匹配（Core层已索引）
    const start2 = Date.now();
    await conn.query('SELECT * FROM core_colleges WHERE name = ?', [collegeName]);
    const coreTime = Date.now() - start2;

    const improvement = ((legacyTime - coreTime) / legacyTime * 100).toFixed(1);
    results.push({
      operation: '按名称查询院校',
      legacyTime,
      coreTime,
      improvement: `${improvement}%`
    });

    console.log(`  旧方式 (LIKE查询): ${legacyTime}ms`);
    console.log(`  新方式 (精确查询): ${coreTime}ms`);
    console.log(`  性能提升: ${improvement}%`);
  }

  // 测试2: 查询985院校列表
  console.log('\n📊 测试2: 查询985院校列表');
  {
    const start1 = Date.now();
    await conn.query('SELECT * FROM colleges WHERE is_985 = TRUE ORDER BY name');
    const legacyTime = Date.now() - start1;

    const start2 = Date.now();
    await conn.query('SELECT * FROM core_colleges WHERE is_985 = TRUE ORDER BY hot_level DESC');
    const coreTime = Date.now() - start2;

    const improvement = ((legacyTime - coreTime) / legacyTime * 100).toFixed(1);
    results.push({
      operation: '查询985院校列表',
      legacyTime,
      coreTime,
      improvement: `${improvement}%`
    });

    console.log(`  旧方式: ${legacyTime}ms`);
    console.log(`  新方式 (预计算热度): ${coreTime}ms`);
    console.log(`  性能提升: ${improvement}%`);
  }

  // 测试3: 查询院校的录取分数（需要JOIN）
  console.log('\n📊 测试3: 查询院校的录取分数');
  {
    // 旧方式：需要通过college_name JOIN
    const start1 = Date.now();
    await conn.query(`
      SELECT a.*
      FROM admission_scores a
      JOIN colleges c ON a.college_name LIKE CONCAT('%', c.name, '%')
      WHERE c.name = '清华大学'
      ORDER BY a.year DESC
      LIMIT 100
    `);
    const legacyTime = Date.now() - start1;

    // 新方式：直接使用college_id（无需JOIN）
    const start2 = Date.now();
    const [colleges]: any = await conn.query('SELECT id FROM core_colleges WHERE name = ?', ['清华大学']);
    if (colleges.length > 0) {
      await conn.query(`
        SELECT * FROM core_admission_scores
        WHERE college_id = ?
        ORDER BY year DESC
        LIMIT 100
      `, [colleges[0].id]);
    }
    const coreTime = Date.now() - start2;

    const improvement = ((legacyTime - coreTime) / legacyTime * 100).toFixed(1);
    results.push({
      operation: '查询院校录取分数',
      legacyTime,
      coreTime,
      improvement: `${improvement}%`
    });

    console.log(`  旧方式 (LIKE + JOIN): ${legacyTime}ms`);
    console.log(`  新方式 (UUID索引): ${coreTime}ms`);
    console.log(`  性能提升: ${improvement}%`);
  }

  // 测试4: 按热度查询top50院校
  console.log('\n📊 测试4: 按热度查询Top 50院校');
  {
    // 旧方式：需要实时计算或没有热度指标
    const start1 = Date.now();
    await conn.query(`
      SELECT c.*, COUNT(DISTINCT a.major_name) as major_count
      FROM colleges c
      LEFT JOIN admission_scores a ON c.name = a.college_name
      WHERE c.is_985 = TRUE OR c.is_211 = TRUE
      GROUP BY c.id
      ORDER BY major_count DESC
      LIMIT 50
    `);
    const legacyTime = Date.now() - start1;

    // 新方式：使用预计算的hot_level
    const start2 = Date.now();
    await conn.query(`
      SELECT * FROM core_colleges
      ORDER BY hot_level DESC
      LIMIT 50
    `);
    const coreTime = Date.now() - start2;

    const improvement = ((legacyTime - coreTime) / legacyTime * 100).toFixed(1);
    results.push({
      operation: '查询Top 50热门院校',
      legacyTime,
      coreTime,
      improvement: `${improvement}%`
    });

    console.log(`  旧方式 (GROUP BY聚合): ${legacyTime}ms`);
    console.log(`  新方式 (预计算字段): ${coreTime}ms`);
    console.log(`  性能提升: ${improvement}%`);
  }

  // 测试5: 查询某省份所有院校
  console.log('\n📊 测试5: 查询某省份所有院校');
  {
    const province = '北京';

    const start1 = Date.now();
    await conn.query('SELECT * FROM colleges WHERE province = ? ORDER BY name', [province]);
    const legacyTime = Date.now() - start1;

    const start2 = Date.now();
    await conn.query('SELECT * FROM core_colleges WHERE province = ? ORDER BY hot_level DESC', [province]);
    const coreTime = Date.now() - start2;

    const improvement = ((legacyTime - coreTime) / legacyTime * 100).toFixed(1);
    results.push({
      operation: '查询某省份所有院校',
      legacyTime,
      coreTime,
      improvement: `${improvement}%`
    });

    console.log(`  旧方式: ${legacyTime}ms`);
    console.log(`  新方式 (索引优化): ${coreTime}ms`);
    console.log(`  性能提升: ${improvement}%`);
  }

  await conn.end();

  // 输出汇总表格
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 性能测试汇总\n');
  console.log('操作'.padEnd(30) + '旧方式'.padEnd(15) + '新方式'.padEnd(15) + '性能提升');
  console.log('-'.repeat(80));
  results.forEach(r => {
    console.log(
      r.operation.padEnd(30) +
      `${r.legacyTime}ms`.padEnd(15) +
      `${r.coreTime}ms`.padEnd(15) +
      r.improvement
    );
  });

  const avgImprovement = results.reduce((sum, r) => sum + parseFloat(r.improvement), 0) / results.length;
  console.log('-'.repeat(80));
  console.log(`\n✨ 平均性能提升: ${avgImprovement.toFixed(1)}%\n`);

  console.log('=' .repeat(80));
  console.log('\n✅ 性能测试完成！\n');
}

main().catch(console.error);
