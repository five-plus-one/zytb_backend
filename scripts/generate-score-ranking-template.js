/**
 * 生成一分一段表 Excel 导入模板
 *
 * 使用方法:
 * node scripts/generate-score-ranking-template.js
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 创建示例数据
const createSampleData = () => {
  const data = [
    // 表头
    {
      '年份': '年份',
      '省份': '省份',
      '科类': '科类',
      '分数': '分数',
      '人数': '人数',
      '累计人数': '累计人数',
      '位次': '位次'
    }
  ];

  // 生成示例数据（河南省 2024 年物理类）
  let cumulativeCount = 0;
  for (let score = 700; score >= 650; score--) {
    const count = Math.floor(Math.random() * 50) + 10; // 每个分数 10-60 人
    cumulativeCount += count;

    data.push({
      '年份': 2024,
      '省份': '河南',
      '科类': '物理类',
      '分数': score,
      '人数': count,
      '累计人数': cumulativeCount,
      '位次': cumulativeCount - count + 1
    });
  }

  // 生成示例数据（河南省 2024 年历史类）
  cumulativeCount = 0;
  for (let score = 650; score >= 600; score--) {
    const count = Math.floor(Math.random() * 40) + 8; // 每个分数 8-48 人
    cumulativeCount += count;

    data.push({
      '年份': 2024,
      '省份': '河南',
      '科类': '历史类',
      '分数': score,
      '人数': count,
      '累计人数': cumulativeCount,
      '位次': cumulativeCount - count + 1
    });
  }

  return data;
};

// 创建空白模板
const createEmptyTemplate = () => {
  return [
    {
      '年份': '示例：2024',
      '省份': '示例：河南',
      '科类': '示例：物理类',
      '分数': '示例：700',
      '人数': '示例：15',
      '累计人数': '示例：15',
      '位次': '示例：1'
    },
    {
      '年份': '',
      '省份': '',
      '科类': '',
      '分数': '',
      '人数': '',
      '累计人数': '',
      '位次': ''
    }
  ];
};

// 生成 Excel 文件
const generateExcel = () => {
  try {
    // 确保目录存在
    const templateDir = path.join(__dirname, '../docs/templates');
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    // 生成示例数据文件
    const sampleData = createSampleData();
    const sampleWs = XLSX.utils.json_to_sheet(sampleData, { skipHeader: true });

    // 设置列宽
    sampleWs['!cols'] = [
      { wch: 8 },   // 年份
      { wch: 12 },  // 省份
      { wch: 12 },  // 科类
      { wch: 8 },   // 分数
      { wch: 8 },   // 人数
      { wch: 12 },  // 累计人数
      { wch: 8 }    // 位次
    ];

    const sampleWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(sampleWb, sampleWs, '一分一段表');

    const sampleFilePath = path.join(templateDir, 'score-ranking-sample.xlsx');
    XLSX.writeFile(sampleWb, sampleFilePath);
    console.log(`✅ 示例数据文件已生成: ${sampleFilePath}`);

    // 生成空白模板文件
    const emptyData = createEmptyTemplate();
    const emptyWs = XLSX.utils.json_to_sheet(emptyData, { skipHeader: true });

    // 设置列宽
    emptyWs['!cols'] = [
      { wch: 15 },  // 年份
      { wch: 15 },  // 省份
      { wch: 15 },  // 科类
      { wch: 15 },  // 分数
      { wch: 15 },  // 人数
      { wch: 15 },  // 累计人数
      { wch: 15 }   // 位次
    ];

    const emptyWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(emptyWb, emptyWs, '一分一段表');

    const emptyFilePath = path.join(templateDir, 'score-ranking-template.xlsx');
    XLSX.writeFile(emptyWb, emptyFilePath);
    console.log(`✅ 空白模板文件已生成: ${emptyFilePath}`);

    console.log('\n📋 使用说明:');
    console.log('1. score-ranking-template.xlsx - 空白模板，可直接填写数据');
    console.log('2. score-ranking-sample.xlsx - 示例数据，供参考格式\n');

  } catch (error) {
    console.error('❌ 生成模板失败:', error.message);
    process.exit(1);
  }
};

// 执行生成
generateExcel();
