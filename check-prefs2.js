require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const sessionId = '099ff94c-e859-44c9-839a-6501a44dc6ec';

  const [sessions] = await conn.query(`
    SELECT user_id FROM agent_sessions WHERE id = ?
  `, [sessionId]);

  const userId = sessions[0].user_id;

  console.log('=== 用户偏好 ===');
  const [preferences] = await conn.query(`
    SELECT indicator_id, indicator_name, value, confidence, is_latest
    FROM agent_preferences
    WHERE user_id = ? AND is_latest = 1
    ORDER BY indicator_id
  `, [userId]);

  console.log(`\n找到 ${preferences.length} 条偏好\n`);

  // 查找目标专业
  const targetMajor = preferences.find(p => 
    p.indicator_name && (
      p.indicator_name.includes('目标专业') ||
      p.indicator_name.includes('专业方向') ||
      p.indicator_name.includes('专业偏好')
    )
  );

  if (targetMajor) {
    console.log('✅ 找到目标专业偏好:');
    console.log('   指标ID:', targetMajor.indicator_id);
    console.log('   指标名:', targetMajor.indicator_name);
    console.log('   值:', JSON.stringify(targetMajor.value, null, 2));
    console.log('   置信度:', targetMajor.confidence);
  } else {
    console.log('❌ 未找到目标专业偏好！');
    console.log('\n所有偏好列表:');
    preferences.forEach(p => {
      console.log(`  - ${p.indicator_id}: ${p.indicator_name}`);
    });
  }

  await conn.end();
}

check().catch(console.error);
