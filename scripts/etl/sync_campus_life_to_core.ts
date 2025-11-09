#!/usr/bin/env ts-node
/**
 * 同步校园生活数据到 core_campus_life
 * 从 college_campus_life 冗余同步
 */
import { AppDataSource } from '../../src/config/database';

async function syncCampusLifeToCore() {
  console.log('\n🔄 === 同步校园生活数据到 Core Layer ===\n');

  await AppDataSource.initialize();

  // 1. 清空 core_campus_life (重新同步)
  console.log('🗑️  清空 core_campus_life 表...');
  await AppDataSource.query(`TRUNCATE TABLE core_campus_life`);
  console.log('✅ 表已清空\n');

  // 2. 从 college_campus_life 同步数据
  console.log('📥 同步数据到 core_campus_life...');
  const result = await AppDataSource.query(`
    INSERT INTO core_campus_life (
      id, college_id, college_name, college_code, college_province, college_city,
      dorm_style, has_air_conditioner, has_independent_bathroom, bathroom_distance, dorm_score,
      has_morning_self_study, has_evening_self_study, has_library, has_overnight_study_room, study_environment_score,
      canteen_price_level, canteen_quality_score, canteen_has_issues,
      has_subway, in_urban_area, to_city_time, transport_score,
      has_washing_machine, campus_wifi_quality,
      has_power_cutoff, power_cutoff_time, has_network_cutoff,
      hot_water_time, has_morning_run, running_requirement,
      can_ride_ebike, shared_bike_availability,
      supermarket_quality, express_delivery_convenience,
      dorm_curfew_time, school_gate_policy, check_dormitory,
      can_order_takeout, can_bring_computer,
      overall_score, reliability, answer_count,
      data_version, last_synced_at, created_at, updated_at
    )
    SELECT
      ccl.id, ccl.college_id, ccl.college_name,
      c.code as college_code,
      c.province as college_province,
      c.city as college_city,
      ccl.dorm_style, ccl.has_air_conditioner, ccl.has_independent_bathroom, ccl.bathroom_distance, ccl.dorm_score,
      ccl.has_morning_self_study, ccl.has_evening_self_study, ccl.has_library, ccl.has_overnight_study_room, ccl.study_environment_score,
      ccl.canteen_price_level, ccl.canteen_quality_score, ccl.canteen_has_issues,
      ccl.has_subway, ccl.in_urban_area, ccl.to_city_time, ccl.transport_score,
      ccl.has_washing_machine, ccl.campus_wifi_quality,
      ccl.has_power_cutoff, ccl.power_cutoff_time, ccl.has_network_cutoff,
      ccl.hot_water_time, ccl.has_morning_run, ccl.running_requirement,
      ccl.can_ride_ebike, ccl.shared_bike_availability,
      ccl.supermarket_quality, ccl.express_delivery_convenience,
      ccl.dorm_curfew_time, ccl.school_gate_policy, ccl.check_dormitory,
      ccl.can_order_takeout, ccl.can_bring_computer,
      (COALESCE(ccl.dorm_score, 0) + COALESCE(ccl.study_environment_score, 0) + COALESCE(ccl.canteen_quality_score, 0) + COALESCE(ccl.transport_score, 0)) / 4 as overall_score,
      ccl.reliability, ccl.answer_count,
      1 as data_version,
      NOW() as last_synced_at,
      ccl.created_at,
      ccl.updated_at
    FROM college_campus_life ccl
    INNER JOIN colleges c ON ccl.college_id COLLATE utf8mb4_unicode_ci = c.id COLLATE utf8mb4_unicode_ci
  `);

  console.log(`✅ 同步完成: ${result.affectedRows || 0} 行\n`);

  // 3. 更新 core_colleges 的冗余评分字段
  console.log('🔄 更新 core_colleges 的校园生活评分...');
  await AppDataSource.query(`
    UPDATE core_colleges cc
    INNER JOIN core_campus_life ccl ON cc.id COLLATE utf8mb4_unicode_ci = ccl.college_id COLLATE utf8mb4_unicode_ci
    SET
      cc.dorm_score = ccl.dorm_score,
      cc.canteen_score = ccl.canteen_quality_score,
      cc.transport_score = ccl.transport_score,
      cc.study_environment_score = ccl.study_environment_score,
      cc.overall_life_score = ccl.overall_score
  `);
  console.log('✅ core_colleges 评分已更新\n');

  // 4. 统计
  const stats = await AppDataSource.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN dorm_score IS NOT NULL THEN 1 ELSE 0 END) as has_dorm,
      SUM(CASE WHEN canteen_quality_score IS NOT NULL THEN 1 ELSE 0 END) as has_canteen,
      SUM(CASE WHEN transport_score IS NOT NULL THEN 1 ELSE 0 END) as has_transport,
      SUM(CASE WHEN study_environment_score IS NOT NULL THEN 1 ELSE 0 END) as has_study
    FROM core_campus_life
  `);

  const s = stats[0];
  console.log('📊 同步统计:');
  console.log(`  总记录数: ${s.total}`);
  console.log(`  宿舍评分: ${(s.has_dorm / s.total * 100).toFixed(1)}%`);
  console.log(`  食堂评分: ${(s.has_canteen / s.total * 100).toFixed(1)}%`);
  console.log(`  交通评分: ${(s.has_transport / s.total * 100).toFixed(1)}%`);
  console.log(`  学习环境评分: ${(s.has_study / s.total * 100).toFixed(1)}%`);

  await AppDataSource.destroy();

  console.log('\n✅ 校园生活数据同步完成!\n');
}

syncCampusLifeToCore().catch(console.error);
