-- ============================================
-- 三层数据库架构 - 第三层: 核心运算层 (Core Runtime)
-- ============================================
-- 用途: 为应用层提供高性能查询
-- 原则: 极致性能优化、冗余设计、预计算字段
-- ============================================

-- ============================================
-- 核心运算 - 院校表
-- ============================================

CREATE TABLE IF NOT EXISTS core_colleges (
    id VARCHAR(36) PRIMARY KEY COMMENT '院校ID',
    name VARCHAR(100) NOT NULL COMMENT '院校名称',
    code VARCHAR(20) UNIQUE COMMENT '院校代码',

    -- 基础信息(冗余存储,避免JOIN)
    province VARCHAR(50) NOT NULL COMMENT '省份',
    city VARCHAR(50) NOT NULL COMMENT '城市',
    college_type VARCHAR(50) COMMENT '院校类型',
    affiliation VARCHAR(100) COMMENT '主管部门',

    -- 分类标识(冗余)
    is_985 BOOLEAN DEFAULT FALSE,
    is_211 BOOLEAN DEFAULT FALSE,
    is_double_first_class BOOLEAN DEFAULT FALSE,
    is_world_class BOOLEAN DEFAULT FALSE,
    is_art BOOLEAN DEFAULT FALSE,
    is_national_key BOOLEAN DEFAULT FALSE,

    key_level VARCHAR(50) COMMENT '重点级别',
    education_level VARCHAR(50) COMMENT '教育层次',

    -- 学术指标
    postgraduate_rate DECIMAL(5,2) COMMENT '保研率',
    national_special_major_count INT COMMENT '国家级特色专业数',
    world_class_disciplines TEXT COMMENT '世界一流学科',

    -- 基本统计
    founded_year INT COMMENT '建校年份',
    student_count INT COMMENT '在校生数',
    teacher_count INT COMMENT '教师数',
    academician_count INT COMMENT '院士数',

    -- 联系信息
    admission_phone VARCHAR(100),
    email VARCHAR(100),
    address VARCHAR(255),
    website VARCHAR(100),

    -- ===== 预计算字段(避免实时聚合) =====
    avg_admission_score_recent_3years INT COMMENT '近3年平均录取分',
    min_rank_recent_3years INT COMMENT '近3年最低位次',
    avg_admission_score_recent_year INT COMMENT '最近一年平均录取分',
    min_rank_recent_year INT COMMENT '最近一年最低位次',

    hot_level INT DEFAULT 0 COMMENT '热度指数(0-100)',
    difficulty_level VARCHAR(20) COMMENT '录取难度: easy, medium, hard, very_hard',

    -- 校园生活评分(冗余,避免JOIN)
    dorm_score DECIMAL(3,1) COMMENT '宿舍评分',
    canteen_score DECIMAL(3,1) COMMENT '食堂评分',
    transport_score DECIMAL(3,1) COMMENT '交通评分',
    study_environment_score DECIMAL(3,1) COMMENT '学习环境评分',
    overall_life_score DECIMAL(3,1) COMMENT '综合生活评分',

    -- 统计信息
    major_count INT DEFAULT 0 COMMENT '专业数量',
    enrollment_province_count INT DEFAULT 0 COMMENT '招生省份数',

    -- 元数据
    data_version INT DEFAULT 1 COMMENT '数据版本',
    last_synced_at TIMESTAMP NULL COMMENT '最后同步时间',
    sync_source VARCHAR(50) DEFAULT 'cleaned' COMMENT '同步来源',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_code (code),
    INDEX idx_province (province),
    INDEX idx_city (city),
    INDEX idx_province_city (province, city),
    INDEX idx_type (college_type),
    INDEX idx_985_211 (is_985, is_211),
    INDEX idx_hot_level (hot_level),
    INDEX idx_difficulty (difficulty_level),
    INDEX idx_avg_score (avg_admission_score_recent_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核心运算库 - 院校表';

-- ============================================
-- 核心运算 - 专业表
-- ============================================

CREATE TABLE IF NOT EXISTS core_majors (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,

    -- 分类
    discipline VARCHAR(50),
    category VARCHAR(50) NOT NULL,
    sub_category VARCHAR(50),

    -- 培养信息
    degree_type VARCHAR(50),
    study_years INT DEFAULT 4,
    required_subjects JSON,
    description TEXT,

    -- 就业信息(冗余)
    avg_salary INT COMMENT '平均薪资',
    employment_rate DECIMAL(5,2) COMMENT '就业率',
    career_fields JSON COMMENT '职业领域',

    -- 预计算字段
    hot_level INT DEFAULT 0 COMMENT '热度指数',
    college_count INT DEFAULT 0 COMMENT '开设院校数',
    avg_admission_score INT COMMENT '平均录取分',

    -- 元数据
    data_version INT DEFAULT 1,
    last_synced_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_code (code),
    INDEX idx_category (category),
    INDEX idx_discipline (discipline),
    INDEX idx_hot_level (hot_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核心运算库 - 专业表';

-- ============================================
-- 核心运算 - 录取分数表(完全冗余设计)
-- ============================================

CREATE TABLE IF NOT EXISTS core_admission_scores (
    id VARCHAR(36) PRIMARY KEY,

    -- 使用UUID外键(完全避免字符串匹配)
    college_id VARCHAR(36) NOT NULL COMMENT '院校ID',
    major_id VARCHAR(36) NULL COMMENT '专业ID',

    -- 冗余院校信息(避免JOIN)
    college_name VARCHAR(100) NOT NULL COMMENT '院校名称',
    college_code VARCHAR(20) COMMENT '院校代码',
    college_province VARCHAR(50) COMMENT '院校省份',
    college_city VARCHAR(50) COMMENT '院校城市',
    college_is_985 BOOLEAN DEFAULT FALSE COMMENT '是否985',
    college_is_211 BOOLEAN DEFAULT FALSE COMMENT '是否211',
    college_is_double_first_class BOOLEAN DEFAULT FALSE COMMENT '是否双一流',
    college_type VARCHAR(50) COMMENT '院校类型',

    -- 冗余专业信息(避免JOIN)
    major_name VARCHAR(100) COMMENT '专业名称',
    major_code VARCHAR(20) COMMENT '专业代码',
    major_category VARCHAR(50) COMMENT '专业类别',
    major_discipline VARCHAR(50) COMMENT '学科门类',

    -- 基本信息
    year INT NOT NULL COMMENT '年份',
    source_province VARCHAR(50) NOT NULL COMMENT '生源省份',
    subject_type VARCHAR(50) NOT NULL COMMENT '科类',
    batch VARCHAR(50) COMMENT '批次',

    -- 分数数据
    min_score INT COMMENT '最低分',
    min_rank INT COMMENT '最低位次',
    avg_score INT COMMENT '平均分',
    max_score INT COMMENT '最高分',
    max_rank INT COMMENT '最高位次',
    plan_count INT COMMENT '计划招生数',

    -- 专业组信息
    major_group_code VARCHAR(50) COMMENT '专业组代码',
    major_group_name VARCHAR(100) COMMENT '专业组名称',
    subject_requirements TEXT COMMENT '选科要求',

    -- 预计算字段
    score_volatility DECIMAL(5,2) COMMENT '分数波动(标准差)',
    rank_volatility DECIMAL(5,2) COMMENT '位次波动',
    difficulty_level VARCHAR(20) COMMENT '难度等级',
    competitiveness INT COMMENT '竞争度(0-100)',

    -- 元数据
    data_version INT DEFAULT 1,
    last_synced_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (college_id) REFERENCES core_colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (major_id) REFERENCES core_majors(id) ON DELETE SET NULL,

    INDEX idx_college_id (college_id),
    INDEX idx_major_id (major_id),
    INDEX idx_college_year (college_id, year),
    INDEX idx_major_year (major_id, year),
    INDEX idx_province_year (source_province, year),
    INDEX idx_year_subject (year, subject_type),
    INDEX idx_score_range (min_score, max_score),
    INDEX idx_rank_range (min_rank, max_rank),
    INDEX idx_year_province_subject (year, source_province, subject_type),
    INDEX idx_college_province_year (college_id, source_province, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核心运算库 - 录取分数表';

-- ============================================
-- 核心运算 - 招生计划表
-- ============================================

CREATE TABLE IF NOT EXISTS core_enrollment_plans (
    id VARCHAR(36) PRIMARY KEY,

    college_id VARCHAR(36) NOT NULL,
    major_id VARCHAR(36) NULL,

    -- 冗余信息
    college_name VARCHAR(100) NOT NULL,
    college_code VARCHAR(20),
    college_province VARCHAR(50),
    college_is_985 BOOLEAN,
    college_is_211 BOOLEAN,

    major_name VARCHAR(100),
    major_code VARCHAR(20),
    major_category VARCHAR(50),

    -- 基本信息
    year INT NOT NULL,
    source_province VARCHAR(50) NOT NULL,
    subject_type VARCHAR(50) NOT NULL,
    batch VARCHAR(50) NOT NULL,

    plan_count INT NOT NULL COMMENT '计划人数',
    study_years INT COMMENT '学制',
    tuition DECIMAL(10,2) COMMENT '学费',

    major_group_code VARCHAR(50),
    major_group_name VARCHAR(100),
    subject_requirements TEXT,
    major_remarks TEXT,

    -- 元数据
    data_version INT DEFAULT 1,
    last_synced_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (college_id) REFERENCES core_colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (major_id) REFERENCES core_majors(id) ON DELETE SET NULL,

    INDEX idx_college_year (college_id, year),
    INDEX idx_major_year (major_id, year),
    INDEX idx_province_year (source_province, year),
    INDEX idx_year_subject (year, subject_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核心运算库 - 招生计划表';

-- ============================================
-- 核心运算 - 校园生活表
-- ============================================

CREATE TABLE IF NOT EXISTS core_campus_life (
    id VARCHAR(36) PRIMARY KEY,
    college_id VARCHAR(36) NOT NULL,

    -- 冗余院校信息(避免JOIN)
    college_name VARCHAR(100) NOT NULL,
    college_code VARCHAR(20),
    college_province VARCHAR(50),
    college_city VARCHAR(50),

    -- 住宿条件
    dorm_style VARCHAR(20),
    has_air_conditioner BOOLEAN,
    has_independent_bathroom BOOLEAN,
    bathroom_distance TEXT,
    dorm_score DECIMAL(3,1),

    -- 学习环境
    has_morning_self_study BOOLEAN,
    has_evening_self_study BOOLEAN,
    has_library BOOLEAN,
    has_overnight_study_room BOOLEAN,
    study_environment_score DECIMAL(3,1),

    -- 食堂
    canteen_price_level VARCHAR(20),
    canteen_quality_score DECIMAL(3,1),
    canteen_has_issues BOOLEAN,

    -- 交通
    has_subway BOOLEAN,
    in_urban_area BOOLEAN,
    to_city_time TEXT,
    transport_score DECIMAL(3,1),

    -- 设施
    has_washing_machine BOOLEAN,
    campus_wifi_quality VARCHAR(20),
    has_power_cutoff BOOLEAN,
    power_cutoff_time VARCHAR(20),
    has_network_cutoff BOOLEAN,
    hot_water_time TEXT,

    -- 运动
    has_morning_run BOOLEAN,
    running_requirement TEXT,
    can_ride_ebike BOOLEAN,
    shared_bike_availability VARCHAR(20),

    -- 商业配套
    supermarket_quality VARCHAR(20),
    express_delivery_convenience DECIMAL(3,1),

    -- 门禁
    dorm_curfew_time TEXT,
    school_gate_policy TEXT,
    check_dormitory BOOLEAN,

    -- 其他
    can_order_takeout BOOLEAN,
    can_bring_computer BOOLEAN,

    -- 综合评分
    overall_score DECIMAL(3,1) COMMENT '综合评分',
    reliability INT COMMENT '可靠性',
    answer_count INT DEFAULT 1 COMMENT '问卷数量',

    -- 元数据
    data_version INT DEFAULT 1,
    last_synced_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (college_id) REFERENCES core_colleges(id) ON DELETE CASCADE,

    UNIQUE INDEX idx_college (college_id),
    INDEX idx_dorm_score (dorm_score),
    INDEX idx_canteen_score (canteen_quality_score),
    INDEX idx_transport_score (transport_score),
    INDEX idx_overall_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核心运算库 - 校园生活表';

-- ============================================
-- 核心运算 - 院校专业关联表
-- ============================================

CREATE TABLE IF NOT EXISTS core_college_major_relations (
    id VARCHAR(36) PRIMARY KEY,
    college_id VARCHAR(36) NOT NULL,
    major_id VARCHAR(36) NOT NULL,

    -- 冗余字段(避免JOIN)
    college_name VARCHAR(100) NOT NULL,
    college_code VARCHAR(20),
    major_name VARCHAR(100) NOT NULL,
    major_code VARCHAR(20),

    -- 关联信息
    has_enrollment BOOLEAN DEFAULT TRUE COMMENT '是否招生',
    years_offered JSON COMMENT '招生年份列表',
    first_offered_year INT COMMENT '首次招生年份',
    latest_offered_year INT COMMENT '最近招生年份',

    -- 统计信息
    total_plan_count INT DEFAULT 0 COMMENT '总计划数',
    province_count INT DEFAULT 0 COMMENT '招生省份数',

    -- 元数据
    data_version INT DEFAULT 1,
    last_synced_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (college_id) REFERENCES core_colleges(id) ON DELETE CASCADE,
    FOREIGN KEY (major_id) REFERENCES core_majors(id) ON DELETE CASCADE,

    UNIQUE INDEX idx_college_major (college_id, major_id),
    INDEX idx_college (college_id),
    INDEX idx_major (major_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核心运算库 - 院校专业关联表';

-- ============================================
-- 同步日志表
-- ============================================

CREATE TABLE IF NOT EXISTS sync_logs (
    id VARCHAR(36) PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL COMMENT '同步类型: full, incremental',
    entity_type VARCHAR(50) NOT NULL COMMENT '实体类型: college, major, admission_score, etc',

    source_layer VARCHAR(20) NOT NULL COMMENT '源层: cleaned',
    target_layer VARCHAR(20) NOT NULL COMMENT '目标层: core',

    total_records INT DEFAULT 0,
    synced_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    skipped_count INT DEFAULT 0,

    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    duration_ms INT,

    error_details JSON,
    sync_status VARCHAR(20) DEFAULT 'running' COMMENT 'running, completed, failed',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_entity_type (entity_type),
    INDEX idx_sync_status (sync_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据同步日志';

-- ============================================
-- 数据版本控制表
-- ============================================

CREATE TABLE IF NOT EXISTS data_versions (
    id VARCHAR(36) PRIMARY KEY,
    layer VARCHAR(20) NOT NULL COMMENT '数据层: raw, cleaned, core',
    entity_type VARCHAR(50) NOT NULL COMMENT '实体类型',

    version INT NOT NULL COMMENT '版本号',
    description TEXT COMMENT '版本说明',

    record_count INT DEFAULT 0 COMMENT '记录数',
    checksum VARCHAR(64) COMMENT '数据校验和',

    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_layer_entity_version (layer, entity_type, version),
    INDEX idx_layer_entity (layer, entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据版本控制表';
