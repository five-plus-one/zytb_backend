#!/usr/bin/env ts-node
/**
 * 分析专业就业信息Excel文件结构
 */
import * as XLSX from 'xlsx';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../../data/20251107_3_zyjyxxfx.xlsx');

console.log('📖 读取Excel文件:', filePath);

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// 转换为JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('\n📊 文件统计:');
console.log(`  工作表名称: ${sheetName}`);
console.log(`  数据行数: ${data.length}`);

if (data.length > 0) {
  const firstRow: any = data[0];
  const columns = Object.keys(firstRow);

  console.log(`\n📋 列名 (共${columns.length}列):`);
  columns.forEach((col, idx) => {
    console.log(`  ${idx + 1}. ${col}`);
  });

  console.log('\n📝 前3条数据示例:');
  data.slice(0, 3).forEach((row: any, idx) => {
    console.log(`\n--- 第 ${idx + 1} 条 ---`);
    columns.forEach(col => {
      const value = row[col];
      if (value !== undefined && value !== null && value !== '') {
        console.log(`  ${col}: ${typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value}`);
      }
    });
  });
}
