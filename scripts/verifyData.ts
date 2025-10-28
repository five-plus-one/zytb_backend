import { AppDataSource, initDatabase } from '../src/config/database';
import { College } from '../src/models/College';

async function verifyData() {
  try {
    console.log('连接数据库...');
    await initDatabase();

    const collegeRepository = AppDataSource.getRepository(College);

    // 查询总数
    const total = await collegeRepository.count();
    console.log(`\n总院校数: ${total}`);

    // 查询 985 院校
    const count985 = await collegeRepository.count({ where: { is985: true } });
    console.log(`985院校: ${count985}`);

    // 查询 211 院校
    const count211 = await collegeRepository.count({ where: { is211: true } });
    console.log(`211院校: ${count211}`);

    // 查询双一流院校
    const countDoubleFirstClass = await collegeRepository.count({ where: { isDoubleFirstClass: true } });
    console.log(`双一流院校: ${countDoubleFirstClass}`);

    // 查询艺术类院校
    const countArt = await collegeRepository.count({ where: { isArt: true } });
    console.log(`艺术类院校: ${countArt}`);

    // 查看所有院校列表
    console.log('\n院校列表:');
    const colleges = await collegeRepository.find({
      order: { rank: 'ASC' }
    });

    colleges.forEach(college => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`名称: ${college.name}`);
      console.log(`排名: ${college.rank || 'N/A'}`);
      console.log(`省份: ${college.province} | 城市: ${college.city}`);
      console.log(`类型: ${college.type || 'N/A'} | 隶属: ${college.affiliation || 'N/A'}`);
      console.log(`985: ${college.is985 ? '是' : '否'} | 211: ${college.is211 ? '是' : '否'} | 双一流: ${college.isDoubleFirstClass ? '是' : '否'}`);
      console.log(`层次: ${college.educationLevel || 'N/A'} | 保研率: ${college.postgraduateRate ? college.postgraduateRate + '%' : 'N/A'}`);
      console.log(`招办电话: ${college.admissionPhone || 'N/A'}`);
      console.log(`官网: ${college.website || 'N/A'}`);
      if (college.worldClassDisciplines) {
        console.log(`世界一流学科: ${college.worldClassDisciplines}`);
      }
      console.log(`简介: ${college.description || 'N/A'}`);
    });

    console.log(`\n${'='.repeat(60)}\n`);

    await AppDataSource.destroy();
    console.log('验证完成!');
  } catch (error: any) {
    console.error('验证失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyData();
