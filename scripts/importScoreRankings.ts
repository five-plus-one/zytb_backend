import * as XLSX from 'xlsx';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { ScoreRanking } from '../src/models/ScoreRanking';
import * as path from 'path';

// 加载环境变量
dotenv.config();

// 字段映射
const fieldMapping: Record<string, keyof ScoreRanking> = {
  '年份': 'year',
  '省份': 'province',
  '科类': 'subjectType',
  '分数': 'score',
  '人数': 'count',
  '累计人数': 'cumulativeCount',
  '位次': 'rank'
};

// 数据源配置
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'volunteer_system',
  entities: [ScoreRanking],
  synchronize: false,
  logging: true
});

// 转换整数
function parseInteger(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? undefined : Math.floor(num);
}

// 解析 Excel 行数据
function parseRowData(row: any): Partial<ScoreRanking> {
  const ranking: any = {};

  for (const [excelField, modelField] of Object.entries(fieldMapping)) {
    const value = row[excelField];

    if (value === null || value === undefined || value === '') continue;

    // 所有字段都是整数或字符串
    switch (modelField) {
      case 'year':
      case 'score':
      case 'count':
      case 'cumulativeCount':
      case 'rank':
        ranking[modelField] = parseInteger(value);
        break;
      default:
        ranking[modelField] = String(value).trim();
        break;
    }
  }

  return ranking;
}

// 主函数
async function importScoreRankings(filePath: string) {
  try {
    console.log('开始导入一分一段数据...');
    console.log('Excel 文件路径:', filePath);

    // 检查文件是否存在
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 读取 Excel 文件
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`读取到 ${data.length} 条数据`);

    // 初始化数据源
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    const rankingRepository = AppDataSource.getRepository(ScoreRanking);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // 批量导入数据
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as any;
        const rankingData = parseRowData(row);

        // 检查必填字段
        if (!rankingData.year || !rankingData.province ||
            !rankingData.subjectType || rankingData.score === undefined ||
            !rankingData.count || !rankingData.cumulativeCount) {
          console.warn(`第 ${i + 2} 行数据缺少必填字段,跳过`);
          errorCount++;
          errors.push({
            row: i + 2,
            error: '缺少必填字段(年份/省份/科类/分数/人数/累计人数)'
          });
          continue;
        }

        // 检查是否已存在（基于年份、省份、科类、分数的唯一性）
        const existing = await rankingRepository.findOne({
          where: {
            year: rankingData.year as number,
            province: rankingData.province as string,
            subjectType: rankingData.subjectType as string,
            score: rankingData.score as number
          }
        });

        if (existing) {
          // 更新现有记录
          await rankingRepository.update(existing.id, rankingData);
          console.log(`更新: ${rankingData.year} ${rankingData.province} ${rankingData.subjectType} ${rankingData.score}分`);
        } else {
          // 创建新记录
          const ranking = rankingRepository.create(rankingData);
          await rankingRepository.save(ranking);
          console.log(`新增: ${rankingData.year} ${rankingData.province} ${rankingData.subjectType} ${rankingData.score}分`);
        }

        successCount++;
      } catch (error: any) {
        console.error(`第 ${i + 2} 行导入失败:`, error.message);
        errorCount++;
        errors.push({
          row: i + 2,
          error: error.message
        });
      }
    }

    console.log('\n导入完成!');
    console.log(`成功: ${successCount} 条`);
    console.log(`失败: ${errorCount} 条`);

    if (errors.length > 0) {
      console.log('\n错误详情:');
      errors.forEach(err => {
        console.log(`  行 ${err.row}: ${err.error}`);
      });
    }

    await AppDataSource.destroy();
  } catch (error: any) {
    console.error('导入失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 获取命令行参数
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('请提供 Excel 文件路径');
  console.log('使用方法: npm run import-score-rankings <excel文件路径>');
  console.log('示例: npm run import-score-rankings ./data/score_rankings.xlsx');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
importScoreRankings(filePath);
