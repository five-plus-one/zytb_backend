import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from './User';

@Entity('favorites')
@Index(['userId', 'groupId'], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  @Index()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // groupId格式: collegeCode_groupCode_year_province
  @Column({ name: 'group_id', type: 'varchar', length: 100 })
  @Index()
  groupId!: string;

  @Column({ name: 'college_code', type: 'varchar', length: 20 })
  collegeCode!: string;

  @Column({ name: 'college_name', type: 'varchar', length: 100 })
  collegeName!: string;

  @Column({ name: 'group_code', type: 'varchar', length: 50 })
  groupCode!: string;

  @Column({ name: 'group_name', type: 'varchar', length: 100, nullable: true })
  groupName?: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'varchar', length: 50 })
  province!: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
