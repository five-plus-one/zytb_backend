/**
 * AI Tools - 工具索引和初始化
 */

import { ToolRegistry } from './base';

// 导入所有工具
import { EquivalentScoreTool } from './equivalentScore.tool';
import { MajorFilterTool, GetMajorDirectionsTool } from './majorFilter.tool';
import {
  EnrollmentPlanDetailTool,
  EnrollmentPlanByCollegeTool,
  CollegeHistoricalStatsTool
} from './enrollmentPlan.tool';
import {
  ScoreToRankTool,
  RankToScoreTool,
  ScoreDistributionTool
} from './scoreRanking.tool';
import {
  QueryUserVolunteersTo,
  AddVolunteerGroupTool,
  AddVolunteerMajorTool,
  DeleteVolunteerGroupTool,
  ReorderVolunteerGroupTool,
  ClearVolunteerBatchTool
} from './volunteerManagement.tool';
import {
  QueryGroupInfoTool,
  QueryMajorInCollegesTool,
  CompareGroupsTool
} from './majorInfo.tool';

/**
 * 初始化所有工具
 */
export function initializeTools(): void {
  const registry = ToolRegistry.getInstance();

  // 注册等位分工具
  registry.register(new EquivalentScoreTool());

  // 注册专业筛选工具
  registry.register(new MajorFilterTool());
  registry.register(new GetMajorDirectionsTool());

  // 注册招生计划工具
  registry.register(new EnrollmentPlanDetailTool());
  registry.register(new EnrollmentPlanByCollegeTool());
  registry.register(new CollegeHistoricalStatsTool());

  // 注册分数排名工具
  registry.register(new ScoreToRankTool());
  registry.register(new RankToScoreTool());
  registry.register(new ScoreDistributionTool());

  // 注册志愿表管理工具
  registry.register(new QueryUserVolunteersTo());
  registry.register(new AddVolunteerGroupTool());
  registry.register(new AddVolunteerMajorTool());
  registry.register(new DeleteVolunteerGroupTool());
  registry.register(new ReorderVolunteerGroupTool());
  registry.register(new ClearVolunteerBatchTool());

  // 注册专业信息查询工具
  registry.register(new QueryGroupInfoTool());
  registry.register(new QueryMajorInCollegesTool());
  registry.register(new CompareGroupsTool());

  console.log(`\n🔧 AI工具系统初始化完成`);
  console.log(`📊 已注册 ${registry.getAllNames().length} 个工具:`);
  registry.getAllNames().forEach(name => {
    console.log(`   - ${name}`);
  });
  console.log('');
}

// 导出工具注册表
export { ToolRegistry } from './base';
export * from './base';
