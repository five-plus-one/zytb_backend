import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

/**
 * 创建专业组关联表
 *
 * 目的：建立招生计划与历史分数的稳定关联关系
 *
 * 方案：
 * 1. 创建 enrollment_plan_groups 表，存储专业组信息
 * 2. 在 admission_scores 表中添加 group_id 外键
 * 3. 预处理数据，建立关联关系
 */
export class CreateEnrollmentPlanGroups1706000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== 第一步：创建专业组表 =====
    await queryRunner.createTable(
      new Table({
        name: 'enrollment_plan_groups',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: '(UUID())'
          },
          {
            name: 'college_code',
            type: 'varchar',
            length: '20',
            isNullable: false,
            comment: '院校代码'
          },
          {
            name: 'college_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: '院校名称'
          },
          {
            name: 'group_code',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: '专业组代码（标准化后，无括号）'
          },
          {
            name: 'group_code_raw',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '专业组代码（原始格式，可能有括号）'
          },
          {
            name: 'group_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '专业组名称'
          },
          {
            name: 'source_province',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: '生源省份'
          },
          {
            name: 'subject_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: '科类（物理类/历史类）'
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // 创建唯一索引：同一省份、科类下，院校+专业组代码唯一
    await queryRunner.createIndex(
      'enrollment_plan_groups',
      new TableIndex({
        name: 'IDX_GROUP_UNIQUE',
        columnNames: ['college_code', 'group_code', 'source_province', 'subject_type'],
        isUnique: true
      })
    );

    // 创建普通索引：加速查询
    await queryRunner.createIndex(
      'enrollment_plan_groups',
      new TableIndex({
        name: 'IDX_GROUP_COLLEGE',
        columnNames: ['college_code']
      })
    );

    await queryRunner.createIndex(
      'enrollment_plan_groups',
      new TableIndex({
        name: 'IDX_GROUP_PROVINCE_TYPE',
        columnNames: ['source_province', 'subject_type']
      })
    );

    // ===== 第二步：在 enrollment_plans 表中添加 group_id 关联 =====
    await queryRunner.query(`
      ALTER TABLE enrollment_plans
      ADD COLUMN group_id VARCHAR(36) NULL COMMENT '专业组ID（关联到enrollment_plan_groups）'
      AFTER major_group_name
    `);

    // 创建索引
    await queryRunner.createIndex(
      'enrollment_plans',
      new TableIndex({
        name: 'IDX_ENROLLMENT_GROUP',
        columnNames: ['group_id']
      })
    );

    // ===== 第三步：在 admission_scores 表中添加 group_id 关联 =====
    await queryRunner.query(`
      ALTER TABLE admission_scores
      ADD COLUMN group_id VARCHAR(36) NULL COMMENT '专业组ID（关联到enrollment_plan_groups）'
      AFTER group_name
    `);

    // 创建索引
    await queryRunner.createIndex(
      'admission_scores',
      new TableIndex({
        name: 'IDX_ADMISSION_GROUP',
        columnNames: ['group_id']
      })
    );

    // 创建复合索引：加速按专业组查询历史数据
    await queryRunner.createIndex(
      'admission_scores',
      new TableIndex({
        name: 'IDX_ADMISSION_GROUP_YEAR',
        columnNames: ['group_id', 'year']
      })
    );

    console.log('✅ 创建专业组关联表和索引完成');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除索引
    await queryRunner.dropIndex('admission_scores', 'IDX_ADMISSION_GROUP_YEAR');
    await queryRunner.dropIndex('admission_scores', 'IDX_ADMISSION_GROUP');
    await queryRunner.dropIndex('enrollment_plans', 'IDX_ENROLLMENT_GROUP');
    await queryRunner.dropIndex('enrollment_plan_groups', 'IDX_GROUP_PROVINCE_TYPE');
    await queryRunner.dropIndex('enrollment_plan_groups', 'IDX_GROUP_COLLEGE');
    await queryRunner.dropIndex('enrollment_plan_groups', 'IDX_GROUP_UNIQUE');

    // 删除列
    await queryRunner.query('ALTER TABLE admission_scores DROP COLUMN group_id');
    await queryRunner.query('ALTER TABLE enrollment_plans DROP COLUMN group_id');

    // 删除表
    await queryRunner.dropTable('enrollment_plan_groups');
  }
}
