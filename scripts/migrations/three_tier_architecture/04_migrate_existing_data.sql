-- ============================================
-- 阶段2: 数据迁移脚本
-- 从现有表迁移到新的三层架构
-- ============================================

-- ============================================
-- Step 1: 迁移院校数据到 cleaned_colleges
-- ============================================

INSERT INTO cleaned_colleges (
    id,
    standard_name,
    short_name,
    english_name,
    code,
    province,
    city,
    college_type,
    affiliation,
    is_985,
    is_211,
    is_double_first_class,
    is_world_class,
    is_art,
    is_national_key,
    key_level,
    education_level,
    postgraduate_rate,
    national_special_major_count,
    province_special_major_count,
    world_class_disciplines,
    founded_year,
    female_ratio,
    male_ratio,
    student_count,
    teacher_count,
    academician_count,
    admission_phone,
    email,
    address,
    website,
    data_quality_score,
    completeness_score,
    verified,
    created_at,
    updated_at
)
SELECT
    id,
    name AS standard_name,
    NULL AS short_name,
    NULL AS english_name,
    code,
    province,
    city,
    type AS college_type,
    affiliation,
    is_985,
    is_211,
    is_double_first_class,
    is_world_class,
    is_art,
    is_national_key,
    key_level,
    education_level,
    postgraduate_rate,
    national_special_major_count,
    province_special_major_count,
    world_class_disciplines,
    founded_year,
    female_ratio,
    male_ratio,
    student_count,
    teacher_count,
    academician_count,
    admission_phone,
    email,
    address,
    website,
    -- 计算数据质量分(基于字段完整性)
    ROUND(
        (CASE WHEN name IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN code IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN province IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN city IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN type IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN address IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN website IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN admission_phone IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN email IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN student_count IS NOT NULL THEN 10 ELSE 0 END)
    ) AS data_quality_score,
    ROUND(
        (CASE WHEN name IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN code IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN province IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN city IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN type IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN address IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN website IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN admission_phone IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN email IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN student_count IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN teacher_count IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN founded_year IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN is_985 IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN is_211 IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN postgraduate_rate IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN national_special_major_count IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN world_class_disciplines IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN academician_count IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN affiliation IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN key_level IS NOT NULL THEN 5 ELSE 0 END)
    ) AS completeness_score,
    FALSE AS verified,
    created_at,
    updated_at
FROM colleges
ON DUPLICATE KEY UPDATE
    standard_name = VALUES(standard_name),
    code = VALUES(code),
    province = VALUES(province),
    city = VALUES(city),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 2: 建立院校名称映射表(基于现有数据)
-- ============================================

-- 为每个院校创建精确匹配映射
INSERT INTO entity_college_name_mappings (
    id,
    source_name,
    normalized_name,
    cleaned_college_id,
    mapping_type,
    confidence_score,
    source_type,
    verified,
    created_at
)
SELECT
    UUID() AS id,
    name AS source_name,
    name AS normalized_name,
    id AS cleaned_college_id,
    'exact' AS mapping_type,
    1.00 AS confidence_score,
    'legacy' AS source_type,
    TRUE AS verified,
    CURRENT_TIMESTAMP
FROM cleaned_colleges
ON DUPLICATE KEY UPDATE
    normalized_name = VALUES(normalized_name),
    cleaned_college_id = VALUES(cleaned_college_id);

-- 添加newName作为别名映射(如果存在)
INSERT INTO entity_college_name_mappings (
    id,
    source_name,
    normalized_name,
    cleaned_college_id,
    mapping_type,
    confidence_score,
    source_type,
    verified,
    created_at
)
SELECT
    UUID() AS id,
    c.new_name AS source_name,
    cc.standard_name AS normalized_name,
    cc.id AS cleaned_college_id,
    'alias' AS mapping_type,
    0.95 AS confidence_score,
    'legacy' AS source_type,
    FALSE AS verified,
    CURRENT_TIMESTAMP
FROM colleges c
INNER JOIN cleaned_colleges cc ON c.id = cc.id
WHERE c.new_name IS NOT NULL
  AND c.new_name != c.name
ON DUPLICATE KEY UPDATE
    normalized_name = VALUES(normalized_name),
    cleaned_college_id = VALUES(cleaned_college_id);

-- ============================================
-- Step 3: 迁移专业数据到 cleaned_majors
-- ============================================

INSERT INTO cleaned_majors (
    id,
    standard_name,
    code,
    discipline,
    category,
    sub_category,
    degree_type,
    study_years,
    required_subjects,
    training_objective,
    avg_salary,
    employment_rate,
    career_fields,
    courses,
    skills,
    description,
    data_quality_score,
    verified,
    created_at,
    updated_at
)
SELECT
    id,
    name AS standard_name,
    code,
    discipline,
    category,
    sub_category,
    degree_type,
    years AS study_years,
    required_subjects,
    training_objective,
    avg_salary,
    employment_rate,
    career_fields,
    courses,
    skills,
    description,
    -- 计算数据质量分
    ROUND(
        (CASE WHEN name IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN code IS NOT NULL THEN 15 ELSE 0 END +
         CASE WHEN category IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN discipline IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN description IS NOT NULL THEN 10 ELSE 0 END +
         CASE WHEN avg_salary IS NOT NULL THEN 15 ELSE 0 END +
         CASE WHEN employment_rate IS NOT NULL THEN 15 ELSE 0 END +
         CASE WHEN career_fields IS NOT NULL THEN 15 ELSE 0 END)
    ) AS data_quality_score,
    FALSE AS verified,
    created_at,
    updated_at
FROM majors
ON DUPLICATE KEY UPDATE
    standard_name = VALUES(standard_name),
    code = VALUES(code),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 4: 建立专业名称映射表
-- ============================================

INSERT INTO entity_major_name_mappings (
    id,
    source_name,
    normalized_name,
    cleaned_major_id,
    mapping_type,
    confidence_score,
    source_type,
    verified,
    created_at
)
SELECT
    UUID() AS id,
    name AS source_name,
    name AS normalized_name,
    id AS cleaned_major_id,
    'exact' AS mapping_type,
    1.00 AS confidence_score,
    'legacy' AS source_type,
    TRUE AS verified,
    CURRENT_TIMESTAMP
FROM cleaned_majors
ON DUPLICATE KEY UPDATE
    normalized_name = VALUES(normalized_name),
    cleaned_major_id = VALUES(cleaned_major_id);

-- ============================================
-- Step 5: 迁移录取分数数据到 cleaned_admission_scores
-- ============================================

INSERT INTO cleaned_admission_scores (
    id,
    cleaned_college_id,
    cleaned_major_id,
    year,
    source_province,
    subject_type,
    batch,
    min_score,
    min_rank,
    avg_score,
    max_score,
    max_rank,
    plan_count,
    major_group_code,
    major_group_name,
    subject_requirements,
    data_quality_score,
    data_source,
    raw_source_type,
    raw_source_id,
    created_at,
    updated_at
)
SELECT
    a.id,
    -- 通过名称映射找到cleaned_college_id
    COALESCE(
        (SELECT cleaned_college_id FROM entity_college_name_mappings
         WHERE source_name = a.college_name AND source_type = 'legacy' LIMIT 1),
        a.college_id
    ) AS cleaned_college_id,
    NULL AS cleaned_major_id, -- 需要后续通过专业名称映射
    a.year,
    a.source_province,
    a.subject_type,
    a.batch,
    a.min_score,
    a.min_rank,
    a.avg_score,
    a.max_score,
    a.max_rank,
    a.plan_count,
    a.group_code AS major_group_code,
    a.group_name AS major_group_name,
    a.subject_requirements,
    -- 数据质量评分
    ROUND(
        (CASE WHEN a.min_score IS NOT NULL THEN 25 ELSE 0 END +
         CASE WHEN a.min_rank IS NOT NULL THEN 25 ELSE 0 END +
         CASE WHEN a.avg_score IS NOT NULL THEN 20 ELSE 0 END +
         CASE WHEN a.plan_count IS NOT NULL THEN 15 ELSE 0 END +
         CASE WHEN a.college_id IS NOT NULL THEN 15 ELSE 0 END)
    ) AS data_quality_score,
    'legacy_admission_scores' AS data_source,
    'legacy' AS raw_source_type,
    a.id AS raw_source_id,
    a.created_at,
    a.updated_at
FROM admission_scores a
WHERE EXISTS (
    SELECT 1 FROM entity_college_name_mappings m
    WHERE m.source_name = a.college_name AND m.source_type = 'legacy'
)
ON DUPLICATE KEY UPDATE
    year = VALUES(year),
    min_score = VALUES(min_score),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 6: 迁移校园生活数据到 cleaned_campus_life
-- ============================================

INSERT INTO cleaned_campus_life (
    id,
    cleaned_college_id,
    dorm_style,
    has_air_conditioner,
    has_independent_bathroom,
    bathroom_distance,
    dorm_score,
    has_morning_self_study,
    has_evening_self_study,
    has_library,
    has_overnight_study_room,
    study_environment_score,
    canteen_price_level,
    canteen_quality_score,
    canteen_has_issues,
    has_subway,
    in_urban_area,
    to_city_time,
    transport_score,
    has_washing_machine,
    campus_wifi_quality,
    campus_wifi_speed,
    has_power_cutoff,
    power_cutoff_time,
    has_network_cutoff,
    network_cutoff_time,
    hot_water_time,
    has_morning_run,
    running_requirement,
    can_ride_ebike,
    ebike_charging_location,
    shared_bike_availability,
    shared_bike_types,
    supermarket_quality,
    supermarket_description,
    express_delivery_convenience,
    express_delivery_policy,
    dorm_curfew_time,
    school_gate_policy,
    check_dormitory,
    late_return_policy,
    holiday_duration,
    has_mini_semester,
    mini_semester_duration,
    can_order_takeout,
    takeout_pickup_distance,
    can_bring_computer,
    power_limit_description,
    campus_card_description,
    bank_card_issued,
    reliability,
    answer_count,
    data_quality_score,
    data_source,
    raw_source_ids,
    raw_answers,
    created_at,
    updated_at
)
SELECT
    cl.id,
    cl.college_id AS cleaned_college_id,
    cl.dorm_style,
    cl.has_air_conditioner,
    cl.has_independent_bathroom,
    cl.bathroom_distance,
    cl.dorm_score,
    cl.has_morning_self_study,
    cl.has_evening_self_study,
    cl.has_library,
    cl.has_overnight_study_room,
    cl.study_environment_score,
    cl.canteen_price_level,
    cl.canteen_quality_score,
    cl.canteen_has_issues,
    cl.has_subway,
    cl.in_urban_area,
    cl.to_city_time,
    cl.transport_score,
    cl.has_washing_machine,
    cl.campus_wifi_quality,
    cl.campus_wifi_speed,
    cl.has_power_cutoff,
    cl.power_cutoff_time,
    cl.has_network_cutoff,
    cl.network_cutoff_time,
    cl.hot_water_time,
    cl.has_morning_run,
    cl.running_requirement,
    cl.can_ride_ebike,
    cl.ebike_charging_location,
    cl.shared_bike_availability,
    cl.shared_bike_types,
    cl.supermarket_quality,
    cl.supermarket_description,
    cl.express_delivery_convenience,
    cl.express_delivery_policy,
    cl.dorm_curfew_time,
    cl.school_gate_policy,
    cl.check_dormitory,
    cl.late_return_policy,
    cl.holiday_duration,
    cl.has_mini_semester,
    cl.mini_semester_duration,
    cl.can_order_takeout,
    cl.takeout_pickup_distance,
    cl.can_bring_computer,
    cl.power_limit_description,
    cl.campus_card_description,
    cl.bank_card_issued,
    cl.reliability,
    cl.answer_count,
    -- 数据质量评分
    ROUND(
        (CASE WHEN cl.dorm_score IS NOT NULL THEN 15 ELSE 0 END +
         CASE WHEN cl.canteen_quality_score IS NOT NULL THEN 15 ELSE 0 END +
         CASE WHEN cl.transport_score IS NOT NULL THEN 15 ELSE 0 END +
         CASE WHEN cl.reliability IS NOT NULL AND cl.reliability > 50 THEN 20 ELSE 0 END +
         CASE WHEN cl.answer_count IS NOT NULL AND cl.answer_count >= 5 THEN 20 ELSE
              CASE WHEN cl.answer_count IS NOT NULL AND cl.answer_count >= 1 THEN 10 ELSE 0 END
         END +
         CASE WHEN cl.has_air_conditioner IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN cl.has_independent_bathroom IS NOT NULL THEN 5 ELSE 0 END +
         CASE WHEN cl.can_order_takeout IS NOT NULL THEN 5 ELSE 0 END)
    ) AS data_quality_score,
    cl.data_source,
    JSON_ARRAY(cl.id) AS raw_source_ids,
    cl.raw_answers,
    cl.created_at,
    cl.updated_at
FROM college_campus_life cl
WHERE EXISTS (
    SELECT 1 FROM cleaned_colleges cc WHERE cc.id = cl.college_id
)
ON DUPLICATE KEY UPDATE
    dorm_score = VALUES(dorm_score),
    canteen_quality_score = VALUES(canteen_quality_score),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- Step 7: 数据完整性验证
-- ============================================

-- 验证院校数量
SELECT
    'College Migration' AS check_name,
    (SELECT COUNT(*) FROM colleges) AS source_count,
    (SELECT COUNT(*) FROM cleaned_colleges) AS target_count,
    CASE
        WHEN (SELECT COUNT(*) FROM colleges) = (SELECT COUNT(*) FROM cleaned_colleges)
        THEN 'PASS' ELSE 'FAIL'
    END AS status;

-- 验证专业数量
SELECT
    'Major Migration' AS check_name,
    (SELECT COUNT(*) FROM majors) AS source_count,
    (SELECT COUNT(*) FROM cleaned_majors) AS target_count,
    CASE
        WHEN (SELECT COUNT(*) FROM majors) = (SELECT COUNT(*) FROM cleaned_majors)
        THEN 'PASS' ELSE 'FAIL'
    END AS status;

-- 验证录取分数数量
SELECT
    'Admission Score Migration' AS check_name,
    (SELECT COUNT(*) FROM admission_scores) AS source_count,
    (SELECT COUNT(*) FROM cleaned_admission_scores) AS target_count,
    ROUND((SELECT COUNT(*) FROM cleaned_admission_scores) * 100.0 /
          NULLIF((SELECT COUNT(*) FROM admission_scores), 0), 2) AS migration_percentage;

-- 验证校园生活数量
SELECT
    'Campus Life Migration' AS check_name,
    (SELECT COUNT(*) FROM college_campus_life) AS source_count,
    (SELECT COUNT(*) FROM cleaned_campus_life) AS target_count,
    CASE
        WHEN (SELECT COUNT(*) FROM college_campus_life) = (SELECT COUNT(*) FROM cleaned_campus_life)
        THEN 'PASS' ELSE 'FAIL'
    END AS status;

-- 验证数据质量分布
SELECT
    'Data Quality Distribution' AS report_name,
    AVG(data_quality_score) AS avg_quality,
    MIN(data_quality_score) AS min_quality,
    MAX(data_quality_score) AS max_quality,
    COUNT(CASE WHEN data_quality_score >= 80 THEN 1 END) AS high_quality_count,
    COUNT(CASE WHEN data_quality_score >= 50 AND data_quality_score < 80 THEN 1 END) AS medium_quality_count,
    COUNT(CASE WHEN data_quality_score < 50 THEN 1 END) AS low_quality_count
FROM cleaned_colleges;
