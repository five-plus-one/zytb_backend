@echo off
REM 一分一段表导入功能测试脚本 (Windows)
REM 使用方法: scripts\test-score-ranking-import.bat

echo ==================================
echo 一分一段表导入功能测试
echo ==================================
echo.

set BASE_URL=http://localhost:3000
set TEMPLATE_PATH=docs\templates\score-ranking-sample.xlsx

REM 检查模板文件是否存在
if not exist "%TEMPLATE_PATH%" (
    echo ❌ 错误: 找不到测试文件 %TEMPLATE_PATH%
    echo 请先运行: node scripts\generate-score-ranking-template.js
    exit /b 1
)

echo ✅ 找到测试文件: %TEMPLATE_PATH%
echo.

REM 测试 1: 导入数据
echo 📤 测试 1: 导入示例数据...
echo ----------------------------------------
curl -X POST "%BASE_URL%/score-ranking/import" -F "file=@%TEMPLATE_PATH%"
echo.
echo.

REM 等待一秒
timeout /t 1 /nobreak > nul

REM 测试 2: 查询列表
echo 📋 测试 2: 查询一分一段列表...
echo ----------------------------------------
curl "%BASE_URL%/score-ranking/list?year=2024&province=河南&subjectType=物理类&pageNum=1&pageSize=5"
echo.
echo.

REM 测试 3: 根据分数查询位次
echo 🎯 测试 3: 根据分数查询位次 (700分)...
echo ----------------------------------------
curl "%BASE_URL%/score-ranking/rank-by-score?year=2024&province=河南&subjectType=物理类&score=700"
echo.
echo.

REM 测试 4: 根据位次查询分数
echo 🎯 测试 4: 根据位次查询分数 (位次100)...
echo ----------------------------------------
curl "%BASE_URL%/score-ranking/score-by-rank?year=2024&province=河南&subjectType=物理类&rank=100"
echo.
echo.

REM 测试 5: 获取分数段统计
echo 📊 测试 5: 获取分数段统计...
echo ----------------------------------------
curl "%BASE_URL%/score-ranking/distribution?year=2024&province=河南&subjectType=物理类"
echo.
echo.

REM 测试 6: 批量查询
echo 📦 测试 6: 批量查询多个分数的位次...
echo ----------------------------------------
curl -X POST "%BASE_URL%/score-ranking/batch-rank-by-scores" ^
  -H "Content-Type: application/json" ^
  -d "{\"year\": 2024, \"province\": \"河南\", \"subjectType\": \"物理类\", \"scores\": [700, 690, 680, 670, 660]}"
echo.
echo.

REM 测试 7: 获取可用年份
echo 📅 测试 7: 获取可用年份...
echo ----------------------------------------
curl "%BASE_URL%/score-ranking/options/years"
echo.
echo.

REM 测试 8: 获取可用省份
echo 🗺️  测试 8: 获取可用省份...
echo ----------------------------------------
curl "%BASE_URL%/score-ranking/options/provinces"
echo.
echo.

REM 测试 9: 清空数据（可选）
set /p CLEAR_DATA="是否要清空测试数据? (y/N): "
if /i "%CLEAR_DATA%"=="y" (
    echo 🗑️  测试 9: 清空测试数据...
    echo ----------------------------------------
    curl -X POST "%BASE_URL%/score-ranking/clear" ^
      -H "Content-Type: application/json" ^
      -d "{\"year\": 2024, \"province\": \"河南\", \"subjectType\": \"物理类\"}"
    echo.
    echo ✅ 测试数据已清空
) else (
    echo ⏭️  跳过清空测试数据
)

echo.
echo ==================================
echo ✅ 所有测试完成！
echo ==================================

pause
