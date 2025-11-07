-- ============================================
-- 三层数据库架构 - 第一层: 原始数据层 (Raw Data Lake)
-- ============================================
-- 用途: 接收各种渠道的原始数据,零处理直接存储
-- 原则: 只增不改,保留所有原始信息
-- ============================================

-- 原始数据批次表(追踪每次导入)
CREATE TABLE IF NOT EXISTS raw_import_batches (
    id VARCHAR(36) PRIMARY KEY COMMENT '批次ID',
    source_type VARCHAR(50) NOT NULL COMMENT '数据源类型: csv, api, crawler, manual',
    source_name VARCHAR(100) NOT NULL COMMENT '数据源名称',
    import_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '导入时间',
    file_path TEXT COMMENT '文件路径(CSV/Excel)',
    file_hash VARCHAR(64) COMMENT '文件哈希值(用于去重)',
    record_count INT DEFAULT 0 COMMENT '记录数量',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending, processing, completed, failed',
    error_message TEXT COMMENT '错误信息',
    metadata JSON COMMENT '其他元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_source_type (source_type),
    INDEX idx_import_time (import_time),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='原始数据导入批次表';

-- ============================================
-- CSV原始数据表
-- ============================================

-- CSV原始数据 - 校园生活问卷
CREATE TABLE IF NOT EXISTS raw_csv_campus_life (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL COMMENT '批次ID',
    `row_number` INT NOT NULL COMMENT 'CSV行号',

    -- 原始CSV列(不做任何清洗)
    raw_answer_id VARCHAR(50) COMMENT '答题序号',
    raw_source VARCHAR(50) COMMENT '来源',
    raw_college_name VARCHAR(200) COMMENT '学校名称(Q4)',

    -- Q1-Q30原始答案
    raw_q1 TEXT COMMENT 'Q1: 匿名标识',
    raw_q2 TEXT COMMENT 'Q2: 邮箱',
    raw_q3 TEXT COMMENT 'Q3: 显示邮箱',
    raw_q5 TEXT COMMENT 'Q5: 宿舍是上床下桌吗?',
    raw_q6 TEXT COMMENT 'Q6: 教室和宿舍有没有空调?',
    raw_q7 TEXT COMMENT 'Q7: 有独立卫浴吗?',
    raw_q8 TEXT COMMENT 'Q8: 有早自习、晚自习吗?',
    raw_q9 TEXT COMMENT 'Q9: 学校要求早上跑操吗?',
    raw_q10 TEXT COMMENT 'Q10: 跑操要求',
    raw_q11 TEXT COMMENT 'Q11: 假期时间长度',
    raw_q12 TEXT COMMENT 'Q12: 可以叫外卖吗?',
    raw_q13 TEXT COMMENT 'Q13: 交通便利吗?',
    raw_q14 TEXT COMMENT 'Q14: 有洗衣机吗?',
    raw_q15 TEXT COMMENT 'Q15: 校园网怎么样?',
    raw_q16 TEXT COMMENT 'Q16: 有断电吗?',
    raw_q17 TEXT COMMENT 'Q17: 食堂价格',
    raw_q18 TEXT COMMENT 'Q18: 热水供应时间',
    raw_q19 TEXT COMMENT 'Q19: 可以骑电瓶车吗?',
    raw_q20 TEXT COMMENT 'Q20: 功率限制',
    raw_q21 TEXT COMMENT 'Q21: 有通宵自习室吗?',
    raw_q22 TEXT COMMENT 'Q22: 可以带电脑吗?',
    raw_q23 TEXT COMMENT 'Q23: 校园一卡通',
    raw_q24 TEXT COMMENT 'Q24: 银行卡',
    raw_q25 TEXT COMMENT 'Q25: 超市',
    raw_q26 TEXT COMMENT 'Q26: 快递',
    raw_q27 TEXT COMMENT 'Q27: 共享单车',
    raw_q28 TEXT COMMENT 'Q28: 校门管理',
    raw_q29 TEXT COMMENT 'Q29: 晚归政策',
    raw_q30 TEXT COMMENT 'Q30: 自由补充',

    -- 元数据
    raw_submitted_at VARCHAR(50) COMMENT '提交时间',
    raw_ip_province VARCHAR(50) COMMENT 'IP省份',
    raw_ip_city VARCHAR(50) COMMENT 'IP城市',
    raw_browser VARCHAR(100) COMMENT '浏览器',
    raw_os VARCHAR(100) COMMENT '操作系统',

    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '导入时间',

    FOREIGN KEY (batch_id) REFERENCES raw_import_batches(id),
    INDEX idx_batch_id (batch_id),
    INDEX idx_college_name (raw_college_name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSV原始数据 - 校园生活问卷';

-- CSV原始数据 - 院校基本信息
CREATE TABLE IF NOT EXISTS raw_csv_college_info (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    `row_number` INT NOT NULL,

    -- 原始CSV所有列(根据实际CSV结构调整)
    raw_name VARCHAR(200),
    raw_code VARCHAR(50),
    raw_province VARCHAR(100),
    raw_city VARCHAR(100),
    raw_type VARCHAR(100),
    raw_level VARCHAR(100),
    raw_is_985 VARCHAR(50),
    raw_is_211 VARCHAR(50),
    raw_address TEXT,
    raw_phone VARCHAR(100),
    raw_website TEXT,

    -- 存储完整行的JSON
    raw_row_json JSON COMMENT '完整CSV行数据',

    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES raw_import_batches(id),
    INDEX idx_batch_id (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSV原始数据 - 院校信息';

-- CSV原始数据 - 录取分数
CREATE TABLE IF NOT EXISTS raw_csv_admission_scores (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    `row_number` INT NOT NULL,

    raw_year VARCHAR(50),
    raw_province VARCHAR(100),
    raw_college_name VARCHAR(200),
    raw_major_name VARCHAR(200),
    raw_subject_type VARCHAR(50),
    raw_min_score VARCHAR(50),
    raw_min_rank VARCHAR(50),
    raw_avg_score VARCHAR(50),
    raw_max_score VARCHAR(50),
    raw_plan_count VARCHAR(50),

    raw_row_json JSON,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES raw_import_batches(id),
    INDEX idx_batch_id (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CSV原始数据 - 录取分数';

-- ============================================
-- API原始数据表
-- ============================================

-- API原始数据 - 院校信息
CREATE TABLE IF NOT EXISTS raw_api_college_info (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    api_endpoint VARCHAR(200) NOT NULL COMMENT 'API端点',
    college_id_in_api VARCHAR(100) COMMENT 'API中的院校ID',

    -- 存储完整的API响应
    response_json JSON NOT NULL COMMENT 'API响应JSON',

    -- 元数据
    request_time TIMESTAMP COMMENT '请求时间',
    response_code INT COMMENT 'HTTP状态码',
    response_headers JSON COMMENT '响应头',
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES raw_import_batches(id),
    INDEX idx_batch_id (batch_id),
    INDEX idx_api_endpoint (api_endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API原始数据 - 院校信息';

-- API原始数据 - 招生计划
CREATE TABLE IF NOT EXISTS raw_api_enrollment_plans (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    api_endpoint VARCHAR(200) NOT NULL,

    response_json JSON NOT NULL,

    request_time TIMESTAMP,
    response_code INT,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES raw_import_batches(id),
    INDEX idx_batch_id (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API原始数据 - 招生计划';

-- ============================================
-- 爬虫原始数据表
-- ============================================

-- 爬虫原始数据 - 录取分数
CREATE TABLE IF NOT EXISTS raw_crawler_admission_scores (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    source_url TEXT NOT NULL COMMENT '源URL',

    -- 原始HTML或解析后的JSON
    raw_html TEXT COMMENT '原始HTML',
    parsed_json JSON COMMENT '解析后的JSON',

    -- 元数据
    crawled_at TIMESTAMP COMMENT '爬取时间',
    crawler_version VARCHAR(50) COMMENT '爬虫版本',
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES raw_import_batches(id),
    INDEX idx_batch_id (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='爬虫原始数据 - 录取分数';

-- 爬虫原始数据 - 院校详情
CREATE TABLE IF NOT EXISTS raw_crawler_college_details (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    source_url TEXT NOT NULL,

    raw_html TEXT,
    parsed_json JSON,

    crawled_at TIMESTAMP,
    crawler_version VARCHAR(50),
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES raw_import_batches(id),
    INDEX idx_batch_id (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='爬虫原始数据 - 院校详情';

-- ============================================
-- 原始数据处理日志
-- ============================================

CREATE TABLE IF NOT EXISTS raw_data_processing_logs (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL,
    processing_step VARCHAR(100) NOT NULL COMMENT '处理步骤: validation, cleaning, mapping',
    status VARCHAR(20) NOT NULL COMMENT 'success, failed, skipped',
    record_count INT DEFAULT 0 COMMENT '处理记录数',
    error_count INT DEFAULT 0 COMMENT '错误数量',
    log_message TEXT COMMENT '日志信息',
    processing_time_ms INT COMMENT '处理耗时(毫秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES raw_import_batches(id),
    INDEX idx_batch_id (batch_id),
    INDEX idx_step (processing_step),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='原始数据处理日志';
