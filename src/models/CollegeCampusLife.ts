import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { College } from './College';

/**
 * 校园生活数据主表
 * 存储结构化、聚合后的校园生活信息
 * 用于支持indicators.ts中的校园生活类指标（SEC_21-SEC_30）
 */
@Entity('college_campus_life')
@Index(['collegeId'])
@Index(['collegeName'])
export class CollegeCampusLife {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'college_id' })
  collegeId!: string;

  @ManyToOne(() => College)
  @JoinColumn({ name: 'college_id' })
  college!: College;

  @Column({ length: 100, name: 'college_name' })
  collegeName!: string;

  // ========== 住宿条件 (SEC_21) ==========
  @Column({ length: 20, nullable: true, name: 'dorm_style' })
  dormStyle?: string; // '上床下桌', '上下铺', '混合'

  @Column({ type: 'boolean', nullable: true, name: 'has_air_conditioner' })
  hasAirConditioner?: boolean;

  @Column({ type: 'boolean', nullable: true, name: 'has_independent_bathroom' })
  hasIndependentBathroom?: boolean;

  @Column({ type: 'text', nullable: true, name: 'bathroom_distance' })
  bathroomDistance?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'dorm_score' })
  @Index()
  dormScore?: number;

  // ========== 学习环境 (SEC_25) ==========
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

  // ========== 食堂 (SEC_22) ==========
  @Column({ length: 20, nullable: true, name: 'canteen_price_level' })
  canteenPriceLevel?: string; // '便宜', '一般', '较贵', '很贵'

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'canteen_quality_score' })
  @Index()
  canteenQualityScore?: number;

  @Column({ type: 'boolean', nullable: true, name: 'canteen_has_issues' })
  canteenHasIssues?: boolean; // 是否有异物等问题

  // ========== 交通 (SEC_27) ==========
  @Column({ type: 'boolean', nullable: true, name: 'has_subway' })
  hasSubway?: boolean;

  @Column({ type: 'boolean', nullable: true, name: 'in_urban_area' })
  inUrbanArea?: boolean;

  @Column({ type: 'text', nullable: true, name: 'to_city_time' })
  toCityTime?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'transport_score' })
  @Index()
  transportScore?: number;

  // ========== 设施 ==========
  @Column({ type: 'boolean', nullable: true, name: 'has_washing_machine' })
  hasWashingMachine?: boolean;

  @Column({ length: 20, nullable: true, name: 'campus_wifi_quality' })
  campusWifiQuality?: string; // '很好', '一般', '较差'

  @Column({ length: 50, nullable: true, name: 'campus_wifi_speed' })
  campusWifiSpeed?: string;

  @Column({ type: 'boolean', nullable: true, name: 'has_power_cutoff' })
  hasPowerCutoff?: boolean;

  @Column({ length: 20, nullable: true, name: 'power_cutoff_time' })
  powerCutoffTime?: string;

  @Column({ type: 'boolean', nullable: true, name: 'has_network_cutoff' })
  hasNetworkCutoff?: boolean;

  @Column({ length: 20, nullable: true, name: 'network_cutoff_time' })
  networkCutoffTime?: string;

  @Column({ type: 'text', nullable: true, name: 'hot_water_time' })
  hotWaterTime?: string;

  // ========== 运动 (SEC_24) ==========
  @Column({ type: 'boolean', nullable: true, name: 'has_morning_run' })
  hasMorningRun?: boolean;

  @Column({ type: 'text', nullable: true, name: 'running_requirement' })
  runningRequirement?: string;

  @Column({ type: 'boolean', nullable: true, name: 'can_ride_ebike' })
  canRideEbike?: boolean;

  @Column({ type: 'text', nullable: true, name: 'ebike_charging_location' })
  ebikeChargingLocation?: string;

  @Column({ length: 20, nullable: true, name: 'shared_bike_availability' })
  sharedBikeAvailability?: string; // '丰富', '一般', '少'

  @Column({ type: 'text', nullable: true, name: 'shared_bike_types' })
  sharedBikeTypes?: string;

  // ========== 商业配套 (SEC_28) ==========
  @Column({ length: 20, nullable: true, name: 'supermarket_quality' })
  supermarketQuality?: string; // '好', '一般', '差'

  @Column({ type: 'text', nullable: true, name: 'supermarket_description' })
  supermarketDescription?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true, name: 'express_delivery_convenience' })
  expressDeliveryConvenience?: number;

  @Column({ type: 'text', nullable: true, name: 'express_delivery_policy' })
  expressDeliveryPolicy?: string;

  // ========== 门禁管理 ==========
  @Column({ type: 'text', nullable: true, name: 'dorm_curfew_time' })
  dormCurfewTime?: string;

  @Column({ type: 'text', nullable: true, name: 'school_gate_policy' })
  schoolGatePolicy?: string;

  @Column({ type: 'boolean', nullable: true, name: 'check_dormitory' })
  checkDormitory?: boolean;

  @Column({ type: 'text', nullable: true, name: 'late_return_policy' })
  lateReturnPolicy?: string;

  // ========== 其他政策 ==========
  @Column({ type: 'text', nullable: true, name: 'holiday_duration' })
  holidayDuration?: string;

  @Column({ type: 'boolean', nullable: true, name: 'has_mini_semester' })
  hasMiniSemester?: boolean;

  @Column({ type: 'text', nullable: true, name: 'mini_semester_duration' })
  miniSemesterDuration?: string;

  @Column({ type: 'boolean', nullable: true, name: 'can_order_takeout' })
  canOrderTakeout?: boolean;

  @Column({ type: 'text', nullable: true, name: 'takeout_pickup_distance' })
  takeoutPickupDistance?: string;

  @Column({ type: 'boolean', nullable: true, name: 'can_bring_computer' })
  canBringComputer?: boolean;

  @Column({ type: 'text', nullable: true, name: 'power_limit_description' })
  powerLimitDescription?: string;

  @Column({ type: 'text', nullable: true, name: 'campus_card_description' })
  campusCardDescription?: string;

  @Column({ type: 'boolean', nullable: true, name: 'bank_card_issued' })
  bankCardIssued?: boolean;

  // ========== 原始数据 ==========
  @Column({ type: 'json', nullable: true, name: 'raw_answers' })
  rawAnswers?: any;

  // ========== 数据质量 ==========
  @Column({ length: 50, nullable: true, default: 'campus_life_survey', name: 'data_source' })
  dataSource?: string;

  @Column({ type: 'int', nullable: true })
  @Index()
  reliability?: number;

  @Column({ type: 'int', default: 1, name: 'answer_count' })
  answerCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
