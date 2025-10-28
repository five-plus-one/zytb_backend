# Excel 数据导入完成总结

## 已完成的工作

### 1. 安装依赖
- ✅ 安装了 `xlsx` 和 `@types/xlsx` 库用于 Excel 文件解析

### 2. 更新数据库模型
- ✅ 更新了 [College.ts](src/models/College.ts) 模型,添加了以下新字段:

#### 新增字段列表:
- `newName` - 新院校名称
- `affiliation` - 隶属单位
- `is985` - 是否985院校
- `is211` - 是否211院校
- `isWorldClass` - 是否一流大学
- `isArt` - 是否艺术类院校
- `keyLevel` - 国重/省重
- `educationLevel` - 本科/专科
- `isDoubleFirstClass` - 是否双一流
- `postgraduateRate` - 保研率
- `nationalSpecialMajorCount` - 国家特色专业数量
- `provinceSpecialMajorCount` - 省特色专业数量
- `isNationalKey` - 是否国重点
- `worldClassDisciplines` - 世界一流学科
- `femaleRatio` - 女生比例
- `maleRatio` - 男生比例
- `admissionPhone` - 招办电话
- `evaluationResult` - 评估结果

### 3. 创建导入脚本
- ✅ [importColleges.ts](scripts/importColleges.ts) - Excel 数据导入脚本
- ✅ [syncDatabase.ts](scripts/syncDatabase.ts) - 数据库表结构同步脚本
- ✅ [createSampleExcel.ts](scripts/createSampleExcel.ts) - 创建示例 Excel 文件
- ✅ [verifyData.ts](scripts/verifyData.ts) - 验证导入数据

### 4. 创建文档
- ✅ [IMPORT_GUIDE.md](scripts/IMPORT_GUIDE.md) - 详细的导入操作指南

### 5. 更新 package.json
添加了以下 npm 脚本命令:
- `npm run sync-db` - 同步数据库表结构
- `npm run import-colleges <excel文件路径>` - 导入院校数据
- `npm run create-sample` - 创建示例 Excel 文件
- `npm run verify-data` - 验证导入的数据

## 使用方法

### 第一次使用

1. **同步数据库表结构**
```bash
npm run sync-db
```

2. **准备 Excel 文件**
   - 确保 Excel 文件包含必填字段:学校名称、所在省、城市
   - 参考 [IMPORT_GUIDE.md](scripts/IMPORT_GUIDE.md) 中的字段格式说明

3. **执行导入**
```bash
npm run import-colleges <excel文件路径>
```

示例:
```bash
npm run import-colleges ./data/colleges.xlsx
npm run import-colleges E:/data/院校数据.xlsx
```

4. **验证数据**
```bash
npm run verify-data
```

### 创建测试数据

```bash
# 创建示例 Excel 文件
npm run create-sample

# 导入示例数据进行测试
npm run import-colleges data/sample_colleges.xlsx
```

## 导入特性

### ✅ 智能数据处理
- 自动识别布尔值("是"/"否", "true"/"false", "1"/"0")
- 自动解析百分比数据("50%" 或 "50")
- 智能转换数字类型

### ✅ 数据更新策略
- 如果院校名称已存在 → **更新**现有记录
- 如果院校名称不存在 → **创建**新记录

### ✅ 错误处理
- 跳过缺少必填字段的记录
- 详细的错误日志显示
- 不会因单条记录失败而中断整个导入过程

### ✅ 数据验证
- 必填字段验证(学校名称、所在省、城市)
- 数据类型自动转换
- 导入完成后显示统计信息

## Excel 字段映射

| Excel 列名 | 数据库字段 | 类型 | 必填 |
|-----------|----------|------|-----|
| 学校名称 | name | 文本 | ✅ |
| 新院校名称 | newName | 文本 | ❌ |
| 排名 | rank | 数字 | ❌ |
| 所在省 | province | 文本 | ✅ |
| 城市 | city | 文本 | ✅ |
| 类型 | type | 文本 | ❌ |
| 隶属单位 | affiliation | 文本 | ❌ |
| 是否985 | is985 | 布尔 | ❌ |
| 是否211 | is211 | 布尔 | ❌ |
| 一流大学 | isWorldClass | 布尔 | ❌ |
| 是否艺术 | isArt | 布尔 | ❌ |
| 国重/省重 | keyLevel | 文本 | ❌ |
| 本科/专科 | educationLevel | 文本 | ❌ |
| 保研率 | postgraduateRate | 数字 | ❌ |
| 国家特色专业 | nationalSpecialMajorCount | 数字 | ❌ |
| 省特色专业 | provinceSpecialMajorCount | 数字 | ❌ |
| 是否国重点 | isNationalKey | 布尔 | ❌ |
| 世界一流 | worldClassDisciplines | 文本 | ❌ |
| 是否双一流 | isDoubleFirstClass | 布尔 | ❌ |
| 成立时间 | foundedYear | 数字 | ❌ |
| 女生比例 | femaleRatio | 数字 | ❌ |
| 男生比例 | maleRatio | 数字 | ❌ |
| 招办电话 | admissionPhone | 文本 | ❌ |
| 电子邮箱 | email | 文本 | ❌ |
| 通讯地址 | address | 文本 | ❌ |
| 官网 | website | 文本 | ❌ |
| 评估结果 | evaluationResult | 文本 | ❌ |
| 大学简介 | description | 文本 | ❌ |

## 测试结果

✅ 已成功测试导入 5 条示例数据:
- 北京大学 (更新)
- 清华大学 (更新)
- 复旦大学 (新增)
- 中央美术学院 (新增)
- 某某职业技术学院 (新增)

数据库中共有 520 条院校记录,其中:
- 985院校: 57所
- 211院校: 148所
- 艺术类院校: 301所

## 注意事项

1. **Excel 表头必须完全匹配**
   - 确保列名与上述映射表完全一致
   - 包括空格和标点符号

2. **数据格式要求**
   - 布尔值: "是"/"否" 或 "true"/"false" 或 "1"/"0"
   - 百分比: "50%" 或 "50" 都可以
   - 数字: 纯数字格式

3. **必填字段**
   - 学校名称、所在省、城市 这三个字段必须填写
   - 缺少任一字段的记录会被跳过

4. **字符编码**
   - 建议使用 UTF-8 编码保存 Excel 文件
   - 避免出现乱码问题

## 故障排查

如遇问题,请参考 [IMPORT_GUIDE.md](scripts/IMPORT_GUIDE.md) 中的故障排查部分。

## 相关文件

- 数据模型: [src/models/College.ts](src/models/College.ts)
- 导入脚本: [scripts/importColleges.ts](scripts/importColleges.ts)
- 导入指南: [scripts/IMPORT_GUIDE.md](scripts/IMPORT_GUIDE.md)
- 示例数据: [data/sample_colleges.xlsx](data/sample_colleges.xlsx)
