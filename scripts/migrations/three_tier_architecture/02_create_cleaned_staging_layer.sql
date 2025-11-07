-- ============================================
-- 三层数据库架构 - 第二层: 清洗暂存层 (Cleaned Staging)
-- ============================================
-- 用途: 存储通过清洗管道处理后的标准化数据
-- 原则: 建立标准化映射表,支持人工审核
-- ============================================

-- ============================================
-- 院校主数据表 (Master Data)
-- ============================================

CREATE TABLE IF NOT EXISTS cleaned_colleges (
    id VARCHAR(36) PRIMARY KEY COMMENT '标准化院校ID',
    standard_name VARCHAR(100) NOT NULL UNIQUE COMMENT '标准名称',
    short_name VARCHAR(50) COMMENT '简称',
    english_name VARCHAR(200) COMMENT '英文名称',
    code VARCHAR(20) UNIQUE COMMENT '院校代码',

    -- 标准化基本信息
    province VARCHAR(50) NOT NULL COMMENT '省份',
    city VARCHAR(50) NOT NULL COMMENT '城市',
    college_type VARCHAR(50) COMMENT '院校类型',
    affiliation VARCHAR(100) COMMENT '主管部门',

    -- 分类标识
    is_985 BOOLEAN DEFAULT FALSE COMMENT '是否985',
    is_211 BOOLEAN DEFAULT FALSE COMMENT '是否211',
    is_double_first_class BOOLEAN DEFAULT FALSE COMMENT '是否双一流',
    is_world_class BOOLEAN DEFAULT FALSE COMMENT '是否世界一流大学',
    is_art BOOLEAN DEFAULT FALSE COMMENT '是否艺术类',
    is_national_key BOOLEAN DEFAULT FALSE COMMENT '是否国家重点',

    -- 学术指标
    key_level VARCHAR(50) COMMENT '重点级别',
    education_level VARCHAR(50) COMMENT '教育层次',
    postgraduate_rate DECIMAL(5,2) COMMENT '保研率',
    national_special_major_count INT COMMENT '国家级特色专业数',
    province_special_major_count INT COMMENT '省级特色专业数',
    world_class_disciplines TEXT COMMENT '世界一流学科',

    -- 基本信息
    founded_year INT COMMENT '建校年份',
    female_ratio DECIMAL(5,2) COMMENT '女生比例',
    male_ratio DECIMAL(5,2) COMMENT '男生比例',
    student_count INT COMMENT '在校生数',
    teacher_count INT COMMENT '教师数',
    academician_count INT COMMENT '院士数',

    -- 联系信息
    admission_phone VARCHAR(100) COMMENT '招生电话',
    email VARCHAR(100) COMMENT '邮箱',
    address VARCHAR(255) COMMENT '地址',
    website VARCHAR(100) COMMENT '官网',

    -- 数据质量
    data_quality_score INT DEFAULT 0 COMMENT '数据质量评分(0-100)',
    completeness_score INT DEFAULT 0 COMMENT '完整性评分(0-100)',
    verified BOOLEAN DEFAULT FALSE COMMENT '是否人工审核',
    verified_by VARCHAR(50) COMMENT '审核人',
    verified_at TIMESTAMP NULL COMMENT '审核时间',

    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    data_version INT DEFAULT 1 COMMENT '数据版本',

    INDEX idx_standard_name (standard_name),
    INDEX idx_code (code),
    INDEX idx_province (province),
    INDEX idx_city (city),
    INDEX idx_type (college_type),
    INDEX idx_985_211 (is_985, is_211),
    INDEX idx_quality (data_quality_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='清洗库 - 院校主数据表';

-- ============================================
-- 院校名称映射表 (解决同名异形问题)
-- ============================================

CREATE TABLE IF NOT EXISTS entity_college_name_mappings (
    id VARCHAR(36) PRIMARY KEY,
    source_name VARCHAR(200) NOT NULL COMMENT '原始名称',
    normalized_name VARCHAR(200) NOT NULL COMMENT '标准化后的名称',
    cleaned_college_id VARCHAR(36) NOT NULL COMMENT '对应的标准院校ID',

    mapping_type VARCHAR(50) NOT NULL COMMENT '映射类型: exact, alias, fuzzy, manual, short_name, keyword',
    confidence_score DECIMAL(3,2) DEFAULT 0.00 COMMENT '置信度(0.00-1.00)',
    similarity_score DECIMAL(5,2) COMMENT '相似度分数',

    -- 来源追踪
    source_type VARCHAR(50) NOT NULL COMMENT '来源类型: raw_csv, raw_api, raw_crawler, legacy',
    source_table VARCHAR(100) COMMENT '源表名',
    source_record_id VARCHAR(36) COMMENT '源记录ID',
    source_batch_id VARCHAR(36) COMMENT '源批次ID',

    -- 审核信息
    verified BOOLEAN DEFAULT FALSE COMMENT '是否审核确认',
    verified_by VARCHAR(50) COMMENT '审核人',
    verified_at TIMESTAMP NULL COMMENT '审核时间',
    is_valid BOOLEAN DEFAULT TRUE COMMENT '映射是否有效',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cleaned_college_id) REFERENCES cleaned_colleges(id),
    UNIQUE INDEX idx_source_name_type (source_name, source_type),
    INDEX idx_cleaned_college (cleaned_college_id),
    INDEX idx_mapping_type (mapping_type),
    INDEX idx_confidence (confidence_score),
    INDEX idx_verified (verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='院校名称映射表';

-- ============================================
-- 专业主数据表
-- ============================================

CREATE TABLE IF NOT EXISTS cleaned_majors (
    id VARCHAR(36) PRIMARY KEY COMMENT '标准化专业ID',
    standard_name VARCHAR(100) NOT NULL COMMENT '标准名称',
    code VARCHAR(20) UNIQUE COMMENT '专业代码',

    -- 学科分类
    discipline VARCHAR(50) COMMENT '学科门类',
    category VARCHAR(50) NOT NULL COMMENT '专业类别',
    sub_category VARCHAR(50) COMMENT '子类别',

    -- 培养信息
    degree_type VARCHAR(50) COMMENT '学位类型',
    study_years INT DEFAULT 4 COMMENT '学制',
    required_subjects JSON COMMENT '选科要求',
    training_objective TEXT COMMENT '培养目标',

    -- 就业信息
    avg_salary INT COMMENT '平均薪资',
    employment_rate DECIMAL(5,2) COMMENT '就业率',
    career_fields JSON COMMENT '职业领域',

    -- 课程信息
    courses JSON COMMENT '主修课程',
    skills JSON COMMENT '技能要求',

    description TEXT COMMENT '专业描述',

    -- 数据质量
    data_quality_score INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(50),
    verified_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_standard_name (standard_name),
    INDEX idx_code (code),
    INDEX idx_category (category),
    INDEX idx_discipline (discipline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='清洗库 - 专业主数据表';

-- ============================================
-- 专业名称映射表
-- ============================================

CREATE TABLE IF NOT EXISTS entity_major_name_mappings (
    id VARCHAR(36) PRIMARY KEY,
    source_name VARCHAR(200) NOT NULL,
    normalized_name VARCHAR(200) NOT NULL,
    cleaned_major_id VARCHAR(36) NOT NULL,

    mapping_type VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.00,

    source_type VARCHAR(50) NOT NULL,
    source_table VARCHAR(100),
    source_record_id VARCHAR(36),

    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(50),
    verified_at TIMESTAMP NULL,
    is_valid BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cleaned_major_id) REFERENCES cleaned_majors(id),
    UNIQUE INDEX idx_source_name_type (source_name, source_type),
    INDEX idx_cleaned_major (cleaned_major_id),
    INDEX idx_mapping_type (mapping_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专业名称映射表';

-- ============================================
-- 清洗后的录取分数数据
-- ============================================

CREATE TABLE IF NOT EXISTS cleaned_admission_scores (
    id VARCHAR(36) PRIMARY KEY,

    -- 使用标准化ID关联
    cleaned_college_id VARCHAR(36) NOT NULL,
    cleaned_major_id VARCHAR(36) NULL,

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

    -- 数据质量
    data_quality_score INT DEFAULT 0,
    data_source VARCHAR(100) COMMENT '数据来源',

    -- 原始数据追踪
    raw_source_type VARCHAR(50) COMMENT '原始数据类型',
    raw_source_id VARCHAR(36) COMMENT '原始记录ID',
    raw_batch_id VARCHAR(36) COMMENT '原始批次ID',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cleaned_college_id) REFERENCES cleaned_colleges(id),
    FOREIGN KEY (cleaned_major_id) REFERENCES cleaned_majors(id),
    INDEX idx_college_year (cleaned_college_id, year),
    INDEX idx_major_year (cleaned_major_id, year),
    INDEX idx_province_year (source_province, year),
    INDEX idx_year_subject (year, subject_type),
    INDEX idx_score_range (min_score, max_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='清洗库 - 录取分数数据';

-- ============================================
-- 清洗后的招生计划数据
-- ============================================

CREATE TABLE IF NOT EXISTS cleaned_enrollment_plans (
    id VARCHAR(36) PRIMARY KEY,

    cleaned_college_id VARCHAR(36) NOT NULL,
    cleaned_major_id VARCHAR(36) NULL,

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

    data_quality_score INT DEFAULT 0,
    raw_source_type VARCHAR(50),
    raw_source_id VARCHAR(36),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cleaned_college_id) REFERENCES cleaned_colleges(id),
    FOREIGN KEY (cleaned_major_id) REFERENCES cleaned_majors(id),
    INDEX idx_college_year (cleaned_college_id, year),
    INDEX idx_province_year (source_province, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='清洗库 - 招生计划数据';

-- ============================================
-- 清洗后的校园生活数据
-- ============================================

CREATE TABLE IF NOT EXISTS cleaned_campus_life (
    id VARCHAR(36) PRIMARY KEY,
    cleaned_college_id VARCHAR(36) NOT NULL,

    -- 住宿条件
    dorm_style VARCHAR(20) COMMENT '宿舍类型',
    has_air_conditioner BOOLEAN COMMENT '有空调',
    has_independent_bathroom BOOLEAN COMMENT '有独卫',
    bathroom_distance TEXT COMMENT '浴室距离',
    dorm_score DECIMAL(3,1) COMMENT '宿舍评分',

    -- 学习环境
    has_morning_self_study BOOLEAN COMMENT '有早自习',
    has_evening_self_study BOOLEAN COMMENT '有晚自习',
    has_library BOOLEAN COMMENT '有图书馆',
    has_overnight_study_room BOOLEAN COMMENT '有通宵自习室',
    study_environment_score DECIMAL(3,1) COMMENT '学习环境评分',

    -- 食堂
    canteen_price_level VARCHAR(20) COMMENT '食堂价格水平',
    canteen_quality_score DECIMAL(3,1) COMMENT '食堂质量评分',
    canteen_has_issues BOOLEAN COMMENT '食堂有问题',

    -- 交通
    has_subway BOOLEAN COMMENT '有地铁',
    in_urban_area BOOLEAN COMMENT '在市区',
    to_city_time TEXT COMMENT '到市区时间',
    transport_score DECIMAL(3,1) COMMENT '交通评分',

    -- 设施
    has_washing_machine BOOLEAN COMMENT '有洗衣机',
    campus_wifi_quality VARCHAR(20) COMMENT 'WiFi质量',
    campus_wifi_speed VARCHAR(50) COMMENT 'WiFi速度',
    has_power_cutoff BOOLEAN COMMENT '断电',
    power_cutoff_time VARCHAR(20) COMMENT '断电时间',
    has_network_cutoff BOOLEAN COMMENT '断网',
    network_cutoff_time VARCHAR(20) COMMENT '断网时间',
    hot_water_time TEXT COMMENT '热水时间',

    -- 运动
    has_morning_run BOOLEAN COMMENT '早操',
    running_requirement TEXT COMMENT '跑操要求',
    can_ride_ebike BOOLEAN COMMENT '可骑电瓶车',
    ebike_charging_location TEXT COMMENT '电瓶车充电位置',
    shared_bike_availability VARCHAR(20) COMMENT '共享单车丰富度',
    shared_bike_types TEXT COMMENT '共享单车类型',

    -- 商业配套
    supermarket_quality VARCHAR(20) COMMENT '超市质量',
    supermarket_description TEXT COMMENT '超市描述',
    express_delivery_convenience DECIMAL(3,1) COMMENT '快递便利度',
    express_delivery_policy TEXT COMMENT '快递政策',

    -- 门禁管理
    dorm_curfew_time TEXT COMMENT '门禁时间',
    school_gate_policy TEXT COMMENT '校门管理',
    check_dormitory BOOLEAN COMMENT '查寝',
    late_return_policy TEXT COMMENT '晚归政策',

    -- 其他
    holiday_duration TEXT COMMENT '假期时长',
    has_mini_semester BOOLEAN COMMENT '有小学期',
    mini_semester_duration TEXT COMMENT '小学期时长',
    can_order_takeout BOOLEAN COMMENT '可叫外卖',
    takeout_pickup_distance TEXT COMMENT '外卖取餐距离',
    can_bring_computer BOOLEAN COMMENT '可带电脑',
    power_limit_description TEXT COMMENT '功率限制',
    campus_card_description TEXT COMMENT '校园卡说明',
    bank_card_issued BOOLEAN COMMENT '发放银行卡',

    -- 数据质量
    reliability INT COMMENT '可靠性(0-100)',
    answer_count INT DEFAULT 1 COMMENT '问卷数量',
    data_quality_score INT DEFAULT 0,
    data_source VARCHAR(50) DEFAULT 'campus_life_survey',

    -- 原始数据追踪
    raw_source_ids JSON COMMENT '原始记录ID数组',
    raw_answers JSON COMMENT '原始答案',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cleaned_college_id) REFERENCES cleaned_colleges(id),
    UNIQUE INDEX idx_college (cleaned_college_id),
    INDEX idx_reliability (reliability)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='清洗库 - 校园生活数据';

-- ============================================
-- 数据清洗日志
-- ============================================

CREATE TABLE IF NOT EXISTS cleaning_logs (
    id VARCHAR(36) PRIMARY KEY,
    cleaning_type VARCHAR(50) NOT NULL COMMENT '清洗类型: college, major, admission_score, campus_life',
    batch_id VARCHAR(36) COMMENT '批次ID',

    total_records INT DEFAULT 0 COMMENT '总记录数',
    success_count INT DEFAULT 0 COMMENT '成功数',
    failed_count INT DEFAULT 0 COMMENT '失败数',
    skipped_count INT DEFAULT 0 COMMENT '跳过数',

    avg_quality_score DECIMAL(5,2) COMMENT '平均质量分',
    avg_confidence_score DECIMAL(5,2) COMMENT '平均置信度',

    error_details JSON COMMENT '错误详情',
    processing_time_ms INT COMMENT '处理耗时',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_type (cleaning_type),
    INDEX idx_batch (batch_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据清洗日志';
