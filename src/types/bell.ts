export type StrikePosition = '正鼓' | '右鼓' | '左鼓' | '钲部';

export interface Bell {
  id: string;
  name: string;
  position: number;
  targetFrequency: number;
  measuredFrequency: number;
  weight: number;
  strikePosition: StrikePosition;
}

export interface BellSetState {
  bells: Bell[];
  selectedBellId: string | null;
  confirmed: boolean;
  confirmedAt: Date | null;
  allowedDeviation: number;
}

export interface DeviationResult {
  cents: number;
  isOutOfRange: boolean;
  direction: 'sharp' | 'flat' | 'equal';
}

export const STRIKE_POSITIONS: StrikePosition[] = ['正鼓', '右鼓', '左鼓', '钲部'];
