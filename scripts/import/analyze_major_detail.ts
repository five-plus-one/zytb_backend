#!/usr/bin/env ts-node
/**
 * 分析专业技术详细信息Excel文件
 * 文件：20251107_2_zyjsjxzb.xlsx
 */
import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../../data/20251107_2_zyjsjxzb.xlsx');

try {
  const workbook = XLSX.readFile(filePath);

  console.log('\n📊 Excel文件分析: 20251107_2_zyjsjxzb.xlsx\n');
  console.log('Sheet名称:', workbook.SheetNames.join(', '));

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log('\n总行数:', data.length);
  console.log('\n列名 (共' + Object.keys(data[0] || {}).length + '列):');
  if (data.length > 0) {
    Object.keys(data[0]).forEach((key, index) => {
      console.log(`  ${index + 1}. ${key}`);
    });
  }

  console.log('\n前1条数据示例:');
  if (data.length > 0) {
    console.log('\n--- 第1条 ---');
    Object.entries(data[0]).forEach(([key, value]) => {
      const displayValue = typeof value === 'string' && value.length > 80
        ? value.substring(0, 80) + '...'
        : value;
      console.log(`${key}: ${displayValue}`);
    });
  }

  // 检查与第一个文件的字段差异
  console.log('\n\n📋 与第一个文件的差异分析:');
  const file1Fields = ['学科门类', '专业类', '专业名称', '专业代码', '就业率', '专业是什么', '专业学什么'];
  const file2Fields = Object.keys(data[0] || {});

  console.log('\n新增字段:');
  file2Fields.forEach(f => {
    if (!file1Fields.includes(f)) {
      console.log(`  + ${f}`);
    }
  });

} catch (error) {
  console.error('读取文件失败:', error);
  process.exit(1);
}
