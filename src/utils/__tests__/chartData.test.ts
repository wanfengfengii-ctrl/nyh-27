import { describe, it, expect } from 'vitest';
import type { Bell, BellScheme } from '../../types/bell';
import {
  prepareFrequencyChartData,
  prepareDeviationChartData,
  prepareCompareFrequencyData,
  prepareCompareDeviationData,
  getSchemeComparisonStats,
} from '../chartData';

function createTestBell(overrides: Partial<Bell> = {}): Bell {
  return {
    id: 'bell-1',
    name: '测试编钟',
    position: 1,
    weight: 15,
    strikePosition: '正鼓',
    frequencies: {
      '正鼓': { target: 440, measured: 442.5 },
      '右鼓': { target: 494, measured: 496 },
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
    bells: [
      createTestBell({ position: 1, name: '钟1' }),
      createTestBell({ id: 'bell-2', position: 2, name: '钟2' }),
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    reviewStatus: 'pending',
    reviewLogs: [],
    operationHistory: [],
    isActive: true,
    ...overrides,
  };
}

describe('chartData utils', () => {
  describe('prepareFrequencyChartData', () => {
    it('should prepare frequency chart data for single bell', () => {
      const bells = [createTestBell()];
      const result = prepareFrequencyChartData(bells, '正鼓');

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(1);
      expect(result[0].name).toBe('测试编钟');
      expect(result[0].target).toBe(440);
      expect(result[0].measured).toBe(442.5);
    });

    it('should prepare data for multiple bells', () => {
      const bells = [
        createTestBell({ position: 1, name: '钟1' }),
        createTestBell({ id: 'bell-2', position: 2, name: '钟2' }),
      ];
      const result = prepareFrequencyChartData(bells, '正鼓');

      expect(result).toHaveLength(2);
      expect(result[0].position).toBe(1);
      expect(result[1].position).toBe(2);
    });

    it('should handle different strike positions', () => {
      const bells = [createTestBell()];
      const result = prepareFrequencyChartData(bells, '右鼓');

      expect(result[0].target).toBe(494);
      expect(result[0].measured).toBe(496);
    });

    it('should return empty array for empty bells', () => {
      const result = prepareFrequencyChartData([], '正鼓');
      expect(result).toEqual([]);
    });
  });

  describe('prepareDeviationChartData', () => {
    it('should prepare deviation chart data', () => {
      const bells = [createTestBell()];
      const result = prepareDeviationChartData(bells, '正鼓', 50);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(1);
      expect(result[0].name).toBe('测试编钟');
      expect(typeof result[0].deviation).toBe('number');
      expect(typeof result[0].isOutOfRange).toBe('boolean');
    });

    it('should mark as out of range when deviation exceeds allowed', () => {
      const bell = createTestBell({
        frequencies: {
          '正鼓': { target: 440, measured: 470 },
          '右鼓': { target: 494, measured: 496 },
          '左鼓': { target: 484, measured: 486 },
          '钲部': { target: 418, measured: 420 },
        },
      });
      const result = prepareDeviationChartData([bell], '正鼓', 10);

      expect(result[0].isOutOfRange).toBe(true);
    });

    it('should mark as in range when deviation is within allowed', () => {
      const bell = createTestBell({
        frequencies: {
          '正鼓': { target: 440, measured: 441 },
          '右鼓': { target: 494, measured: 496 },
          '左鼓': { target: 484, measured: 486 },
          '钲部': { target: 418, measured: 420 },
        },
      });
      const result = prepareDeviationChartData([bell], '正鼓', 50);

      expect(result[0].isOutOfRange).toBe(false);
    });
  });

  describe('prepareCompareFrequencyData', () => {
    it('should prepare compare frequency data for multiple schemes', () => {
      const schemes = [
        createTestScheme({ id: 'scheme-1', name: '方案1' }),
        createTestScheme({ id: 'scheme-2', name: '方案2' }),
      ];
      const result = prepareCompareFrequencyData(schemes, '正鼓');

      expect(result).toHaveLength(2);
      expect(result[0].schemeId).toBe('scheme-1');
      expect(result[0].schemeName).toBe('方案1');
      expect(result[0].data).toHaveLength(2);
      expect(result[0].data[0].value).toBe(442.5);
    });

    it('should handle empty schemes array', () => {
      const result = prepareCompareFrequencyData([], '正鼓');
      expect(result).toEqual([]);
    });
  });

  describe('prepareCompareDeviationData', () => {
    it('should prepare compare deviation data for multiple schemes', () => {
      const schemes = [
        createTestScheme({ id: 'scheme-1', name: '方案1' }),
      ];
      const result = prepareCompareDeviationData(schemes, '正鼓');

      expect(result).toHaveLength(1);
      expect(result[0].schemeId).toBe('scheme-1');
      expect(result[0].data).toHaveLength(2);
      expect(typeof result[0].data[0].value).toBe('number');
    });
  });

  describe('getSchemeComparisonStats', () => {
    it('should calculate comparison statistics between two schemes', () => {
      const scheme1 = createTestScheme({
        id: 'scheme-1',
        name: '基准方案',
        bells: [
          createTestBell({
            position: 1,
            name: '钟1',
            frequencies: {
              '正鼓': { target: 440, measured: 440 },
              '右鼓': { target: 494, measured: 494 },
              '左鼓': { target: 484, measured: 484 },
              '钲部': { target: 418, measured: 418 },
            },
          }),
        ],
      });

      const scheme2 = createTestScheme({
        id: 'scheme-2',
        name: '对比方案',
        bells: [
          createTestBell({
            position: 1,
            name: '钟1',
            frequencies: {
              '正鼓': { target: 440, measured: 445 },
              '右鼓': { target: 494, measured: 499 },
              '左鼓': { target: 484, measured: 489 },
              '钲部': { target: 418, measured: 423 },
            },
          }),
        ],
      });

      const stats = getSchemeComparisonStats(scheme1, scheme2, '正鼓');

      expect(stats.avgDifference).toBe(5);
      expect(stats.maxDifference).toBe(5);
      expect(stats.minDifference).toBe(5);
      expect(stats.matchingBells).toBe(1);
      expect(stats.totalBells).toBe(1);
    });

    it('should handle schemes with different bell counts', () => {
      const scheme1 = createTestScheme({
        id: 'scheme-1',
        name: '方案1',
        bells: [createTestBell({ position: 1, name: '钟1' })],
      });

      const scheme2 = createTestScheme({
        id: 'scheme-2',
        name: '方案2',
        bells: [
          createTestBell({ position: 1, name: '钟1' }),
          createTestBell({ id: 'bell-2', position: 2, name: '钟2' }),
        ],
      });

      const stats = getSchemeComparisonStats(scheme1, scheme2, '正鼓');
      expect(stats.matchingBells).toBe(1);
      expect(stats.totalBells).toBe(2);
    });

    it('should calculate zero difference for identical schemes', () => {
      const scheme = createTestScheme();
      const stats = getSchemeComparisonStats(scheme, scheme, '正鼓');

      expect(stats.avgDifference).toBe(0);
      expect(stats.maxDifference).toBe(0);
      expect(stats.minDifference).toBe(0);
    });
  });
});
