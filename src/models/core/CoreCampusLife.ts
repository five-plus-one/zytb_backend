import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { CoreCollege } from './CoreCollege';

/**
 * 核心运算层 - 校园生活表
 * 冗余院校信息避免JOIN查询
 */
@Entity('core_campus_life')
@Index(['collegeId'], { unique: true })
export class CoreCampusLife {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  // UUID外键
  @Column('varchar', { length: 36, name: 'college_id' })
  @Index()
  collegeId!: string;

  @ManyToOne(() => CoreCollege)
  @JoinColumn({ name: 'college_id' })
  college?: CoreCollege;

  // 冗余院校信息(避免JOIN)
  @Column({ length: 100, name: 'college_name' })
  collegeName!: string;

  @Column({ length: 20, nullable: true, name: 'college_code' })
  collegeCode?: string;

  @Column({ length: 50, nullable: true, name: 'college_province' })
  collegeProvince?: string;

  @Column({ length: 50, nullable: true, name: 'college_city' })
  collegeCity?: string;

  // 住宿条件
  @Column({ length: 20, nullable: true, name: 'dorm_style' })
  dormStyle?: string;

  @Column({ type: 'boolean', nullable: true, name: 'has_air_conditioner' })
  hasAirConditioner?: boolean;

  @Column({ type: 'boolean', nullable: true, name: 'has_independent_bathroom' })
  hasIndependentBathroom?: boolean;

  @Column({ type: 'text', nullable: true, name: 'bathroom_distance' })
  bathroomDistance?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'dorm_score' })
  @Index()
  dormScore?: number;

  // 学习环境
  @Column({ type: 'boolean', nullable: true, name: 'has_morning_self_study' })
  hasMorningSelfStudy?: boolean;

  @Column({ type: 'boolean', nullable: true, name: 'has_evening_self_study' })
  hasEveningSelfStudy?: boolean;

  @Column({ type: 'boolean', nullable: true, name: 'has_library' })
  hasLibrary?: boolean;

  @Column({ type: 'boolean', nullable: true, name: 'has_overnight_study_room' })
  hasOvernightStudyRoom?: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'study_environment_score' })
  studyEnvironmentScore?: number;

  // 食堂
  @Column({ length: 20, nullable: true, name: 'canteen_price_level' })
  canteenPriceLevel?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'canteen_quality_score' })
  @Index()
  canteenQualityScore?: number;

  @Column({ type: 'boolean', nullable: true, name: 'canteen_has_issues' })
  canteenHasIssues?: boolean;

  // 交通
  @Column({ type: 'boolean', nullable: true, name: 'has_subway' })
  hasSubway?: boolean;

  @Column({ type: 'boolean', nullable: true, name: 'in_urban_area' })
  inUrbanArea?: boolean;

  @Column({ type: 'text', nullable: true, name: 'to_city_time' })
  toCityTime?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'transport_score' })
  @Index()
  transportScore?: number;

  // 设施
  @Column({ type: 'boolean', nullable: true, name: 'has_washing_machine' })
  hasWashingMachine?: boolean;

  @Column({ length: 20, nullable: true, name: 'campus_wifi_quality' })
  campusWifiQuality?: string;

  @Column({ type: 'boolean', nullable: true, name: 'has_power_cutoff' })
  hasPowerCutoff?: boolean;

  @Column({ length: 20, nullable: true, name: 'power_cutoff_time' })
  powerCutoffTime?: string;

  @Column({ type: 'boolean', nullable: true, name: 'has_network_cutoff' })
  hasNetworkCutoff?: boolean;

  @Column({ type: 'text', nullable: true, name: 'hot_water_time' })
  hotWaterTime?: string;

  // 运动
  @Column({ type: 'boolean', nullable: true, name: 'has_morning_run' })
  hasMorningRun?: boolean;

  @Column({ type: 'text', nullable: true, name: 'running_requirement' })
  runningRequirement?: string;

  @Column({ type: 'boolean', nullable: true, name: 'can_ride_ebike' })
  canRideEbike?: boolean;

  @Column({ length: 20, nullable: true, name: 'shared_bike_availability' })
  sharedBikeAvailability?: string;

  // 商业配套
  @Column({ length: 20, nullable: true, name: 'supermarket_quality' })
  supermarketQuality?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'express_delivery_convenience' })
  expressDeliveryConvenience?: number;

  // 门禁
  @Column({ type: 'text', nullable: true, name: 'dorm_curfew_time' })
  dormCurfewTime?: string;

  @Column({ type: 'text', nullable: true, name: 'school_gate_policy' })
  schoolGatePolicy?: string;

  @Column({ type: 'boolean', nullable: true, name: 'check_dormitory' })
  checkDormitory?: boolean;

  // 其他
  @Column({ type: 'boolean', nullable: true, name: 'can_order_takeout' })
  canOrderTakeout?: boolean;

  @Column({ type: 'boolean', nullable: true, name: 'can_bring_computer' })
  canBringComputer?: boolean;

  // 综合评分
  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'overall_score', comment: '综合评分' })
  @Index()
  overallScore?: number;

  @Column({ type: 'int', nullable: true, comment: '可靠性(0-100)' })
  reliability?: number;

  @Column({ type: 'int', default: 1, name: 'answer_count', comment: '问卷数量' })
  answerCount!: number;

  // 元数据
  @Column({ type: 'int', default: 1, name: 'data_version' })
  dataVersion!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_synced_at' })
  lastSyncedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
