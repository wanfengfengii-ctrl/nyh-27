export type StrikePosition = '正鼓' | '右鼓' | '左鼓' | '钲部';

export const STRIKE_POSITIONS: StrikePosition[] = ['正鼓', '右鼓', '左鼓', '钲部'];

export interface FrequencyData {
  target: number;
  measured: number;
}

export interface BellFrequencies {
  '正鼓': FrequencyData;
  '右鼓': FrequencyData;
  '左鼓': FrequencyData;
  '钲部': FrequencyData;
}

export interface Bell {
  id: string;
  name: string;
  position: number;
  weight: number;
  strikePosition: StrikePosition;
  frequencies: BellFrequencies;
  note?: string;
}

export type OperationType = 'add' | 'remove' | 'update' | 'reorder' | 'import' | 'batch_add';

export type OperationField =
  | 'name'
  | 'weight'
  | 'position'
  | 'targetFrequency'
  | 'measuredFrequency'
  | 'strikePosition'
  | 'note'
  | 'frequencies';

export interface OperationHistory {
  id: string;
  timestamp: Date;
  type: OperationType;
  bellId?: string;
  bellName?: string;
  field?: OperationField;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  description: string;
  operator?: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewLog {
  id: string;
  timestamp: Date;
  status: ReviewStatus;
  comment: string;
  reviewer: string;
  schemeId: string;
}

export interface BellScheme {
  id: string;
  name: string;
  description: string;
  bells: Bell[];
  createdAt: Date;
  updatedAt: Date;
  reviewStatus: ReviewStatus;
  reviewLogs: ReviewLog[];
  operationHistory: OperationHistory[];
  isActive: boolean;
}

export interface BellSetState {
  schemes: BellScheme[];
  activeSchemeId: string | null;
  selectedBellId: string | null;
  allowedDeviation: number;
  filterOutOfRange: boolean;
  sortBy: 'position' | 'deviation' | 'weight' | 'name';
  sortOrder: 'asc' | 'desc';
  currentStrikePosition: StrikePosition;
  compareSchemeIds: string[];
}

export interface DeviationResult {
  cents: number;
  isOutOfRange: boolean;
  direction: 'sharp' | 'flat' | 'equal';
}

export type ExportFormat = 'json' | 'csv';

export interface ImportResult {
  success: boolean;
  bells?: Bell[];
  error?: string;
}
