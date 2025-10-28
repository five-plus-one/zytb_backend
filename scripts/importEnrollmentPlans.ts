import * as XLSX from 'xlsx';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { EnrollmentPlan } from '../src/models/EnrollmentPlan';
import { College } from '../src/models/College';
import * as path from 'path';

// 加载环境变量
dotenv.config();

// 字段映射
const fieldMapping: Record<string, keyof EnrollmentPlan> = {
  '年份': 'year',
  '生源地': 'sourceProvince',
  '科类': 'subjectType',
  '批次': 'batch',
  '院校代码': 'collegeCode',
  '院校名称': 'collegeName',
  '院校专业组代码': 'collegeMajorGroupCode',
  '专业组代码': 'majorGroupCode',
  '专业组名称': 'majorGroupName',
  '选科要求': 'subjectRequirements',
  '专业代码': 'majorCode',
  '专业名称': 'majorName',
  '专业备注': 'majorRemarks',
  '计划人数': 'planCount',
  '学制': 'studyYears',
  '学费': 'tuition'
};

// 数据源配置
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'volunteer_system',
  entities: [EnrollmentPlan, College],
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
function parseRowData(row: any): Partial<EnrollmentPlan> {
  const plan: any = {};

  for (const [excelField, modelField] of Object.entries(fieldMapping)) {
    const value = row[excelField];

    if (value === null || value === undefined || value === '') continue;

    // 根据字段类型进行转换
    switch (modelField) {
      // 整数类型
      case 'year':
      case 'planCount':
      case 'studyYears':
        plan[modelField] = parseInteger(value);
        break;

      // 小数类型（学费）
      case 'tuition':
        plan[modelField] = parseNumber(value);
        break;

      // 字符串类型
      default:
        plan[modelField] = String(value).trim();
        break;
    }
  }

  return plan;
}

// 主函数
async function importEnrollmentPlans(filePath: string) {
  try {
    console.log('开始导入招生计划数据...');
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

    const planRepository = AppDataSource.getRepository(EnrollmentPlan);
    const collegeRepository = AppDataSource.getRepository(College);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // 批量导入数据
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as any;
        const planData = parseRowData(row);

        // 检查必填字段
        if (!planData.year || !planData.sourceProvince || !planData.collegeCode ||
            !planData.collegeName || !planData.majorCode || !planData.majorName ||
            !planData.planCount) {
          console.warn(`第 ${i + 2} 行数据缺少必填字段,跳过`);
          errorCount++;
          errors.push({
            row: i + 2,
            error: '缺少必填字段(年份/生源地/院校代码/院校名称/专业代码/专业名称/计划人数)'
          });
          continue;
        }

        // 尝试关联院校
        const college = await collegeRepository.findOne({
          where: { code: planData.collegeCode as string }
        });

        if (college) {
          planData.collegeId = college.id;
        }

        // 检查是否已存在（基于年份、生源地、院校代码、专业代码的唯一性）
        const existing = await planRepository.findOne({
          where: {
            year: planData.year as number,
            sourceProvince: planData.sourceProvince as string,
            collegeCode: planData.collegeCode as string,
            majorCode: planData.majorCode as string,
            batch: planData.batch as string
          }
        });

        if (existing) {
          // 更新现有记录
          await planRepository.update(existing.id, planData);
          console.log(`更新: ${planData.year} ${planData.collegeName} - ${planData.majorName}`);
        } else {
          // 创建新记录
          const plan = planRepository.create(planData);
          await planRepository.save(plan);
          console.log(`新增: ${planData.year} ${planData.collegeName} - ${planData.majorName}`);
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
  console.log('使用方法: npm run import-enrollment-plans <excel文件路径>');
  console.log('示例: npm run import-enrollment-plans ./data/enrollment_plans.xlsx');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
importEnrollmentPlans(filePath);
