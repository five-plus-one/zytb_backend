#!/usr/bin/env ts-node
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.development') });

async function listTables() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'volunteer_system'
  });

  const [tables]: any = await conn.query('SHOW TABLES');

  console.log('\n数据库中的所有表:\n');

  const rawTables: string[] = [];
  const cleanedTables: string[] = [];
  const coreTables: string[] = [];
  const otherTables: string[] = [];

  tables.forEach((row: any) => {
    const tableName = Object.values(row)[0] as string;
    if (tableName.startsWith('raw_')) {
      rawTables.push(tableName);
    } else if (tableName.startsWith('cleaned_')) {
      cleanedTables.push(tableName);
    } else if (tableName.startsWith('core_')) {
      coreTables.push(tableName);
    } else {
      otherTables.push(tableName);
    }
  });

  console.log('📁 Raw Layer Tables:');
  rawTables.forEach(t => console.log(`   ${t}`));

  console.log('\n📁 Cleaned Layer Tables:');
  cleanedTables.forEach(t => console.log(`   ${t}`));

  console.log('\n📁 Core Layer Tables:');
  coreTables.forEach(t => console.log(`   ${t}`));

  console.log('\n📁 Other Tables:');
  otherTables.forEach(t => console.log(`   ${t}`));

  await conn.end();
}

listTables().catch(console.error);
