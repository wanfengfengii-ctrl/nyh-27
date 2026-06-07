import type {
  WorkOrder,
  WorkOrderFilter,
  WorkOrderType,
  RiskLevel,
  RiskComparison,
  MaintenanceStatistics,
  BellMaintenanceAssessment,
  Bell,
} from '../types/bell';
import { generateId, addDays } from '../utils/common';
import { getRiskLevel } from './riskAssessment';

export interface CreateWorkOrderParams {
  bellId: string;
  bellName: string;
  bellPosition: number;
  title: string;
  description: string;
  type: WorkOrderType;
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  assignee?: string;
  riskLevel?: RiskLevel;
  preMaintenanceRiskScore?: number;
  sourceType: WorkOrder['sourceType'];
  suggestionId?: string;
}

export function createWorkOrder(params: CreateWorkOrderParams): WorkOrder {
  const now = new Date();
  const hasAssignee = !!params.assignee;

  return {
    id: generateId('wo'),
    bellId: params.bellId,
    bellName: params.bellName,
    bellPosition: params.bellPosition,
    title: params.title,
    description: params.description,
    type: params.type,
    status: hasAssignee ? 'in_progress' : 'pending_assign',
    priority: params.priority,
    riskLevel: params.riskLevel || 'medium',
    assignee: params.assignee || '',
    assignor: '系统管理员',
    dueDate: params.dueDate,
    createdAt: now,
    updatedAt: now,
    assignedAt: hasAssignee ? now : undefined,
    startedAt: hasAssignee ? now : undefined,
    completedAt: undefined,
    reviewedAt: undefined,
    completedBy: undefined,
    reviewedBy: undefined,
    mediaIds: [],
    preMaintenanceRiskScore: params.preMaintenanceRiskScore,
    postMaintenanceRiskScore: undefined,
    effectEvaluation: undefined,
    reviewComment: undefined,
    sourceType: params.sourceType,
    suggestionId: params.suggestionId,
  };
}

export function assignWorkOrder(
  workOrder: WorkOrder,
  assignee: string,
  assignor: string = '系统管理员'
): WorkOrder {
  if (workOrder.status !== 'pending_assign') return workOrder;

  const now = new Date();
  return {
    ...workOrder,
    status: 'in_progress',
    assignee,
    assignor,
    assignedAt: now,
    startedAt: workOrder.startedAt || now,
    updatedAt: now,
  };
}

export function startWorkOrder(workOrder: WorkOrder): WorkOrder {
  if (workOrder.status !== 'pending_assign' && workOrder.status !== 'in_progress') {
    return workOrder;
  }

  const now = new Date();
  return {
    ...workOrder,
    status: 'in_progress',
    startedAt: workOrder.startedAt || now,
    updatedAt: now,
  };
}

export interface CompleteWorkOrderParams {
  completedBy: string;
  effectEvaluation?: string;
  postMaintenanceRiskScore?: number;
  mediaIds?: string[];
  maintenanceRecordId?: string;
}

export function completeWorkOrder(
  workOrder: WorkOrder,
  params: CompleteWorkOrderParams
): WorkOrder {
  if (workOrder.status !== 'in_progress') return workOrder;

  const now = new Date();
  return {
    ...workOrder,
    status: 'completed',
    completedAt: now,
    completedBy: params.completedBy,
    maintenanceRecordId: params.maintenanceRecordId,
    mediaIds: params.mediaIds || workOrder.mediaIds,
    postMaintenanceRiskScore: params.postMaintenanceRiskScore,
    effectEvaluation: params.effectEvaluation || workOrder.effectEvaluation,
    updatedAt: now,
  };
}

export interface ReviewWorkOrderParams {
  reviewedBy: string;
  reviewComment: string;
  passed: boolean;
}

export function reviewWorkOrder(
  workOrder: WorkOrder,
  params: ReviewWorkOrderParams
): WorkOrder {
  if (workOrder.status !== 'completed') return workOrder;

  const now = new Date();
  if (!params.passed) {
    return {
      ...workOrder,
      status: 'in_progress',
      reviewComment: params.reviewComment,
      reviewedBy: params.reviewedBy,
      updatedAt: now,
    };
  }

  return {
    ...workOrder,
    status: 'reviewed',
    reviewedAt: now,
    reviewedBy: params.reviewedBy,
    reviewComment: params.reviewComment,
    updatedAt: now,
  };
}

export function addMediaToWorkOrder(workOrder: WorkOrder, mediaId: string): WorkOrder {
  if (workOrder.mediaIds.includes(mediaId)) return workOrder;
  return {
    ...workOrder,
    mediaIds: [...workOrder.mediaIds, mediaId],
    updatedAt: new Date(),
  };
}

export function filterWorkOrders(
  workOrders: WorkOrder[],
  filter: WorkOrderFilter
): WorkOrder[] {
  return workOrders.filter((wo) => {
    if (filter.status && filter.status.length > 0 && !filter.status.includes(wo.status)) return false;
    if (filter.assignee && wo.assignee !== filter.assignee) return false;
    if (filter.riskLevel && filter.riskLevel.length > 0 && !filter.riskLevel.includes(wo.riskLevel)) return false;
    if (filter.priority && filter.priority.length > 0 && !filter.priority.includes(wo.priority)) return false;
    if (filter.type && filter.type.length > 0 && !filter.type.includes(wo.type)) return false;
    if (filter.dueDateFrom && new Date(wo.dueDate) < new Date(filter.dueDateFrom)) return false;
    if (filter.dueDateTo && new Date(wo.dueDate) > new Date(filter.dueDateTo)) return false;
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      if (
        !wo.title.toLowerCase().includes(keyword) &&
        !wo.bellName.toLowerCase().includes(keyword) &&
        !wo.description.toLowerCase().includes(keyword)
      ) return false;
    }
    return true;
  });
}

export function getWorkOrdersByBell(workOrders: WorkOrder[], bellId: string): WorkOrder[] {
  return workOrders.filter((w) => w.bellId === bellId);
}

export function getWorkOrderById(workOrders: WorkOrder[], workOrderId: string): WorkOrder | null {
  return workOrders.find((w) => w.id === workOrderId) || null;
}

export function hasActiveWorkOrder(workOrders: WorkOrder[], bellId: string): boolean {
  return workOrders.some(
    (w) => w.bellId === bellId && (w.status === 'pending_assign' || w.status === 'in_progress')
  );
}

export function createWorkOrderFromAssessment(
  bell: Bell,
  assessment: BellMaintenanceAssessment
): WorkOrder | null {
  const topSuggestion = assessment.suggestions[0];
  if (!topSuggestion) return null;

  const priority = assessment.riskLevel === 'critical' || assessment.riskLevel === 'high' ? 'high' : 'medium';
  const dueDays = assessment.riskLevel === 'critical' ? 1 : assessment.riskLevel === 'high' ? 3 : 7;
  const dueDate = addDays(new Date(), dueDays);

  return createWorkOrder({
    bellId: bell.id,
    bellName: bell.name,
    bellPosition: bell.position,
    title: topSuggestion.title,
    description: topSuggestion.description,
    type: topSuggestion.type === 'immediate' ? 'repair' : 'inspection',
    priority,
    dueDate,
    riskLevel: assessment.riskLevel,
    preMaintenanceRiskScore: assessment.riskScore,
    sourceType: 'risk_auto',
    suggestionId: topSuggestion.id,
  });
}

export function batchCreateWorkOrdersFromHighRisk(
  bells: Bell[],
  assessments: Record<string, BellMaintenanceAssessment>,
  existingWorkOrders: WorkOrder[]
): WorkOrder[] {
  const highRiskBells = Object.entries(assessments)
    .filter(([, assessment]) => assessment.riskLevel === 'high' || assessment.riskLevel === 'critical')
    .map(([bellId, assessment]) => ({ bellId, assessment }));

  const newWorkOrders: WorkOrder[] = [];

  for (const { bellId, assessment } of highRiskBells) {
    const bell = bells.find((b) => b.id === bellId);
    if (!bell) continue;
    if (hasActiveWorkOrder(existingWorkOrders, bellId)) continue;

    const workOrder = createWorkOrderFromAssessment(bell, assessment);
    if (workOrder) {
      newWorkOrders.push(workOrder);
    }
  }

  return newWorkOrders;
}

export function getRiskComparisons(workOrders: WorkOrder[]): RiskComparison[] {
  const completedOrders = workOrders.filter(
    (w) =>
      (w.status === 'completed' || w.status === 'reviewed') &&
      w.preMaintenanceRiskScore !== undefined &&
      w.postMaintenanceRiskScore !== undefined
  );

  return completedOrders
    .map((wo) => {
      const preLevel = getRiskLevel(wo.preMaintenanceRiskScore!);
      const postLevel = getRiskLevel(wo.postMaintenanceRiskScore!);
      const scoreChange = wo.postMaintenanceRiskScore! - wo.preMaintenanceRiskScore!;
      const levelOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
      const levelImproved = levelOrder.indexOf(postLevel) < levelOrder.indexOf(preLevel);

      return {
        bellId: wo.bellId,
        bellName: wo.bellName,
        preRiskScore: wo.preMaintenanceRiskScore!,
        preRiskLevel: preLevel,
        postRiskScore: wo.postMaintenanceRiskScore!,
        postRiskLevel: postLevel,
        scoreChange,
        levelImproved,
        workOrderId: wo.id,
        workOrderTitle: wo.title,
        completedDate: wo.completedAt || new Date(),
      };
    })
    .sort((a, b) => b.completedDate.getTime() - a.completedDate.getTime());
}

export function calculateStatistics(
  workOrders: WorkOrder[],
  assessments: Record<string, BellMaintenanceAssessment>,
  maintenanceRecordsCount: number
): MaintenanceStatistics {
  const now = Date.now();

  const overdueCount = workOrders.filter(
    (w) =>
      (w.status === 'pending_assign' || w.status === 'in_progress') &&
      new Date(w.dueDate).getTime() < now
  ).length;

  const completedOrders = workOrders.filter((w) => w.completedAt && w.startedAt);
  const avgCompletionDays =
    completedOrders.length > 0
      ? completedOrders.reduce((sum, w) => {
          const days =
            (new Date(w.completedAt!).getTime() - new Date(w.startedAt!).getTime()) /
            (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / completedOrders.length
      : 0;

  const workOrdersByType: Record<WorkOrderType, number> = {
    inspection: 0,
    cleaning: 0,
    repair: 0,
    lubrication: 0,
    tuning: 0,
    other: 0,
  };
  workOrders.forEach((w) => {
    workOrdersByType[w.type] = (workOrdersByType[w.type] || 0) + 1;
  });

  const workOrdersByAssignee: Record<string, number> = {};
  workOrders.forEach((w) => {
    if (w.assignee) {
      workOrdersByAssignee[w.assignee] = (workOrdersByAssignee[w.assignee] || 0) + 1;
    }
  });

  const workOrdersByRiskLevel: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  workOrders.forEach((w) => {
    workOrdersByRiskLevel[w.riskLevel] = (workOrdersByRiskLevel[w.riskLevel] || 0) + 1;
  });

  const monthlyTrend: { month: string; completed: number; created: number }[] = [];
  const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const currentMonth = new Date().getMonth();

  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = new Date().getFullYear() - (currentMonth - i < 0 ? 1 : 0);
    const monthStart = new Date(year, monthIndex, 1).getTime();
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59).getTime();

    const created = workOrders.filter(
      (w) =>
        new Date(w.createdAt).getTime() >= monthStart && new Date(w.createdAt).getTime() <= monthEnd
    ).length;

    const completed = workOrders.filter(
      (w) =>
        w.completedAt &&
        new Date(w.completedAt).getTime() >= monthStart &&
        new Date(w.completedAt).getTime() <= monthEnd
    ).length;

    monthlyTrend.push({ month: monthLabels[monthIndex], completed, created });
  }

  const reviewedOrders = workOrders.filter(
    (w) =>
      w.status === 'reviewed' &&
      w.postMaintenanceRiskScore !== undefined &&
      w.preMaintenanceRiskScore !== undefined
  );
  const effectEvaluationAvg =
    reviewedOrders.length > 0
      ? reviewedOrders.reduce((sum, w) => {
          const improvement = w.preMaintenanceRiskScore! - w.postMaintenanceRiskScore!;
          return sum + improvement;
        }, 0) / reviewedOrders.length
      : 0;

  const highRiskBells = Object.values(assessments).filter((a) => a.riskLevel === 'high').length;
  const criticalRiskBells = Object.values(assessments).filter((a) => a.riskLevel === 'critical').length;
  const allScores = Object.values(assessments).map((a) => a.riskScore);
  const overallRiskScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

  return {
    totalWorkOrders: workOrders.length,
    pendingAssignCount: workOrders.filter((w) => w.status === 'pending_assign').length,
    inProgressCount: workOrders.filter((w) => w.status === 'in_progress').length,
    completedCount: workOrders.filter((w) => w.status === 'completed').length,
    reviewedCount: workOrders.filter((w) => w.status === 'reviewed').length,
    overdueCount,
    avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
    totalMaintenanceRecords: maintenanceRecordsCount,
    highRiskBells,
    criticalRiskBells,
    overallRiskScore,
    workOrdersByType,
    workOrdersByAssignee,
    workOrdersByRiskLevel,
    monthlyTrend,
    effectEvaluationAvg: Math.round(effectEvaluationAvg * 10) / 10,
  };
}

export function getWorkOrderStatusCounts(workOrders: WorkOrder[]): Record<string, number> {
  return {
    all: workOrders.length,
    pending_assign: workOrders.filter((w) => w.status === 'pending_assign').length,
    in_progress: workOrders.filter((w) => w.status === 'in_progress').length,
    completed: workOrders.filter((w) => w.status === 'completed').length,
    reviewed: workOrders.filter((w) => w.status === 'reviewed').length,
  };
}
