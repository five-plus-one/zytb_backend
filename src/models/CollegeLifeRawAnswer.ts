import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index
} from 'typeorm';
import { College } from './College';

/**
 * 校园生活问卷原始答案表
 * 存储每份问卷的原始文本答案
 */
@Entity('college_life_raw_answers')
@Index(['collegeId'])
@Index(['collegeName'])
@Index(['answerId'])
export class CollegeLifeRawAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true, name: 'college_id' })
  collegeId?: string;

  @ManyToOne(() => College, { nullable: true })
  @JoinColumn({ name: 'college_id' })
  college?: College;

  @Column({ length: 100, name: 'college_name' })
  collegeName!: string;

  @Column({ type: 'int', nullable: true, name: 'answer_id' })
  answerId?: number;

  // ========== Q1-Q25 原始答案 ==========
  @Column({ type: 'text', nullable: true, name: 'q1_dorm_style' })
  q1DormStyle?: string;

  @Column({ type: 'text', nullable: true, name: 'q2_air_conditioner' })
  q2AirConditioner?: string;

  @Column({ type: 'text', nullable: true, name: 'q3_bathroom' })
  q3Bathroom?: string;

  @Column({ type: 'text', nullable: true, name: 'q4_self_study' })
  q4SelfStudy?: string;

  @Column({ type: 'text', nullable: true, name: 'q5_morning_run' })
  q5MorningRun?: string;

  @Column({ type: 'text', nullable: true, name: 'q6_running_requirement' })
  q6RunningRequirement?: string;

  @Column({ type: 'text', nullable: true, name: 'q7_holiday_duration' })
  q7HolidayDuration?: string;

  @Column({ type: 'text', nullable: true, name: 'q8_takeout' })
  q8Takeout?: string;

  @Column({ type: 'text', nullable: true, name: 'q9_transport' })
  q9Transport?: string;

  @Column({ type: 'text', nullable: true, name: 'q10_washing_machine' })
  q10WashingMachine?: string;

  @Column({ type: 'text', nullable: true, name: 'q11_campus_wifi' })
  q11CampusWifi?: string;

  @Column({ type: 'text', nullable: true, name: 'q12_power_cutoff' })
  q12PowerCutoff?: string;

  @Column({ type: 'text', nullable: true, name: 'q13_canteen_price' })
  q13CanteenPrice?: string;

  @Column({ type: 'text', nullable: true, name: 'q14_hot_water' })
  q14HotWater?: string;

  @Column({ type: 'text', nullable: true, name: 'q15_ebike' })
  q15Ebike?: string;

  @Column({ type: 'text', nullable: true, name: 'q16_power_limit' })
  q16PowerLimit?: string;

  @Column({ type: 'text', nullable: true, name: 'q17_overnight_study' })
  q17OvernightStudy?: string;

  @Column({ type: 'text', nullable: true, name: 'q18_bring_computer' })
  q18BringComputer?: string;

  @Column({ type: 'text', nullable: true, name: 'q19_campus_card' })
  q19CampusCard?: string;

  @Column({ type: 'text', nullable: true, name: 'q20_bank_card' })
  q20BankCard?: string;

  @Column({ type: 'text', nullable: true, name: 'q21_supermarket' })
  q21Supermarket?: string;

  @Column({ type: 'text', nullable: true, name: 'q22_express_delivery' })
  q22ExpressDelivery?: string;

  @Column({ type: 'text', nullable: true, name: 'q23_shared_bike' })
  q23SharedBike?: string;

  @Column({ type: 'text', nullable: true, name: 'q24_gate_policy' })
  q24GatePolicy?: string;

  @Column({ type: 'text', nullable: true, name: 'q25_late_return' })
  q25LateReturn?: string;

  // ========== 元数据 ==========
  @Column({ length: 50, nullable: true })
  source?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'submitted_at' })
  submittedAt?: Date;

  @Column({ length: 50, nullable: true, name: 'ip_province' })
  ipProvince?: string;

  @Column({ length: 50, nullable: true, name: 'ip_city' })
  ipCity?: string;

  @Column({ length: 100, nullable: true })
  browser?: string;

  @Column({ length: 100, nullable: true, name: 'operating_system' })
  operatingSystem?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
