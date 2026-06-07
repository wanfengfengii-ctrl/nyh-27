import type { DeviationResult } from '../types/bell';

export function calculateCents(targetFreq: number, measuredFreq: number): number {
  if (targetFreq <= 0 || measuredFreq <= 0) return 0;
  return 1200 * Math.log2(measuredFreq / targetFreq);
}

export function getDeviationResult(
  targetFreq: number,
  measuredFreq: number,
  allowedDeviation: number
): DeviationResult {
  const cents = calculateCents(targetFreq, measuredFreq);
  const isOutOfRange = Math.abs(cents) > allowedDeviation;
  let direction: 'sharp' | 'flat' | 'equal';
  if (cents > 0.01) {
    direction = 'sharp';
  } else if (cents < -0.01) {
    direction = 'flat';
  } else {
    direction = 'equal';
  }
  return { cents, isOutOfRange, direction };
}

export function formatCents(cents: number): string {
  const sign = cents > 0 ? '+' : '';
  return `${sign}${cents.toFixed(2)} ct`;
}
