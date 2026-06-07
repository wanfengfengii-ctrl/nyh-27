import type { Bell } from '../types/bell';

export function validateFrequency(value: number): boolean {
  return value > 0 && isFinite(value);
}

export function validateWeight(value: number): boolean {
  return value > 0 && isFinite(value);
}

export function validateBell(bell: Bell): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!bell.name.trim()) {
    errors.push('编钟名称不能为空');
  }

  if (!validateFrequency(bell.targetFrequency)) {
    errors.push('目标频率必须大于零');
  }

  if (!validateFrequency(bell.measuredFrequency)) {
    errors.push('实测频率必须大于零');
  }

  if (!validateWeight(bell.weight)) {
    errors.push('重量必须大于零');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
