#!/bin/bash

# =============================================
# 志愿填报系统 - Docker MySQL 初始化脚本
# =============================================

echo "开始初始化MySQL数据库..."

# 数据库连接配置（从 .env 读取）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3307}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-123456}"
DB_NAME="${DB_NAME:-volunteer_system}"

# 检查MySQL是否运行
echo "检查MySQL连接..."
docker exec -it mysql-volunteer mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "错误: 无法连接到MySQL。请确保Docker容器正在运行。"
    echo "提示: 使用以下命令启动MySQL容器:"
    echo "  docker run -d --name mysql-volunteer -p 3307:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql:8.0"
    exit 1
fi

echo "MySQL连接成功！"

# 执行初始化SQL脚本
echo "执行数据库初始化脚本..."
docker exec -i mysql-volunteer mysql -h"$DB_HOST" -P3306 -u"$DB_USER" -p"$DB_PASSWORD" < scripts/init_database.sql

if [ $? -eq 0 ]; then
    echo "✅ 数据库初始化成功！"
    echo ""
    echo "接下来的步骤:"
    echo "1. 导入Excel数据: npm run import:data"
    echo "2. 构建专业组关系: npm run build:groups"
    echo "3. 启动服务: npm run dev"
else
    echo "❌ 数据库初始化失败，请检查错误信息"
    exit 1
fi
