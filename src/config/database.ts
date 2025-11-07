import { DataSource } from 'typeorm';
import config from './index';
import { User } from '../models/User';
import { College } from '../models/College';
import { Major } from '../models/Major';
import { EnrollmentPlan } from '../models/EnrollmentPlan';
import { EnrollmentPlanGroup } from '../models/EnrollmentPlanGroup';
import { AdmissionScore } from '../models/AdmissionScore';
import { ScoreRanking } from '../models/ScoreRanking';
import { Volunteer } from '../models/Volunteer';
import { VolunteerBatch, VolunteerGroup, VolunteerMajor } from '../models/VolunteerNew';
import { VolunteerTable } from '../models/VolunteerTable';
import { AgentSession } from '../models/AgentSession';
import { AgentMessage } from '../models/AgentMessage';
import { AgentPreference } from '../models/AgentPreference';
import { AgentRecommendation } from '../models/AgentRecommendation';
import { SystemConfig } from '../models/SystemConfig';

// 核心运算层实体
import { CoreCollege } from '../models/core/CoreCollege';
import { CoreAdmissionScore } from '../models/core/CoreAdmissionScore';
import { CoreMajor } from '../models/core/CoreMajor';
import { CoreCampusLife } from '../models/core/CoreCampusLife';

export const AppDataSource = new DataSource({
  ...config.database,
  entities: [
    User,
    College,
    Major,
    EnrollmentPlan,
    EnrollmentPlanGroup,
    AdmissionScore,
    ScoreRanking,
    Volunteer,
    VolunteerTable,
    VolunteerBatch,
    VolunteerGroup,
    VolunteerMajor,
    AgentSession,
    AgentMessage,
    AgentPreference,
    AgentRecommendation,
    SystemConfig,
    // 核心运算层实体
    CoreCollege,
    CoreAdmissionScore,
    CoreMajor,
    CoreCampusLife
  ],
  migrations: [__dirname + '/../migrations/**/*.js']
});

// 初始化数据库连接
export const initDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};
