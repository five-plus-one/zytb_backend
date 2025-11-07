/**
 * 校园生活数据导入主脚本
 *
 * 使用方法:
 * npx ts-node scripts/import_campus_life_data.ts <csv_file_path>
 *
 * 示例:
 * npx ts-node scripts/import_campus_life_data.ts data/campus_life/survey.csv
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import { College } from '../src/models/College';
import { CollegeCampusLife } from '../src/models/CollegeCampusLife';
import { CollegeLifeRawAnswer } from '../src/models/CollegeLifeRawAnswer';
import { CsvParser, groupByCollege, CleanedCsvRow } from '../src/utils/campusLifeImporter/csvParser';
import { CollegeNameMatcher } from '../src/utils/campusLifeImporter/collegeNameMatcher';
import { AnswerParser, ParsedAnswers } from '../src/utils/campusLifeImporter/answerParser';
import { ScoreCalculator, AnswerAggregator, calculateReliability } from '../src/utils/campusLifeImporter/scoreCalculator';

/**
 * 主导入类
 */
class CampusLifeImporter {
  private dataSource!: DataSource;
  private csvParser: CsvParser;
  private answerParser: AnswerParser;
  private scoreCalculator: ScoreCalculator;
  private aggregator: AnswerAggregator;

  // 统计信息
  private stats = {
    totalRows: 0,
    validRows: 0,
    matchedColleges: 0,
    unmatchedColleges: 0,
    savedRawAnswers: 0,
    savedCampusLife: 0,
    errors: 0
  };

  constructor() {
    this.csvParser = new CsvParser();
    this.answerParser = new AnswerParser();
    this.scoreCalculator = new ScoreCalculator();
    this.aggregator = new AnswerAggregator();
  }

  /**
   * 初始化数据库连接
   */
  async initDatabase() {
    console.log('[Database] 初始化数据库连接...');

    // 加载环境变量
    require('dotenv').config({ path: '.env.development' });

    this.dataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'volunteer_system',
      entities: [College, CollegeCampusLife, CollegeLifeRawAnswer],
      synchronize: false, // 不自动同步，使用SQL脚本
      logging: false
    });

    await this.dataSource.initialize();
    console.log('[Database] ✓ 数据库连接成功\n');
  }

  /**
   * 执行导入
   */
  async import(csvFilePath: string) {
    console.log('='.repeat(60));
    console.log('校园生活数据导入工具');
    console.log('='.repeat(60));
    console.log(`CSV文件: ${csvFilePath}\n`);

    try {
      // 1. 读取并解析CSV
      console.log('[Step 1/5] 读取并解析CSV文件...');
      const cleanedRows = await this.csvParser.parseCsv(csvFilePath);
      this.stats.totalRows = cleanedRows.length;
      this.stats.validRows = cleanedRows.length;
      console.log(`✓ 读取完成: ${cleanedRows.length} 条有效记录\n`);

      // 2. 按学校分组
      console.log('[Step 2/5] 按学校分组...');
      const grouped = groupByCollege(cleanedRows);
      console.log(`✓ 分组完成: ${grouped.size} 所院校\n`);

      // 3. 匹配院校
      console.log('[Step 3/5] 匹配院校到数据库...');
      const collegeRepo = this.dataSource.getRepository(College);
      const nameMatcher = new CollegeNameMatcher(collegeRepo);

      const collegeNames = Array.from(grouped.keys());
      const matchResults = await nameMatcher.batchMatch(collegeNames);
      console.log('');

      // 4. 处理每所院校
      console.log('[Step 4/5] 处理每所院校的问卷数据...');
      const rawAnswerRepo = this.dataSource.getRepository(CollegeLifeRawAnswer);
      const campusLifeRepo = this.dataSource.getRepository(CollegeCampusLife);

      for (const [collegeName, answers] of grouped.entries()) {
        await this.processCollege(
          collegeName,
          answers,
          matchResults.get(collegeName) || null,
          rawAnswerRepo,
          campusLifeRepo
        );
      }

      console.log('');

      // 5. 输出统计信息
      console.log('[Step 5/5] 导入完成！\n');
      this.printStats();

    } catch (error) {
      console.error('\n[Error] 导入失败:', error);
      throw error;
    }
  }

  /**
   * 处理单个学校的数据
   */
  private async processCollege(
    collegeName: string,
    answers: CleanedCsvRow[],
    college: College | null,
    rawAnswerRepo: any,
    campusLifeRepo: any
  ) {
    console.log(`\n处理: ${collegeName} (${answers.length}份答卷)`);

    if (!college) {
      console.log(`  ✗ 未找到匹配院校，跳过`);
      this.stats.unmatchedColleges++;
      return;
    }

    console.log(`  ✓ 匹配成功: ${college.name} (ID: ${college.id})`);
    this.stats.matchedColleges++;

    try {
      // 保存原始答案
      console.log(`  → 保存原始答案...`);
      for (const answer of answers) {
        await this.saveRawAnswer(answer, college.id, rawAnswerRepo);
      }
      console.log(`  ✓ 保存了 ${answers.length} 份原始答案`);

      // 解析答案
      console.log(`  → 解析答案...`);
      const parsedList: ParsedAnswers[] = answers.map(ans =>
        this.answerParser.parseAnswers(ans)
      );

      // 聚合多份答卷
      console.log(`  → 聚合数据...`);
      const aggregated = this.aggregator.aggregate(parsedList);

      // 计算评分
      console.log(`  → 计算评分...`);
      const scores = this.scoreCalculator.calculateAllScores(aggregated);

      // 计算可靠性
      const reliability = calculateReliability(answers.length);

      console.log(`  → 评分结果:`);
      console.log(`     宿舍: ${scores.dormScore.toFixed(1)}/5.0`);
      console.log(`     食堂: ${scores.canteenQualityScore.toFixed(1)}/5.0`);
      console.log(`     交通: ${scores.transportScore.toFixed(1)}/5.0`);
      console.log(`     学习: ${scores.studyEnvironmentScore.toFixed(1)}/5.0`);
      console.log(`     快递: ${scores.expressDeliveryConvenience.toFixed(1)}/5.0`);
      console.log(`     可靠性: ${reliability}/100`);

      // 保存到数据库
      console.log(`  → 保存聚合数据...`);
      await this.saveCampusLife(
        college,
        aggregated,
        scores,
        answers,
        reliability,
        campusLifeRepo
      );

      console.log(`  ✓ ${collegeName} 处理完成`);
      this.stats.savedCampusLife++;

    } catch (error) {
      console.error(`  ✗ 处理失败:`, error);
      this.stats.errors++;
    }
  }

  /**
   * 保存原始答案
   */
  private async saveRawAnswer(
    answer: CleanedCsvRow,
    collegeId: string,
    repo: any
  ) {
    const rawAnswer = new CollegeLifeRawAnswer();
    rawAnswer.collegeId = collegeId;
    rawAnswer.collegeName = answer.collegeName;
    rawAnswer.answerId = answer.answerId;

    rawAnswer.q1DormStyle = answer.q1;
    rawAnswer.q2AirConditioner = answer.q2;
    rawAnswer.q3Bathroom = answer.q3;
    rawAnswer.q4SelfStudy = answer.q4;
    rawAnswer.q5MorningRun = answer.q5;
    rawAnswer.q6RunningRequirement = answer.q6;
    rawAnswer.q7HolidayDuration = answer.q7;
    rawAnswer.q8Takeout = answer.q8;
    rawAnswer.q9Transport = answer.q9;
    rawAnswer.q10WashingMachine = answer.q10;
    rawAnswer.q11CampusWifi = answer.q11;
    rawAnswer.q12PowerCutoff = answer.q12;
    rawAnswer.q13CanteenPrice = answer.q13;
    rawAnswer.q14HotWater = answer.q14;
    rawAnswer.q15Ebike = answer.q15;
    rawAnswer.q16PowerLimit = answer.q16;
    rawAnswer.q17OvernightStudy = answer.q17;
    rawAnswer.q18BringComputer = answer.q18;
    rawAnswer.q19CampusCard = answer.q19;
    rawAnswer.q20BankCard = answer.q20;
    rawAnswer.q21Supermarket = answer.q21;
    rawAnswer.q22ExpressDelivery = answer.q22;
    rawAnswer.q23SharedBike = answer.q23;
    rawAnswer.q24GatePolicy = answer.q24;
    rawAnswer.q25LateReturn = answer.q25;

    rawAnswer.source = answer.source;
    rawAnswer.submittedAt = answer.submittedAt;
    rawAnswer.ipProvince = answer.ipProvince;
    rawAnswer.ipCity = answer.ipCity;
    rawAnswer.browser = answer.browser;
    rawAnswer.operatingSystem = answer.operatingSystem;

    await repo.save(rawAnswer);
    this.stats.savedRawAnswers++;
  }

  /**
   * 保存校园生活聚合数据
   */
  private async saveCampusLife(
    college: College,
    aggregated: ParsedAnswers,
    scores: any,
    originalAnswers: CleanedCsvRow[],
    reliability: number,
    repo: any
  ) {
    // 检查是否已存在
    let campusLife = await repo.findOne({
      where: { collegeId: college.id }
    });

    if (!campusLife) {
      campusLife = new CollegeCampusLife();
      campusLife.collegeId = college.id;
      campusLife.collegeName = college.name;
    }

    // 住宿条件
    campusLife.dormStyle = aggregated.dormStyle;
    campusLife.hasAirConditioner = aggregated.hasAirConditioner;
    campusLife.hasIndependentBathroom = aggregated.hasIndependentBathroom;
    campusLife.bathroomDistance = aggregated.bathroomDistance;
    campusLife.dormScore = scores.dormScore;

    // 学习环境
    campusLife.hasMorningSelfStudy = aggregated.hasMorningSelfStudy;
    campusLife.hasEveningSelfStudy = aggregated.hasEveningSelfStudy;
    campusLife.hasOvernightStudyRoom = aggregated.hasOvernightStudyRoom;
    campusLife.studyEnvironmentScore = scores.studyEnvironmentScore;

    // 食堂
    campusLife.canteenPriceLevel = aggregated.canteenPriceLevel;
    campusLife.canteenQualityScore = scores.canteenQualityScore;
    campusLife.canteenHasIssues = aggregated.canteenHasIssues;

    // 交通
    campusLife.hasSubway = aggregated.hasSubway;
    campusLife.inUrbanArea = aggregated.inUrbanArea;
    campusLife.toCityTime = aggregated.toCityTime;
    campusLife.transportScore = scores.transportScore;

    // 设施
    campusLife.hasWashingMachine = aggregated.hasWashingMachine;
    campusLife.campusWifiQuality = aggregated.campusWifiQuality;
    campusLife.campusWifiSpeed = aggregated.campusWifiSpeed;
    campusLife.hasPowerCutoff = aggregated.hasPowerCutoff;
    campusLife.powerCutoffTime = aggregated.powerCutoffTime;
    campusLife.hasNetworkCutoff = aggregated.hasNetworkCutoff;
    campusLife.networkCutoffTime = aggregated.networkCutoffTime;
    campusLife.hotWaterTime = aggregated.hotWaterTime;

    // 运动
    campusLife.hasMorningRun = aggregated.hasMorningRun;
    campusLife.runningRequirement = aggregated.runningRequirement;
    campusLife.canRideEbike = aggregated.canRideEbike;
    campusLife.ebikeChargingLocation = aggregated.ebikeChargingLocation;
    campusLife.sharedBikeAvailability = aggregated.sharedBikeAvailability;
    campusLife.sharedBikeTypes = aggregated.sharedBikeTypes;

    // 商业
    campusLife.supermarketQuality = aggregated.supermarketQuality;
    campusLife.supermarketDescription = aggregated.supermarketDescription;
    campusLife.expressDeliveryConvenience = scores.expressDeliveryConvenience;
    campusLife.expressDeliveryPolicy = aggregated.expressDeliveryPolicy;

    // 门禁
    campusLife.dormCurfewTime = aggregated.dormCurfewTime;
    campusLife.schoolGatePolicy = aggregated.schoolGatePolicy;
    campusLife.checkDormitory = aggregated.checkDormitory;
    campusLife.lateReturnPolicy = aggregated.lateReturnPolicy;

    // 其他
    campusLife.holidayDuration = aggregated.holidayDuration;
    campusLife.hasMiniSemester = aggregated.hasMiniSemester;
    campusLife.miniSemesterDuration = aggregated.miniSemesterDuration;
    campusLife.canOrderTakeout = aggregated.canOrderTakeout;
    campusLife.takeoutPickupDistance = aggregated.takeoutPickupDistance;
    campusLife.canBringComputer = aggregated.canBringComputer;
    campusLife.powerLimitDescription = aggregated.powerLimitDescription;
    campusLife.campusCardDescription = aggregated.campusCardDescription;
    campusLife.bankCardIssued = aggregated.bankCardIssued;

    // 原始数据（保存所有答案的JSON）
    campusLife.rawAnswers = originalAnswers.map(ans => ({
      q1: ans.q1, q2: ans.q2, q3: ans.q3, q4: ans.q4, q5: ans.q5,
      q6: ans.q6, q7: ans.q7, q8: ans.q8, q9: ans.q9, q10: ans.q10,
      q11: ans.q11, q12: ans.q12, q13: ans.q13, q14: ans.q14, q15: ans.q15,
      q16: ans.q16, q17: ans.q17, q18: ans.q18, q19: ans.q19, q20: ans.q20,
      q21: ans.q21, q22: ans.q22, q23: ans.q23, q24: ans.q24, q25: ans.q25
    }));

    // 数据质量
    campusLife.dataSource = 'campus_life_survey';
    campusLife.reliability = reliability;
    campusLife.answerCount = originalAnswers.length;

    await repo.save(campusLife);
  }

  /**
   * 打印统计信息
   */
  private printStats() {
    console.log('='.repeat(60));
    console.log('导入统计');
    console.log('='.repeat(60));
    console.log(`总记录数:        ${this.stats.totalRows}`);
    console.log(`有效记录数:      ${this.stats.validRows}`);
    console.log(`匹配院校数:      ${this.stats.matchedColleges}`);
    console.log(`未匹配院校数:    ${this.stats.unmatchedColleges}`);
    console.log(`保存原始答案:    ${this.stats.savedRawAnswers} 条`);
    console.log(`保存聚合数据:    ${this.stats.savedCampusLife} 条`);
    console.log(`错误数:          ${this.stats.errors}`);
    console.log('='.repeat(60));

    if (this.stats.unmatchedColleges > 0) {
      console.log('\n⚠️  有部分院校未匹配成功，请检查院校名称或手动添加');
    }

    if (this.stats.errors > 0) {
      console.log('\n⚠️  有部分数据处理失败，请查看上方错误信息');
    }

    if (this.stats.errors === 0 && this.stats.unmatchedColleges === 0) {
      console.log('\n✓ 所有数据导入成功！');
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      console.log('\n[Database] 数据库连接已关闭');
    }
  }
}

/**
 * 主函数
 */
async function main() {
  // 检查命令行参数
  if (process.argv.length < 3) {
    console.error('用法: npx ts-node scripts/import_campus_life_data.ts <csv_file_path>');
    console.error('示例: npx ts-node scripts/import_campus_life_data.ts data/campus_life/survey.csv');
    process.exit(1);
  }

  const csvFilePath = process.argv[2];

  // 检查文件路径
  if (!csvFilePath.endsWith('.csv')) {
    console.error('错误: 请提供CSV文件路径');
    process.exit(1);
  }

  const importer = new CampusLifeImporter();

  try {
    // 初始化数据库
    await importer.initDatabase();

    // 执行导入
    await importer.import(csvFilePath);

  } catch (error) {
    console.error('\n导入过程出错:', error);
    process.exit(1);
  } finally {
    // 关闭连接
    await importer.close();
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { CampusLifeImporter };
