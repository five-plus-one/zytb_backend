// 专业系统功能测试
// 使用方法：ts-node test_major_system.ts

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

// 测试配置
const config = {
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

const api = axios.create(config);

// 测试数据
const testPreferences = {
  interests: ['编程', '算法', '人工智能', '数据分析'],
  careerGoals: ['软件工程师', '算法工程师', '数据科学家'],
  skills: ['逻辑思维', '数学', '英语', '团队协作'],
  subjects: ['物理', '数学', '信息技术'],
  industryPreferences: ['互联网', '科技', '金融科技']
};

async function testMajorSystem() {
  console.log('========================================');
  console.log('专业系统功能测试');
  console.log('========================================\n');

  try {
    // 1. 测试获取专业列表
    console.log('1️⃣  测试：获取专业列表');
    const listResponse = await api.get('/majors/list', {
      params: {
        pageNum: 1,
        pageSize: 5
      }
    });
    console.log(`   ✅ 成功获取 ${listResponse.data.data.total} 个专业`);
    console.log(`   📋 前5个专业：`);
    listResponse.data.data.list.forEach((major: any, index: number) => {
      console.log(`      ${index + 1}. ${major.name} (${major.code}) - ${major.category}`);
    });
    console.log();

    if (listResponse.data.data.list.length === 0) {
      console.log('   ⚠️  数据库中暂无专业数据，请先运行导入脚本');
      console.log('   💡 运行: npm run create-major-sample');
      console.log('   💡 然后: npm run import-majors ./data/sample_majors.xlsx\n');
      return;
    }

    const firstMajor = listResponse.data.data.list[0];

    // 2. 测试获取专业详情
    console.log('2️⃣  测试：获取专业详情');
    const detailResponse = await api.get(`/majors/${firstMajor.id}`);
    console.log(`   ✅ 成功获取专业详情：${detailResponse.data.data.name}`);
    console.log(`   📝 学科：${detailResponse.data.data.discipline || '未设置'}`);
    console.log(`   📝 门类：${detailResponse.data.data.category}`);
    console.log(`   📝 学制：${detailResponse.data.data.years}年`);
    if (detailResponse.data.data.courses?.length > 0) {
      console.log(`   📝 主修课程：${detailResponse.data.data.courses.slice(0, 3).join('、')}...`);
    }
    console.log();

    // 3. 测试获取专业优势院校
    console.log('3️⃣  测试：获取专业优势院校');
    try {
      const collegesResponse = await api.get(`/majors/${firstMajor.id}/colleges`);
      console.log(`   ✅ 该专业有 ${collegesResponse.data.data.total} 所优势院校`);
      if (collegesResponse.data.data.list.length > 0) {
        console.log(`   🏫 优势院校：`);
        collegesResponse.data.data.list.slice(0, 3).forEach((college: any) => {
          console.log(`      - ${college.name}`);
        });
      }
    } catch (error: any) {
      console.log(`   ℹ️  暂无优势院校数据`);
    }
    console.log();

    // 4. 测试生成嵌入向量（可选）
    console.log('4️⃣  测试：生成专业嵌入向量（可选）');
    try {
      const embeddingResponse = await api.post(`/majors/${firstMajor.id}/embedding`);
      console.log(`   ✅ ${embeddingResponse.data.data.message}`);
    } catch (error: any) {
      if (error.response?.status === 500) {
        console.log(`   ⚠️  未配置 OpenAI API Key，跳过嵌入向量生成`);
        console.log(`   💡 配置方法：在 .env 中设置 OPENAI_API_KEY`);
      } else {
        console.log(`   ❌ 生成失败：${error.message}`);
      }
    }
    console.log();

    // 5. 测试专业匹配（需要嵌入向量）
    console.log('5️⃣  测试：计算单个专业匹配度');
    try {
      const matchResponse = await api.post(
        `/majors/match/${firstMajor.id}`,
        testPreferences
      );
      console.log(`   ✅ 匹配度计算成功`);
      console.log(`   📊 专业：${matchResponse.data.data.major.name}`);
      console.log(`   📊 匹配分数：${matchResponse.data.data.matchScore}/100`);
      console.log(`   📊 匹配等级：${matchResponse.data.data.matchLevel}`);
    } catch (error: any) {
      if (error.response?.status === 500) {
        console.log(`   ⚠️  匹配功能需要先生成嵌入向量`);
        console.log(`   💡 运行: curl -X POST http://localhost:3000/api/majors/embeddings/generate-all`);
      } else {
        console.log(`   ❌ 匹配失败：${error.message}`);
      }
    }
    console.log();

    // 6. 测试所有专业匹配度排名
    console.log('6️⃣  测试：获取所有专业匹配度排名');
    try {
      const rankingResponse = await api.post(
        '/majors/match/ranking',
        testPreferences,
        {
          params: {
            pageNum: 1,
            pageSize: 5
          }
        }
      );
      console.log(`   ✅ 匹配排名计算成功`);
      console.log(`   📊 Top 5 匹配专业：`);
      rankingResponse.data.data.list.forEach((item: any, index: number) => {
        console.log(`      ${index + 1}. ${item.major.name} - ${item.matchScore}分 (${item.matchLevel})`);
      });
    } catch (error: any) {
      if (error.response?.status === 500) {
        console.log(`   ⚠️  匹配功能需要先生成嵌入向量`);
      } else {
        console.log(`   ❌ 排名失败：${error.message}`);
      }
    }
    console.log();

    // 7. 测试筛选功能
    console.log('7️⃣  测试：专业筛选功能');
    try {
      const filterResponse = await api.get('/majors/list', {
        params: {
          hot: true,
          pageNum: 1,
          pageSize: 5
        }
      });
      console.log(`   ✅ 筛选成功，找到 ${filterResponse.data.data.total} 个热门专业`);
      if (filterResponse.data.data.list.length > 0) {
        console.log(`   🔥 热门专业：`);
        filterResponse.data.data.list.forEach((major: any, index: number) => {
          console.log(`      ${index + 1}. ${major.name}`);
        });
      }
    } catch (error: any) {
      console.log(`   ❌ 筛选失败：${error.message}`);
    }
    console.log();

    console.log('========================================');
    console.log('✅ 测试完成！');
    console.log('========================================\n');

    console.log('📚 更多测试方法：');
    console.log('   - 查看 MAJOR_API_DOCUMENTATION.md');
    console.log('   - 使用 api-test.http 进行 API 测试');
    console.log('   - 查看 MAJOR_SYSTEM_SUMMARY.md 了解完整功能\n');

  } catch (error: any) {
    console.error('\n❌ 测试失败：', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  无法连接到服务器，请确保后端服务已启动');
      console.error('💡 运行: npm run dev\n');
    }
  }
}

// 运行测试
testMajorSystem().catch(console.error);
