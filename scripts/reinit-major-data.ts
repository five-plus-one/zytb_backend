import { DataSource } from 'typeorm';
import config from '../src/config';

const AppDataSource = new DataSource({
  ...config.database,
  entities: [],
  charset: 'utf8mb4'
});

async function reinitMajorData() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 1. 删除旧数据
    console.log('\n=== 删除旧的专业数据 ===');
    await AppDataSource.query('DELETE FROM majors');
    console.log('✅ 已删除旧的专业数据');

    // 2. 插入新数据 - 使用正确的UTF-8编码
    console.log('\n=== 插入新的正确编码专业数据 ===');

    const majors = [
      {
        id: 'major-001',
        name: '计算机科学与技术',
        code: '080901',
        category: '工学',
        subCategory: '计算机类',
        degree: '本科',
        degreeType: '工学学士',
        years: 4,
        isHot: true,
        tags: JSON.stringify(['高薪', '就业好', '前景广']),
        avgSalary: 12000,
        employmentRate: '95.5'
      },
      {
        id: 'major-002',
        name: '软件工程',
        code: '080902',
        category: '工学',
        subCategory: '计算机类',
        degree: '本科',
        degreeType: '工学学士',
        years: 4,
        isHot: true,
        tags: JSON.stringify(['高薪', '就业好']),
        avgSalary: 11000,
        employmentRate: '94.8'
      },
      {
        id: 'major-003',
        name: '人工智能',
        code: '080717T',
        category: '工学',
        subCategory: '计算机类',
        degree: '本科',
        degreeType: '工学学士',
        years: 4,
        isHot: true,
        tags: JSON.stringify(['热门', '高薪', '前沿']),
        avgSalary: 13000,
        employmentRate: '96.2'
      },
      {
        id: 'major-004',
        name: '数据科学与大数据技术',
        code: '080910T',
        category: '工学',
        subCategory: '计算机类',
        degree: '本科',
        degreeType: '工学学士',
        years: 4,
        isHot: true,
        tags: JSON.stringify(['热门', '高薪', '大数据']),
        avgSalary: 11500,
        employmentRate: '94.5'
      },
      {
        id: 'major-005',
        name: '电子信息工程',
        code: '080701',
        category: '工学',
        subCategory: '电子信息类',
        degree: '本科',
        degreeType: '工学学士',
        years: 4,
        isHot: false,
        tags: JSON.stringify(['技术密集', '就业稳定']),
        avgSalary: 9500,
        employmentRate: '92.3'
      },
      {
        id: 'major-006',
        name: '临床医学',
        code: '100201K',
        category: '医学',
        subCategory: '临床医学类',
        degree: '本科',
        degreeType: '医学学士',
        years: 5,
        isHot: true,
        tags: JSON.stringify(['高端', '稳定', '救死扶伤']),
        avgSalary: 10000,
        employmentRate: '93.5'
      },
      {
        id: 'major-007',
        name: '金融学',
        code: '020301K',
        category: '经济学',
        subCategory: '金融学类',
        degree: '本科',
        degreeType: '经济学学士',
        years: 4,
        isHot: true,
        tags: JSON.stringify(['热门', '高薪', '金融']),
        avgSalary: 10500,
        employmentRate: '91.8'
      },
      {
        id: 'major-008',
        name: '法学',
        code: '030101K',
        category: '法学',
        subCategory: '法学类',
        degree: '本科',
        degreeType: '法学学士',
        years: 4,
        isHot: false,
        tags: JSON.stringify(['专业性强', '社会地位高']),
        avgSalary: 9000,
        employmentRate: '88.5'
      },
      {
        id: 'major-009',
        name: '汉语言文学',
        code: '050101',
        category: '文学',
        subCategory: '中国语言文学类',
        degree: '本科',
        degreeType: '文学学士',
        years: 4,
        isHot: false,
        tags: JSON.stringify(['传统', '文化', '教育']),
        avgSalary: 7500,
        employmentRate: '87.2'
      },
      {
        id: 'major-010',
        name: '英语',
        code: '050201',
        category: '文学',
        subCategory: '外国语言文学类',
        degree: '本科',
        degreeType: '文学学士',
        years: 4,
        isHot: false,
        tags: JSON.stringify(['语言', '国际化']),
        avgSalary: 8000,
        employmentRate: '89.5'
      }
    ];

    for (const major of majors) {
      await AppDataSource.query(
        `INSERT INTO majors (
          id, name, code, category, sub_category, degree, degree_type, years,
          is_hot, tags, avg_salary, employment_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          major.id, major.name, major.code, major.category, major.subCategory,
          major.degree, major.degreeType, major.years, major.isHot,
          major.tags, major.avgSalary, major.employmentRate
        ]
      );
      console.log(`✅ 已插入: ${major.name} (${major.category})`);
    }

    // 3. 验证数据
    console.log('\n=== 验证插入的数据 ===');
    const result = await AppDataSource.query(
      'SELECT id, name, category, sub_category, degree, avg_salary FROM majors ORDER BY avg_salary DESC'
    );
    console.log('专业数据:');
    result.forEach((major: any) => {
      console.log(`  - ${major.name} (${major.category}-${major.sub_category}) - 平均薪资: ${major.avg_salary}`);
    });

    await AppDataSource.destroy();
    console.log('\n✅ 专业数据重新初始化完成!');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

reinitMajorData();
