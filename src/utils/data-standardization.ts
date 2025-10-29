/**
 * 数据标准化和补全工具
 * 一劳永逸地解决各个表字段缺失问题
 */

import { AppDataSource } from '../config/database';
import { StandardizationConfig, FieldCompletionConfig } from './standardization-config';

export class DataStandardizationTool {
  /**
   * 标准化院校名称
   */
  static standardizeCollegeName(name: string): string {
    if (!name) return name;

    let standardized = name.trim();

    // 检查是否有完全别名映射
    if (StandardizationConfig.collegeNameMapping.aliases[standardized]) {
      return StandardizationConfig.collegeNameMapping.aliases[standardized];
    }

    // 去除特定后缀
    for (const suffix of StandardizationConfig.collegeNameMapping.suffixToRemove) {
      standardized = standardized.replace(suffix, '');
    }

    // 应用替换规则
    for (const rule of StandardizationConfig.collegeNameMapping.replacements) {
      standardized = standardized.replace(rule.from, rule.to);
    }

    return standardized.trim();
  }

  /**
   * 标准化专业名称
   */
  static standardizeMajorName(name: string): string {
    if (!name) return name;

    let standardized = name.trim();

    // 去除特定后缀
    for (const suffix of StandardizationConfig.majorNameMapping.suffixToRemove) {
      standardized = standardized.replace(suffix, '');
    }

    // 应用替换规则
    for (const rule of StandardizationConfig.majorNameMapping.replacements) {
      standardized = standardized.replace(rule.from, rule.to);
    }

    return standardized.trim();
  }

  /**
   * 标准化省份名称
   */
  static standardizeProvinceName(name: string): string {
    if (!name) return name;
    return StandardizationConfig.provinceMapping[name] || name;
  }

  /**
   * 模糊匹配院校名称
   * 返回最相似的标准院校名称
   */
  static fuzzyMatchCollegeName(name: string, candidateNames: string[]): string | null {
    if (!name || candidateNames.length === 0) return null;

    const standardizedName = this.standardizeCollegeName(name);

    // 1. 完全匹配
    const exactMatch = candidateNames.find(c => this.standardizeCollegeName(c) === standardizedName);
    if (exactMatch) return exactMatch;

    // 2. 包含匹配（去掉独立学院后缀）
    const nameWithoutSuffix = standardizedName
      .replace(/学院$/, '')
      .replace(/大学.*学院$/, '大学');

    const partialMatch = candidateNames.find(c => {
      const candidateStandardized = this.standardizeCollegeName(c);
      return candidateStandardized.includes(nameWithoutSuffix) ||
             nameWithoutSuffix.includes(candidateStandardized);
    });

    if (partialMatch) return partialMatch;

    // 3. 相似度匹配（基于编辑距离）
    let bestMatch: string | null = null;
    let minDistance = Infinity;

    for (const candidate of candidateNames) {
      const distance = this.levenshteinDistance(standardizedName, this.standardizeCollegeName(candidate));
      if (distance < minDistance && distance < standardizedName.length * 0.3) {
        minDistance = distance;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  }

  /**
   * 计算编辑距离（用于模糊匹配）
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // 删除
            dp[i][j - 1] + 1,     // 插入
            dp[i - 1][j - 1] + 1  // 替换
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * 补全enrollment_plans表的院校信息
   */
  static async completeEnrollmentPlansFields() {
    console.log('\n=== 开始补全 enrollment_plans 表字段 ===');

    // 1. 检查是否需要添加新字段
    await this.addMissingColumns();

    // 2. 获取所有colleges数据
    const colleges = await AppDataSource.query(`
      SELECT id, name, province, city, is_985, is_211, is_world_class, code
      FROM colleges
    `);

    console.log(`📚 加载了 ${colleges.length} 所院校信息`);

    // 创建院校名称索引（包括标准化后的名称）
    const collegeMap = new Map<string, any>();
    colleges.forEach((college: any) => {
      const standardName = this.standardizeCollegeName(college.name);
      collegeMap.set(college.name, college);
      collegeMap.set(standardName, college);
    });

    // 3. 分批更新enrollment_plans
    const batchSize = 1000;
    let totalUpdated = 0;
    let offset = 0;

    while (true) {
      const plans = await AppDataSource.query(`
        SELECT id, college_name, college_code
        FROM enrollment_plans
        WHERE college_province IS NULL OR college_city IS NULL
        LIMIT ? OFFSET ?
      `, [batchSize, offset]);

      if (plans.length === 0) break;

      console.log(`\n处理第 ${offset + 1} - ${offset + plans.length} 条记录...`);

      for (const plan of plans) {
        // 尝试匹配院校
        let college = collegeMap.get(plan.college_name);

        if (!college) {
          // 尝试标准化后匹配
          const standardName = this.standardizeCollegeName(plan.college_name);
          college = collegeMap.get(standardName);
        }

        if (!college) {
          // 尝试模糊匹配
          const candidateNames = Array.from(collegeMap.keys());
          const matchedName = this.fuzzyMatchCollegeName(plan.college_name, candidateNames);
          if (matchedName) {
            college = collegeMap.get(matchedName);
          }
        }

        if (college) {
          // 更新字段
          await AppDataSource.query(`
            UPDATE enrollment_plans
            SET
              college_province = ?,
              college_city = ?,
              college_is_985 = ?,
              college_is_211 = ?,
              college_is_world_class = ?
            WHERE id = ?
          `, [
            college.province,
            college.city,
            college.is_985 || false,
            college.is_211 || false,
            college.is_world_class || false,
            plan.id
          ]);

          totalUpdated++;
        } else {
          console.log(`  ⚠️ 未匹配到院校: ${plan.college_name}`);
        }
      }

      offset += batchSize;

      if (plans.length < batchSize) break;
    }

    console.log(`\n✅ 完成！共更新 ${totalUpdated} 条记录`);
  }

  /**
   * 补全colleges表的code字段
   */
  static async completeCollegesCodeField() {
    console.log('\n=== 开始补全 colleges 表的 code 字段 ===');

    // 从enrollment_plans获取院校代码
    const codeMapping = await AppDataSource.query(`
      SELECT DISTINCT college_name, college_code
      FROM enrollment_plans
      WHERE college_code IS NOT NULL
    `);

    console.log(`📚 从enrollment_plans获取了 ${codeMapping.length} 个院校代码映射`);

    let totalUpdated = 0;

    for (const mapping of codeMapping) {
      // 检查该code是否已被使用
      const existingCode = await AppDataSource.query(`
        SELECT id FROM colleges WHERE code = ?
      `, [mapping.college_code]);

      if (existingCode.length > 0) {
        // 该code已被其他院校使用，跳过
        continue;
      }

      // 尝试匹配colleges表中的院校
      const colleges = await AppDataSource.query(`
        SELECT id, name, code
        FROM colleges
        WHERE (code IS NULL OR code = '')
        AND (name = ? OR name LIKE ?)
      `, [mapping.college_name, `%${mapping.college_name}%`]);

      if (colleges.length > 0) {
        // 只更新第一个匹配的院校，避免重复code
        const college = colleges[0];

        try {
          await AppDataSource.query(`
            UPDATE colleges
            SET code = ?
            WHERE id = ?
          `, [mapping.college_code, college.id]);

          console.log(`  ✓ 更新 ${college.name} 的代码为 ${mapping.college_code}`);
          totalUpdated++;
        } catch (error: any) {
          if (error.message.includes('Duplicate entry')) {
            console.log(`  ⚠️ 代码 ${mapping.college_code} 已被占用，跳过 ${college.name}`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log(`\n✅ 完成！共更新 ${totalUpdated} 条记录`);
  }

  /**
   * 补全admission_scores表的字段
   */
  static async completeAdmissionScoresFields() {
    console.log('\n=== 开始补全 admission_scores 表字段 ===');

    // 添加缺失的字段
    await this.addMissingColumnsToAdmissionScores();

    // 获取colleges数据
    const colleges = await AppDataSource.query(`
      SELECT name, province, code
      FROM colleges
    `);

    const collegeMap = new Map<string, any>();
    colleges.forEach((c: any) => {
      collegeMap.set(c.name, c);
      collegeMap.set(this.standardizeCollegeName(c.name), c);
    });

    console.log(`📚 加载了 ${colleges.length} 所院校信息`);

    const batchSize = 1000;
    let totalUpdated = 0;
    let offset = 0;

    while (true) {
      const scores = await AppDataSource.query(`
        SELECT id, college_name
        FROM admission_scores
        WHERE college_province IS NULL
        LIMIT ? OFFSET ?
      `, [batchSize, offset]);

      if (scores.length === 0) break;

      for (const score of scores) {
        let college = collegeMap.get(score.college_name) ||
                      collegeMap.get(this.standardizeCollegeName(score.college_name));

        if (college) {
          await AppDataSource.query(`
            UPDATE admission_scores
            SET college_province = ?, college_code = ?
            WHERE id = ?
          `, [college.province, college.code, score.id]);

          totalUpdated++;
        }
      }

      offset += batchSize;
      if (scores.length < batchSize) break;
    }

    console.log(`\n✅ 完成！共更新 ${totalUpdated} 条记录`);
  }

  /**
   * 添加缺失的列到enrollment_plans表
   */
  private static async addMissingColumns() {
    const columns = [
      { name: 'college_province', type: 'VARCHAR(50)' },
      { name: 'college_city', type: 'VARCHAR(50)' },
      { name: 'college_is_985', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'college_is_211', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'college_is_world_class', type: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const col of columns) {
      try {
        await AppDataSource.query(`
          ALTER TABLE enrollment_plans
          ADD COLUMN ${col.name} ${col.type}
        `);
        console.log(`✓ 添加列: ${col.name}`);
      } catch (error: any) {
        // 列可能已存在，忽略错误
        if (!error.message.includes('Duplicate column')) {
          console.log(`  - 列 ${col.name} 已存在或添加失败: ${error.message}`);
        }
      }
    }
  }

  /**
   * 添加缺失的列到admission_scores表
   */
  private static async addMissingColumnsToAdmissionScores() {
    const columns = [
      { name: 'college_province', type: 'VARCHAR(50)' },
      { name: 'college_code', type: 'VARCHAR(20)' }
    ];

    for (const col of columns) {
      try {
        await AppDataSource.query(`
          ALTER TABLE admission_scores
          ADD COLUMN ${col.name} ${col.type}
        `);
        console.log(`✓ 添加列: ${col.name}`);
      } catch (error: any) {
        if (!error.message.includes('Duplicate column')) {
          console.log(`  - 列 ${col.name} 已存在或添加失败`);
        }
      }
    }
  }

  /**
   * 执行完整的标准化流程
   */
  static async runFullStandardization() {
    console.log('\n🚀 开始完整的数据标准化流程...\n');

    try {
      await AppDataSource.initialize();
      console.log('✅ 数据库连接成功\n');

      // 1. 补全colleges表的code字段
      await this.completeCollegesCodeField();

      // 2. 补全enrollment_plans表的院校信息
      await this.completeEnrollmentPlansFields();

      // 3. 补全admission_scores表的字段
      await this.completeAdmissionScoresFields();

      console.log('\n🎉 数据标准化完成！');
    } catch (error: any) {
      console.error('\n❌ 标准化过程出错:', error.message);
      console.error(error.stack);
    } finally {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    }
  }
}
