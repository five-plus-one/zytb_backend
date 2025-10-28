import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';
import { College } from './College';
import { Major } from './Major';

@Entity('volunteers')
export class Volunteer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'college_id' })
  collegeId!: string;

  @ManyToOne(() => College)
  @JoinColumn({ name: 'college_id' })
  college!: College;

  @Column({ type: 'uuid', name: 'major_id' })
  majorId!: string;

  @ManyToOne(() => Major)
  @JoinColumn({ name: 'major_id' })
  major!: Major;

  @Column({ type: 'int' })
  priority!: number;

  @Column({ type: 'boolean', default: true, name: 'is_obey_adjustment' })
  isObeyAdjustment!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'admit_probability' })
  admitProbability?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  @Index()
  status!: string;

  @Column({ type: 'datetime', nullable: true, name: 'submitted_at' })
  submittedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
