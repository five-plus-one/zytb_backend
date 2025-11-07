-- =====================================================
-- 修复校园生活数据表字段长度问题
-- =====================================================

-- 增加 shared_bike_types 字段长度
ALTER TABLE college_campus_life
MODIFY COLUMN shared_bike_types TEXT;

-- 增加其他可能超长的字段
ALTER TABLE college_campus_life
MODIFY COLUMN campus_card_description TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN power_limit_description TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN school_gate_policy TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN late_return_policy TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN express_delivery_policy TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN holiday_duration TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN takeout_pickup_distance TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN hot_water_time TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN bathroom_distance TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN to_city_time TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN running_requirement TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN ebike_charging_location TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN supermarket_description TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN dorm_curfew_time TEXT;

ALTER TABLE college_campus_life
MODIFY COLUMN mini_semester_duration TEXT;
