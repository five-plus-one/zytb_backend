@echo off
REM =============================================
REM 志愿填报系统 - Docker MySQL 初始化脚本 (Windows)
REM =============================================

echo 开始初始化MySQL数据库...

REM 数据库连接配置
set DB_HOST=localhost
set DB_PORT=3307
set DB_USER=root
set DB_PASSWORD=123456
set DB_NAME=volunteer_system

REM 检查MySQL是否运行
echo 检查MySQL连接...
docker exec mysql-volunteer mysql -h127.0.0.1 -P3306 -u%DB_USER% -p%DB_PASSWORD% -e "SELECT 1" >nul 2>&1

if errorlevel 1 (
    echo 错误: 无法连接到MySQL。请确保Docker容器正在运行。
    echo.
    echo 提示: 使用以下命令启动MySQL容器:
    echo   docker run -d --name mysql-volunteer -p 3307:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql:8.0
    echo.
    pause
    exit /b 1
)

echo MySQL连接成功！

REM 执行初始化SQL脚本
echo 执行数据库初始化脚本...
docker exec -i mysql-volunteer mysql -h127.0.0.1 -P3306 -u%DB_USER% -p%DB_PASSWORD% < scripts\init_database.sql

if errorlevel 0 (
    echo.
    echo ✅ 数据库初始化成功！
    echo.
    echo 接下来的步骤:
    echo 1. 导入Excel数据: npm run import:data
    echo 2. 构建专业组关系: npm run build:groups
    echo 3. 启动服务: npm run dev
    echo.
) else (
    echo ❌ 数据库初始化失败，请检查错误信息
    pause
    exit /b 1
)

pause
