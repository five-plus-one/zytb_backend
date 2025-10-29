@echo off
chcp 65001 > nul
REM 一分一段表 Excel 快速导入脚本
REM 使用方法: scripts\quick-import.bat <Excel文件路径> [--clear]

echo =============================================
echo      一分一段表 Excel 导入工具
echo =============================================
echo.

REM 检查是否提供了文件路径
if "%~1"=="" (
    echo ❌ 错误: 请提供 Excel 文件路径
    echo.
    echo 使用方法:
    echo   scripts\quick-import.bat E:\path\to\file.xlsx
    echo   scripts\quick-import.bat E:\path\to\file.xlsx --clear
    echo.
    echo 或者直接拖拽文件到本脚本上
    echo.
    pause
    exit /b 1
)

set FILE_PATH=%~1
set CLEAR_FLAG=%~2

REM 检查文件是否存在
if not exist "%FILE_PATH%" (
    echo ❌ 错误: 找不到文件 %FILE_PATH%
    pause
    exit /b 1
)

echo 文件路径: %FILE_PATH%
echo.

REM 运行导入脚本（不需要编译）
if "%CLEAR_FLAG%"=="--clear" (
    echo 📤 开始导入（覆盖模式）...
    node scripts\import-excel-direct.js "%FILE_PATH%" --clear
) else (
    echo 📤 开始导入（追加模式）...
    node scripts\import-excel-direct.js "%FILE_PATH%"
)

echo.
pause
