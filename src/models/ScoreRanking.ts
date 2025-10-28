import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('score_rankings')
@Index(['year', 'province', 'subjectType', 'score'])
export class ScoreRanking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // 年份
  @Column({ type: 'int' })
  @Index()
  year!: number;

  // 省份
  @Column({ length: 50 })
  @Index()
  province!: string;

  // 科类（物理类/历史类）
  @Column({ length: 50, name: 'subject_type' })
  @Index()
  subjectType!: string;

  // 分数
  @Column({ type: 'int' })
  @Index()
  score!: number;

  // 该分数的人数
  @Column({ type: 'int', name: 'count' })
  count!: number;

  // 累计人数（该分数及以上的总人数）
  @Column({ type: 'int', name: 'cumulative_count' })
  cumulativeCount!: number;

  // 位次（排名）
  @Column({ type: 'int', nullable: true })
  rank?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
