import * as XLSX from 'xlsx';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Major } from '../src/models/Major';
import { College } from '../src/models/College';
import * as path from 'path';

// 加载环境变量
dotenv.config();

// 字段映射
const fieldMapping: Record<string, keyof Major> = {
  '专业代码': 'code',
  '专业名称': 'name',
  '学科': 'discipline',
  '门类': 'category',
  '子类': 'subCategory',
  '学位': 'degree',
  '学位类型': 'degreeType',
  '学制': 'years',
  '专业描述': 'description',
  '培养对象': 'trainingObjective',
  '是否热门': 'isHot',
  '平均薪资': 'avgSalary',
  '就业率': 'employmentRate',
  '职业方向': 'career'
};

// 数据源配置
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'volunteer_system',
  entities: [Major, College],
  synchronize: false,
  logging: true
});

// 转换布尔值
function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '是' || v === 'true' || v === '1' || v === 'yes';
  }
  return !!value;
}

// 转换数字
function parseNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? undefined : num;
}

// 解析数组（逗号或顿号分隔）
function parseArray(value: any): string[] | undefined {
  if (!value) return undefined;
  const str = String(value).trim();
  if (!str) return undefined;
  return str.split(/[,、;；]/).map(s => s.trim()).filter(s => s.length > 0);
}

// 解析 Excel 行数据
function parseRowData(row: any): Partial<Major> {
  const major: any = {};

  for (const [excelField, modelField] of Object.entries(fieldMapping)) {
    const value = row[excelField];

    if (value === null || value === undefined || value === '') continue;

    // 根据字段类型进行转换
    switch (modelField) {
      // 布尔类型
      case 'isHot':
        major[modelField] = parseBoolean(value);
        break;

      // 数字类型
      case 'years':
      case 'avgSalary':
        major[modelField] = parseNumber(value);
        break;

      case 'employmentRate':
        const rate = parseNumber(value);
        major[modelField] = rate ? rate : undefined;
        break;

      // 字符串类型
      default:
        major[modelField] = String(value).trim();
        break;
    }
  }

  // 解析数组字段
  if (row['匹配学科']) {
    major.requiredSubjects = parseArray(row['匹配学科']);
  }

  if (row['主修课程']) {
    major.courses = parseArray(row['主修课程']);
  }

  if (row['技能要求']) {
    major.skills = parseArray(row['技能要求']);
  }

  if (row['职业领域']) {
    major.careerFields = parseArray(row['职业领域']);
  }

  if (row['标签']) {
    major.tags = parseArray(row['标签']);
  }

  return major;
}

// 解析优势院校
async function parseAdvantageColleges(
  collegeRepository: any,
  row: any
): Promise<College[]> {
  const collegeNames = parseArray(row['优势院校']);
  if (!collegeNames || collegeNames.length === 0) return [];

  const colleges: College[] = [];

  for (const name of collegeNames) {
    const college = await collegeRepository.findOne({
      where: { name: name }
    });

    if (college) {
      colleges.push(college);
    } else {
      console.warn(`  警告: 未找到院校 "${name}"`);
    }
  }

  return colleges;
}

// 主函数
async function importMajors(filePath: string) {
  try {
    console.log('开始导入专业数据...');
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

    const majorRepository = AppDataSource.getRepository(Major);
    const collegeRepository = AppDataSource.getRepository(College);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // 批量导入数据
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as any;
        const majorData = parseRowData(row);

        // 检查必填字段（只需要专业名称和门类）
        if (!majorData.name || !majorData.category) {
          console.warn(`第 ${i + 2} 行数据缺少必填字段,跳过`);
          errorCount++;
          errors.push({
            row: i + 2,
            error: '缺少必填字段(专业名称/门类)'
          });
          continue;
        }

        // 解析优势院校
        const advantageColleges = await parseAdvantageColleges(collegeRepository, row);

        // 检查是否已存在（优先使用专业代码，如果没有则使用专业名称）
        let existing = null;
        if (majorData.code) {
          existing = await majorRepository.findOne({
            where: { code: majorData.code as string },
            relations: ['advantageColleges']
          });
        }

        // 如果没有专业代码或根据代码没找到，则按名称查找
        if (!existing) {
          existing = await majorRepository.findOne({
            where: { name: majorData.name as string },
            relations: ['advantageColleges']
          });
        }

        if (existing) {
          // 更新现有记录
          await majorRepository.update(existing.id, majorData);

          // 更新优势院校关联
          if (advantageColleges.length > 0) {
            existing.advantageColleges = advantageColleges;
            await majorRepository.save(existing);
          }

          const codeDisplay = majorData.code ? `(${majorData.code})` : '';
          console.log(`更新: ${majorData.name} ${codeDisplay}`);
        } else {
          // 创建新记录
          const major = majorRepository.create(majorData);
          major.advantageColleges = advantageColleges;
          await majorRepository.save(major);
          const codeDisplay = majorData.code ? `(${majorData.code})` : '';
          console.log(`新增: ${majorData.name} ${codeDisplay}`);
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
  console.log('使用方法: npm run import-majors <excel文件路径>');
  console.log('示例: npm run import-majors ./data/majors.xlsx');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
importMajors(filePath);
