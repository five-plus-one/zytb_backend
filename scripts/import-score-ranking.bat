@echo off
chcp 65001 > nul
REM 一分一段表导入脚本 (Windows)
REM 使用方法: scripts\import-score-ranking.bat <文件路径>

echo ==================================
echo 一分一段表导入工具
echo ==================================
echo.

set BASE_URL=http://localhost:11452

REM 检查是否提供了文件路径
if "%~1"=="" (
    echo ❌ 错误: 请提供 Excel 文件路径
    echo.
    echo 使用方法:
    echo   scripts\import-score-ranking.bat E:\path\to\file.xlsx
    echo.
    echo 或者拖拽文件到本脚本上
    echo.
    pause
    exit /b 1
)

set FILE_PATH=%~1

REM 检查文件是否存在
if not exist "%FILE_PATH%" (
    echo ❌ 错误: 找不到文件 %FILE_PATH%
    pause
    exit /b 1
)

echo ✅ 找到文件: %FILE_PATH%
echo.

REM 询问是否覆盖已有数据
set /p CLEAR_DATA="是否清空已有数据后导入? (y/N): "
echo.

if /i "%CLEAR_DATA%"=="y" (
    echo 📤 正在导入（覆盖模式）...
    curl.exe -X POST "%BASE_URL%/score-ranking/import" ^
      -F "file=@%FILE_PATH%" ^
      -F "clearExisting=true"
) else (
    echo 📤 正在导入（追加模式）...
    curl.exe -X POST "%BASE_URL%/score-ranking/import" ^
      -F "file=@%FILE_PATH%"
)

echo.
echo.
echo ==================================
echo ✅ 导入完成！
echo ==================================
echo.

REM 询问是否验证数据
set /p VERIFY="是否查询导入结果? (y/N): "
if /i "%VERIFY%"=="y" (
    echo.
    echo 📋 查询可用年份...
    curl.exe "%BASE_URL%/score-ranking/options/years"
    echo.
    echo.
    echo 🗺️ 查询可用省份...
    curl.exe "%BASE_URL%/score-ranking/options/provinces"
    echo.
)

echo.
pause
