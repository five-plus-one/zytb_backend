import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { College } from '../models/College';
import { ResponseUtil } from '../utils/response';

/**
 * 数据库诊断控制器
 */
export class DiagnosticController {
  /**
   * 诊断数据库问题
   * GET /api/diagnostic/database
   */
  static async diagnoseDatabase(req: Request, res: Response): Promise<void> {
    try {
      const enrollmentRepo = AppDataSource.getRepository(EnrollmentPlan);
      const collegeRepo = AppDataSource.getRepository(College);

      const diagnostics: any = {
        timestamp: new Date().toISOString(),
        issues: [],
        suggestions: [],
        data: {}
      };

      // 1. 检查总记录数
      const totalCount = await enrollmentRepo.count();
      diagnostics.data.totalEnrollmentPlans = totalCount;

      if (totalCount === 0) {
        diagnostics.issues.push('enrollment_plans表是空的');
        diagnostics.suggestions.push('需要导入招生计划数据');
      }

      // 2. 检查字段值格式
      const sampleData = await enrollmentRepo
        .createQueryBuilder('ep')
        .select(['ep.sourceProvince', 'ep.subjectType', 'ep.year'])
        .distinct(true)
        .orderBy('ep.year', 'DESC')
        .limit(10)
        .getMany();

      diagnostics.data.sampleData = sampleData.map(d => ({
        province: d.sourceProvince,
        subjectType: d.subjectType,
        year: d.year
      }));

      // 3. 检查江苏数据
      const jiangsuData = await enrollmentRepo
        .createQueryBuilder('ep')
        .select('ep.sourceProvince', 'province')
        .addSelect('ep.year', 'year')
        .addSelect('ep.subjectType', 'subjectType')
        .addSelect('COUNT(*)', 'count')
        .where('ep.sourceProvince LIKE :province', { province: '%江苏%' })
        .groupBy('ep.sourceProvince, ep.year, ep.subjectType')
        .orderBy('ep.year', 'DESC')
        .getRawMany();

      diagnostics.data.jiangsuData = jiangsuData;

      if (jiangsuData.length === 0) {
        diagnostics.issues.push('没有找到江苏省相关数据');
        diagnostics.suggestions.push('检查省份名称格式（可能是"江苏"、"江苏省"或其他格式）');
      }

      // 4. 检查college_id关联
      const nullCollegeIdCount = await enrollmentRepo
        .createQueryBuilder('ep')
        .where('ep.collegeId IS NULL')
        .getCount();

      diagnostics.data.nullCollegeIdCount = nullCollegeIdCount;

      if (nullCollegeIdCount > 0) {
        diagnostics.issues.push(`有 ${nullCollegeIdCount} 条记录的college_id为NULL`);
        diagnostics.suggestions.push('需要关联colleges表');
      }

      // 5. 检查年份分布
      const yearDistribution = await enrollmentRepo
        .createQueryBuilder('ep')
        .select('ep.year', 'year')
        .addSelect('COUNT(*)', 'count')
        .groupBy('ep.year')
        .orderBy('ep.year', 'DESC')
        .getRawMany();

      diagnostics.data.yearDistribution = yearDistribution;

      const latestYear = yearDistribution[0]?.year;
      const currentYear = new Date().getFullYear();

      if (latestYear && latestYear < currentYear) {
        diagnostics.issues.push(`数据库最新年份是${latestYear}，不是${currentYear}`);
        diagnostics.suggestions.push(`系统会自动使用${latestYear}年的数据`);
      }

      // 6. 检查colleges表
      const collegeCount = await collegeRepo.count();
      diagnostics.data.totalColleges = collegeCount;

      if (collegeCount === 0) {
        diagnostics.issues.push('colleges表是空的');
        diagnostics.suggestions.push('需要先导入院校数据');
      }

      // 7. 模拟用户查询
      const testQuery = {
        province: '江苏',
        subjectType: '物理类',
        year: currentYear
      };

      const testResult = await enrollmentRepo
        .createQueryBuilder('ep')
        .innerJoinAndSelect('ep.college', 'college')
        .where('ep.sourceProvince IN (:...provinces)', {
          provinces: ['江苏', '江苏省']
        })
        .andWhere('ep.subjectType IN (:...subjectTypes)', {
          subjectTypes: ['物理类', '物理']
        })
        .andWhere('ep.year = :year', { year: currentYear })
        .limit(5)
        .getMany();

      diagnostics.data.testQueryResult = {
        query: testQuery,
        resultCount: testResult.length,
        samples: testResult.slice(0, 3).map(p => ({
          college: p.college?.name,
          major: p.majorName,
          year: p.year
        }))
      };

      if (testResult.length === 0) {
        diagnostics.issues.push(`使用条件(省份:江苏, 科类:物理类, 年份:${currentYear})查询返回0条`);
      }

      // 总结
      diagnostics.summary = {
        totalIssues: diagnostics.issues.length,
        canAutoFix: nullCollegeIdCount > 0 && collegeCount > 0,
        status: diagnostics.issues.length === 0 ? 'healthy' : 'needs_attention'
      };

      ResponseUtil.success(res, diagnostics);
    } catch (error: any) {
      console.error('Diagnostic error:', error);
      ResponseUtil.error(res, error.message);
    }
  }

  /**
   * 自动修复数据库问题
   * POST /api/diagnostic/fix
   */
  static async fixDatabase(req: Request, res: Response): Promise<void> {
    try {
      const enrollmentRepo = AppDataSource.getRepository(EnrollmentPlan);
      const collegeRepo = AppDataSource.getRepository(College);

      const result: any = {
        timestamp: new Date().toISOString(),
        fixes: []
      };

      // 修复1: 关联college_id
      const plansWithoutCollege = await enrollmentRepo
        .createQueryBuilder('ep')
        .where('ep.collegeId IS NULL')
        .limit(1000)
        .getMany();

      let fixedCount = 0;
      for (const plan of plansWithoutCollege) {
        const college = await collegeRepo.findOne({
          where: { name: plan.collegeName }
        });

        if (college) {
          plan.collegeId = college.id;
          await enrollmentRepo.save(plan);
          fixedCount++;
        }
      }

      if (fixedCount > 0) {
        result.fixes.push({
          type: 'college_id_association',
          description: `关联了 ${fixedCount} 条记录的college_id`,
          count: fixedCount
        });
      }

      result.summary = {
        totalFixes: result.fixes.length,
        success: true
      };

      ResponseUtil.success(res, result);
    } catch (error: any) {
      console.error('Fix error:', error);
      ResponseUtil.error(res, error.message);
    }
  }
}
