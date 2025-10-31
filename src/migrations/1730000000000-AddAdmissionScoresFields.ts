import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * TypeORM 迁移：为 admission_scores 表添加新字段
 *
 * 运行方式：
 * npm run typeorm migration:run
 */
export class AddAdmissionScoresFields1730000000000 implements MigrationInterface {
  name = 'AddAdmissionScoresFields1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== 第一步：添加新字段 =====

    // 平均分
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'avg_score',
        type: 'int',
        isNullable: true,
      })
    );

    // 最高分
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'max_score',
        type: 'int',
        isNullable: true,
      })
    );

    // 最高位次
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'max_rank',
        type: 'int',
        isNullable: true,
      })
    );

    // 招生计划数
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'plan_count',
        type: 'int',
        isNullable: true,
      })
    );

    // 分数波动性（标准差）
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'score_volatility',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true,
      })
    );

    // 专业热度指数
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'popularity_index',
        type: 'int',
        isNullable: true,
      })
    );

    // 院校代码
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'college_code',
        type: 'varchar',
        length: '20',
        isNullable: true,
      })
    );

    // 专业组代码
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'group_code',
        type: 'varchar',
        length: '50',
        isNullable: true,
      })
    );

    // 专业组名称
    await queryRunner.addColumn(
      'admission_scores',
      new TableColumn({
        name: 'group_name',
        type: 'varchar',
        length: '100',
        isNullable: true,
      })
    );

    // ===== 第二步：添加索引 =====

    // 专业组查询索引（核心查询）
    await queryRunner.createIndex(
      'admission_scores',
      new TableIndex({
        name: 'IDX_ADMISSION_SCORES_GROUP_QUERY',
        columnNames: ['college_code', 'group_code', 'source_province', 'subject_type', 'year'],
      })
    );

    // 院校代码索引
    await queryRunner.createIndex(
      'admission_scores',
      new TableIndex({
        name: 'IDX_ADMISSION_SCORES_COLLEGE_CODE',
        columnNames: ['college_code'],
      })
    );

    // 专业组代码索引
    await queryRunner.createIndex(
      'admission_scores',
      new TableIndex({
        name: 'IDX_ADMISSION_SCORES_GROUP_CODE',
        columnNames: ['group_code'],
      })
    );

    // 分数范围查询索引
    await queryRunner.createIndex(
      'admission_scores',
      new TableIndex({
        name: 'IDX_ADMISSION_SCORES_SCORE_RANGE',
        columnNames: ['year', 'source_province', 'subject_type', 'min_score'],
      })
    );

    console.log('✅ admission_scores 表新字段和索引添加成功');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ===== 回滚：删除索引 =====
    await queryRunner.dropIndex('admission_scores', 'IDX_ADMISSION_SCORES_GROUP_QUERY');
    await queryRunner.dropIndex('admission_scores', 'IDX_ADMISSION_SCORES_COLLEGE_CODE');
    await queryRunner.dropIndex('admission_scores', 'IDX_ADMISSION_SCORES_GROUP_CODE');
    await queryRunner.dropIndex('admission_scores', 'IDX_ADMISSION_SCORES_SCORE_RANGE');

    // ===== 回滚：删除字段 =====
    await queryRunner.dropColumn('admission_scores', 'group_name');
    await queryRunner.dropColumn('admission_scores', 'group_code');
    await queryRunner.dropColumn('admission_scores', 'college_code');
    await queryRunner.dropColumn('admission_scores', 'popularity_index');
    await queryRunner.dropColumn('admission_scores', 'score_volatility');
    await queryRunner.dropColumn('admission_scores', 'plan_count');
    await queryRunner.dropColumn('admission_scores', 'max_rank');
    await queryRunner.dropColumn('admission_scores', 'max_score');
    await queryRunner.dropColumn('admission_scores', 'avg_score');

    console.log('✅ admission_scores 表迁移已回滚');
  }
}
