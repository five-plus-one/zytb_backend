import 'reflect-metadata';
import { AppDataSource } from '../src/config/database';

async function diagnoseHighScoreIssue() {
  console.log('🔍 诊断高分推荐问题（700分示例）\n');

  try {
    await AppDataSource.initialize();

    // 模拟用户：江苏物理类700分，位次126
    const userProfile = {
      score: 700,
      rank: 126,
      province: '江苏',
      category: '物理类',
      year: 2025
    };

    const preferences = {
      locations: ['江苏', '浙江'],
      majorCategories: ['自动化']
    };

    console.log('👤 用户档案:');
    console.log(`   分数: ${userProfile.score}`);
    console.log(`   位次: ${userProfile.rank}`);
    console.log(`   省份: ${userProfile.province}`);
    console.log(`   科类: ${userProfile.category}`);
    console.log(`   偏好: ${preferences.locations.join('、')} + ${preferences.majorCategories.join('、')}\n`);

    // 1. 查询符合条件的招生计划
    console.log('📋 第1步：查询招生计划');
    const enrollmentPlans = await AppDataSource.query(`
      SELECT
        college_name,
        college_province,
        major_group_name,
        major_name,
        college_is_985,
        college_is_211,
        COUNT(*) as count
      FROM enrollment_plans
      WHERE year = 2025
        AND source_province = '江苏'
        AND subject_type = '物理类'
        AND college_province IN ('江苏', '浙江')
        AND major_name LIKE '%自动化%'
      GROUP BY college_name, college_province, major_group_name, major_name, college_is_985, college_is_211
      LIMIT 20
    `);

    console.log(`   找到 ${enrollmentPlans.length} 个符合条件的专业组\n`);
    enrollmentPlans.forEach((plan: any, idx: number) => {
      const tags = [];
      if (plan.college_is_985) tags.push('985');
      if (plan.college_is_211) tags.push('211');
      console.log(`   ${idx + 1}. [${plan.college_province}] ${plan.college_name} - ${plan.major_name} ${tags.length > 0 ? `[${tags.join(',')}]` : ''}`);
    });

    // 2. 查看这些学校的历史分数
    console.log('\n📊 第2步：查询历史录取分数');
    const colleges = [...new Set(enrollmentPlans.map((p: any) => p.college_name))];

    for (const collegeName of colleges.slice(0, 5)) {
      const historicalScores = await AppDataSource.query(`
        SELECT year, min_score, min_rank, major_group, group_name
        FROM admission_scores
        WHERE college_name = ?
          AND source_province = '江苏'
          AND subject_type = '物理类'
        ORDER BY year DESC
        LIMIT 3
      `, [collegeName]);

      console.log(`\n   ${collegeName}:`);
      if (historicalScores.length === 0) {
        console.log(`     ⚠️  没有历史数据`);
      } else {
        historicalScores.forEach((score: any) => {
          console.log(`     ${score.year}年: 最低分=${score.min_score}, 最低位次=${score.min_rank}, 专业组=${score.major_group || score.group_name}`);
        });

        // 计算是否能录取
        const avgMinScore = historicalScores.reduce((sum: number, s: any) => sum + s.min_score, 0) / historicalScores.length;
        const avgMinRank = historicalScores.reduce((sum: number, s: any) => sum + s.min_rank, 0) / historicalScores.length;
        const scoreGap = userProfile.score - avgMinScore;
        const rankGap = avgMinRank - userProfile.rank;

        console.log(`     平均最低分: ${avgMinScore.toFixed(1)}, 用户分差: ${scoreGap > 0 ? '+' : ''}${scoreGap.toFixed(1)}`);
        console.log(`     平均最低位次: ${avgMinRank.toFixed(0)}, 用户位次差: ${rankGap > 0 ? '+' : ''}${rankGap.toFixed(0)}`);

        if (scoreGap > 20) {
          console.log(`     ✅ 录取概率很高（保）`);
        } else if (scoreGap > 10) {
          console.log(`     ✅ 录取概率较高（稳）`);
        } else if (scoreGap > 0) {
          console.log(`     ⚠️  有一定风险（稳/冲）`);
        } else {
          console.log(`     ❌ 分数偏低（冲）`);
        }
      }
    }

    // 3. 检查是否有数据关联问题
    console.log('\n\n🔗 第3步：检查数据关联问题');

    const unmatchedPlans = await AppDataSource.query(`
      SELECT DISTINCT ep.college_name, ep.college_code, ep.major_group_code
      FROM enrollment_plans ep
      LEFT JOIN admission_scores ads
        ON ep.college_code = ads.college_code
        AND ep.major_group_code = ads.group_code
        AND ads.source_province = '江苏'
        AND ads.subject_type = '物理类'
      WHERE ep.year = 2025
        AND ep.source_province = '江苏'
        AND ep.subject_type = '物理类'
        AND ep.college_province IN ('江苏', '浙江')
        AND ep.major_name LIKE '%自动化%'
        AND ads.id IS NULL
      LIMIT 10
    `);

    console.log(`   找到 ${unmatchedPlans.length} 个无法匹配历史数据的专业组:`);
    unmatchedPlans.forEach((plan: any) => {
      console.log(`     - ${plan.college_name} (code: ${plan.college_code}, group: ${plan.major_group_code})`);
    });

    // 4. 查询顶尖院校（985/211）是否被过滤
    console.log('\n\n🏆 第4步：检查顶尖院校');
    const top985 = await AppDataSource.query(`
      SELECT DISTINCT college_name, college_code
      FROM enrollment_plans
      WHERE year = 2025
        AND source_province = '江苏'
        AND subject_type = '物理类'
        AND college_province IN ('江苏', '浙江')
        AND college_is_985 = 1
      ORDER BY college_name
    `);

    console.log(`   江苏+浙江地区的985院校（共${top985.length}所）:`);
    top985.forEach((college: any) => {
      console.log(`     - ${college.college_name}`);
    });

    // 检查南京大学和东南大学的数据
    console.log('\n   特别检查：南京大学和东南大学');
    for (const collegeName of ['南京大学', '东南大学']) {
      const plans = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM enrollment_plans
        WHERE year = 2025
          AND source_province = '江苏'
          AND subject_type = '物理类'
          AND college_name = ?
      `, [collegeName]);

      const scores = await AppDataSource.query(`
        SELECT COUNT(*) as count
        FROM admission_scores
        WHERE college_name = ?
          AND source_province = '江苏'
          AND subject_type = '物理类'
      `, [collegeName]);

      console.log(`     ${collegeName}: 招生计划=${plans[0].count}条, 历史分数=${scores[0].count}条`);
    }

  } catch (error: any) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

diagnoseHighScoreIssue()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
