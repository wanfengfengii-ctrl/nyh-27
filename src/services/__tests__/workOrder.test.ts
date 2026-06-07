import { describe, it, expect } from 'vitest';
import type { WorkOrder, Bell, BellMaintenanceAssessment, MaintenanceSuggestion } from '../../types/bell';
import {
  createWorkOrder,
  assignWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  reviewWorkOrder,
  filterWorkOrders,
  hasActiveWorkOrder,
  getWorkOrdersByBell,
  getWorkOrderById,
  addMediaToWorkOrder,
  createWorkOrderFromAssessment,
  batchCreateWorkOrdersFromHighRisk,
  calculateStatistics,
  getRiskComparisons,
} from '../workOrder';

function createTestBell(overrides: Partial<Bell> = {}): Bell {
  return {
    id: 'bell-1',
    name: '测试编钟',
    position: 1,
    weight: 15,
    strikePosition: '正鼓',
    frequencies: {
      '正鼓': { target: 440, measured: 442 },
      '右鼓': { target: 494, measured: 495 },
      '左鼓': { target: 484, measured: 486 },
      '钲部': { target: 418, measured: 420 },
    },
    note: 'A4',
    ...overrides,
  };
}

function createTestWorkOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: 'wo-1',
    bellId: 'bell-1',
    bellName: '测试编钟',
    bellPosition: 1,
    title: '测试工单',
    description: '测试工单描述',
    type: 'inspection',
    status: 'pending_assign',
    priority: 'medium',
    riskLevel: 'medium',
    assignee: '',
    assignor: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    mediaIds: [],
    sourceType: 'manual',
    ...overrides,
  };
}

function createTestSuggestion(overrides: Partial<MaintenanceSuggestion> = {}): MaintenanceSuggestion {
  return {
    id: 'sug-1',
    bellId: 'bell-1',
    type: 'immediate',
    title: '立即修复建议',
    description: '需要立即进行修复处理',
    priority: 1,
    ...overrides,
  };
}

describe('workOrder service', () => {
  describe('createWorkOrder', () => {
    it('should create a work order with pending_assign status when no assignee', () => {
      const result = createWorkOrder({
        bellId: 'bell-1',
        bellName: '测试编钟',
        bellPosition: 1,
        title: '新工单',
        description: '新工单描述',
        type: 'cleaning',
        priority: 'high',
        dueDate: new Date('2024-12-01'),
        sourceType: 'manual',
      });

      expect(result.status).toBe('pending_assign');
      expect(result.bellId).toBe('bell-1');
      expect(result.title).toBe('新工单');
      expect(result.type).toBe('cleaning');
      expect(result.priority).toBe('high');
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.assignedAt).toBeUndefined();
      expect(result.startedAt).toBeUndefined();
    });

    it('should create work order with in_progress status when assignee provided', () => {
      const result = createWorkOrder({
        bellId: 'bell-1',
        bellName: '测试编钟',
        bellPosition: 1,
        title: '新工单',
        description: '描述',
        type: 'cleaning',
        priority: 'high',
        dueDate: new Date(),
        assignee: '张师傅',
        sourceType: 'manual',
      });

      expect(result.assignee).toBe('张师傅');
      expect(result.status).toBe('in_progress');
      expect(result.assignedAt).toBeInstanceOf(Date);
      expect(result.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('assignWorkOrder', () => {
    it('should assign pending work order and set status to in_progress', () => {
      const wo = createTestWorkOrder({ status: 'pending_assign', assignee: '' });
      const result = assignWorkOrder(wo, '张师傅', '李主任');

      expect(result.assignee).toBe('张师傅');
      expect(result.assignor).toBe('李主任');
      expect(result.assignedAt).toBeInstanceOf(Date);
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.status).toBe('in_progress');
    });

    it('should not modify work order if already assigned (not pending_assign)', () => {
      const wo = createTestWorkOrder({ status: 'in_progress', assignee: '张师傅' });
      const result = assignWorkOrder(wo, '李师傅', '王主任');

      expect(result).toBe(wo);
    });
  });

  describe('startWorkOrder', () => {
    it('should start a pending work order', () => {
      const wo = createTestWorkOrder({ status: 'pending_assign', assignee: '张师傅' });
      const result = startWorkOrder(wo);

      expect(result.status).toBe('in_progress');
      expect(result.startedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt for already in_progress work order', () => {
      const originalDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const wo = createTestWorkOrder({
        status: 'in_progress',
        startedAt: originalDate,
        updatedAt: originalDate,
      });
      const result = startWorkOrder(wo);

      expect(result.status).toBe('in_progress');
      expect(result.startedAt).toEqual(originalDate);
      expect(result.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should not start completed work order', () => {
      const wo = createTestWorkOrder({ status: 'completed' });
      const result = startWorkOrder(wo);

      expect(result).toBe(wo);
    });

    it('should not start reviewed work order', () => {
      const wo = createTestWorkOrder({ status: 'reviewed' });
      const result = startWorkOrder(wo);

      expect(result).toBe(wo);
    });
  });

  describe('completeWorkOrder', () => {
    it('should complete an in_progress work order', () => {
      const wo = createTestWorkOrder({ status: 'in_progress' });
      const result = completeWorkOrder(wo, {
        completedBy: '张师傅',
        effectEvaluation: '效果良好',
      });

      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.completedBy).toBe('张师傅');
      expect(result.effectEvaluation).toBe('效果良好');
    });

    it('should not complete non in_progress work order', () => {
      const wo = createTestWorkOrder({ status: 'pending_assign' });
      const result = completeWorkOrder(wo, { completedBy: '张师傅' });

      expect(result).toBe(wo);
    });
  });

  describe('reviewWorkOrder', () => {
    it('should pass review and set status to reviewed', () => {
      const wo = createTestWorkOrder({ status: 'completed' });
      const result = reviewWorkOrder(wo, {
        reviewedBy: '李主任',
        reviewComment: '质量达标',
        passed: true,
      });

      expect(result.status).toBe('reviewed');
      expect(result.reviewedAt).toBeInstanceOf(Date);
      expect(result.reviewedBy).toBe('李主任');
      expect(result.reviewComment).toBe('质量达标');
    });

    it('should reject review and rollback to in_progress, keeping reviewer', () => {
      const wo = createTestWorkOrder({ status: 'completed' });
      const result = reviewWorkOrder(wo, {
        reviewedBy: '李主任',
        reviewComment: '需要返工',
        passed: false,
      });

      expect(result.status).toBe('in_progress');
      expect(result.reviewComment).toBe('需要返工');
      expect(result.reviewedBy).toBe('李主任');
      expect(result.reviewedAt).toBeUndefined();
    });

    it('should not review non-completed work order', () => {
      const wo = createTestWorkOrder({ status: 'in_progress' });
      const result = reviewWorkOrder(wo, {
        reviewedBy: '李主任',
        reviewComment: 'test',
        passed: true,
      });

      expect(result).toBe(wo);
    });
  });

  describe('filterWorkOrders', () => {
    const workOrders: WorkOrder[] = [
      createTestWorkOrder({ id: 'wo-1', status: 'pending_assign', priority: 'high', type: 'inspection' }),
      createTestWorkOrder({ id: 'wo-2', status: 'in_progress', priority: 'medium', type: 'cleaning', assignee: '张师傅' }),
      createTestWorkOrder({ id: 'wo-3', status: 'completed', priority: 'low', type: 'repair', assignee: '李师傅' }),
      createTestWorkOrder({ id: 'wo-4', bellId: 'bell-2', status: 'reviewed', priority: 'high', type: 'tuning' }),
    ];

    it('should filter by status', () => {
      const result = filterWorkOrders(workOrders, { status: ['pending_assign', 'in_progress'] });
      expect(result).toHaveLength(2);
      expect(result.map(w => w.id)).toContain('wo-1');
      expect(result.map(w => w.id)).toContain('wo-2');
    });

    it('should filter by assignee', () => {
      const result = filterWorkOrders(workOrders, { assignee: '张师傅' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('wo-2');
    });

    it('should filter by priority', () => {
      const result = filterWorkOrders(workOrders, { priority: ['high'] });
      expect(result).toHaveLength(2);
    });

    it('should filter by type', () => {
      const result = filterWorkOrders(workOrders, { type: ['cleaning', 'repair'] });
      expect(result).toHaveLength(2);
    });

    it('should filter by keyword in title', () => {
      const result = filterWorkOrders(workOrders, { keyword: '测试' });
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return all work orders when no filter', () => {
      const result = filterWorkOrders(workOrders, {});
      expect(result).toHaveLength(4);
    });
  });

  describe('hasActiveWorkOrder', () => {
    const workOrders: WorkOrder[] = [
      createTestWorkOrder({ id: 'wo-1', bellId: 'bell-1', status: 'in_progress' }),
      createTestWorkOrder({ id: 'wo-2', bellId: 'bell-2', status: 'completed' }),
      createTestWorkOrder({ id: 'wo-3', bellId: 'bell-1', status: 'pending_assign' }),
    ];

    it('should return true when bell has active work order (in_progress)', () => {
      expect(hasActiveWorkOrder(workOrders, 'bell-1')).toBe(true);
    });

    it('should return true when bell has pending_assign work order', () => {
      expect(hasActiveWorkOrder(workOrders, 'bell-1')).toBe(true);
    });

    it('should return false when bell has no active work order', () => {
      expect(hasActiveWorkOrder(workOrders, 'bell-2')).toBe(false);
    });
  });

  describe('getWorkOrdersByBell', () => {
    const workOrders: WorkOrder[] = [
      createTestWorkOrder({ id: 'wo-1', bellId: 'bell-1' }),
      createTestWorkOrder({ id: 'wo-2', bellId: 'bell-2' }),
      createTestWorkOrder({ id: 'wo-3', bellId: 'bell-1' }),
    ];

    it('should return work orders for specific bell', () => {
      const result = getWorkOrdersByBell(workOrders, 'bell-1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for bell with no work orders', () => {
      const result = getWorkOrdersByBell(workOrders, 'bell-99');
      expect(result).toHaveLength(0);
    });
  });

  describe('getWorkOrderById', () => {
    const workOrders: WorkOrder[] = [
      createTestWorkOrder({ id: 'wo-1' }),
      createTestWorkOrder({ id: 'wo-2' }),
    ];

    it('should return work order by id', () => {
      const result = getWorkOrderById(workOrders, 'wo-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('wo-1');
    });

    it('should return null for non-existent id', () => {
      const result = getWorkOrderById(workOrders, 'wo-99');
      expect(result).toBeNull();
    });
  });

  describe('addMediaToWorkOrder', () => {
    it('should add media id to work order', () => {
      const wo = createTestWorkOrder({ mediaIds: ['media-1'] });
      const result = addMediaToWorkOrder(wo, 'media-2');

      expect(result.mediaIds).toContain('media-1');
      expect(result.mediaIds).toContain('media-2');
      expect(result.mediaIds).toHaveLength(2);
    });

    it('should not add duplicate media', () => {
      const wo = createTestWorkOrder({ mediaIds: ['media-1'] });
      const result = addMediaToWorkOrder(wo, 'media-1');

      expect(result).toBe(wo);
    });
  });

  describe('createWorkOrderFromAssessment', () => {
    it('should create work order from assessment with suggestions', () => {
      const bell = createTestBell();
      const suggestion = createTestSuggestion();
      const assessment: BellMaintenanceAssessment = {
        bellId: 'bell-1',
        riskLevel: 'high',
        riskScore: 75,
        frequencyDeviationScore: 60,
        weightChangeScore: 70,
        wearConditionScore: 80,
        maintenanceHistoryScore: 65,
        suggestions: [suggestion],
        nextMaintenanceDate: new Date(),
      };

      const result = createWorkOrderFromAssessment(bell, assessment);
      expect(result).not.toBeNull();
      expect(result?.riskLevel).toBe('high');
      expect(result?.preMaintenanceRiskScore).toBe(75);
      expect(result?.priority).toBe('high');
      expect(result?.sourceType).toBe('risk_auto');
      expect(result?.title).toBe(suggestion.title);
    });

    it('should return null for assessment with no suggestions', () => {
      const bell = createTestBell();
      const assessment: BellMaintenanceAssessment = {
        bellId: 'bell-1',
        riskLevel: 'high',
        riskScore: 80,
        frequencyDeviationScore: 70,
        weightChangeScore: 75,
        wearConditionScore: 85,
        maintenanceHistoryScore: 70,
        suggestions: [],
        nextMaintenanceDate: new Date(),
      };

      const result = createWorkOrderFromAssessment(bell, assessment);
      expect(result).toBeNull();
    });
  });

  describe('batchCreateWorkOrdersFromHighRisk', () => {
    const bells = [
      createTestBell({ id: 'bell-1', name: '钟1' }),
      createTestBell({ id: 'bell-2', name: '钟2' }),
      createTestBell({ id: 'bell-3', name: '钟3' }),
    ];

    const suggestion = createTestSuggestion();

    const assessments: Record<string, BellMaintenanceAssessment> = {
      'bell-1': {
        bellId: 'bell-1',
        riskLevel: 'high',
        riskScore: 80,
        frequencyDeviationScore: 70,
        weightChangeScore: 80,
        wearConditionScore: 85,
        maintenanceHistoryScore: 75,
        suggestions: [suggestion],
        nextMaintenanceDate: new Date(),
      },
      'bell-2': {
        bellId: 'bell-2',
        riskLevel: 'low',
        riskScore: 20,
        frequencyDeviationScore: 20,
        weightChangeScore: 20,
        wearConditionScore: 20,
        maintenanceHistoryScore: 20,
        suggestions: [suggestion],
        nextMaintenanceDate: new Date(),
      },
      'bell-3': {
        bellId: 'bell-3',
        riskLevel: 'critical',
        riskScore: 95,
        frequencyDeviationScore: 90,
        weightChangeScore: 95,
        wearConditionScore: 95,
        maintenanceHistoryScore: 90,
        suggestions: [suggestion],
        nextMaintenanceDate: new Date(),
      },
    };

    it('should create work orders for high and critical risk bells with suggestions', () => {
      const result = batchCreateWorkOrdersFromHighRisk(bells, assessments, []);
      expect(result).toHaveLength(2);
      const bellIds = result.map(w => w.bellId);
      expect(bellIds).toContain('bell-1');
      expect(bellIds).toContain('bell-3');
    });

    it('should skip bells with active work orders', () => {
      const existingWorkOrders: WorkOrder[] = [
        createTestWorkOrder({ id: 'wo-1', bellId: 'bell-1', status: 'in_progress' }),
      ];

      const result = batchCreateWorkOrdersFromHighRisk(bells, assessments, existingWorkOrders);
      expect(result).toHaveLength(1);
      expect(result[0].bellId).toBe('bell-3');
    });

    it('should return empty array when no high risk bells have suggestions', () => {
      const noSuggestionAssessments: Record<string, BellMaintenanceAssessment> = {
        'bell-1': {
          ...assessments['bell-1'],
          suggestions: [],
        },
        'bell-3': {
          ...assessments['bell-3'],
          suggestions: [],
        },
      };

      const result = batchCreateWorkOrdersFromHighRisk(bells, noSuggestionAssessments, []);
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateStatistics', () => {
    const assessments: Record<string, BellMaintenanceAssessment> = {
      'bell-1': { bellId: 'bell-1', riskLevel: 'high', riskScore: 80, frequencyDeviationScore: 70, weightChangeScore: 75, wearConditionScore: 85, maintenanceHistoryScore: 70, suggestions: [], nextMaintenanceDate: new Date() },
      'bell-2': { bellId: 'bell-2', riskLevel: 'low', riskScore: 20, frequencyDeviationScore: 20, weightChangeScore: 20, wearConditionScore: 20, maintenanceHistoryScore: 20, suggestions: [], nextMaintenanceDate: new Date() },
      'bell-3': { bellId: 'bell-3', riskLevel: 'medium', riskScore: 50, frequencyDeviationScore: 50, weightChangeScore: 50, wearConditionScore: 50, maintenanceHistoryScore: 50, suggestions: [], nextMaintenanceDate: new Date() },
    };

    const workOrders: WorkOrder[] = [
      createTestWorkOrder({ id: 'wo-1', status: 'pending_assign', type: 'inspection' }),
      createTestWorkOrder({ id: 'wo-2', status: 'in_progress', type: 'cleaning' }),
      createTestWorkOrder({ id: 'wo-3', status: 'completed', type: 'repair' }),
      createTestWorkOrder({ id: 'wo-4', status: 'reviewed', type: 'tuning' }),
    ];

    it('should calculate correct statistics', () => {
      const stats = calculateStatistics(workOrders, assessments, 10);
      expect(stats.totalWorkOrders).toBe(4);
      expect(stats.pendingAssignCount).toBe(1);
      expect(stats.inProgressCount).toBe(1);
      expect(stats.completedCount).toBe(1);
      expect(stats.reviewedCount).toBe(1);
      expect(stats.totalMaintenanceRecords).toBe(10);
      expect(stats.highRiskBells).toBe(1);
      expect(stats.criticalRiskBells).toBe(0);
    });

    it('should calculate work orders by type', () => {
      const stats = calculateStatistics(workOrders, assessments, 0);
      expect(stats.workOrdersByType.inspection).toBe(1);
      expect(stats.workOrdersByType.cleaning).toBe(1);
      expect(stats.workOrdersByType.repair).toBe(1);
      expect(stats.workOrdersByType.tuning).toBe(1);
      expect(stats.workOrdersByType.other).toBe(0);
      expect(stats.workOrdersByType.lubrication).toBe(0);
    });

    it('should calculate overall risk score', () => {
      const stats = calculateStatistics([], assessments, 0);
      expect(stats.overallRiskScore).toBe(50);
    });
  });

  describe('getRiskComparisons', () => {
    const workOrders: WorkOrder[] = [
      createTestWorkOrder({
        id: 'wo-1',
        status: 'completed',
        preMaintenanceRiskScore: 80,
        postMaintenanceRiskScore: 30,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }),
      createTestWorkOrder({
        id: 'wo-2',
        status: 'reviewed',
        preMaintenanceRiskScore: 60,
        postMaintenanceRiskScore: 25,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      }),
      createTestWorkOrder({
        id: 'wo-3',
        status: 'in_progress',
        preMaintenanceRiskScore: 70,
      }),
    ];

    it('should return risk comparisons only for completed/reviewed orders with both scores', () => {
      const result = getRiskComparisons(workOrders);
      expect(result).toHaveLength(2);
      expect(result[0].scoreChange).toBe(-35);
      expect(result[1].scoreChange).toBe(-50);
    });

    it('should sort by completed date descending', () => {
      const result = getRiskComparisons(workOrders);
      expect(result[0].workOrderId).toBe('wo-2');
      expect(result[1].workOrderId).toBe('wo-1');
    });

    it('should include levelImproved flag', () => {
      const result = getRiskComparisons(workOrders);
      expect(result[0].levelImproved).toBe(true);
    });
  });
});
