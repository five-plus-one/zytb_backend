/**
 * 一分一段表 Excel 导入脚本
 *
 * 使用方法:
 * node scripts/import-excel-directly.js <Excel文件路径>
 *
 * 示例:
 * node scripts/import-excel-directly.js E:\5plus1\DEV\zytb\zy_backend\data\hz.xlsx
 */

const XLSX = require('xlsx');
const { DataSource } = require('typeorm');
const path = require('path');

// 导入配置
const config = require('../dist/config/index').default;

// 创建数据源
const AppDataSource = new DataSource({
  ...config.database,
  entities: [path.join(__dirname, '../dist/models/**/*.js')],
  migrations: [path.join(__dirname, '../dist/migrations/**/*.js')]
});

// 解析 Excel 文件
function parseExcel(filePath) {
  console.log(`📖 正在读取文件: ${filePath}`);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON 数据
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ 读取成功，共 ${rawData.length} 行数据`);
    return rawData;
  } catch (error) {
    console.error(`❌ 读取文件失败: ${error.message}`);
    process.exit(1);
  }
}

// 验证和转换数据
function validateAndTransform(rawData) {
  console.log('\n🔍 正在验证数据...');

  const validData = [];
  const errors = [];

  rawData.forEach((row, index) => {
    const rowNum = index + 2; // Excel 行号（从2开始，1是表头）

    try {
      // 字段映射（支持中文列名和英文列名）
      let year = row['年份'] || row['year'];
      let province = row['省份'] || row['province'];
      let subjectType = row['科类'] || row['科目类型'] || row['科目'] || row['subjectType'];
      let score = row['分数'] || row['score'];
      const count = row['人数'] || row['count'];
      const cumulativeCount = row['累计人数'] || row['cumulativeCount'];
      const rank = row['位次'] || row['rank'];

      // 清理年份格式（去除"年"字）
      if (year && typeof year === 'string') {
        year = year.replace(/年/g, '').trim();
      }

      // 清理省份格式（去除"省"字，标准化）
      if (province && typeof province === 'string') {
        province = province.replace(/省/g, '').trim();
      }

      // 清理科目格式（标准化为科类）
      if (subjectType && typeof subjectType === 'string') {
        subjectType = subjectType.trim();
        // 标准化科目名称
        const subjectMap = {
          '物理': '物理类',
          '历史': '历史类',
          '理科': '理科',
          '文科': '文科',
          '综合': '综合'
        };
        subjectType = subjectMap[subjectType] || subjectType;
      }

      // 清理分数格式（处理"及以上"等文字）
      if (score && typeof score === 'string') {
        // 提取数字，去除"及以上"、"以下"等文字
        const scoreMatch = score.match(/\d+/);
        if (scoreMatch) {
          score = scoreMatch[0];
        }
      }

      // 验证必填字段
      if (!year || !province || !subjectType || score === undefined || count === undefined) {
        errors.push({
          row: rowNum,
          error: '缺少必填字段（年份、省份、科类、分数、人数）',
          data: row
        });
        return;
      }

      // 数据类型转换和验证
      const yearNum = parseInt(year);
      const scoreNum = parseInt(score);
      const countNum = parseInt(count);
      const cumulativeCountNum = cumulativeCount ? parseInt(cumulativeCount) : 0;
      const rankNum = rank ? parseInt(rank) : null;

      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        errors.push({ row: rowNum, error: '年份格式错误或超出范围', data: row });
        return;
      }

      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 999) {
        errors.push({ row: rowNum, error: '分数格式错误或超出范围', data: row });
        return;
      }

      if (isNaN(countNum) || countNum < 0) {
        errors.push({ row: rowNum, error: '人数格式错误', data: row });
        return;
      }

      // 构建有效数据
      validData.push({
        year: yearNum,
        province: String(province).trim(),
        subjectType: String(subjectType).trim(),
        score: scoreNum,
        count: countNum,
        cumulativeCount: cumulativeCountNum,
        rank: rankNum
      });
    } catch (error) {
      errors.push({
        row: rowNum,
        error: `数据解析错误: ${error.message}`,
        data: row
      });
    }
  });

  if (errors.length > 0) {
    console.log(`\n⚠️ 发现 ${errors.length} 条错误数据:`);
    errors.slice(0, 10).forEach(err => {
      console.log(`  行 ${err.row}: ${err.error}`);
      console.log(`  数据:`, err.data);
    });

    if (errors.length > 10) {
      console.log(`  ... 还有 ${errors.length - 10} 条错误（已省略）`);
    }

    return { validData: [], errors };
  }

  console.log(`✅ 数据验证通过，共 ${validData.length} 条有效数据`);
  return { validData, errors: [] };
}

// 批量插入数据
async function batchInsert(dataSource, validData, clearExisting = false) {
  // 动态加载 ScoreRanking 模型
  const ScoreRanking = require('../dist/models/ScoreRanking').ScoreRanking;
  const repository = dataSource.getRepository(ScoreRanking);

  // 如果需要清空已有数据
  if (clearExisting && validData.length > 0) {
    const firstRecord = validData[0];
    console.log(`\n🗑️ 清空已有数据: ${firstRecord.year}年 ${firstRecord.province} ${firstRecord.subjectType}`);

    const deleteResult = await repository.delete({
      year: firstRecord.year,
      province: firstRecord.province,
      subjectType: firstRecord.subjectType
    });

    console.log(`✅ 已删除 ${deleteResult.affected || 0} 条记录`);
  }

  console.log(`\n💾 开始批量插入数据...`);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 动态加载 ScoreRanking 模型
    const ScoreRanking = require('../dist/models/ScoreRanking').ScoreRanking;

    // 分批插入（每次1000条）
    const batchSize = 1000;
    let insertedCount = 0;

    for (let i = 0; i < validData.length; i += batchSize) {
      const batch = validData.slice(i, i + batchSize);
      await queryRunner.manager.save(ScoreRanking, batch);
      insertedCount += batch.length;

      const progress = Math.round((insertedCount / validData.length) * 100);
      console.log(`  进度: ${insertedCount}/${validData.length} (${progress}%)`);
    }

    await queryRunner.commitTransaction();
    console.log(`✅ 成功插入 ${insertedCount} 条记录`);

    return insertedCount;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error(`❌ 插入失败: ${error.message}`);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// 显示导入摘要
function showSummary(validData) {
  if (validData.length === 0) return;

  const years = [...new Set(validData.map(d => d.year))];
  const provinces = [...new Set(validData.map(d => d.province))];
  const subjectTypes = [...new Set(validData.map(d => d.subjectType))];

  const minScore = Math.min(...validData.map(d => d.score));
  const maxScore = Math.max(...validData.map(d => d.score));

  console.log('\n📊 导入数据摘要:');
  console.log('─'.repeat(50));
  console.log(`年份: ${years.join(', ')}`);
  console.log(`省份: ${provinces.join(', ')}`);
  console.log(`科类: ${subjectTypes.join(', ')}`);
  console.log(`分数范围: ${minScore} - ${maxScore}`);
  console.log(`总记录数: ${validData.length}`);
  console.log('─'.repeat(50));
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ 错误: 请提供 Excel 文件路径');
    console.log('\n使用方法:');
    console.log('  node scripts/import-excel-directly.js <Excel文件路径>');
    console.log('\n示例:');
    console.log('  node scripts/import-excel-directly.js E:\\data\\hz.xlsx');
    console.log('  node scripts/import-excel-directly.js E:\\data\\hz.xlsx --clear');
    process.exit(1);
  }

  const filePath = args[0];
  const clearExisting = args.includes('--clear');

  console.log('═'.repeat(60));
  console.log('           一分一段表 Excel 导入工具');
  console.log('═'.repeat(60));

  // 1. 解析 Excel
  const rawData = parseExcel(filePath);

  // 2. 验证数据
  const { validData, errors } = validateAndTransform(rawData);

  if (errors.length > 0) {
    console.log('\n❌ 由于数据验证失败，导入已取消');
    process.exit(1);
  }

  // 3. 显示摘要
  showSummary(validData);

  // 4. 连接数据库
  console.log('\n🔌 正在连接数据库...');
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error(`❌ 数据库连接失败: ${error.message}`);
    process.exit(1);
  }

  // 5. 批量插入
  try {
    const insertedCount = await batchInsert(AppDataSource, validData, clearExisting);

    console.log('\n═'.repeat(60));
    console.log('✅ 导入完成！');
    console.log(`   总行数: ${rawData.length}`);
    console.log(`   有效数据: ${validData.length}`);
    console.log(`   成功插入: ${insertedCount}`);
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('\n❌ 导入失败:', error.message);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// 运行
main().catch(error => {
  console.error('❌ 程序异常:', error);
  process.exit(1);
});
