#!/bin/bash

# 一分一段表导入功能测试脚本
# 使用方法: bash scripts/test-score-ranking-import.sh

echo "=================================="
echo "一分一段表导入功能测试"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"
TEMPLATE_PATH="docs/templates/score-ranking-sample.xlsx"

# 检查模板文件是否存在
if [ ! -f "$TEMPLATE_PATH" ]; then
    echo "❌ 错误: 找不到测试文件 $TEMPLATE_PATH"
    echo "请先运行: node scripts/generate-score-ranking-template.js"
    exit 1
fi

echo "✅ 找到测试文件: $TEMPLATE_PATH"
echo ""

# 测试 1: 导入数据
echo "📤 测试 1: 导入示例数据..."
echo "----------------------------------------"
response=$(curl -s -X POST "$BASE_URL/score-ranking/import" \
  -F "file=@$TEMPLATE_PATH")

echo "$response" | jq '.'
echo ""

# 检查导入是否成功
success=$(echo "$response" | jq -r '.data.success')
if [ "$success" = "true" ]; then
    echo "✅ 导入成功"
    insertedRows=$(echo "$response" | jq -r '.data.insertedRows')
    echo "   导入记录数: $insertedRows"
else
    echo "❌ 导入失败"
    exit 1
fi
echo ""

# 等待一秒
sleep 1

# 测试 2: 查询列表
echo "📋 测试 2: 查询一分一段列表..."
echo "----------------------------------------"
curl -s "$BASE_URL/score-ranking/list?year=2024&province=河南&subjectType=物理类&pageNum=1&pageSize=5" | jq '.'
echo ""

# 测试 3: 根据分数查询位次
echo "🎯 测试 3: 根据分数查询位次 (700分)..."
echo "----------------------------------------"
curl -s "$BASE_URL/score-ranking/rank-by-score?year=2024&province=河南&subjectType=物理类&score=700" | jq '.'
echo ""

# 测试 4: 根据位次查询分数
echo "🎯 测试 4: 根据位次查询分数 (位次100)..."
echo "----------------------------------------"
curl -s "$BASE_URL/score-ranking/score-by-rank?year=2024&province=河南&subjectType=物理类&rank=100" | jq '.'
echo ""

# 测试 5: 获取分数段统计
echo "📊 测试 5: 获取分数段统计..."
echo "----------------------------------------"
curl -s "$BASE_URL/score-ranking/distribution?year=2024&province=河南&subjectType=物理类" | jq '.'
echo ""

# 测试 6: 批量查询
echo "📦 测试 6: 批量查询多个分数的位次..."
echo "----------------------------------------"
curl -s -X POST "$BASE_URL/score-ranking/batch-rank-by-scores" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "province": "河南",
    "subjectType": "物理类",
    "scores": [700, 690, 680, 670, 660]
  }' | jq '.'
echo ""

# 测试 7: 获取可用年份
echo "📅 测试 7: 获取可用年份..."
echo "----------------------------------------"
curl -s "$BASE_URL/score-ranking/options/years" | jq '.'
echo ""

# 测试 8: 获取可用省份
echo "🗺️  测试 8: 获取可用省份..."
echo "----------------------------------------"
curl -s "$BASE_URL/score-ranking/options/provinces" | jq '.'
echo ""

# 测试 9: 清空数据（可选，默认注释）
read -p "是否要清空测试数据? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  测试 9: 清空测试数据..."
    echo "----------------------------------------"
    curl -s -X POST "$BASE_URL/score-ranking/clear" \
      -H "Content-Type: application/json" \
      -d '{"year": 2024, "province": "河南", "subjectType": "物理类"}' | jq '.'
    echo ""
    echo "✅ 测试数据已清空"
else
    echo "⏭️  跳过清空测试数据"
fi

echo ""
echo "=================================="
echo "✅ 所有测试完成！"
echo "=================================="
