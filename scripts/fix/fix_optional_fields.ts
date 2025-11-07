#!/usr/bin/env ts-node
/**
 * 修复可选字段的undefined错误
 * 通过添加 || "" 或 || [] 来处理可能为undefined的字段
 */
import * as fs from 'fs';
import * as path from 'path';

const fileFixes: { file: string; fixes: Array<{search: RegExp; replace: string; desc: string}> }[] = [
  {
    file: 'src/services/agent/recommendation.service.ts',
    fixes: [
      {
        search: /getProvinceAdmissionScores\(college\.id!, province, subjectType\)/g,
        replace: 'getProvinceAdmissionScores(college.id!, province || "", subjectType || "")',
        desc: 'Add null coalescing for province and subjectType'
      }
    ]
  },
  {
    file: 'src/services/agent/recommendation_new.service.ts',
    fixes: [
      {
        search: /majorCodes: plans\.map\(p => p\.majorCode\)\.filter\(Boolean\),/g,
        replace: 'majorCodes: plans.map(p => p.majorCode).filter((code): code is string => Boolean(code)),',
        desc: 'Add type guard for majorCode filter'
      }
    ]
  },
  {
    file: 'src/services/agent/score-ranking-recommendation.service.ts',
    fixes: [
      {
        search: /majorGroupCode: plan\.majorGroupCode,/g,
        replace: 'majorGroupCode: plan.majorGroupCode || "",',
        desc: 'Add default value for majorGroupCode'
      },
      {
        search: /majorGroupName: plan\.majorGroupName,/g,
        replace: 'majorGroupName: plan.majorGroupName || "",',
        desc: 'Add default value for majorGroupName'
      },
      {
        search: /majorCode: m\.majorCode,/g,
        replace: 'majorCode: m.majorCode || "",',
        desc: 'Add default value for m.majorCode'
      },
      {
        search: /majorName: m\.majorName,/g,
        replace: 'majorName: m.majorName || "",',
        desc: 'Add default value for m.majorName'
      }
    ]
  },
  {
    file: 'src/services/collegeMatch.service.ts',
    fixes: [
      {
        search: /this\.getRecentAdmissionScores\(filter\.preferredCollegeId, filter\.province, filter\.subjectType\)/g,
        replace: 'this.getRecentAdmissionScores(filter.preferredCollegeId, filter.province || "", filter.subjectType || "")',
        desc: 'Add null coalescing for province and subjectType'
      },
      {
        search: /\.getAdmissionScores\(plan\.collegeId, province, subjectType\)/g,
        replace: '.getAdmissionScores(plan.collegeId, province || "", subjectType || "")',
        desc: 'Add null coalescing for province and subjectType'
      }
    ]
  },
  {
    file: 'src/services/enrollmentPlanDetail.service.ts',
    fixes: [
      {
        search: /collegeName: plan\.collegeName,/g,
        replace: 'collegeName: plan.collegeName || "",',
        desc: 'Add default value for collegeName'
      },
      {
        search: /collegeProvince: plan\.collegeProvince,/g,
        replace: 'collegeProvince: plan.collegeProvince || "",',
        desc: 'Add default value for collegeProvince'
      },
      {
        search: /collegeCity: plan\.collegeCity,/g,
        replace: 'collegeCity: plan.collegeCity || "",',
        desc: 'Add default value for collegeCity'
      }
    ]
  },
  {
    file: 'src/services/majorFilter.service.ts',
    fixes: [
      {
        search: /collegeCode: plan\.collegeCode,/g,
        replace: 'collegeCode: plan.collegeCode || "",',
        desc: 'Add default value for collegeCode'
      }
    ]
  },
  {
    file: 'src/services/major.service.ts',
    fixes: [
      {
        search: /embeddingText: embeddingText,/g,
        replace: '// embeddingText: embeddingText, // Not in CoreMajor schema',
        desc: 'Comment out embeddingText field'
      }
    ]
  }
];

console.log('\n🔧 修复可选字段的undefined错误\n');
console.log('=' + '='.repeat(80) + '\n');

let fixedCount = 0;

fileFixes.forEach(({ file, fixes }) => {
  const fullPath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  文件不存在: ${file}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;
  let fileChanged = false;

  fixes.forEach(fix => {
    const beforeChange = content;
    content = content.replace(fix.search, fix.replace);
    if (content !== beforeChange) {
      console.log(`✅ ${fix.desc}`);
      console.log(`   文件: ${path.basename(file)}\n`);
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
