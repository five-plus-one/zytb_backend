import * as XLSX from 'xlsx';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { AdmissionScore } from '../src/models/AdmissionScore';
import { College } from '../src/models/College';
import * as path from 'path';

// 加载环境变量
dotenv.config();

// 字段映射
const fieldMapping: Record<string, keyof AdmissionScore> = {
  '生源地': 'sourceProvince',
  '学校': 'collegeName',
  '年份': 'year',
  '专业': 'majorName',
  '专业组': 'majorGroup',
  '科类': 'subjectType',
  '选科': 'subjectRequirements',
  '最低分': 'minScore',
  '最低位次': 'minRank',
  '批次': 'batch',
  '省份': 'province',
  '城市': 'city'
};

// 数据源配置
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'volunteer_system',
  entities: [AdmissionScore, College],
  synchronize: false,
  logging: true
});

// 转换数字
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? undefined : num;
}

// 转换整数
function parseInteger(value: any): number | undefined {
  const num = parseNumber(value);
  return num !== undefined ? Math.floor(num) : undefined;
}

// 解析 Excel 行数据
function parseRowData(row: any): Partial<AdmissionScore> {
  const score: any = {};

  for (const [excelField, modelField] of Object.entries(fieldMapping)) {
    const value = row[excelField];

    if (value === null || value === undefined || value === '') continue;

    // 根据字段类型进行转换
    switch (modelField) {
      // 整数类型
      case 'year':
      case 'minScore':
      case 'minRank':
        score[modelField] = parseInteger(value);
        break;

      // 字符串类型
      default:
        score[modelField] = String(value).trim();
        break;
    }
  }

  return score;
}

// 主函数
async function importAdmissionScores(filePath: string) {
  try {
    console.log('开始导入专业录取分数线数据...');
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

    const scoreRepository = AppDataSource.getRepository(AdmissionScore);
    const collegeRepository = AppDataSource.getRepository(College);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // 批量导入数据
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as any;
        const scoreData = parseRowData(row);

        // 检查必填字段
        if (!scoreData.sourceProvince || !scoreData.collegeName ||
            !scoreData.year || !scoreData.majorName || !scoreData.subjectType) {
          console.warn(`第 ${i + 2} 行数据缺少必填字段,跳过`);
          errorCount++;
          errors.push({
            row: i + 2,
            error: '缺少必填字段(生源地/学校/年份/专业/科类)'
          });
          continue;
        }

        // 尝试关联院校（通过院校名称）
        const college = await collegeRepository.findOne({
          where: { name: scoreData.collegeName as string }
        });

        if (college) {
          scoreData.collegeId = college.id;
          // 如果Excel中没有省份/城市信息，从院校表获取
          if (!scoreData.province) {
            scoreData.province = college.province;
          }
          if (!scoreData.city) {
            scoreData.city = college.city;
          }
        }

        // 检查是否已存在（基于年份、生源地、学校、专业、科类的唯一性）
        const existing = await scoreRepository.findOne({
          where: {
            year: scoreData.year as number,
            sourceProvince: scoreData.sourceProvince as string,
            collegeName: scoreData.collegeName as string,
            majorName: scoreData.majorName as string,
            subjectType: scoreData.subjectType as string
          }
        });

        if (existing) {
          // 更新现有记录
          await scoreRepository.update(existing.id, scoreData);
          console.log(`更新: ${scoreData.year} ${scoreData.collegeName} - ${scoreData.majorName}`);
        } else {
          // 创建新记录
          const score = scoreRepository.create(scoreData);
          await scoreRepository.save(score);
          console.log(`新增: ${scoreData.year} ${scoreData.collegeName} - ${scoreData.majorName}`);
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
  console.log('使用方法: npm run import-admission-scores <excel文件路径>');
  console.log('示例: npm run import-admission-scores ./data/admission_scores.xlsx');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
importAdmissionScores(filePath);
