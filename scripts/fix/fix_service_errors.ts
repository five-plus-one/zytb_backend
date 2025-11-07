#!/usr/bin/env ts-node
/**
 * 修复服务中的类型错误和字段引用问题
 */
import * as fs from 'fs';
import * as path from 'path';

interface Fix {
  file: string;
  search: string | RegExp;
  replace: string;
  description: string;
}

const fixes: Fix[] = [
  // Fix AdmissionScore type reference in college.service.ts
  {
    file: 'src/services/college.service.ts',
    search: /\bAdmissionScore\b(?!\.)/g,
    replace: 'CoreAdmissionScore',
    description: 'Replace AdmissionScore with CoreAdmissionScore'
  },

  // Fix College type reference in entityExtraction.service.ts and groupDetail.service.ts
  {
    file: 'src/services/entityExtraction.service.ts',
    search: /: College\b/g,
    replace: ': CoreCollege',
    description: 'Replace College type with CoreCollege'
  },
  {
    file: 'src/services/entityExtraction.service.ts',
    search: /: Major\b/g,
    replace: ': CoreMajor',
    description: 'Replace Major type with CoreMajor'
  },
  {
    file: 'src/services/groupDetail.service.ts',
    search: /: College\b/g,
    replace: ': CoreCollege',
    description: 'Replace College type with CoreCollege'
  },
  {
    file: 'src/services/collegeMatch.service.ts',
    search: /: College\b/g,
    replace: ': CoreCollege',
    description: 'Replace College type with CoreCollege'
  },

  // Fix plan.college references -> use redundant fields
  {
    file: 'src/services/agent/embedding-recommendation.service.ts',
    search: /plan\.college\.name/g,
    replace: 'plan.collegeName',
    description: 'Replace plan.college.name with plan.collegeName'
  },
  {
    file: 'src/services/agent/embedding-recommendation.service.ts',
    search: /plan\.college\.province/g,
    replace: 'plan.collegeProvince',
    description: 'Replace plan.college.province with plan.collegeProvince'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    search: /plan\.college\.name/g,
    replace: 'plan.collegeName',
    description: 'Replace plan.college.name'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    search: /plan\.college\.province/g,
    replace: 'plan.collegeProvince',
    description: 'Replace plan.college.province'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    search: /plan\.college\.city/g,
    replace: 'plan.collegeCity',
    description: 'Replace plan.college.city'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    search: /plan\.college\.is985/g,
    replace: 'plan.collegeIs985',
    description: 'Replace plan.college.is985'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    search: /plan\.college\.is211/g,
    replace: 'plan.collegeIs211',
    description: 'Replace plan.college.is211'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    search: /plan\.college\.isWorldClass/g,
    replace: 'plan.collegeIsWorldClass',
    description: 'Replace plan.college.isWorldClass'
  },

  // Fix collegeMajorGroupCode -> majorGroupCode
  {
    file: 'src/services/agent/score-ranking-recommendation.service.ts',
    search: /\.collegeMajorGroupCode/g,
    replace: '.majorGroupCode',
    description: 'Replace collegeMajorGroupCode with majorGroupCode'
  },

  // Fix optional string handling - add null checks
  {
    file: 'src/services/agent/recommendation.service.ts',
    search: /const provinceAdmissions = await this\.getProvinceAdmissionScores\(college\.id!, province, subjectType\);/g,
    replace: 'const provinceAdmissions = await this.getProvinceAdmissionScores(college.id || "", province || "", subjectType || "");',
    description: 'Add null coalescing for optional strings'
  },

  // Fix major.service embeddingText -> this needs manual handling based on context
  {
    file: 'src/services/major.service.ts',
    search: /embeddingText:/g,
    replace: '// embeddingText:',
    description: 'Comment out embeddingText (not in CoreMajor)'
  }
];

console.log('\n🔧 修复服务中的类型错误\n');
console.log('=' + '='.repeat(80) + '\n');

let fixedCount = 0;
let errorCount = 0;

fixes.forEach(fix => {
  const fullPath = path.resolve(process.cwd(), fix.file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${fix.file}`);
    errorCount++;
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;

  content = content.replace(fix.search, fix.replace);

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ ${fix.description}`);
    console.log(`   文件: ${path.basename(fix.file)}`);
    fixedCount++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n✅ 完成: ${fixedCount} 个修复`);
if (errorCount > 0) {
  console.log(`⚠️  错误: ${errorCount} 个文件未找到`);
}
console.log();
