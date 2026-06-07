import { describe, it, expect } from 'vitest';
import type { BellScheme, Bell, ReviewLog } from '../../types/bell';
import {
  createReviewLog,
  applyReviewToScheme,
  resetReviewStatus,
  shouldResetOnUpdate,
  canExport,
  canEdit,
  getReviewStatusColor,
  getReviewStatusLabel,
  isWorkOrderReviewable,
  canReopenWorkOrder,
} from '../review';
import type { WorkOrder } from '../../types/bell';

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

function createTestScheme(overrides: Partial<BellScheme> = {}): BellScheme {
  return {
    id: 'scheme-1',
    name: '测试方案',
    description: '测试方案描述',
    bells: [createTestBell()],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    reviewStatus: 'pending',
    reviewLogs: [],
    operationHistory: [],
    isActive: true,
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
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    mediaIds: [],
    sourceType: 'manual',
    ...overrides,
  };
}

describe('review utils', () => {
  describe('createReviewLog', () => {
    it('should create review log with correct fields', () => {
      const log = createReviewLog('scheme-1', 'approved', '审核通过', '张主任');

      expect(log.id).toBeTruthy();
      expect(log.timestamp).toBeInstanceOf(Date);
      expect(log.status).toBe('approved');
      expect(log.comment).toBe('审核通过');
      expect(log.reviewer).toBe('张主任');
      expect(log.schemeId).toBe('scheme-1');
    });

    it('should use default reviewer when not provided', () => {
      const log = createReviewLog('scheme-1', 'pending', '提交审核');
      expect(log.reviewer).toBe('当前用户');
    });
  });

  describe('applyReviewToScheme', () => {
    it('should apply approved review to scheme', () => {
      const scheme = createTestScheme({ reviewStatus: 'pending' });
      const result = applyReviewToScheme(scheme, 'approved', '通过', '张主任');

      expect(result.reviewStatus).toBe('approved');
      expect(result.reviewLogs.length).toBe(1);
      expect(result.reviewLogs[0].status).toBe('approved');
      expect(result.updatedAt).not.toEqual(scheme.updatedAt);
    });

    it('should apply rejected review to scheme', () => {
      const scheme = createTestScheme({ reviewStatus: 'pending' });
      const result = applyReviewToScheme(scheme, 'rejected', '需要修改', '张主任');

      expect(result.reviewStatus).toBe('rejected');
      expect(result.reviewLogs.length).toBe(1);
      expect(result.reviewLogs[0].status).toBe('rejected');
    });

    it('should preserve existing review logs and prepend new one', () => {
      const existingLog: ReviewLog = {
        id: 'log-1',
        timestamp: new Date(),
        status: 'pending',
        comment: '初次提交',
        reviewer: '提交人',
        schemeId: 'scheme-1',
      };
      const scheme = createTestScheme({ reviewLogs: [existingLog] });
      const result = applyReviewToScheme(scheme, 'approved', '通过', '张主任');

      expect(result.reviewLogs.length).toBe(2);
      expect(result.reviewLogs[1].id).toBe('log-1');
      expect(result.reviewLogs[0].status).toBe('approved');
    });
  });

  describe('resetReviewStatus', () => {
    it('should reset approved status to pending', () => {
      const scheme = createTestScheme({ reviewStatus: 'approved' });
      const result = resetReviewStatus(scheme);

      expect(result.reviewStatus).toBe('pending');
      expect(result.updatedAt).not.toEqual(scheme.updatedAt);
    });

    it('should reset rejected status to pending', () => {
      const scheme = createTestScheme({ reviewStatus: 'rejected' });
      const result = resetReviewStatus(scheme);

      expect(result.reviewStatus).toBe('pending');
    });

    it('should not change pending status', () => {
      const scheme = createTestScheme({ reviewStatus: 'pending' });
      const result = resetReviewStatus(scheme);

      expect(result).toBe(scheme);
    });
  });

  describe('shouldResetOnUpdate', () => {
    it('should return true when old is approved and new is pending', () => {
      expect(shouldResetOnUpdate('approved', 'pending')).toBe(true);
    });

    it('should return true when old is rejected and new is pending', () => {
      expect(shouldResetOnUpdate('rejected', 'pending')).toBe(true);
    });

    it('should return false when both are pending', () => {
      expect(shouldResetOnUpdate('pending', 'pending')).toBe(false);
    });

    it('should return false when new is not pending', () => {
      expect(shouldResetOnUpdate('pending', 'approved')).toBe(false);
    });
  });

  describe('canExport', () => {
    it('should allow export for approved status', () => {
      expect(canExport('approved')).toBe(true);
    });

    it('should not allow export for pending status', () => {
      expect(canExport('pending')).toBe(false);
    });

    it('should not allow export for rejected status', () => {
      expect(canExport('rejected')).toBe(false);
    });
  });

  describe('canEdit', () => {
    it('should allow edit for pending status', () => {
      expect(canEdit('pending')).toBe(true);
    });

    it('should allow edit for rejected status', () => {
      expect(canEdit('rejected')).toBe(true);
    });

    it('should also allow edit for approved status (always true)', () => {
      expect(canEdit('approved')).toBe(true);
    });
  });

  describe('getReviewStatusColor', () => {
    it('should return correct color for pending', () => {
      expect(getReviewStatusColor('pending')).toBe('yellow');
    });

    it('should return correct color for approved', () => {
      expect(getReviewStatusColor('approved')).toBe('green');
    });

    it('should return correct color for rejected', () => {
      expect(getReviewStatusColor('rejected')).toBe('red');
    });
  });

  describe('getReviewStatusLabel', () => {
    it('should return correct label for pending', () => {
      expect(getReviewStatusLabel('pending')).toBe('待复核');
    });

    it('should return correct label for approved', () => {
      expect(getReviewStatusLabel('approved')).toBe('已通过');
    });

    it('should return correct label for rejected', () => {
      expect(getReviewStatusLabel('rejected')).toBe('已驳回');
    });
  });

  describe('isWorkOrderReviewable', () => {
    it('should return true for completed work order', () => {
      const wo = createTestWorkOrder({ status: 'completed' });
      expect(isWorkOrderReviewable(wo)).toBe(true);
    });

    it('should return false for pending_assign work order', () => {
      const wo = createTestWorkOrder({ status: 'pending_assign' });
      expect(isWorkOrderReviewable(wo)).toBe(false);
    });

    it('should return false for in_progress work order', () => {
      const wo = createTestWorkOrder({ status: 'in_progress' });
      expect(isWorkOrderReviewable(wo)).toBe(false);
    });

    it('should return false for reviewed work order', () => {
      const wo = createTestWorkOrder({ status: 'reviewed' });
      expect(isWorkOrderReviewable(wo)).toBe(false);
    });
  });

  describe('canReopenWorkOrder', () => {
    it('should allow reopen for completed work order', () => {
      const wo = createTestWorkOrder({ status: 'completed' });
      expect(canReopenWorkOrder(wo)).toBe(true);
    });

    it('should allow reopen for reviewed work order', () => {
      const wo = createTestWorkOrder({ status: 'reviewed' });
      expect(canReopenWorkOrder(wo)).toBe(true);
    });

    it('should not allow reopen for pending_assign work order', () => {
      const wo = createTestWorkOrder({ status: 'pending_assign' });
      expect(canReopenWorkOrder(wo)).toBe(false);
    });

    it('should not allow reopen for in_progress work order', () => {
      const wo = createTestWorkOrder({ status: 'in_progress' });
      expect(canReopenWorkOrder(wo)).toBe(false);
    });
  });
});
