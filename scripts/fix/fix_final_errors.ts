#!/usr/bin/env ts-node
/**
 * 最终修复 - 处理所有剩余的服务错误
 */
import * as fs from 'fs';
import * as path from 'path';

interface FileFix {
  file: string;
  line: number;
  search: string;
  replace: string;
  desc: string;
}

const fixes: FileFix[] = [
  // embedding-recommendation.service.ts - fix plan.college references
  {
    file: 'src/services/agent/embedding-recommendation.service.ts',
    line: 308,
    search: 'plan.college.province',
    replace: 'plan.collegeProvince',
    desc: 'Replace plan.college.province with plan.collegeProvince'
  },
  {
    file: 'src/services/agent/embedding-recommendation.service.ts',
    line: 319,
    search: 'plan.college.name',
    replace: 'plan.collegeName',
    desc: 'Replace plan.college.name with plan.collegeName'
  },
  {
    file: 'src/services/agent/embedding-recommendation.service.ts',
    line: 926,
    search: '(field)',
    replace: '(field: any)',
    desc: 'Add type annotation for field parameter'
  },
  {
    file: 'src/services/agent/embedding-recommendation.service.ts',
    line: 1310,
    search: '(field)',
    replace: '(field: any)',
    desc: 'Add type annotation for field parameter'
  },

  // recommendation.service.ts - fix getProvinceAdmissionScores calls
  {
    file: 'src/services/agent/recommendation.service.ts',
    line: 718,
    search: 'this.getProvinceAdmissionScores(college.id!,',
    replace: 'this.getProvinceAdmissionScores(college.id || "",',
    desc: 'Add null coalescing for college.id'
  },

  // recommendation_new.service.ts - fix major code filtering
  {
    file: 'src/services/agent/recommendation_new.service.ts',
    line: 260,
    search: 'majorCodes: plans.map(p => p.majorCode).filter(Boolean)',
    replace: 'majorCodes: plans.map(p => p.majorCode).filter((code): code is string => !!code)',
    desc: 'Add type guard for majorCode'
  },
  {
    file: 'src/services/agent/recommendation_new.service.ts',
    line: 329,
    search: 'majorCodes: plans.map(p => p.majorCode).filter(Boolean)',
    replace: 'majorCodes: plans.map(p => p.majorCode).filter((code): code is string => !!code)',
    desc: 'Add type guard for majorCode'
  },

  // score-ranking-recommendation.service.ts - fix major arrays
  {
    file: 'src/services/agent/score-ranking-recommendation.service.ts',
    line: 340,
    search: 'majorCode: m.majorCode,',
    replace: 'majorCode: m.majorCode || "",',
    desc: 'Add default for majorCode'
  },
  {
    file: 'src/services/agent/score-ranking-recommendation.service.ts',
    line: 340,
    search: 'majorName: m.majorName,',
    replace: 'majorName: m.majorName || "",',
    desc: 'Add default for majorName'
  },

  // collegeMatch.service.ts - fix getRecentAdmissionScores calls
  {
    file: 'src/services/collegeMatch.service.ts',
    line: 220,
    search: 'filter.province, filter.subjectType',
    replace: 'filter.province || "", filter.subjectType || ""',
    desc: 'Add default values'
  },
  {
    file: 'src/services/collegeMatch.service.ts',
    line: 243,
    search: 'province, subjectType',
    replace: 'province || "", subjectType || ""',
    desc: 'Add default values'
  },
  {
    file: 'src/services/collegeMatch.service.ts',
    line: 267,
    search: 'province, subjectType',
    replace: 'province || "", subjectType || ""',
    desc: 'Add default values'
  },

  // enrollmentPlanDetail.service.ts - fix plan.college references
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    line: 149,
    search: 'plan.college.name',
    replace: 'plan.collegeName',
    desc: 'Use redundant field'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    line: 151,
    search: 'plan.college.code',
    replace: 'plan.collegeCode',
    desc: 'Use redundant field'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    line: 152,
    search: 'plan.college.province',
    replace: 'plan.collegeProvince',
    desc: 'Use redundant field'
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    line: 157,
    search: 'plan.college.isWorldClass',
    replace: 'plan.collegeIsWorldClass',
    desc: 'Use redundant field'
  },

  // major.service.ts - fix embeddingText
  {
    file: 'src/services/major.service.ts',
    line: 120,
    search: 'embeddingText: embeddingText,',
    replace: '// embeddingText: embeddingText, // Not in CoreMajor',
    desc: 'Comment out embeddingText'
  },
  {
    file: 'src/services/major.service.ts',
    line: 258,
    search: 'major.advantageColleges || []',
    replace: '(major.advantageColleges || []).filter((c): c is string => typeof c === "string")',
    desc: 'Add type guard for advantageColleges'
  },

  // majorFilter.service.ts - fix collegeCode
  {
    file: 'src/services/majorFilter.service.ts',
    line: 181,
    search: 'collegeCode: plan.collegeCode,',
    replace: 'collegeCode: plan.collegeCode || "",',
    desc: 'Add default for collegeCode'
  },
  {
    file: 'src/services/majorFilter.service.ts',
    line: 181,
    search: 'majorCode: plan.majorCode,',
    replace: 'majorCode: plan.majorCode || "",',
    desc: 'Add default for majorCode'
  }
];

console.log('\n🔧 最终修复 - 处理所有剩余的服务错误\n');
console.log('=' + '='.repeat(80) + '\n');

let fixedCount = 0;
const fileContents = new Map<string, string>();

// Group fixes by file
const fixesByFile = new Map<string, FileFix[]>();
fixes.forEach(fix => {
  if (!fixesByFile.has(fix.file)) {
    fixesByFile.set(fix.file, []);
  }
  fixesByFile.get(fix.file)!.push(fix);
});

// Apply fixes file by file
fixesByFile.forEach((fileFixes, file) => {
  const fullPath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${file}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;
  let fileChanged = false;

  fileFixes.forEach(fix => {
    const beforeChange = content;
    content = content.replace(fix.search, fix.replace);
    if (content !== beforeChange) {
      console.log(`✅ ${fix.desc}`);
      console.log(`   文件: ${path.basename(file)} (line ~${fix.line})\n`);
      fileChanged = true;
      fixedCount++;
    }
  });

  if (fileChanged && content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
});

console.log('=' + '='.repeat(80));
console.log(`\n✅ 完成: ${fixedCount} 个修复\n`);
