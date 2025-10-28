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

  console.log('=== 1. 检查会话信息 ===');
  const [sessions] = await conn.query(`
    SELECT id, user_id, exam_score, province, subject_type, status
    FROM agent_sessions
    WHERE id = ?
  `, [sessionId]);
  console.table(sessions);

  if (sessions.length === 0) {
    console.log('会话不存在！');
    await conn.end();
    return;
  }

  const userId = sessions[0].user_id;

  console.log('\n=== 2. 检查用户偏好 ===');
  const [preferences] = await conn.query(`
    SELECT indicator_code, indicator_name, value, weight
    FROM agent_preferences
    WHERE user_id = ?
    ORDER BY indicator_code
  `, [userId]);
  console.table(preferences);

  console.log('\n=== 3. 检查目标专业偏好 ===');
  const targetMajor = preferences.find(p => p.indicator_name && p.indicator_name.includes('目标专业'));
  if (targetMajor) {
    console.log('目标专业偏好:', targetMajor.value);
  } else {
    console.log('❌ 未找到目标专业偏好！');
  }

  await conn.end();
}

check().catch(console.error);
