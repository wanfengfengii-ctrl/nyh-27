export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '未记录';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '未记录';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDateTime(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
};

export const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export function getPriorityColor(priority: string): string {
  return PRIORITY_COLORS[priority] || 'gray';
}

export function getPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] || '';
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: '手动创建',
  risk_auto: '风险自动生成',
  maintenance_cycle: '保养周期',
  suggestion: '保养建议',
};

export const SOURCE_TYPE_COLORS: Record<string, string> = {
  manual: 'gray',
  risk_auto: 'red',
  maintenance_cycle: 'blue',
  suggestion: 'green',
};

export function getSourceTypeLabel(sourceType: string): string {
  return SOURCE_TYPE_LABELS[sourceType] || sourceType;
}

export function getSourceTypeColor(sourceType: string): string {
  return SOURCE_TYPE_COLORS[sourceType] || 'gray';
}

export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.round((d2 - d1) / oneDay);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isOverdue(dueDate: Date | string, status: string): boolean {
  if (status === 'completed' || status === 'reviewed') return false;
  const now = new Date().getTime();
  const due = new Date(dueDate).getTime();
  return due < now;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
