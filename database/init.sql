-- 志愿填报系统数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS volunteer_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE volunteer_system;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  phone VARCHAR(11) NOT NULL UNIQUE,
  email VARCHAR(100),
  avatar VARCHAR(255),
  real_name VARCHAR(50),
  id_card VARCHAR(18),
  province VARCHAR(50),
  city VARCHAR(50),
  school VARCHAR(100),
  exam_year INT,
  exam_score INT,
  subject_type VARCHAR(20),
  status TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 院校表
CREATE TABLE IF NOT EXISTS colleges (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  type VARCHAR(50),
  level VARCHAR(100),
  nature VARCHAR(50),
  department VARCHAR(100),
  logo TEXT,
  banner TEXT,
  description TEXT,
  address VARCHAR(255),
  website VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(100),
  `rank` INT,
  min_score INT,
  avg_score INT,
  max_score INT,
  tags JSON,
  hot_level INT DEFAULT 0,
  founded_year INT,
  area INT,
  student_count INT,
  teacher_count INT,
  academician_count INT,
  key_discipline_count INT,
  features JSON,
  admission_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_province (province)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='院校表';

-- 专业表
CREATE TABLE IF NOT EXISTS majors (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  sub_category VARCHAR(50),
  degree VARCHAR(20) NOT NULL,
  degree_type VARCHAR(50),
  years INT DEFAULT 4,
  description TEXT,
  is_hot BOOLEAN DEFAULT FALSE,
  tags JSON,
  avg_salary INT,
  employment_rate DECIMAL(5,2),
  courses JSON,
  skills JSON,
  career TEXT,
  career_fields JSON,
  salary_trend JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='专业表';

-- 志愿表
CREATE TABLE IF NOT EXISTS volunteers (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  college_id VARCHAR(36) NOT NULL,
  major_id VARCHAR(36) NOT NULL,
  priority INT NOT NULL,
  is_obey_adjustment BOOLEAN DEFAULT TRUE,
  admit_probability VARCHAR(20),
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  submitted_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
  FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='志愿表';

-- 插入示例数据

-- 插入院校示例数据
INSERT INTO colleges (id, name, code, province, city, type, level, nature, department, `rank`, min_score, avg_score, max_score, tags, features)
VALUES
('college-001', '北京大学', '10001', '北京', '北京', '综合类', '985/211/双一流', '公办', '教育部', 1, 680, 690, 700, '["985", "211", "双一流"]', '["数学", "物理学", "化学"]'),
('college-002', '清华大学', '10002', '北京', '北京', '理工类', '985/211/双一流', '公办', '教育部', 2, 685, 695, 705, '["985", "211", "双一流"]', '["计算机科学", "工程学", "物理学"]'),
('college-003', '浙江大学', '10335', '浙江', '杭州', '综合类', '985/211/双一流', '公办', '教育部', 3, 670, 680, 690, '["985", "211", "双一流"]', '["计算机科学", "控制科学", "光学工程"]');

-- 插入专业示例数据
INSERT INTO majors (id, name, code, category, sub_category, degree, degree_type, years, is_hot, tags, avg_salary, employment_rate)
VALUES
('major-001', '计算机科学与技术', '080901', '工学', '计算机类', '本科', '工学学士', 4, TRUE, '["高薪", "就业好", "前景广"]', 12000, 95.5),
('major-002', '软件工程', '080902', '工学', '计算机类', '本科', '工学学士', 4, TRUE, '["高薪", "就业好"]', 11000, 94.8),
('major-003', '人工智能', '080717T', '工学', '计算机类', '本科', '工学学士', 4, TRUE, '["热门", "高薪", "前沿"]', 13000, 96.2);

-- 创建初始管理员账号 (密码: admin123)
-- 注意: 实际使用时需要通过 API 注册,这里的密码哈希是示例
INSERT INTO users (id, username, password, nickname, phone, email)
VALUES ('admin-001', 'admin', '$2b$10$XQKLvJ5VQ5dY5L5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5', '系统管理员', '13800138000', 'admin@example.com');
