-- =====================================================
-- 创建校园生活数据表
-- 用于存储问卷调查中的校园生活信息
-- =====================================================

-- 删除已存在的表（谨慎使用）
DROP TABLE IF EXISTS college_life_raw_answers CASCADE;
DROP TABLE IF EXISTS college_campus_life CASCADE;

-- =====================================================
-- 主表：college_campus_life
-- 存储结构化、聚合后的校园生活数据
-- =====================================================
CREATE TABLE college_campus_life (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  college_name VARCHAR(100) NOT NULL,

  -- ========== 住宿条件 (SEC_21) ==========
  dorm_style VARCHAR(20), -- '上床下桌', '上下铺', '混合'
  has_air_conditioner BOOLEAN,
  has_independent_bathroom BOOLEAN,
  bathroom_distance VARCHAR(100),
  dorm_score DECIMAL(3, 1) CHECK (dorm_score BETWEEN 0 AND 5),

  -- ========== 学习环境 (SEC_25) ==========
  has_morning_self_study BOOLEAN,
  has_evening_self_study BOOLEAN,
  has_library BOOLEAN,
  has_overnight_study_room BOOLEAN,
  study_environment_score DECIMAL(3, 1) CHECK (study_environment_score BETWEEN 0 AND 5),

  -- ========== 食堂 (SEC_22) ==========
  canteen_price_level VARCHAR(20), -- '便宜', '一般', '较贵', '很贵'
  canteen_quality_score DECIMAL(3, 1) CHECK (canteen_quality_score BETWEEN 0 AND 5),
  canteen_has_issues BOOLEAN, -- 是否有异物等问题

  -- ========== 交通 (SEC_27) ==========
  has_subway BOOLEAN,
  in_urban_area BOOLEAN,
  to_city_time VARCHAR(50), -- 到市中心时间
  transport_score DECIMAL(3, 1) CHECK (transport_score BETWEEN 0 AND 5),

  -- ========== 设施 ==========
  has_washing_machine BOOLEAN,
  campus_wifi_quality VARCHAR(20), -- '很好', '一般', '较差'
  campus_wifi_speed VARCHAR(50), -- '100M', '200M', '千兆'
  has_power_cutoff BOOLEAN,
  power_cutoff_time VARCHAR(20),
  has_network_cutoff BOOLEAN,
  network_cutoff_time VARCHAR(20),
  hot_water_time VARCHAR(100), -- 热水供应时间

  -- ========== 运动 (SEC_24) ==========
  has_morning_run BOOLEAN,
  running_requirement VARCHAR(100), -- '每学期50公里'等
  can_ride_ebike BOOLEAN,
  ebike_charging_location VARCHAR(100),
  shared_bike_availability VARCHAR(20), -- '丰富', '一般', '少'
  shared_bike_types VARCHAR(100), -- '青桔、哈啰'等

  -- ========== 商业配套 (SEC_28) ==========
  supermarket_quality VARCHAR(20), -- '好', '一般', '差'
  supermarket_description TEXT,
  express_delivery_convenience DECIMAL(3, 1) CHECK (express_delivery_convenience BETWEEN 0 AND 5),
  express_delivery_policy VARCHAR(200),

  -- ========== 门禁管理 ==========
  dorm_curfew_time VARCHAR(20), -- '23:00'
  school_gate_policy VARCHAR(200),
  check_dormitory BOOLEAN,
  late_return_policy VARCHAR(200),

  -- ========== 其他政策 ==========
  holiday_duration VARCHAR(100), -- '寒假2个月，暑假1个月'
  has_mini_semester BOOLEAN,
  mini_semester_duration VARCHAR(50),
  can_order_takeout BOOLEAN,
  takeout_pickup_distance VARCHAR(100),
  can_bring_computer BOOLEAN, -- 大一能否带电脑
  power_limit_description VARCHAR(200), -- 限电说明
  campus_card_description VARCHAR(200), -- 校园卡使用说明
  bank_card_issued BOOLEAN, -- 是否发放银行卡

  -- ========== 原始数据 ==========
  raw_answers JSONB, -- 存储所有原始答案

  -- ========== 数据质量 ==========
  data_source VARCHAR(50) DEFAULT 'campus_life_survey',
  reliability INT CHECK (reliability BETWEEN 0 AND 100), -- 可靠性 0-100
  answer_count INT DEFAULT 1, -- 答卷份数

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(college_id)
);

-- 创建索引
CREATE INDEX idx_campus_life_college ON college_campus_life(college_id);
CREATE INDEX idx_campus_life_college_name ON college_campus_life(college_name);
CREATE INDEX idx_campus_life_dorm_score ON college_campus_life(dorm_score);
CREATE INDEX idx_campus_life_transport_score ON college_campus_life(transport_score);
CREATE INDEX idx_campus_life_canteen_score ON college_campus_life(canteen_quality_score);
CREATE INDEX idx_campus_life_reliability ON college_campus_life(reliability);

-- 添加注释
COMMENT ON TABLE college_campus_life IS '校园生活数据主表（结构化聚合数据）';
COMMENT ON COLUMN college_campus_life.dorm_score IS '宿舍条件评分 (0-5分)';
COMMENT ON COLUMN college_campus_life.canteen_quality_score IS '食堂质量评分 (0-5分)';
COMMENT ON COLUMN college_campus_life.transport_score IS '交通便利性评分 (0-5分)';
COMMENT ON COLUMN college_campus_life.reliability IS '数据可靠性 (0-100，基于答卷数量)';
COMMENT ON COLUMN college_campus_life.answer_count IS '聚合的答卷份数';

-- =====================================================
-- 辅助表：college_life_raw_answers
-- 存储每份问卷的原始答案
-- =====================================================
CREATE TABLE college_life_raw_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES colleges(id) ON DELETE CASCADE,
  college_name VARCHAR(100) NOT NULL,
  answer_id INT, -- 对应CSV的答题序号

  -- ========== Q1-Q25 原始答案 ==========
  q1_dorm_style TEXT,
  q2_air_conditioner TEXT,
  q3_bathroom TEXT,
  q4_self_study TEXT,
  q5_morning_run TEXT,
  q6_running_requirement TEXT,
  q7_holiday_duration TEXT,
  q8_takeout TEXT,
  q9_transport TEXT,
  q10_washing_machine TEXT,
  q11_campus_wifi TEXT,
  q12_power_cutoff TEXT,
  q13_canteen_price TEXT,
  q14_hot_water TEXT,
  q15_ebike TEXT,
  q16_power_limit TEXT,
  q17_overnight_study TEXT,
  q18_bring_computer TEXT,
  q19_campus_card TEXT,
  q20_bank_card TEXT,
  q21_supermarket TEXT,
  q22_express_delivery TEXT,
  q23_shared_bike TEXT,
  q24_gate_policy TEXT,
  q25_late_return TEXT,

  -- ========== 元数据 ==========
  source VARCHAR(50),
  submitted_at TIMESTAMP,
  ip_province VARCHAR(50),
  ip_city VARCHAR(50),
  browser VARCHAR(100),
  operating_system VARCHAR(100),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_raw_answers_college ON college_life_raw_answers(college_id);
CREATE INDEX idx_raw_answers_college_name ON college_life_raw_answers(college_name);
CREATE INDEX idx_raw_answers_answer_id ON college_life_raw_answers(answer_id);

-- 添加注释
COMMENT ON TABLE college_life_raw_answers IS '校园生活问卷原始答案表';
COMMENT ON COLUMN college_life_raw_answers.answer_id IS '答题序号（对应CSV）';

-- =====================================================
-- 创建更新时间触发器
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campus_life_updated_at
  BEFORE UPDATE ON college_campus_life
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 授权（如果需要）
-- =====================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON college_campus_life TO your_app_user;
-- GRANT SELECT, INSERT ON college_life_raw_answers TO your_app_user;

COMMIT;
