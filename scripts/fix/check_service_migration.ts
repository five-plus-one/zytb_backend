#!/usr/bin/env ts-node
/**
 * 检查所有服务是否使用Core Layer实体
 */
import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

interface ServiceAnalysis {
  file: string;
  usesOldModels: string[];
  usesCoreModels: string[];
  needsMigration: boolean;
}

function analyzeService(filePath: string): ServiceAnalysis {
  const content = fs.readFileSync(filePath, 'utf-8');
  const analysis: ServiceAnalysis = {
    file: filePath.replace(/\\/g, '/'),
    usesOldModels: [],
    usesCoreModels: [],
    needsMigration: false
  };

  // 检查旧模型
  const oldModels = [
    'College',
    'Major',
    'AdmissionScore',
    'EnrollmentPlan',
    'CollegeCampusLife'
  ];

  const coreModels = [
    'CoreCollege',
    'CoreMajor',
    'CoreAdmissionScore',
    'CoreEnrollmentPlan',
    'CoreCampusLife',
    'CoreCollegeMajorRelation'
  ];

  oldModels.forEach(model => {
    // 排除agent相关的模型
    if (model === 'Major' && content.includes('AgentMajor')) {
      return;
    }

    const regex1 = new RegExp(`from ['"].*models\\/${model}['"]`, 'g');
    const regex2 = new RegExp(`from ['"].*models.*\\/${model}['"]`, 'g');
    const regex3 = new RegExp(`import.*${model}.*from`, 'g');

    if (regex1.test(content) || regex2.test(content) || regex3.test(content)) {
      // 确认不是Core模型
      if (!content.includes(`Core${model}`)) {
        analysis.usesOldModels.push(model);
      }
    }
  });

  coreModels.forEach(model => {
    const regex = new RegExp(`import.*${model}.*from`, 'g');
    if (regex.test(content)) {
      analysis.usesCoreModels.push(model);
    }
  });

  analysis.needsMigration = analysis.usesOldModels.length > 0 && analysis.usesCoreModels.length === 0;

  return analysis;
}

console.log('\n🔍 检查所有服务是否使用Core Layer\n');
console.log('=' + '='.repeat(80) + '\n');

// 获取所有服务文件
const serviceFiles = globSync('src/services/**/*.service.ts', {
  cwd: process.cwd(),
  absolute: true
});

const analyses: ServiceAnalysis[] = serviceFiles.map(analyzeService);

// 分类统计
const usingCore = analyses.filter(a => a.usesCoreModels.length > 0 && !a.needsMigration);
const usingOld = analyses.filter(a => a.needsMigration);
const usingBoth = analyses.filter(a => a.usesCoreModels.length > 0 && a.usesOldModels.length > 0);
const usingNeither = analyses.filter(a => a.usesCoreModels.length === 0 && a.usesOldModels.length === 0);

console.log('📊 统计结果:\n');
console.log(`   ✅ 已使用Core Layer: ${usingCore.length} 个服务`);
console.log(`   ⚠️  仍使用旧模型: ${usingOld.length} 个服务`);
console.log(`   🔄 混合使用: ${usingBoth.length} 个服务`);
console.log(`   ℹ️  不使用数据模型: ${usingNeither.length} 个服务\n`);

if (usingCore.length > 0) {
  console.log('✅ 已迁移到Core Layer的服务:\n');
  usingCore.forEach(a => {
    const fileName = path.basename(a.file);
    console.log(`   ${fileName}`);
    console.log(`      使用: ${a.usesCoreModels.join(', ')}`);
  });
  console.log();
}

if (usingOld.length > 0) {
  console.log('⚠️  需要迁移的服务:\n');
  usingOld.forEach(a => {
    const fileName = path.basename(a.file);
    const relPath = a.file.replace(process.cwd().replace(/\\/g, '/'), '').substring(1);
    console.log(`   ${fileName}`);
    console.log(`      路径: ${relPath}`);
    console.log(`      使用旧模型: ${a.usesOldModels.join(', ')}`);
  });
  console.log();
}

if (usingBoth.length > 0) {
  console.log('🔄 混合使用的服务:\n');
  usingBoth.forEach(a => {
    const fileName = path.basename(a.file);
    console.log(`   ${fileName}`);
    console.log(`      Core模型: ${a.usesCoreModels.join(', ')}`);
    console.log(`      旧模型: ${a.usesOldModels.join(', ')}`);
  });
  console.log();
}

console.log('=' + '='.repeat(80) + '\n');

if (usingOld.length > 0) {
  console.log('⚠️  需要迁移 ${usingOld.length} 个服务到Core Layer\n');
  console.log('建议优先迁移以下关键服务:\n');

  const priorityServices = [
    'college.service.ts',
    'major.service.ts',
    'admissionScore.service.ts',
    'enrollmentPlan.service.ts',
    'agent/tools.service.ts',
    'agent/search.service.ts'
  ];

  usingOld.forEach(a => {
    const fileName = path.basename(a.file);
    if (priorityServices.some(p => a.file.includes(p))) {
      console.log(`   🔥 ${fileName} (高优先级)`);
    }
  });
  console.log();
} else {
  console.log('✅ 所有服务已迁移到Core Layer!\n');
}
