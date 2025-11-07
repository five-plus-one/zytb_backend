#!/usr/bin/env ts-node
/**
 * 批量迁移服务到Core Layer
 * 自动替换导入语句和Repository引用
 */
import * as fs from 'fs';
import * as path from 'path';

const SERVICES_TO_MIGRATE = [
  'src/services/college.service.ts',
  'src/services/major.service.ts',
  'src/services/admissionScore.service.ts',
  'src/services/enrollmentPlan.service.ts',
  'src/services/collegeMatch.service.ts',
  'src/services/enrollmentPlanDetail.service.ts',
  'src/services/entityExtraction.service.ts',
  'src/services/groupDetail.service.ts',
  'src/services/majorFilter.service.ts',
  'src/services/volunteer.service.ts',
  'src/services/agent/tools.service.ts',
  'src/services/agent/recommendation.service.ts',
  'src/services/agent/recommendation_new.service.ts',
  'src/services/agent/score-ranking-recommendation.service.ts',
  'src/services/agent/embedding-recommendation.service.ts'
];

interface MigrationResult {
  file: string;
  success: boolean;
  changes: string[];
  errors: string[];
}

function migrateService(filePath: string): MigrationResult {
  const result: MigrationResult = {
    file: filePath,
    success: false,
    changes: [],
    errors: []
  };

  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      result.errors.push(`文件不存在: ${fullPath}`);
      return result;
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;

    // 1. 替换导入语句
    const imports = [
      { old: /from ['"]\.\.\/models\/College['"]/g, new: "from '../models/core/CoreCollege'", model: 'College' },
      { old: /from ['"]\.\.\/models\/Major['"]/g, new: "from '../models/core/CoreMajor'", model: 'Major' },
      { old: /from ['"]\.\.\/models\/AdmissionScore['"]/g, new: "from '../models/core/CoreAdmissionScore'", model: 'AdmissionScore' },
      { old: /from ['"]\.\.\/models\/EnrollmentPlan['"]/g, new: "from '../models/core/CoreEnrollmentPlan'", model: 'EnrollmentPlan' },
      { old: /from ['"]\.\.\/\.\.\/models\/College['"]/g, new: "from '../../models/core/CoreCollege'", model: 'College' },
      { old: /from ['"]\.\.\/\.\.\/models\/Major['"]/g, new: "from '../../models/core/CoreMajor'", model: 'Major' },
      { old: /from ['"]\.\.\/\.\.\/models\/AdmissionScore['"]/g, new: "from '../../models/core/CoreAdmissionScore'", model: 'AdmissionScore' },
      { old: /from ['"]\.\.\/\.\.\/models\/EnrollmentPlan['"]/g, new: "from '../../models/core/CoreEnrollmentPlan'", model: 'EnrollmentPlan' },
    ];

    imports.forEach(imp => {
      if (imp.old.test(content)) {
        content = content.replace(imp.old, imp.new);
        result.changes.push(`导入: ${imp.model} → Core${imp.model}`);
      }
    });

    // 2. 替换模型引用 (import { College } → import { CoreCollege })
    const modelRefs = [
      { old: /import\s*{\s*College\s*}/g, new: 'import { CoreCollege }' },
      { old: /import\s*{\s*Major\s*}/g, new: 'import { CoreMajor }' },
      { old: /import\s*{\s*AdmissionScore\s*}/g, new: 'import { CoreAdmissionScore }' },
      { old: /import\s*{\s*EnrollmentPlan\s*}/g, new: 'import { CoreEnrollmentPlan }' },
    ];

    modelRefs.forEach(ref => {
      if (ref.old.test(content)) {
        content = content.replace(ref.old, ref.new);
      }
    });

    // 3. 替换Repository类型声明
    const repoTypes = [
      { old: /Repository<College>/g, new: 'Repository<CoreCollege>' },
      { old: /Repository<Major>/g, new: 'Repository<CoreMajor>' },
      { old: /Repository<AdmissionScore>/g, new: 'Repository<CoreAdmissionScore>' },
      { old: /Repository<EnrollmentPlan>/g, new: 'Repository<CoreEnrollmentPlan>' },
      { old: /getRepository\(College\)/g, new: 'getRepository(CoreCollege)' },
      { old: /getRepository\(Major\)/g, new: 'getRepository(CoreMajor)' },
      { old: /getRepository\(AdmissionScore\)/g, new: 'getRepository(CoreAdmissionScore)' },
      { old: /getRepository\(EnrollmentPlan\)/g, new: 'getRepository(CoreEnrollmentPlan)' },
    ];

    repoTypes.forEach(type => {
      if (type.old.test(content)) {
        content = content.replace(type.old, type.new);
        result.changes.push(`Repository类型: ${type.old.source} → ${type.new}`);
      }
    });

    // 4. 替换字段名（Core Layer使用驼峰命名）
    const fieldMappings = [
      { old: /\.min_score\b/g, new: '.minScore' },
      { old: /\.max_score\b/g, new: '.maxScore' },
      { old: /\.avg_score\b/g, new: '.avgScore' },
      { old: /\.hot_level\b/g, new: '.hotLevel' },
      { old: /\.is_985\b/g, new: '.is985' },
      { old: /\.is_211\b/g, new: '.is211' },
      { old: /college\.rank/g, new: 'college.rank' }, // 保持不变
    ];

    fieldMappings.forEach(mapping => {
      if (mapping.old.test(content)) {
        content = content.replace(mapping.old, mapping.new);
      }
    });

    // 检查是否有实际更改
    if (content !== originalContent) {
      // 备份原文件
      const backupPath = fullPath + '.bak';
      fs.writeFileSync(backupPath, originalContent, 'utf-8');
      result.changes.push(`已创建备份: ${path.basename(backupPath)}`);

      // 写入新内容
      fs.writeFileSync(fullPath, content, 'utf-8');
      result.success = true;
      result.changes.push('✅ 文件已更新');
    } else {
      result.changes.push('ℹ️  无需更改（可能已迁移或不使用这些模型）');
      result.success = true;
    }

  } catch (error: any) {
    result.errors.push(`迁移失败: ${error.message}`);
  }

  return result;
}

console.log('🚀 开始批量迁移服务到Core Layer\n');
console.log('=' + '='.repeat(80) + '\n');

const results = SERVICES_TO_MIGRATE.map(migrateService);

// 输出结果
let successCount = 0;
let failCount = 0;

results.forEach((result, index) => {
  console.log(`${index + 1}. ${path.basename(result.file)}`);

  if (result.success) {
    successCount++;
    console.log('   ✅ 成功');
    if (result.changes.length > 0) {
      result.changes.forEach(change => console.log(`      ${change}`));
    }
  } else {
    failCount++;
    console.log('   ❌ 失败');
    if (result.errors.length > 0) {
      result.errors.forEach(error => console.log(`      ${error}`));
    }
  }
  console.log();
});

console.log('=' + '='.repeat(80) + '\n');
console.log(`✅ 成功: ${successCount} 个`);
console.log(`❌ 失败: ${failCount} 个\n`);

if (successCount > 0) {
  console.log('📝 注意:');
  console.log('   1. 已自动创建.bak备份文件');
  console.log('   2. 请手动检查迁移后的代码');
  console.log('   3. 某些字段名可能需要手动调整');
  console.log('   4. 建议运行TypeScript编译器检查错误: npm run build\n');
}
