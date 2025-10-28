import { AppDataSource } from '../src/config/database';
import { EnrollmentPlan } from '../src/models/EnrollmentPlan';
import { College } from '../src/models/College';

/**
 * 自动诊断和修复数据库问题
 */

async function diagnoseAndFix() {
  console.log('🔍 开始诊断数据库问题...\n');

  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const enrollmentRepo = AppDataSource.getRepository(EnrollmentPlan);
    const collegeRepo = AppDataSource.getRepository(College);

    // 诊断1: 检查总记录数
    console.log('=== 诊断1: enrollment_plans总记录数 ===');
    const totalCount = await enrollmentRepo.count();
    console.log(`📊 总记录数: ${totalCount}`);

    if (totalCount === 0) {
      console.log('❌ 表是空的！需要导入招生计划数据。');
      console.log('   请使用导入脚本或手动导入数据。\n');
      process.exit(1);
    }

    // 诊断2: 检查字段值格式
    console.log('\n=== 诊断2: 检查实际的字段值格式 ===');
    const sampleData = await enrollmentRepo
      .createQueryBuilder('ep')
      .select(['ep.sourceProvince', 'ep.subjectType', 'ep.year'])
      .distinct(true)
      .orderBy('ep.year', 'DESC')
      .addOrderBy('ep.sourceProvince', 'ASC')
      .limit(20)
      .getMany();

    console.log('📋 数据样本:');
    sampleData.forEach(item => {
      console.log(`   省份: "${item.sourceProvince}", 科类: "${item.subjectType}", 年份: ${item.year}`);
    });

    // 诊断3: 检查江苏数据
    console.log('\n=== 诊断3: 检查江苏相关数据 ===');
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

    if (jiangsuData.length === 0) {
      console.log('❌ 没有找到江苏相关数据！');
      console.log('   数据库中可能使用了不同的省份名称。');
    } else {
      console.log('📊 江苏数据统计:');
      jiangsuData.forEach(item => {
        console.log(`   ${item.province} | ${item.subjectType} | ${item.year}年: ${item.count}条`);
      });
    }

    // 诊断4: 检查college_id关联
    console.log('\n=== 诊断4: 检查college_id关联情况 ===');
    const nullCollegeIdCount = await enrollmentRepo.count({
      where: { collegeId: null as any }
    });
    console.log(`📊 college_id为NULL的记录: ${nullCollegeIdCount}条`);

    // 诊断5: 检查年份分布
    console.log('\n=== 诊断5: 检查年份分布 ===');
    const yearDistribution = await enrollmentRepo
      .createQueryBuilder('ep')
      .select('ep.year', 'year')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ep.year')
      .orderBy('ep.year', 'DESC')
      .getRawMany();

    console.log('📊 年份分布:');
    yearDistribution.forEach(item => {
      console.log(`   ${item.year}年: ${item.count}条`);
    });

    const latestYear = yearDistribution[0]?.year;
    console.log(`\n✅ 数据库最新年份: ${latestYear}`);

    // 诊断6: 检查colleges表
    console.log('\n=== 诊断6: 检查colleges表 ===');
    const collegeCount = await collegeRepo.count();
    console.log(`📊 colleges表记录数: ${collegeCount}`);

    if (collegeCount === 0) {
      console.log('❌ colleges表是空的！需要先导入院校数据。');
    }

    // ============ 开始修复 ============
    console.log('\n\n🔧 开始自动修复...\n');

    let fixCount = 0;

    // 修复1: 关联college_id
    if (nullCollegeIdCount > 0 && collegeCount > 0) {
      console.log('=== 修复1: 关联college_id ===');

      const plansWithoutCollege = await enrollmentRepo.find({
        where: { collegeId: null as any },
        take: 1000 // 每次处理1000条
      });

      for (const plan of plansWithoutCollege) {
        const college = await collegeRepo.findOne({
          where: { name: plan.collegeName }
        });

        if (college) {
          plan.collegeId = college.id;
          await enrollmentRepo.save(plan);
          fixCount++;
        }
      }

      console.log(`✅ 已关联 ${fixCount} 条记录的college_id`);
    }

    // 输出修复建议
    console.log('\n\n📝 诊断总结和建议:\n');

    if (totalCount === 0) {
      console.log('❌ 问题: enrollment_plans表是空的');
      console.log('   解决方案: 导入招生计划数据');
      console.log('   命令: npm run import:enrollment-plans -- --file /path/to/file.xlsx\n');
    }

    if (jiangsuData.length === 0) {
      console.log('❌ 问题: 没有江苏省数据');
      console.log('   可能原因: 数据库中省份名称格式不同');
      console.log('   当前查询: "江苏"、"江苏省"');
      console.log('   建议: 检查实际的省份名称格式\n');
    } else {
      const jiangsuLatest = jiangsuData[0];
      if (jiangsuLatest.year < new Date().getFullYear()) {
        console.log(`⚠️  注意: 江苏省最新数据是${jiangsuLatest.year}年，不是${new Date().getFullYear()}年`);
        console.log(`   系统会自动使用${jiangsuLatest.year}年数据\n`);
      }
    }

    if (nullCollegeIdCount > fixCount) {
      console.log(`⚠️  注意: 还有 ${nullCollegeIdCount - fixCount} 条记录的college_id未关联`);
      console.log('   原因: colleges表中找不到对应的院校名称');
      console.log('   建议: 检查院校名称是否匹配\n');
    }

    if (collegeCount === 0) {
      console.log('❌ 问题: colleges表是空的');
      console.log('   解决方案: 先导入院校数据');
      console.log('   命令: npm run import:colleges -- --file /path/to/colleges.xlsx\n');
    }

    // 生成推荐的查询条件
    if (jiangsuData.length > 0) {
      const recommended = jiangsuData[0];
      console.log('✅ 推荐使用的查询条件:');
      console.log(`   省份: "${recommended.province}"`);
      console.log(`   科类: "${recommended.subjectType}"`);
      console.log(`   年份: ${recommended.year}`);
      console.log('\n   系统已配置兼容性查询，会自动匹配这些值。\n');
    }

    console.log('🎉 诊断完成！\n');

    if (fixCount > 0) {
      console.log(`✅ 已自动修复 ${fixCount} 个问题`);
    }

    await AppDataSource.destroy();

  } catch (error: any) {
    console.error('❌ 诊断失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行
diagnoseAndFix();
