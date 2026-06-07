import type { Bell, BellScheme, StrikePosition } from '../types/bell';

const createDefaultFrequencies = (target: number, measured: number) => ({
  '正鼓': { target, measured },
  '右鼓': { target: target * 1.125, measured: measured * 1.122 },
  '左鼓': { target: target * 1.1, measured: measured * 1.098 },
  '钲部': { target: target * 0.95, measured: measured * 0.952 },
});

export const mockBells: Bell[] = [
  {
    id: 'bell-1',
    name: '低音宫钟',
    position: 1,
    weight: 32.5,
    strikePosition: '正鼓',
    frequencies: createDefaultFrequencies(130.81, 131.52),
    note: 'C3',
  },
  {
    id: 'bell-2',
    name: '商钟',
    position: 2,
    weight: 28.3,
    strikePosition: '正鼓',
    frequencies: createDefaultFrequencies(146.83, 145.90),
    note: 'D3',
  },
  {
    id: 'bell-3',
    name: '角钟',
    position: 3,
    weight: 24.7,
    strikePosition: '右鼓',
    frequencies: createDefaultFrequencies(164.81, 165.20),
    note: 'E3',
  },
  {
    id: 'bell-4',
    name: '变徵钟',
    position: 4,
    weight: 22.1,
    strikePosition: '正鼓',
    frequencies: createDefaultFrequencies(174.61, 173.80),
    note: 'F3',
  },
  {
    id: 'bell-5',
    name: '徵钟',
    position: 5,
    weight: 19.8,
    strikePosition: '正鼓',
    frequencies: createDefaultFrequencies(196.00, 197.25),
    note: 'G3',
  },
  {
    id: 'bell-6',
    name: '羽钟',
    position: 6,
    weight: 17.5,
    strikePosition: '左鼓',
    frequencies: createDefaultFrequencies(220.00, 218.50),
    note: 'A3',
  },
  {
    id: 'bell-7',
    name: '变宫钟',
    position: 7,
    weight: 15.2,
    strikePosition: '正鼓',
    frequencies: createDefaultFrequencies(246.94, 248.30),
    note: 'B3',
  },
  {
    id: 'bell-8',
    name: '清宫钟',
    position: 8,
    weight: 13.8,
    strikePosition: '正鼓',
    frequencies: createDefaultFrequencies(261.63, 260.10),
    note: 'C4',
  },
  {
    id: 'bell-9',
    name: '清商钟',
    position: 9,
    weight: 12.1,
    strikePosition: '右鼓',
    frequencies: createDefaultFrequencies(293.66, 295.80),
    note: 'D4',
  },
  {
    id: 'bell-10',
    name: '清角钟',
    position: 10,
    weight: 10.5,
    strikePosition: '正鼓',
    frequencies: createDefaultFrequencies(329.63, 327.50),
    note: 'E4',
  },
  {
    id: 'bell-11',
    name: '清徵钟',
    position: 11,
    weight: 8.7,
    strikePosition: '钲部',
    frequencies: createDefaultFrequencies(392.00, 395.60),
    note: 'G4',
  },
  {
    id: 'bell-12',
    name: '清羽钟',
    position: 12,
    weight: 7.2,
    strikePosition: '正鼓',
    frequencies: createDefaultFrequencies(440.00, 437.20),
    note: 'A4',
  },
];

export const createMockScheme = (
  id: string,
  name: string,
  description: string,
  bells: Bell[],
  reviewStatus: 'pending' | 'approved' | 'rejected' = 'pending'
): BellScheme => ({
  id,
  name,
  description,
  bells: JSON.parse(JSON.stringify(bells)),
  createdAt: new Date(Date.now() - Math.random() * 86400000 * 7),
  updatedAt: new Date(Date.now() - Math.random() * 86400000),
  reviewStatus,
  reviewLogs: [],
  operationHistory: [],
  isActive: false,
});

export const mockSchemes: BellScheme[] = [
  createMockScheme('scheme-1', '标准音列方案', '基于十二平均律的标准音列方案', mockBells, 'approved'),
  createMockScheme('scheme-2', '曾侯乙复刻方案', '参考曾侯乙编钟的音列设计', 
    mockBells.map((b, i) => ({
      ...b,
      id: `bell-2-${i + 1}`,
      frequencies: {
        ...b.frequencies,
        '正鼓': {
          target: b.frequencies['正鼓'].target * (0.98 + i * 0.003),
          measured: b.frequencies['正鼓'].measured * (0.98 + i * 0.003),
        },
      },
    })),
    'pending'
  ),
  createMockScheme('scheme-3', '低音增强方案', '增强低音区共鸣的调整方案',
    mockBells.slice(0, 8).map((b, i) => ({
      ...b,
      id: `bell-3-${i + 1}`,
      weight: b.weight * 1.1,
      frequencies: {
        ...b.frequencies,
        '正鼓': {
          target: b.frequencies['正鼓'].target * 0.95,
          measured: b.frequencies['正鼓'].measured * 0.95,
        },
      },
    })),
    'pending'
  ),
];

export function createEmptyBell(position: number): Bell {
  return {
    id: `bell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: `新编钟 ${position}`,
    position,
    weight: 10,
    strikePosition: '正鼓' as StrikePosition,
    frequencies: {
      '正鼓': { target: 440, measured: 440 },
      '右鼓': { target: 440 * 1.125, measured: 440 * 1.125 },
      '左鼓': { target: 440 * 1.1, measured: 440 * 1.1 },
      '钲部': { target: 440 * 0.95, measured: 440 * 0.95 },
    },
    note: '',
  };
}
