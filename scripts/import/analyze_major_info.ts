#!/usr/bin/env ts-node
/**
 * 分析专业基本介绍Excel文件结构
 */
import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../../data/20251107_zyjbjs.xlsx');

try {
  const workbook = XLSX.readFile(filePath);

  console.log('📊 Excel文件分析:\n');
  console.log('Sheet名称:', workbook.SheetNames.join(', '));

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log('\n总行数:', data.length);
  console.log('\n列名:');
  if (data.length > 0) {
    Object.keys(data[0]).forEach((key, index) => {
      console.log(`  ${index + 1}. ${key}`);
    });
  }

  console.log('\n前2条数据示例:');
  data.slice(0, 2).forEach((row, i) => {
    console.log(`\n--- 第${i + 1}条 ---`);
    Object.entries(row).forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 100
        ? value.substring(0, 100) + '...'
        : value;
      console.log(`${key}: ${displayValue}`);
    });
  });

} catch (error) {
  console.error('读取文件失败:', error);
  process.exit(1);
}
