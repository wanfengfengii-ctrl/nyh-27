import type {
  Bell,
  BellMaintenanceInfo,
  BellMaintenanceAssessment,
  MaintenanceRecord,
  WearLevel,
  RiskLevel,
  MaintenanceSuggestion,
} from '../types/bell';
import { getBellCents } from '../utils/cents';
import { generateId, addDays } from '../utils/common';

const WEAR_SCORES: Record<WearLevel, number> = {
  none: 0,
  mild: 20,
  moderate: 45,
  severe: 75,
  critical: 100,
};

const RISK_LEVEL_THRESHOLDS: { threshold: number; level: RiskLevel }[] = [
  { threshold: 25, level: 'low' },
  { threshold: 50, level: 'medium' },
  { threshold: 75, level: 'high' },
];

export function getWearScore(level: WearLevel): number {
  return WEAR_SCORES[level] ?? 0;
}

export function getRiskLevel(score: number): RiskLevel {
  for (const { threshold, level } of RISK_LEVEL_THRESHOLDS) {
    if (score < threshold) return level;
  }
  return 'critical';
}

export function reduceWearLevel(level: WearLevel): WearLevel {
  const levels: WearLevel[] = ['critical', 'severe', 'moderate', 'mild', 'none'];
  const currentIndex = levels.indexOf(level);
  if (currentIndex === -1 || currentIndex === levels.length - 1) return 'none';
  return levels[currentIndex + 1];
}

export function getMaxDeviationCents(bell: Bell): number {
  const positions: Array<keyof Bell['frequencies']> = ['正鼓', '右鼓', '左鼓', '钲部'];
  let maxCents = 0;
  for (const pos of positions) {
    const cents = Math.abs(getBellCents(bell, pos));
    if (cents > maxCents) maxCents = cents;
  }
  return maxCents;
}

export function calculateFrequencyDeviationScore(bell: Bell): number {
  const maxDeviationCents = getMaxDeviationCents(bell);
  return Math.min(100, (maxDeviationCents / 100) * 100);
}

export function calculateWeightChangeScore(
  bell: Bell,
  originalWeight: number
): number {
  if (originalWeight <= 0) return 0;
  const weightChangePercent = Math.abs((bell.weight - originalWeight) / originalWeight) * 100;
  return Math.min(100, weightChangePercent * 10);
}

export function calculateWearConditionScore(wearCondition: BellMaintenanceInfo['wearCondition']): number {
  const crackScore = getWearScore(wearCondition.crack);
  const rustScore = getWearScore(wearCondition.rust);
  const wearScore = getWearScore(wearCondition.wear);
  return crackScore * 0.5 + rustScore * 0.3 + wearScore * 0.2;
}

export function calculateMaintenanceHistoryScore(
  lastMaintenanceDate: Date | null,
  maintenanceCycleDays: number
): number {
  const daysSinceLastMaintenance = lastMaintenanceDate
    ? Math.floor((Date.now() - new Date(lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24))
    : maintenanceCycleDays * 2;
  const overdueRatio = daysSinceLastMaintenance / maintenanceCycleDays;
  return Math.min(100, overdueRatio * 50);
}

export function calculateInspectionBonus(records: MaintenanceRecord[], bellId: string): number {
  const recentInspections = records.filter(
    (r) =>
      r.bellId === bellId &&
      r.type === 'inspection' &&
      Date.now() - new Date(r.timestamp).getTime() < 90 * 24 * 60 * 60 * 1000
  ).length;
  return recentInspections > 0 ? -10 : 0;
}

export function calculateRiskScore(
  frequencyDeviationScore: number,
  weightChangeScore: number,
  wearConditionScore: number,
  maintenanceHistoryScore: number,
  inspectionBonus: number
): number {
  const rawScore =
    frequencyDeviationScore * 0.3 +
    weightChangeScore * 0.2 +
    wearConditionScore * 0.3 +
    maintenanceHistoryScore * 0.2 +
    inspectionBonus;
  return Math.max(0, Math.min(100, rawScore));
}

export function generateSuggestions(
  bell: Bell,
  info: BellMaintenanceInfo,
  frequencyDeviationScore: number,
  weightChangeScore: number,
  weightChangePercent: number,
  maintenanceHistoryScore: number,
  overdueRatio: number
): MaintenanceSuggestion[] {
  const suggestions: MaintenanceSuggestion[] = [];
  const crackScore = getWearScore(info.wearCondition.crack);
  const rustScore = getWearScore(info.wearCondition.rust);
  const wearScore = getWearScore(info.wearCondition.wear);
  const maxDeviationCents = getMaxDeviationCents(bell);

  if (crackScore >= 45) {
    suggestions.push({
      id: generateId('sug'),
      bellId: bell.id,
      type: crackScore >= 75 ? 'immediate' : 'short_term',
      title: '裂纹检查与修复',
      description: `编钟存在${info.wearCondition.crack === 'moderate' ? '中等' : info.wearCondition.crack === 'severe' ? '严重' : '危急'}程度的裂纹，需要专业人员进行检查和修复，防止裂纹扩大影响音质和结构安全。`,
      priority: 1,
      estimatedCost: crackScore >= 75 ? 5000 : 2000,
    });
  }

  if (rustScore >= 45) {
    suggestions.push({
      id: generateId('sug'),
      bellId: bell.id,
      type: rustScore >= 75 ? 'immediate' : 'short_term',
      title: '除锈与防锈处理',
      description: `编钟存在${info.wearCondition.rust === 'moderate' ? '中等' : info.wearCondition.rust === 'severe' ? '严重' : '危急'}程度的锈蚀，需要进行除锈处理并施加防锈保护层。`,
      priority: 2,
      estimatedCost: rustScore >= 75 ? 3000 : 1500,
    });
  }

  if (wearScore >= 45) {
    suggestions.push({
      id: generateId('sug'),
      bellId: bell.id,
      type: wearScore >= 75 ? 'short_term' : 'long_term',
      title: '磨损部位修复',
      description: `编钟存在${info.wearCondition.wear === 'moderate' ? '中等' : info.wearCondition.wear === 'severe' ? '严重' : '危急'}程度的磨损，特别是敲击部位，需要进行修复或更换相关部件。`,
      priority: 3,
      estimatedCost: wearScore >= 75 ? 4000 : 1800,
    });
  }

  if (frequencyDeviationScore >= 40) {
    suggestions.push({
      id: generateId('sug'),
      bellId: bell.id,
      type: frequencyDeviationScore >= 70 ? 'immediate' : 'short_term',
      title: '音高校准与调音',
      description: `当前频率偏差较大（最大偏差 ${maxDeviationCents.toFixed(1)} 音分），需要进行专业调音以确保音准。建议检查磨损情况并进行校音。`,
      priority: 2,
      estimatedCost: frequencyDeviationScore >= 70 ? 2500 : 1200,
    });
  }

  if (weightChangeScore >= 30) {
    suggestions.push({
      id: generateId('sug'),
      bellId: bell.id,
      type: 'short_term',
      title: '重量变化检查',
      description: `编钟重量变化率为 ${weightChangePercent.toFixed(2)}%，超出正常范围。请检查是否有严重锈蚀、部件脱落或其他损伤。`,
      priority: 3,
      estimatedCost: 800,
    });
  }

  if (maintenanceHistoryScore >= 50) {
    const daysSinceLastMaintenance = info.lastMaintenanceDate
      ? Math.floor((Date.now() - new Date(info.lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24))
      : info.maintenanceCycleDays * 2;
    suggestions.push({
      id: generateId('sug'),
      bellId: bell.id,
      type: overdueRatio > 2 ? 'immediate' : 'short_term',
      title: '定期保养',
      description: `已超过保养周期 ${daysSinceLastMaintenance - info.maintenanceCycleDays} 天，建议尽快安排定期保养，包括清洁、检查和润滑。`,
      priority: 4,
      estimatedCost: 500,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: generateId('sug'),
      bellId: bell.id,
      type: 'preventive',
      title: '保持常规维护',
      description: '编钟状态良好，请继续保持定期检查和保养，按照保养周期进行常规维护。',
      priority: 5,
    });
  }

  suggestions.sort((a, b) => a.priority - b.priority);
  return suggestions;
}

export function calculateNextMaintenanceDate(
  lastMaintenanceDate: Date | null,
  maintenanceCycleDays: number
): Date {
  const baseDate = lastMaintenanceDate ? new Date(lastMaintenanceDate) : new Date();
  return addDays(baseDate, maintenanceCycleDays);
}

export function calculateAssessment(
  bell: Bell,
  info: BellMaintenanceInfo,
  records: MaintenanceRecord[]
): BellMaintenanceAssessment {
  const frequencyDeviationScore = calculateFrequencyDeviationScore(bell);
  const weightChangePercent =
    info.originalWeight > 0
      ? Math.abs((bell.weight - info.originalWeight) / info.originalWeight) * 100
      : 0;
  const weightChangeScore = calculateWeightChangeScore(bell, info.originalWeight);
  const wearConditionScore = calculateWearConditionScore(info.wearCondition);
  const maintenanceHistoryScore = calculateMaintenanceHistoryScore(
    info.lastMaintenanceDate,
    info.maintenanceCycleDays
  );
  const inspectionBonus = calculateInspectionBonus(records, bell.id);

  const riskScore = calculateRiskScore(
    frequencyDeviationScore,
    weightChangeScore,
    wearConditionScore,
    maintenanceHistoryScore,
    inspectionBonus
  );
  const riskLevel = getRiskLevel(riskScore);

  const overdueRatio =
    maintenanceHistoryScore /
    50;
  const suggestions = generateSuggestions(
    bell,
    info,
    frequencyDeviationScore,
    weightChangeScore,
    weightChangePercent,
    maintenanceHistoryScore,
    overdueRatio
  );

  const nextMaintenanceDate = calculateNextMaintenanceDate(
    info.lastMaintenanceDate,
    info.maintenanceCycleDays
  );

  return {
    bellId: bell.id,
    riskLevel,
    riskScore: Math.round(riskScore),
    frequencyDeviationScore: Math.round(frequencyDeviationScore),
    weightChangeScore: Math.round(weightChangeScore),
    wearConditionScore: Math.round(wearConditionScore),
    maintenanceHistoryScore: Math.round(maintenanceHistoryScore),
    suggestions,
    nextMaintenanceDate,
  };
}

export function calculateOverallRiskLevel(
  assessments: Record<string, BellMaintenanceAssessment>
): RiskLevel {
  const scores = Object.values(assessments).map((a) => a.riskScore);
  if (scores.length === 0) return 'low';
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  return getRiskLevel(avgScore);
}

export function countHighRiskBells(
  assessments: Record<string, BellMaintenanceAssessment>
): number {
  return Object.values(assessments).filter(
    (a) => a.riskLevel === 'high' || a.riskLevel === 'critical'
  ).length;
}

export function applyWearImprovement(
  wearCondition: BellMaintenanceInfo['wearCondition'],
  title: string
): { wearCondition: BellMaintenanceInfo['wearCondition']; improved: boolean } {
  const newWearCondition = { ...wearCondition };
  let improved = false;

  if (title.includes('裂纹')) {
    newWearCondition.crack = reduceWearLevel(newWearCondition.crack);
    improved = true;
  }
  if (title.includes('除锈') || title.includes('锈蚀')) {
    newWearCondition.rust = reduceWearLevel(newWearCondition.rust);
    improved = true;
  }
  if (title.includes('磨损')) {
    newWearCondition.wear = reduceWearLevel(newWearCondition.wear);
    improved = true;
  }
  if (title.includes('清洁') || title.includes('保养') || title.includes('定期')) {
    if (newWearCondition.rust === 'mild') {
      newWearCondition.rust = 'none';
      improved = true;
    }
    if (newWearCondition.wear === 'mild') {
      newWearCondition.wear = 'none';
      improved = true;
    }
  }

  return { wearCondition: newWearCondition, improved };
}
