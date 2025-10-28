import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50, unique: true })
  @Index()
  username!: string;

  @Column({ length: 255 })
  password!: string;

  @Column({ length: 50 })
  nickname!: string;

  @Column({ length: 11, unique: true })
  @Index()
  phone!: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ length: 255, nullable: true })
  avatar?: string;

  @Column({ length: 50, nullable: true, name: 'real_name' })
  realName?: string;

  @Column({ length: 18, nullable: true, name: 'id_card' })
  idCard?: string;

  @Column({ length: 50, nullable: true })
  province?: string;

  @Column({ length: 50, nullable: true })
  city?: string;

  @Column({ length: 100, nullable: true })
  school?: string;

  @Column({ type: 'int', nullable: true, name: 'exam_year' })
  examYear?: number;

  @Column({ type: 'int', nullable: true, name: 'exam_score' })
  examScore?: number;

  @Column({ length: 20, nullable: true, name: 'subject_type' })
  subjectType?: string;

  @Column({ type: 'tinyint', default: 1 })
  status!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
