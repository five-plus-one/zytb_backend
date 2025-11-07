/**
 * ETL管道 - Cleaned → Core 同步服务
 * 负责将清洗层数据同步到核心运算层
 */

import { AppDataSource } from '../../config/database';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../../', process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'volunteer_system'
};

interface SyncStats {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
}

interface CollegeStats {
  avgAdmissionScore3Years: number | null;
  minRank3Years: number | null;
  avgAdmissionScoreRecentYear: number | null;
  minRankRecentYear: number | null;
  hotLevel: number;
  difficultyLevel: string;
  majorCount: number;
  enrollmentProvinceCount: number;
}

export class CleanedToCorePipeline {
  private connection: mysql.Connection | null = null;

  async initialize(): Promise<void> {
    this.connection = await mysql.createConnection(dbConfig);
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
    }
  }

  /**
   * 同步院校数据
   */
  async syncCollege(cleanedCollegeId: string): Promise<void> {
    if (!this.connection) throw new Error('Pipeline not initialized');

    // 1. 获取清洗层院校数据
    const [colleges]: any = await this.connection.query(
      'SELECT * FROM cleaned_colleges WHERE id = ?',
      [cleanedCollegeId]
    );

    if (colleges.length === 0) {
      throw new Error(`College not found: ${cleanedCollegeId}`);
    }

    const college = colleges[0];

    // 2. 计算预计算字段
    const stats = await this.calculateCollegeStats(cleanedCollegeId);

    // 3. 获取校园生活评分(冗余字段)
    const [campusLife]: any = await this.connection.query(
      'SELECT dorm_score, canteen_quality_score, transport_score, study_environment_score FROM cleaned_campus_life WHERE cleaned_college_id = ?',
      [cleanedCollegeId]
    );

    const dormScore = campusLife[0]?.dorm_score || null;
    const canteenScore = campusLife[0]?.canteen_quality_score || null;
    const transportScore = campusLife[0]?.transport_score || null;
    const studyScore = campusLife[0]?.study_environment_score || null;

    // 计算综合生活评分
    const overallLifeScore = this.calculateOverallLifeScore([
      dormScore, canteenScore, transportScore, studyScore
    ].filter(s => s !== null) as number[]);

    // 4. 插入/更新核心运算层
    await this.connection.query(`
      INSERT INTO core_colleges (
        id, name, code, province, city, college_type, affiliation,
        is_985, is_211, is_double_first_class, is_world_class, is_art, is_national_key,
        key_level, education_level, postgraduate_rate, national_special_major_count,
        world_class_disciplines, founded_year, student_count, teacher_count, academician_count,
        admission_phone, email, address, website,
        avg_admission_score_recent_3years, min_rank_recent_3years,
        avg_admission_score_recent_year, min_rank_recent_year,
        hot_level, difficulty_level,
        dorm_score, canteen_score, transport_score, study_environment_score, overall_life_score,
        major_count, enrollment_province_count,
        data_version, last_synced_at, sync_source, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        province = VALUES(province),
        avg_admission_score_recent_3years = VALUES(avg_admission_score_recent_3years),
        min_rank_recent_3years = VALUES(min_rank_recent_3years),
        hot_level = VALUES(hot_level),
        dorm_score = VALUES(dorm_score),
        last_synced_at = VALUES(last_synced_at),
        data_version = data_version + 1,
        updated_at = CURRENT_TIMESTAMP
    `, [
      college.id, college.standard_name, college.code, college.province, college.city,
      college.college_type, college.affiliation,
      college.is_985, college.is_211, college.is_double_first_class, college.is_world_class,
      college.is_art, college.is_national_key, college.key_level, college.education_level,
      college.postgraduate_rate, college.national_special_major_count, college.world_class_disciplines,
      college.founded_year, college.student_count, college.teacher_count, college.academician_count,
      college.admission_phone, college.email, college.address, college.website,
      stats.avgAdmissionScore3Years, stats.minRank3Years,
      stats.avgAdmissionScoreRecentYear, stats.minRankRecentYear,
      stats.hotLevel, stats.difficultyLevel,
      dormScore, canteenScore, transportScore, studyScore, overallLifeScore,
      stats.majorCount, stats.enrollmentProvinceCount,
      1, new Date(), 'cleaned', college.created_at, college.updated_at
    ]);
  }

  /**
   * 计算院校统计数据
   */
  private async calculateCollegeStats(collegeId: string): Promise<CollegeStats> {
    if (!this.connection) throw new Error('Pipeline not initialized');

    const currentYear = new Date().getFullYear();

    // 近3年平均录取分
    const [scores3Years]: any = await this.connection.query(`
      SELECT
        AVG(min_score) as avg_score,
        MIN(min_rank) as min_rank
      FROM cleaned_admission_scores
      WHERE cleaned_college_id = ?
        AND year >= ?
        AND min_score IS NOT NULL
    `, [collegeId, currentYear - 3]);

    // 最近一年
    const [scoresRecentYear]: any = await this.connection.query(`
      SELECT
        AVG(min_score) as avg_score,
        MIN(min_rank) as min_rank
      FROM cleaned_admission_scores
      WHERE cleaned_college_id = ?
        AND year = ?
        AND min_score IS NOT NULL
    `, [collegeId, currentYear - 1]);

    // 专业数量
    const [majorCount]: any = await this.connection.query(`
      SELECT COUNT(DISTINCT cleaned_major_id) as count
      FROM cleaned_admission_scores
      WHERE cleaned_college_id = ?
        AND cleaned_major_id IS NOT NULL
    `, [collegeId]);

    // 招生省份数
    const [provinceCount]: any = await this.connection.query(`
      SELECT COUNT(DISTINCT source_province) as count
      FROM cleaned_enrollment_plans
      WHERE cleaned_college_id = ?
    `, [collegeId]);

    const avgScore3Years = scores3Years[0]?.avg_score || null;
    const minRank3Years = scores3Years[0]?.min_rank || null;
    const avgScoreRecentYear = scoresRecentYear[0]?.avg_score || null;
    const minRankRecentYear = scoresRecentYear[0]?.min_rank || null;

    // 计算热度指数(0-100)
    const hotLevel = this.calculateHotLevel(
      minRank3Years,
      majorCount[0].count,
      provinceCount[0].count
    );

    // 计算难度等级
    const difficultyLevel = this.calculateDifficultyLevel(avgScore3Years, minRank3Years);

    return {
      avgAdmissionScore3Years: avgScore3Years ? Math.round(avgScore3Years) : null,
      minRank3Years,
      avgAdmissionScoreRecentYear: avgScoreRecentYear ? Math.round(avgScoreRecentYear) : null,
      minRankRecentYear,
      hotLevel,
      difficultyLevel,
      majorCount: majorCount[0].count,
      enrollmentProvinceCount: provinceCount[0].count
    };
  }

  /**
   * 计算热度指数
   */
  private calculateHotLevel(minRank: number | null, majorCount: number, provinceCount: number): number {
    let score = 50; // 基础分

    // 位次越高,越热门
    if (minRank !== null) {
      if (minRank <= 1000) score += 30;
      else if (minRank <= 5000) score += 20;
      else if (minRank <= 10000) score += 10;
      else if (minRank <= 50000) score += 5;
    }

    // 专业数量
    if (majorCount >= 50) score += 10;
    else if (majorCount >= 30) score += 5;

    // 招生省份
    if (provinceCount >= 30) score += 10;
    else if (provinceCount >= 20) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 计算难度等级
   */
  private calculateDifficultyLevel(avgScore: number | null, minRank: number | null): string {
    if (minRank !== null) {
      if (minRank <= 1000) return 'very_hard';
      if (minRank <= 10000) return 'hard';
      if (minRank <= 50000) return 'medium';
      return 'easy';
    }

    if (avgScore !== null) {
      if (avgScore >= 650) return 'very_hard';
      if (avgScore >= 600) return 'hard';
      if (avgScore >= 500) return 'medium';
      return 'easy';
    }

    return 'medium';
  }

  /**
   * 计算综合生活评分
   */
  private calculateOverallLifeScore(scores: number[]): number | null {
    if (scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return parseFloat((sum / scores.length).toFixed(1));
  }

  /**
   * 同步录取分数数据(带冗余字段)
   */
  async syncAdmissionScore(cleanedScoreId: string): Promise<void> {
    if (!this.connection) throw new Error('Pipeline not initialized');

    // 获取清洗层数据
    const [scores]: any = await this.connection.query(`
      SELECT * FROM cleaned_admission_scores WHERE id = ?
    `, [cleanedScoreId]);

    if (scores.length === 0) return;

    const score = scores[0];

    // 获取院校信息(冗余)
    const [colleges]: any = await this.connection.query(`
      SELECT standard_name, code, province, city, is_985, is_211, is_double_first_class, college_type
      FROM cleaned_colleges WHERE id = ?
    `, [score.cleaned_college_id]);

    const college = colleges[0] || {};

    // 获取专业信息(冗余)
    let major: any = {};
    if (score.cleaned_major_id) {
      const [majors]: any = await this.connection.query(`
        SELECT standard_name, code, category, discipline
        FROM cleaned_majors WHERE id = ?
      `, [score.cleaned_major_id]);
      major = majors[0] || {};
    }

    // 计算分数波动
    const scoreVolatility = await this.calculateScoreVolatility(
      score.cleaned_college_id,
      score.cleaned_major_id,
      score.source_province,
      score.year
    );

    // 计算竞争度
    const competitiveness = this.calculateCompetitiveness(
      score.min_rank,
      score.plan_count
    );

    // 插入核心层
    await this.connection.query(`
      INSERT INTO core_admission_scores (
        id, college_id, major_id,
        college_name, college_code, college_province, college_city,
        college_is_985, college_is_211, college_is_double_first_class, college_type,
        major_name, major_code, major_category, major_discipline,
        year, source_province, subject_type, batch,
        min_score, min_rank, avg_score, max_score, max_rank, plan_count,
        major_group_code, major_group_name, subject_requirements,
        score_volatility, rank_volatility, difficulty_level, competitiveness,
        data_version, last_synced_at, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        min_score = VALUES(min_score),
        avg_score = VALUES(avg_score),
        score_volatility = VALUES(score_volatility),
        last_synced_at = VALUES(last_synced_at),
        data_version = data_version + 1,
        updated_at = CURRENT_TIMESTAMP
    `, [
      score.id, score.cleaned_college_id, score.cleaned_major_id,
      college.standard_name, college.code, college.province, college.city,
      college.is_985, college.is_211, college.is_double_first_class, college.college_type,
      major.standard_name, major.code, major.category, major.discipline,
      score.year, score.source_province, score.subject_type, score.batch,
      score.min_score, score.min_rank, score.avg_score, score.max_score, score.max_rank, score.plan_count,
      score.major_group_code, score.major_group_name, score.subject_requirements,
      scoreVolatility, null, this.calculateDifficultyLevel(score.avg_score, score.min_rank), competitiveness,
      1, new Date(), score.created_at, score.updated_at
    ]);
  }

  /**
   * 计算分数波动
   */
  private async calculateScoreVolatility(
    collegeId: string,
    majorId: string | null,
    province: string,
    currentYear: number
  ): Promise<number | null> {
    if (!this.connection) return null;

    const [scores]: any = await this.connection.query(`
      SELECT min_score
      FROM cleaned_admission_scores
      WHERE cleaned_college_id = ?
        AND (cleaned_major_id = ? OR (cleaned_major_id IS NULL AND ? IS NULL))
        AND source_province = ?
        AND year >= ?
        AND year <= ?
        AND min_score IS NOT NULL
    `, [collegeId, majorId, majorId, province, currentYear - 3, currentYear]);

    if (scores.length < 2) return null;

    const values = scores.map((s: any) => s.min_score);
    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const variance = values.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return parseFloat(stdDev.toFixed(2));
  }

  /**
   * 计算竞争度
   */
  private calculateCompetitiveness(minRank: number | null, planCount: number | null): number {
    if (minRank === null || planCount === null) return 50;

    // 位次越低,计划数越少,竞争越激烈
    const rankScore = minRank <= 1000 ? 50 : minRank <= 10000 ? 40 : minRank <= 50000 ? 30 : 20;
    const planScore = planCount <= 10 ? 30 : planCount <= 50 ? 20 : planCount <= 100 ? 10 : 5;

    return Math.min(100, rankScore + planScore);
  }

  /**
   * 同步校园生活数据(带冗余)
   */
  async syncCampusLife(cleanedCampusLifeId: string): Promise<void> {
    if (!this.connection) throw new Error('Pipeline not initialized');

    const [campusLives]: any = await this.connection.query(`
      SELECT * FROM cleaned_campus_life WHERE id = ?
    `, [cleanedCampusLifeId]);

    if (campusLives.length === 0) return;

    const cl = campusLives[0];

    // 获取院校信息(冗余)
    const [colleges]: any = await this.connection.query(`
      SELECT standard_name, code, province, city
      FROM cleaned_colleges WHERE id = ?
    `, [cl.cleaned_college_id]);

    const college = colleges[0] || {};

    // 计算综合评分
    const scores = [cl.dorm_score, cl.canteen_quality_score, cl.transport_score, cl.study_environment_score]
      .filter((s: any) => s !== null) as number[];
    const overallScore = this.calculateOverallLifeScore(scores);

    await this.connection.query(`
      INSERT INTO core_campus_life (
        id, college_id, college_name, college_code, college_province, college_city,
        dorm_style, has_air_conditioner, has_independent_bathroom, bathroom_distance, dorm_score,
        has_morning_self_study, has_evening_self_study, has_library, has_overnight_study_room, study_environment_score,
        canteen_price_level, canteen_quality_score, canteen_has_issues,
        has_subway, in_urban_area, to_city_time, transport_score,
        has_washing_machine, campus_wifi_quality, has_power_cutoff, power_cutoff_time,
        has_network_cutoff, hot_water_time,
        has_morning_run, running_requirement, can_ride_ebike, shared_bike_availability,
        supermarket_quality, express_delivery_convenience,
        dorm_curfew_time, school_gate_policy, check_dormitory,
        can_order_takeout, can_bring_computer,
        overall_score, reliability, answer_count,
        data_version, last_synced_at, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        dorm_score = VALUES(dorm_score),
        canteen_quality_score = VALUES(canteen_quality_score),
        overall_score = VALUES(overall_score),
        last_synced_at = VALUES(last_synced_at),
        data_version = data_version + 1,
        updated_at = CURRENT_TIMESTAMP
    `, [
      cl.id, cl.cleaned_college_id, college.standard_name, college.code, college.province, college.city,
      cl.dorm_style, cl.has_air_conditioner, cl.has_independent_bathroom, cl.bathroom_distance, cl.dorm_score,
      cl.has_morning_self_study, cl.has_evening_self_study, cl.has_library, cl.has_overnight_study_room, cl.study_environment_score,
      cl.canteen_price_level, cl.canteen_quality_score, cl.canteen_has_issues,
      cl.has_subway, cl.in_urban_area, cl.to_city_time, cl.transport_score,
      cl.has_washing_machine, cl.campus_wifi_quality, cl.has_power_cutoff, cl.power_cutoff_time,
      cl.has_network_cutoff, cl.hot_water_time,
      cl.has_morning_run, cl.running_requirement, cl.can_ride_ebike, cl.shared_bike_availability,
      cl.supermarket_quality, cl.express_delivery_convenience,
      cl.dorm_curfew_time, cl.school_gate_policy, cl.check_dormitory,
      cl.can_order_takeout, cl.can_bring_computer,
      overallScore, cl.reliability, cl.answer_count,
      1, new Date(), cl.created_at, cl.updated_at
    ]);
  }

  /**
   * 全量同步所有院校
   */
  async fullSyncColleges(): Promise<SyncStats> {
    if (!this.connection) throw new Error('Pipeline not initialized');

    console.log('🔄 开始全量同步院校...');

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };

    const [colleges]: any = await this.connection.query('SELECT id FROM cleaned_colleges');
    stats.total = colleges.length;

    for (const college of colleges) {
      try {
        await this.syncCollege(college.id);
        stats.synced++;

        if (stats.synced % 100 === 0) {
          console.log(`  进度: ${stats.synced}/${stats.total}`);
        }
      } catch (error: any) {
        console.error(`  ❌ 同步失败: ${college.id} - ${error.message}`);
        stats.failed++;
      }
    }

    console.log(`✅ 院校同步完成: ${stats.synced}/${stats.total}`);
    return stats;
  }

  /**
   * 全量同步所有录取分数
   */
  async fullSyncAdmissionScores(): Promise<SyncStats> {
    if (!this.connection) throw new Error('Pipeline not initialized');

    console.log('🔄 开始全量同步录取分数...');

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };

    const [scores]: any = await this.connection.query('SELECT id FROM cleaned_admission_scores');
    stats.total = scores.length;

    for (const score of scores) {
      try {
        await this.syncAdmissionScore(score.id);
        stats.synced++;

        if (stats.synced % 1000 === 0) {
          console.log(`  进度: ${stats.synced}/${stats.total}`);
        }
      } catch (error: any) {
        console.error(`  ❌ 同步失败: ${score.id} - ${error.message}`);
        stats.failed++;
      }
    }

    console.log(`✅ 录取分数同步完成: ${stats.synced}/${stats.total}`);
    return stats;
  }

  /**
   * 全量同步所有校园生活
   */
  async fullSyncCampusLife(): Promise<SyncStats> {
    if (!this.connection) throw new Error('Pipeline not initialized');

    console.log('🔄 开始全量同步校园生活...');

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };

    const [campusLives]: any = await this.connection.query('SELECT id FROM cleaned_campus_life');
    stats.total = campusLives.length;

    for (const cl of campusLives) {
      try {
        await this.syncCampusLife(cl.id);
        stats.synced++;

        if (stats.synced % 100 === 0) {
          console.log(`  进度: ${stats.synced}/${stats.total}`);
        }
      } catch (error: any) {
        console.error(`  ❌ 同步失败: ${cl.id} - ${error.message}`);
        stats.failed++;
      }
    }

    console.log(`✅ 校园生活同步完成: ${stats.synced}/${stats.total}`);
    return stats;
  }

  /**
   * 增量同步(仅同步更新的数据)
   */
  async incrementalSync(entityType: string, since: Date): Promise<SyncStats> {
    if (!this.connection) throw new Error('Pipeline not initialized');

    console.log(`🔄 开始增量同步 ${entityType} (since: ${since.toISOString()})...`);

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };

    if (entityType === 'college') {
      const [colleges]: any = await this.connection.query(
        'SELECT id FROM cleaned_colleges WHERE updated_at > ?',
        [since]
      );
      stats.total = colleges.length;

      for (const college of colleges) {
        try {
          await this.syncCollege(college.id);
          stats.synced++;
        } catch (error) {
          stats.failed++;
        }
      }
    }

    console.log(`✅ 增量同步完成: ${stats.synced}/${stats.total}`);
    return stats;
  }

  /**
   * 记录同步日志
   */
  async logSync(syncType: string, entityType: string, stats: SyncStats, status: string): Promise<void> {
    if (!this.connection) return;

    await this.connection.query(`
      INSERT INTO sync_logs (
        id, sync_type, entity_type, source_layer, target_layer,
        total_records, synced_count, failed_count, skipped_count,
        start_time, end_time, duration_ms, sync_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      uuidv4(),
      syncType,
      entityType,
      'cleaned',
      'core',
      stats.total,
      stats.synced,
      stats.failed,
      stats.skipped,
      new Date(),
      new Date(),
      0,  // duration
      status
    ]);
  }
}
