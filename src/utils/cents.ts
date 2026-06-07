import type { DeviationResult, Bell, StrikePosition } from '../types/bell';

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

export function getBellDeviation(
  bell: Bell,
  strikePosition: StrikePosition,
  allowedDeviation: number
): DeviationResult {
  const freq = bell.frequencies[strikePosition];
  return getDeviationResult(freq.target, freq.measured, allowedDeviation);
}

export function getBellCents(bell: Bell, strikePosition: StrikePosition): number {
  const freq = bell.frequencies[strikePosition];
  return calculateCents(freq.target, freq.measured);
}

export function isBellOutOfRange(
  bell: Bell,
  strikePosition: StrikePosition,
  allowedDeviation: number
): boolean {
  return Math.abs(getBellCents(bell, strikePosition)) > allowedDeviation;
}

export function getOutOfRangeCount(
  bells: Bell[],
  strikePosition: StrikePosition,
  allowedDeviation: number
): number {
  return bells.filter((b) => isBellOutOfRange(b, strikePosition, allowedDeviation)).length;
}

export function formatFrequency(freq: number): string {
  return `${freq.toFixed(2)} Hz`;
}

export function formatWeight(weight: number): string {
  return `${weight.toFixed(2)} kg`;
}
