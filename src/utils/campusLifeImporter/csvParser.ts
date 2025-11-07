/**
 * CSV解析器
 * 负责读取和解析校园生活问卷CSV文件
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * CSV原始行数据结构
 * 注意：Q4是学校名称，Q5-Q29是25个问题的答案，Q30可能是自由补充
 */
export interface CsvRawRow {
  答题序号: string;
  来源: string;
  Q1: string;  // 未使用（可能是匿名标识）
  Q2: string;  // 未使用（可能是邮箱）
  Q3: string;  // 未使用（可能是显示邮箱标识）
  Q4: string;  // *** 学校名称 ***
  Q5: string;  // 问题1: 宿舍是上床下桌吗？
  Q6: string;  // 问题2: 教室和宿舍有没有空调？
  Q7: string;  // 问题3: 有独立卫浴吗？没有独立浴室的话，澡堂离宿舍多远？
  Q8: string;  // 问题4: 有早自习、晚自习吗？
  Q9: string;  // 问题5: 有晨跑吗？
  Q10: string; // 问题6: 每学期跑步打卡的要求是多少公里，可以骑车吗？
  Q11: string; // 问题7: 寒暑假放多久，每年小学期有多长？
  Q12: string; // 问题8: 学校允许点外卖吗，取外卖的地方离宿舍楼多远？
  Q13: string; // 问题9: 学校交通便利吗，有地铁吗，在市区吗，不在的话进城要多久？
  Q14: string; // 问题10: 宿舍楼有洗衣机吗？
  Q15: string; // 问题11: 校园网怎么样？
  Q16: string; // 问题12: 每天断电断网吗，几点开始断？
  Q17: string; // 问题13: 食堂价格贵吗，会吃出异物吗？
  Q18: string; // 问题14: 洗澡热水供应时间？
  Q19: string; // 问题15: 校园内可以骑电瓶车吗，电池在哪能充电？
  Q20: string; // 问题16: 宿舍限电情况？
  Q21: string; // 问题17: 通宵自习有去处吗？
  Q22: string; // 问题18: 大一能带电脑吗？
  Q23: string; // 问题19: 学校里面用什么卡，饭堂怎样消费？
  Q24: string; // 问题20: 学校会给学生发银行卡吗？
  Q25: string; // 问题21: 学校的超市怎么样？
  Q26: string; // 问题22: 学校的收发快递政策怎么样？
  Q27: string; // 问题23: 学校里面的共享单车数目与种类如何？
  Q28: string; // 问题24: 现阶段学校的门禁情况如何？
  Q29: string; // 问题25: 宿舍晚上查寝吗，封寝吗，晚归能回去吗？
  Q30: string; // 自由补充
  开始时间: string;
  提交时间: string;
  答题时长: string;
  IP省份: string;
  IP城市: string;
  IP地址: string;
  浏览器: string;
  操作系统: string;
}

/**
 * 清洗后的CSV行数据
 * q1-q25对应原问卷的25个问题（CSV的Q5-Q29）
 */
export interface CleanedCsvRow {
  answerId: number;
  source: string;
  collegeName: string; // 来自CSV的Q4

  // 25个问题的答案（对应CSV的Q5-Q29）
  q1: string;   // Q5: 宿舍是上床下桌吗？
  q2: string;   // Q6: 教室和宿舍有没有空调？
  q3: string;   // Q7: 有独立卫浴吗？没有独立浴室的话，澡堂离宿舍多远？
  q4: string;   // Q8: 有早自习、晚自习吗？
  q5: string;   // Q9: 有晨跑吗？
  q6: string;   // Q10: 每学期跑步打卡的要求是多少公里，可以骑车吗？
  q7: string;   // Q11: 寒暑假放多久，每年小学期有多长？
  q8: string;   // Q12: 学校允许点外卖吗，取外卖的地方离宿舍楼多远？
  q9: string;   // Q13: 学校交通便利吗，有地铁吗，在市区吗，不在的话进城要多久？
  q10: string;  // Q14: 宿舍楼有洗衣机吗？
  q11: string;  // Q15: 校园网怎么样？
  q12: string;  // Q16: 每天断电断网吗，几点开始断？
  q13: string;  // Q17: 食堂价格贵吗，会吃出异物吗？
  q14: string;  // Q18: 洗澡热水供应时间？
  q15: string;  // Q19: 校园内可以骑电瓶车吗，电池在哪能充电？
  q16: string;  // Q20: 宿舍限电情况？
  q17: string;  // Q21: 通宵自习有去处吗？
  q18: string;  // Q22: 大一能带电脑吗？
  q19: string;  // Q23: 学校里面用什么卡，饭堂怎样消费？
  q20: string;  // Q24: 学校会给学生发银行卡吗？
  q21: string;  // Q25: 学校的超市怎么样？
  q22: string;  // Q26: 学校的收发快递政策怎么样？
  q23: string;  // Q27: 学校里面的共享单车数目与种类如何？
  q24: string;  // Q28: 现阶段学校的门禁情况如何？
  q25: string;  // Q29: 宿舍晚上查寝吗，封寝吗，晚归能回去吗？

  additionalAnswer: string; // Q30: 自由补充

  // 元数据
  startTime?: Date;
  submittedAt?: Date;
  ipProvince?: string;
  ipCity?: string;
  browser?: string;
  operatingSystem?: string;
}

/**
 * CSV解析器类
 */
export class CsvParser {
  /**
   * 读取并解析CSV文件
   */
  async parseCsv(filePath: string): Promise<CleanedCsvRow[]> {
    console.log(`[CsvParser] 读取CSV文件: ${filePath}`);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV文件不存在: ${filePath}`);
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // 解析CSV
    const records: CsvRawRow[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // 处理UTF-8 BOM
      relax_column_count: true // 允许列数不一致
    });

    console.log(`[CsvParser] 读取到 ${records.length} 条原始记录`);

    // 清洗数据
    const cleanedRows: CleanedCsvRow[] = [];
    for (const record of records) {
      try {
        const cleaned = this.cleanRow(record);
        if (cleaned) {
          cleanedRows.push(cleaned);
        }
      } catch (error) {
        console.warn(`[CsvParser] 清洗行数据失败:`, error);
      }
    }

    console.log(`[CsvParser] 清洗后有效记录: ${cleanedRows.length} 条`);

    return cleanedRows;
  }

  /**
   * 清洗单行数据
   */
  private cleanRow(raw: CsvRawRow): CleanedCsvRow | null {
    // 获取学校名称（Q4字段）
    const rawCollegeName = this.cleanText(raw.Q4);

    // 学校名称为空或无效，跳过
    if (!rawCollegeName || rawCollegeName === '[DESENSITIZED]' || rawCollegeName === '0') {
      return null;
    }

    // 清洗学校名称（参考原作者逻辑）
    const collegeName = this.cleanCollegeName(rawCollegeName);

    // 过滤掉明显不是大学的名称
    if (this.isInvalidCollegeName(collegeName)) {
      return null;
    }

    // 提取答题序号
    const answerId = this.parseNumber(raw.答题序号);

    return {
      answerId: answerId || 0,
      source: this.cleanText(raw.来源) || '',
      collegeName,

      // 正确映射：CSV的Q5-Q29 对应 q1-q25
      q1: this.cleanText(raw.Q5) || '',   // 宿舍是上床下桌吗？
      q2: this.cleanText(raw.Q6) || '',   // 教室和宿舍有没有空调？
      q3: this.cleanText(raw.Q7) || '',   // 有独立卫浴吗？
      q4: this.cleanText(raw.Q8) || '',   // 有早自习、晚自习吗？
      q5: this.cleanText(raw.Q9) || '',   // 有晨跑吗？
      q6: this.cleanText(raw.Q10) || '',  // 每学期跑步打卡的要求
      q7: this.cleanText(raw.Q11) || '',  // 寒暑假放多久
      q8: this.cleanText(raw.Q12) || '',  // 学校允许点外卖吗
      q9: this.cleanText(raw.Q13) || '',  // 学校交通便利吗
      q10: this.cleanText(raw.Q14) || '', // 宿舍楼有洗衣机吗？
      q11: this.cleanText(raw.Q15) || '', // 校园网怎么样？
      q12: this.cleanText(raw.Q16) || '', // 每天断电断网吗
      q13: this.cleanText(raw.Q17) || '', // 食堂价格贵吗
      q14: this.cleanText(raw.Q18) || '', // 洗澡热水供应时间？
      q15: this.cleanText(raw.Q19) || '', // 校园内可以骑电瓶车吗
      q16: this.cleanText(raw.Q20) || '', // 宿舍限电情况？
      q17: this.cleanText(raw.Q21) || '', // 通宵自习有去处吗？
      q18: this.cleanText(raw.Q22) || '', // 大一能带电脑吗？
      q19: this.cleanText(raw.Q23) || '', // 学校里面用什么卡
      q20: this.cleanText(raw.Q24) || '', // 学校会给学生发银行卡吗？
      q21: this.cleanText(raw.Q25) || '', // 学校的超市怎么样？
      q22: this.cleanText(raw.Q26) || '', // 学校的收发快递政策
      q23: this.cleanText(raw.Q27) || '', // 学校里面的共享单车
      q24: this.cleanText(raw.Q28) || '', // 现阶段学校的门禁情况
      q25: this.cleanText(raw.Q29) || '', // 宿舍晚上查寝吗

      additionalAnswer: this.cleanText(raw.Q30) || '', // 自由补充

      // 元数据
      startTime: this.parseDate(raw.开始时间),
      submittedAt: this.parseDate(raw.提交时间),
      ipProvince: this.cleanText(raw.IP省份),
      ipCity: this.cleanText(raw.IP城市),
      browser: this.cleanText(raw.浏览器),
      operatingSystem: this.cleanText(raw.操作系统)
    };
  }

  /**
   * 清洗学校名称（参考原作者逻辑）
   */
  private cleanCollegeName(name: string): string {
    // 1. 去除特殊字符：()（）【】#
    name = name.replace(/[\(\)（）【】#]/g, '');

    // 2. 去除所有空格
    name = name.replace(/\s+/g, '');

    // 3. 去除首尾空格
    name = name.trim();

    return name;
  }

  /**
   * 判断是否为无效的学校名称
   */
  private isInvalidCollegeName(name: string): boolean {
    // 过滤中学（以"中"、"高"、"实验"结尾，或包含"中学"）
    if ((name.endsWith('中') || name.endsWith('高') || name.endsWith('实验') || name.includes('中学'))) {
      // 但要保留包含"大学"或"学院"的名称（如"中国科学技术大学"）
      if (!name.includes('大学') && !name.includes('学院')) {
        return true;
      }
    }

    // 名称太短
    if (name.length < 3) {
      return true;
    }

    return false;
  }

  /**
   * 清洗文本
   */
  private cleanText(text: string | undefined): string {
    if (!text) return '';

    // 去除首尾空格
    text = text.trim();

    // 替换[DESENSITIZED]
    if (text === '[DESENSITIZED]') return '';

    // 统一换行符
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 去除多余空格
    text = text.replace(/\s+/g, ' ');

    return text;
  }

  /**
   * 解析数字
   */
  private parseNumber(text: string | undefined): number | undefined {
    if (!text) return undefined;
    const num = parseInt(text.trim(), 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * 解析日期
   */
  private parseDate(text: string | undefined): Date | undefined {
    if (!text || text.trim() === '') return undefined;

    try {
      const date = new Date(text.trim());
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }
}

/**
 * 按学校名称分组
 */
export function groupByCollege(rows: CleanedCsvRow[]): Map<string, CleanedCsvRow[]> {
  const grouped = new Map<string, CleanedCsvRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.collegeName) || [];
    existing.push(row);
    grouped.set(row.collegeName, existing);
  }

  return grouped;
}
