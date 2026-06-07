import type { BellScheme, ReviewLog, ReviewStatus, WorkOrder } from '../types/bell';
import { generateId } from '../utils/common';

export function createReviewLog(
  schemeId: string,
  status: ReviewStatus,
  comment: string,
  reviewer: string = '当前用户'
): ReviewLog {
  return {
    id: generateId('review'),
    timestamp: new Date(),
    status,
    comment,
    reviewer,
    schemeId,
  };
}

export function applyReviewToScheme(
  scheme: BellScheme,
  status: ReviewStatus,
  comment: string,
  reviewer: string = '当前用户'
): BellScheme {
  const log = createReviewLog(scheme.id, status, comment, reviewer);
  return {
    ...scheme,
    reviewStatus: status,
    reviewLogs: [log, ...scheme.reviewLogs],
    updatedAt: new Date(),
  };
}

export function resetReviewStatus(scheme: BellScheme): BellScheme {
  if (scheme.reviewStatus === 'pending') return scheme;
  return {
    ...scheme,
    reviewStatus: 'pending',
    updatedAt: new Date(),
  };
}

export function shouldResetOnUpdate(
  oldStatus: ReviewStatus,
  newStatus: ReviewStatus
): boolean {
  return oldStatus !== newStatus && newStatus === 'pending';
}

export function canExport(reviewStatus: ReviewStatus): boolean {
  return reviewStatus === 'approved';
}

export function canEdit(_reviewStatus: ReviewStatus): boolean {
  return true;
}

export function getReviewStatusColor(status: ReviewStatus): string {
  switch (status) {
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    case 'pending':
    default:
      return 'yellow';
  }
}

export function getReviewStatusLabel(status: ReviewStatus): string {
  switch (status) {
    case 'approved':
      return '已通过';
    case 'rejected':
      return '已驳回';
    case 'pending':
    default:
      return '待复核';
  }
}

export function isWorkOrderReviewable(workOrder: WorkOrder): boolean {
  return workOrder.status === 'completed';
}

export function canReopenWorkOrder(workOrder: WorkOrder): boolean {
  return workOrder.status === 'completed' || workOrder.status === 'reviewed';
}
