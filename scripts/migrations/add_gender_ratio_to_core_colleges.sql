-- 添加男女比例字段到 core_colleges 表
-- 这些数据在 colleges 表中存在,但在core层缺失

ALTER TABLE core_colleges
ADD COLUMN `female_ratio` DECIMAL(5,2) NULL COMMENT '女生比例',
ADD COLUMN `male_ratio` DECIMAL(5,2) NULL COMMENT '男生比例';

-- 添加索引用于AI推荐系统查询
CREATE INDEX idx_gender_ratio ON core_colleges(female_ratio, male_ratio);
