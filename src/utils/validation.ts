import type { Bell, StrikePosition } from '../types/bell';

export function validateFrequency(value: number): boolean {
  return value > 0 && isFinite(value);
}

export function validateWeight(value: number): boolean {
  return value > 0 && isFinite(value);
}

export function validateBell(bell: Bell, strikePosition: StrikePosition = '正鼓'): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!bell.name.trim()) {
    errors.push('编钟名称不能为空');
  }

  const freq = bell.frequencies[strikePosition];
  if (!validateFrequency(freq.target)) {
    errors.push(`${strikePosition}目标频率必须大于零`);
  }

  if (!validateFrequency(freq.measured)) {
    errors.push(`${strikePosition}实测频率必须大于零`);
  }

  if (!validateWeight(bell.weight)) {
    errors.push('重量必须大于零');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
