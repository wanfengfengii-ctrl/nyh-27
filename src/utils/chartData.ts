import type { Bell, BellScheme, StrikePosition } from '../types/bell';
import { getBellCents } from './cents';

export interface FrequencyChartData {
  position: number;
  name: string;
  target: number;
  measured: number;
}

export interface DeviationChartData {
  position: number;
  name: string;
  deviation: number;
  isOutOfRange: boolean;
}

export interface CompareSchemeData {
  schemeId: string;
  schemeName: string;
  data: { position: number; name: string; value: number }[];
}

export function prepareFrequencyChartData(
  bells: Bell[],
  strikePosition: StrikePosition
): FrequencyChartData[] {
  return bells.map((bell) => ({
    position: bell.position,
    name: bell.name,
    target: bell.frequencies[strikePosition].target,
    measured: bell.frequencies[strikePosition].measured,
  }));
}

export function prepareDeviationChartData(
  bells: Bell[],
  strikePosition: StrikePosition,
  allowedDeviation: number
): DeviationChartData[] {
  return bells.map((bell) => {
    const deviation = getBellCents(bell, strikePosition);
    return {
      position: bell.position,
      name: bell.name,
      deviation,
      isOutOfRange: Math.abs(deviation) > allowedDeviation,
    };
  });
}

export function prepareCompareFrequencyData(
  schemes: BellScheme[],
  strikePosition: StrikePosition
): CompareSchemeData[] {
  return schemes.map((scheme) => ({
    schemeId: scheme.id,
    schemeName: scheme.name,
    data: scheme.bells.map((bell) => ({
      position: bell.position,
      name: bell.name,
      value: bell.frequencies[strikePosition].measured,
    })),
  }));
}

export function prepareCompareDeviationData(
  schemes: BellScheme[],
  strikePosition: StrikePosition
): CompareSchemeData[] {
  return schemes.map((scheme) => ({
    schemeId: scheme.id,
    schemeName: scheme.name,
    data: scheme.bells.map((bell) => ({
      position: bell.position,
      name: bell.name,
      value: getBellCents(bell, strikePosition),
    })),
  }));
}

export function getSchemeComparisonStats(
  baseScheme: BellScheme,
  compareScheme: BellScheme,
  strikePosition: StrikePosition
): {
  avgDifference: number;
  maxDifference: number;
  minDifference: number;
  matchingBells: number;
  totalBells: number;
} {
  const baseBells = baseScheme.bells;
  const compareBells = compareScheme.bells;

  let totalDiff = 0;
  let maxDiff = 0;
  let minDiff = Infinity;
  let matchingCount = 0;

  const minLength = Math.min(baseBells.length, compareBells.length);

  for (let i = 0; i < minLength; i++) {
    const baseFreq = baseBells[i].frequencies[strikePosition].measured;
    const compareFreq = compareBells[i].frequencies[strikePosition].measured;
    const diff = Math.abs(baseFreq - compareFreq);

    totalDiff += diff;
    maxDiff = Math.max(maxDiff, diff);
    minDiff = Math.min(minDiff, diff);
    matchingCount++;
  }

  return {
    avgDifference: matchingCount > 0 ? totalDiff / matchingCount : 0,
    maxDifference: maxDiff,
    minDifference: matchingCount > 0 ? minDiff : 0,
    matchingBells: matchingCount,
    totalBells: Math.max(baseBells.length, compareBells.length),
  };
}
