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

export type MaterialCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export const MATERIAL_CONDITIONS: { value: MaterialCondition; label: string; color: string }[] = [
  { value: 'excellent', label: '完好', color: 'green' },
  { value: 'good', label: '良好', color: 'teal' },
  { value: 'fair', label: '一般', color: 'yellow' },
  { value: 'poor', label: '较差', color: 'orange' },
  { value: 'critical', label: '危险', color: 'red' },
];

export type WearLevel = 'none' | 'mild' | 'moderate' | 'severe' | 'critical';

export const WEAR_LEVELS: { value: WearLevel; label: string; color: string }[] = [
  { value: 'none', label: '无', color: 'green' },
  { value: 'mild', label: '轻微', color: 'teal' },
  { value: 'moderate', label: '中等', color: 'yellow' },
  { value: 'severe', label: '严重', color: 'orange' },
  { value: 'critical', label: '危急', color: 'red' },
];

export interface WearCondition {
  crack: WearLevel;
  rust: WearLevel;
  wear: WearLevel;
  description?: string;
}

export interface EnvironmentData {
  temperature: number;
  humidity: number;
  timestamp: Date;
}

export interface InspectionMedia {
  id: string;
  bellId: string;
  type: 'image' | 'audio';
  name: string;
  url: string;
  timestamp: Date;
  description?: string;
}

export interface MaintenanceRecord {
  id: string;
  bellId: string;
  type: 'inspection' | 'cleaning' | 'repair' | 'lubrication' | 'tuning' | 'other';
  description: string;
  timestamp: Date;
  operator: string;
  notes?: string;
  mediaIds: string[];
}

export const MAINTENANCE_TYPES: { value: MaintenanceRecord['type']; label: string; color: string }[] = [
  { value: 'inspection', label: '检测', color: 'blue' },
  { value: 'cleaning', label: '清洁', color: 'green' },
  { value: 'repair', label: '修复', color: 'orange' },
  { value: 'lubrication', label: '润滑', color: 'yellow' },
  { value: 'tuning', label: '校音', color: 'purple' },
  { value: 'other', label: '其他', color: 'gray' },
];

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const RISK_LEVELS: { value: RiskLevel; label: string; color: string }[] = [
  { value: 'low', label: '低风险', color: 'green' },
  { value: 'medium', label: '中等风险', color: 'yellow' },
  { value: 'high', label: '高风险', color: 'orange' },
  { value: 'critical', label: '危急风险', color: 'red' },
];

export interface MaintenanceSuggestion {
  id: string;
  bellId: string;
  type: 'immediate' | 'short_term' | 'long_term' | 'preventive';
  title: string;
  description: string;
  priority: number;
  estimatedCost?: number;
  suggestedDate?: Date;
}

export interface BellMaintenanceInfo {
  bellId: string;
  materialCondition: MaterialCondition;
  wearCondition: WearCondition;
  lastMaintenanceDate: Date | null;
  maintenanceCycleDays: number;
  environment: EnvironmentData | null;
  responsiblePerson: string;
  originalWeight: number;
  lastInspectionDate: Date | null;
  remarks?: string;
}

export interface BellMaintenanceAssessment {
  bellId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  frequencyDeviationScore: number;
  weightChangeScore: number;
  wearConditionScore: number;
  maintenanceHistoryScore: number;
  suggestions: MaintenanceSuggestion[];
  nextMaintenanceDate: Date;
}

export interface MaintenanceTodoItem {
  id: string;
  bellId: string;
  bellName: string;
  bellPosition: number;
  type: MaintenanceRecord['type'];
  title: string;
  dueDate: Date;
  priority: 'high' | 'medium' | 'low';
  riskLevel: RiskLevel;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export interface MaintenanceState {
  maintenanceInfo: Record<string, BellMaintenanceInfo>;
  maintenanceRecords: MaintenanceRecord[];
  inspectionMedia: InspectionMedia[];
  assessments: Record<string, BellMaintenanceAssessment>;
  todoList: MaintenanceTodoItem[];
}
