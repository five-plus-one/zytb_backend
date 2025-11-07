#!/usr/bin/env ts-node
/**
 * 修复服务中剩余的类型引用错误
 */
import * as fs from 'fs';
import * as path from 'path';

const FILES_TO_FIX = [
  'src/services/agent/embedding-recommendation.service.ts',
  'src/services/agent/recommendation.service.ts',
  'src/services/agent/recommendation_new.service.ts',
  'src/services/agent/score-ranking-recommendation.service.ts'
];

FILES_TO_FIX.forEach(filePath => {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;

  // 修复类型引用
  content = content.replace(/: Major\b/g, ': CoreMajor');
  content = content.replace(/: College\b/g, ': CoreCollege');
  content = content.replace(/: AdmissionScore\b/g, ': CoreAdmissionScore');
  content = content.replace(/: EnrollmentPlan\b/g, ': CoreEnrollmentPlan');

  content = content.replace(/\bMajor\[\]/g, 'CoreMajor[]');
  content = content.replace(/\bCollege\[\]/g, 'CoreCollege[]');
  content = content.replace(/\bAdmissionScore\[\]/g, 'CoreAdmissionScore[]');
  content = content.replace(/\bEnrollmentPlan\[\]/g, 'CoreEnrollmentPlan[]');

  content = content.replace(/Array<Major>/g, 'Array<CoreMajor>');
  content = content.replace(/Array<College>/g, 'Array<CoreCollege>');
  content = content.replace(/Array<AdmissionScore>/g, 'Array<CoreAdmissionScore>');
  content = content.replace(/Array<EnrollmentPlan>/g, 'Array<CoreEnrollmentPlan>');

  // 修复函数参数类型
  content = content.replace(/\(major: Major\)/g, '(major: CoreMajor)');
  content = content.replace(/\(college: College\)/g, '(college: CoreCollege)');
  content = content.replace(/\(score: AdmissionScore\)/g, '(score: CoreAdmissionScore)');
  content = content.replace(/\(plan: EnrollmentPlan\)/g, '(plan: CoreEnrollmentPlan)');

  // 修复泛型类型
  content = content.replace(/Promise<Major>/g, 'Promise<CoreMajor>');
  content = content.replace(/Promise<College>/g, 'Promise<CoreCollege>');
  content = content.replace(/Promise<AdmissionScore>/g, 'Promise<CoreAdmissionScore>');
  content = content.replace(/Promise<EnrollmentPlan>/g, 'Promise<CoreEnrollmentPlan>');

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ 修复: ${path.basename(filePath)}`);
  } else {
    console.log(`ℹ️  无变化: ${path.basename(filePath)}`);
  }
});

console.log('\n✅ 类型引用修复完成');
