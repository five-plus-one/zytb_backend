import { DataSource } from 'typeorm';
import config from '../src/config';

const AppDataSource = new DataSource({
  ...config.database,
  entities: [],
  charset: 'utf8mb4'
});

async function reinitData() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 1. 删除旧数据
    console.log('\n=== 删除旧数据 ===');
    await AppDataSource.query('DELETE FROM colleges');
    console.log('✅ 已删除旧的院校数据');

    // 2. 插入新数据 - 使用正确的UTF-8编码
    console.log('\n=== 插入新的正确编码数据 ===');

    const colleges = [
      {
        id: 'college-001',
        name: '北京大学',
        code: '10001',
        province: '北京',
        city: '北京',
        type: '综合类',
        level: '985/211/双一流',
        nature: '公办',
        department: '教育部',
        rank: 1,
        minScore: 680,
        avgScore: 690,
        maxScore: 700,
        tags: JSON.stringify(['985', '211', '双一流']),
        features: JSON.stringify(['数学', '物理学', '化学'])
      },
      {
        id: 'college-002',
        name: '清华大学',
        code: '10002',
        province: '北京',
        city: '北京',
        type: '理工类',
        level: '985/211/双一流',
        nature: '公办',
        department: '教育部',
        rank: 2,
        minScore: 685,
        avgScore: 695,
        maxScore: 705,
        tags: JSON.stringify(['985', '211', '双一流']),
        features: JSON.stringify(['计算机科学', '工程学', '物理学'])
      },
      {
        id: 'college-003',
        name: '浙江大学',
        code: '10335',
        province: '浙江',
        city: '杭州',
        type: '综合类',
        level: '985/211/双一流',
        nature: '公办',
        department: '教育部',
        rank: 3,
        minScore: 670,
        avgScore: 680,
        maxScore: 690,
        tags: JSON.stringify(['985', '211', '双一流']),
        features: JSON.stringify(['计算机科学', '控制科学', '光学工程'])
      }
    ];

    for (const college of colleges) {
      await AppDataSource.query(
        `INSERT INTO colleges (
          id, name, code, province, city, type, level, nature, department,
          \`rank\`, min_score, avg_score, max_score, tags, features
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          college.id, college.name, college.code, college.province, college.city,
          college.type, college.level, college.nature, college.department,
          college.rank, college.minScore, college.avgScore, college.maxScore,
          college.tags, college.features
        ]
      );
      console.log(`✅ 已插入: ${college.name}`);
    }

    // 3. 验证数据
    console.log('\n=== 验证插入的数据 ===');
    const result = await AppDataSource.query(
      'SELECT id, name, province, city, type, level FROM colleges'
    );
    console.log('院校数据:');
    result.forEach((college: any) => {
      console.log(`  - ${college.name} (${college.province}${college.city}) - ${college.type}`);
    });

    await AppDataSource.destroy();
    console.log('\n✅ 数据重新初始化完成!');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

reinitData();
