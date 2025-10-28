import * as XLSX from 'xlsx';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { College } from '../src/models/College';
import * as path from 'path';

// 加载环境变量
dotenv.config();

// 字段映射
const fieldMapping: Record<string, keyof College> = {
  '学校名称': 'name',
  '新院校名称': 'newName',
  '排名': 'rank',
  '所在省': 'province',
  '城市': 'city',
  '类型': 'type',
  '隶属单位': 'affiliation',
  '是否985': 'is985',
  '是否211': 'is211',
  '一流大学': 'isWorldClass',
  '是否艺术': 'isArt',
  '国重/省重': 'keyLevel',
  '本科/专科': 'educationLevel',
  '保研率': 'postgraduateRate',
  '国家特色专业': 'nationalSpecialMajorCount',
  '省特色专业': 'provinceSpecialMajorCount',
  '是否国重点': 'isNationalKey',
  '世界一流': 'worldClassDisciplines',
  '是否双一流': 'isDoubleFirstClass',
  '成立时间': 'foundedYear',
  '女生比例': 'femaleRatio',
  '男生比例': 'maleRatio',
  '招办电话': 'admissionPhone',
  '电子邮箱': 'email',
  '通讯地址': 'address',
  '官网': 'website',
  '评估结果': 'evaluationResult',
  '大学简介': 'description'
};

// 数据源配置
const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'volunteer_system',
  entities: [College],
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

// 转换百分比为小数
function parsePercentage(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const str = String(value);
  if (str.includes('%')) {
    const num = parseFloat(str.replace('%', ''));
    return isNaN(num) ? undefined : num;
  }
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

// 解析 Excel 行数据
function parseRowData(row: any): Partial<College> {
  const college: any = {};

  for (const [excelField, modelField] of Object.entries(fieldMapping)) {
    const value = row[excelField];

    if (value === null || value === undefined || value === '') continue;

    // 根据字段类型进行转换
    switch (modelField) {
      // 布尔类型
      case 'is985':
      case 'is211':
      case 'isWorldClass':
      case 'isArt':
      case 'isNationalKey':
      case 'isDoubleFirstClass':
        college[modelField] = parseBoolean(value);
        break;

      // 数字类型
      case 'rank':
      case 'foundedYear':
      case 'nationalSpecialMajorCount':
      case 'provinceSpecialMajorCount':
        college[modelField] = parseNumber(value);
        break;

      // 百分比类型
      case 'postgraduateRate':
      case 'femaleRatio':
      case 'maleRatio':
        college[modelField] = parsePercentage(value);
        break;

      // 字符串类型
      default:
        college[modelField] = String(value).trim();
        break;
    }
  }

  return college;
}

// 主函数
async function importColleges(filePath: string) {
  try {
    console.log('开始导入院校数据...');
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

    const collegeRepository = AppDataSource.getRepository(College);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // 批量导入数据
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as any;
        const collegeData = parseRowData(row);

        // 检查必填字段
        if (!collegeData.name || !collegeData.province || !collegeData.city) {
          console.warn(`第 ${i + 2} 行数据缺少必填字段,跳过`);
          errorCount++;
          errors.push({
            row: i + 2,
            error: '缺少必填字段(学校名称/所在省/城市)'
          });
          continue;
        }

        // 检查是否已存在
        const existing = await collegeRepository.findOne({
          where: { name: collegeData.name as string }
        });

        if (existing) {
          // 更新现有记录
          await collegeRepository.update(existing.id, collegeData);
          console.log(`更新: ${collegeData.name}`);
        } else {
          // 创建新记录
          const college = collegeRepository.create(collegeData);
          await collegeRepository.save(college);
          console.log(`新增: ${collegeData.name}`);
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
  console.log('使用方法: npm run import-colleges <excel文件路径>');
  console.log('示例: npm run import-colleges ./data/colleges.xlsx');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
importColleges(filePath);
