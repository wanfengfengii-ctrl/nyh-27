import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  Bell,
  StrikePosition,
  BellMaintenanceInfo,
  MaintenanceRecord,
  InspectionMedia,
  BellMaintenanceAssessment,
  MaintenanceSuggestion,
  MaintenanceTodoItem,
  RiskLevel,
  WearLevel,
  MaterialCondition,
  MaintenanceState,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderFilter,
  WorkOrderType,
  MaintenanceStatistics,
  RiskComparison,
} from '../types/bell';
import { getBellCents } from '../utils/cents';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const getWearScore = (level: WearLevel): number => {
  switch (level) {
    case 'none': return 0;
    case 'mild': return 20;
    case 'moderate': return 45;
    case 'severe': return 75;
    case 'critical': return 100;
  }
};

const getRiskLevel = (score: number): RiskLevel => {
  if (score < 25) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'critical';
};

const reduceWearLevel = (level: WearLevel): WearLevel => {
  switch (level) {
    case 'critical': return 'severe';
    case 'severe': return 'moderate';
    case 'moderate': return 'mild';
    case 'mild': return 'none';
    default: return 'none';
  }
};

const getMaxDeviationCents = (bell: Bell): number => {
  const positions: StrikePosition[] = ['正鼓', '右鼓', '左鼓', '钲部'];
  let maxCents = 0;
  for (const pos of positions) {
    const cents = Math.abs(getBellCents(bell, pos));
    if (cents > maxCents) maxCents = cents;
  }
  return maxCents;
};

function calculateAssessment(
  bell: Bell,
  info: BellMaintenanceInfo,
  records: MaintenanceRecord[]
): BellMaintenanceAssessment {
  const bellRecords = records.filter((r) => r.bellId === bell.id);

  const maxDeviationCents = getMaxDeviationCents(bell);
  const frequencyDeviationScore = Math.min(100, (maxDeviationCents / 100) * 100);

  const weightChangePercent = info.originalWeight > 0
    ? Math.abs((bell.weight - info.originalWeight) / info.originalWeight) * 100
    : 0;
  const weightChangeScore = Math.min(100, weightChangePercent * 10);

  const crackScore = getWearScore(info.wearCondition.crack);
  const rustScore = getWearScore(info.wearCondition.rust);
  const wearScore = getWearScore(info.wearCondition.wear);
  const wearConditionScore = (crackScore * 0.5 + rustScore * 0.3 + wearScore * 0.2);

  const daysSinceLastMaintenance = info.lastMaintenanceDate
    ? Math.floor((Date.now() - new Date(info.lastMaintenanceDate).getTime()) / (1000 * 60 * 60 * 24))
    : info.maintenanceCycleDays * 2;
  const overdueRatio = daysSinceLastMaintenance / info.maintenanceCycleDays;
  const maintenanceHistoryScore = Math.min(100, overdueRatio * 50);

  const recentInspections = bellRecords.filter(
    (r) => r.type === 'inspection' && Date.now() - new Date(r.timestamp).getTime() < 90 * 24 * 60 * 60 * 1000
  ).length;
  const inspectionBonus = recentInspections > 0 ? -10 : 0;

  const riskScore = Math.max(0, Math.min(100,
    frequencyDeviationScore * 0.3 +
    weightChangeScore * 0.2 +
    wearConditionScore * 0.3 +
    maintenanceHistoryScore * 0.2 +
    inspectionBonus
  ));

  const riskLevel = getRiskLevel(riskScore);

  const suggestions: MaintenanceSuggestion[] = [];

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

  const nextMaintenanceDate = new Date(
    (info.lastMaintenanceDate?.getTime() || Date.now()) + info.maintenanceCycleDays * 24 * 60 * 60 * 1000
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

function generateTodoList(
  bells: Bell[],
  assessments: Record<string, BellMaintenanceAssessment>,
  infoMap: Record<string, BellMaintenanceInfo>
): MaintenanceTodoItem[] {
  const todos: MaintenanceTodoItem[] = [];

  for (const bell of bells) {
    const assessment = assessments[bell.id];
    const info = infoMap[bell.id];
    if (!assessment || !info) continue;

    const priority =
      assessment.riskLevel === 'critical' ? 'high' :
      assessment.riskLevel === 'high' ? 'high' :
      assessment.riskLevel === 'medium' ? 'medium' : 'low';

    if (assessment.riskLevel === 'critical' || assessment.riskLevel === 'high') {
      const topSuggestion = assessment.suggestions[0];
      if (topSuggestion) {
        todos.push({
          id: generateId('todo'),
          bellId: bell.id,
          bellName: bell.name,
          bellPosition: bell.position,
          type: topSuggestion.type === 'immediate' ? 'repair' : 'inspection',
          title: topSuggestion.title,
          dueDate: new Date(Date.now() + (assessment.riskLevel === 'critical' ? 1 : 7) * 24 * 60 * 60 * 1000),
          priority,
          riskLevel: assessment.riskLevel,
          completed: false,
        });
      }
    }

    const daysUntilNextMaintenance = Math.floor(
      (assessment.nextMaintenanceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilNextMaintenance <= 7) {
      todos.push({
        id: generateId('todo'),
        bellId: bell.id,
        bellName: bell.name,
        bellPosition: bell.position,
        type: 'inspection',
        title: '定期保养检查',
        dueDate: assessment.nextMaintenanceDate,
        priority: daysUntilNextMaintenance <= 0 ? 'high' : 'medium',
        riskLevel: assessment.riskLevel,
        completed: false,
      });
    }
  }

  todos.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const prioDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (prioDiff !== 0) return prioDiff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return todos;
}

export function useMaintenance(bells: Bell[]) {
  const [state, setState] = useState<MaintenanceState>(() => {
    const maintenanceInfo: Record<string, BellMaintenanceInfo> = {};
    const maintenanceRecords: MaintenanceRecord[] = [];
    const inspectionMedia: InspectionMedia[] = [];

    bells.forEach((bell, index) => {
      const daysAgo = 30 + index * 15;
      const lastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const inspectionDate = new Date(Date.now() - Math.floor(daysAgo * 0.7) * 24 * 60 * 60 * 1000);

      const crackLevels: WearLevel[] = ['none', 'none', 'mild', 'none', 'mild', 'moderate', 'none', 'mild', 'none', 'none', 'severe', 'none'];
      const rustLevels: WearLevel[] = ['mild', 'none', 'mild', 'moderate', 'none', 'mild', 'none', 'none', 'severe', 'mild', 'moderate', 'none'];
      const wearLevels: WearLevel[] = ['mild', 'none', 'none', 'mild', 'moderate', 'mild', 'none', 'none', 'mild', 'none', 'moderate', 'mild'];
      const materialConditions: MaterialCondition[] = ['good', 'excellent', 'good', 'fair', 'good', 'fair', 'good', 'excellent', 'poor', 'good', 'fair', 'good'];

      maintenanceInfo[bell.id] = {
        bellId: bell.id,
        materialCondition: materialConditions[index % materialConditions.length],
        wearCondition: {
          crack: crackLevels[index % crackLevels.length],
          rust: rustLevels[index % rustLevels.length],
          wear: wearLevels[index % wearLevels.length],
          description: '',
        },
        lastMaintenanceDate: lastDate,
        maintenanceCycleDays: 90,
        environment: {
          temperature: 22 + Math.random() * 6,
          humidity: 45 + Math.random() * 20,
          timestamp: new Date(),
        },
        responsiblePerson: ['张师傅', '李工', '王师傅', '赵老师'][index % 4],
        originalWeight: bell.weight * (0.99 + Math.random() * 0.02),
        lastInspectionDate: inspectionDate,
        remarks: '',
      };

      maintenanceRecords.push({
        id: generateId('rec'),
        bellId: bell.id,
        type: 'inspection',
        description: '例行检查',
        timestamp: inspectionDate,
        operator: ['张师傅', '李工', '王师傅'][index % 3],
        notes: '状态正常',
        mediaIds: [],
      });

      if (index % 3 === 0) {
        maintenanceRecords.push({
          id: generateId('rec'),
          bellId: bell.id,
          type: 'cleaning',
          description: '清洁保养',
          timestamp: lastDate,
          operator: ['张师傅', '李工'][index % 2],
          notes: '完成表面清洁和防锈处理',
          mediaIds: [],
        });
      }
    });

    const assessments: Record<string, BellMaintenanceAssessment> = {};
    for (const bell of bells) {
      if (maintenanceInfo[bell.id]) {
        assessments[bell.id] = calculateAssessment(bell, maintenanceInfo[bell.id], maintenanceRecords);
      }
    }

    const todoList = generateTodoList(bells, assessments, maintenanceInfo);

    const workOrders: WorkOrder[] = [];
    const responsiblePersons = ['张师傅', '李工', '王师傅', '赵老师'];

    let workOrderIndex = 0;
    for (const bell of bells) {
      const assessment = assessments[bell.id];
      const info = maintenanceInfo[bell.id];
      if (!assessment || !info) continue;

      if (assessment.riskLevel === 'critical' || assessment.riskLevel === 'high') {
        const topSuggestion = assessment.suggestions[0];
        if (topSuggestion) {
          const statuses: WorkOrderStatus[] = ['pending_assign', 'in_progress', 'completed', 'reviewed'];
          const status = statuses[workOrderIndex % 4];
          const dueDate = new Date(Date.now() + (assessment.riskLevel === 'critical' ? 1 : 7) * 24 * 60 * 60 * 1000);
          const createdAt = new Date(Date.now() - (workOrderIndex * 2 + 1) * 24 * 60 * 60 * 1000);

          const workOrder: WorkOrder = {
            id: generateId('wo'),
            bellId: bell.id,
            bellName: bell.name,
            bellPosition: bell.position,
            title: topSuggestion.title,
            description: topSuggestion.description,
            type: topSuggestion.type === 'immediate' ? 'repair' : 'inspection',
            status,
            priority: assessment.riskLevel === 'critical' ? 'high' : 'high',
            riskLevel: assessment.riskLevel,
            assignee: status === 'pending_assign' ? '' : responsiblePersons[workOrderIndex % responsiblePersons.length],
            assignor: '系统管理员',
            dueDate,
            createdAt,
            updatedAt: createdAt,
            assignedAt: status !== 'pending_assign' ? new Date(createdAt.getTime() + 1 * 60 * 60 * 1000) : undefined,
            startedAt: status === 'in_progress' || status === 'completed' || status === 'reviewed'
              ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
              : undefined,
            completedAt: status === 'completed' || status === 'reviewed'
              ? new Date(createdAt.getTime() + (workOrderIndex % 3 + 1) * 24 * 60 * 60 * 1000)
              : undefined,
            reviewedAt: status === 'reviewed'
              ? new Date(createdAt.getTime() + (workOrderIndex % 3 + 2) * 24 * 60 * 60 * 1000)
              : undefined,
            completedBy: status === 'completed' || status === 'reviewed'
              ? responsiblePersons[workOrderIndex % responsiblePersons.length]
              : undefined,
            reviewedBy: status === 'reviewed'
              ? responsiblePersons[(workOrderIndex + 1) % responsiblePersons.length]
              : undefined,
            mediaIds: [],
            preMaintenanceRiskScore: status === 'completed' || status === 'reviewed'
              ? assessment.riskScore
              : assessment.riskScore,
            postMaintenanceRiskScore: status === 'completed' || status === 'reviewed'
              ? Math.max(5, assessment.riskScore - 20 - workOrderIndex * 3)
              : undefined,
            effectEvaluation: status === 'completed' || status === 'reviewed'
              ? '维护效果良好，风险等级下降'
              : undefined,
            reviewComment: status === 'reviewed'
              ? '复核通过，维护质量达标'
              : undefined,
            sourceType: 'risk_auto',
            suggestionId: topSuggestion.id,
          };

          workOrders.push(workOrder);
          workOrderIndex++;
        }
      }
    }

    return {
      maintenanceInfo,
      maintenanceRecords,
      inspectionMedia,
      assessments,
      todoList,
      workOrders,
    };
  });

  useEffect(() => {
    setState((prev) => {
      const newInfo = { ...prev.maintenanceInfo };
      const newAssessments = { ...prev.assessments };
      let changed = false;

      for (const bell of bells) {
        if (!newInfo[bell.id]) {
          newInfo[bell.id] = {
            bellId: bell.id,
            materialCondition: 'good',
            wearCondition: { crack: 'none', rust: 'none', wear: 'none' },
            lastMaintenanceDate: null,
            maintenanceCycleDays: 90,
            environment: null,
            responsiblePerson: '',
            originalWeight: bell.weight,
            lastInspectionDate: null,
          };
          changed = true;
        }
        newAssessments[bell.id] = calculateAssessment(bell, newInfo[bell.id], prev.maintenanceRecords);
        changed = true;
      }

      const newTodoList = generateTodoList(bells, newAssessments, newInfo);

      let newWorkOrders = prev.workOrders;
      if (prev.workOrders.length === 0 && bells.length > 0) {
        const workOrders: WorkOrder[] = [];
        const responsiblePersons = ['张师傅', '李工', '王师傅', '赵老师'];
        const workOrderTypes: WorkOrderType[] = ['inspection', 'cleaning', 'repair', 'lubrication', 'tuning', 'other'];
        const statuses: WorkOrderStatus[] = ['pending_assign', 'in_progress', 'completed', 'reviewed'];
        const priorities: ('high' | 'medium' | 'low')[] = ['low', 'medium', 'high', 'high'];

        for (let i = 0; i < Math.min(bells.length, 8); i++) {
          const bell = bells[i];
          const assessment = newAssessments[bell.id];
          const status = statuses[i % 4];
          const type = workOrderTypes[i % workOrderTypes.length];
          const priority = priorities[i % priorities.length];
          const dueDate = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000);
          const createdAt = new Date(Date.now() - (i * 2 + 1) * 24 * 60 * 60 * 1000);

          const titles: Record<WorkOrderType, string> = {
            inspection: '定期检查与状态评估',
            cleaning: '清洁保养',
            repair: '修复受损部位',
            lubrication: '润滑保养',
            tuning: '音高校准调音',
            other: '其他维护工作',
          };

          const descriptions: Record<WorkOrderType, string> = {
            inspection: '对编钟进行全面检查，包括外观、结构、音质等方面的评估，记录当前状态并生成检查报告。',
            cleaning: '对编钟进行专业清洁，去除灰尘、污渍和轻度氧化层，保持编钟外观整洁。',
            repair: '修复编钟的受损部位，包括裂纹修复、变形校正、部件更换等工作，确保编钟结构安全。',
            lubrication: '对编钟悬挂和连接部位进行润滑保养，减少摩擦和磨损，延长使用寿命。',
            tuning: '对编钟进行专业调音，校正音高偏差，确保音准符合演奏要求。',
            other: '其他类型的维护工作，根据实际情况进行处理。',
          };

          const workOrder: WorkOrder = {
            id: generateId('wo'),
            bellId: bell.id,
            bellName: bell.name,
            bellPosition: bell.position,
            title: titles[type],
            description: descriptions[type],
            type,
            status,
            priority,
            riskLevel: assessment?.riskLevel || 'medium',
            assignee: status === 'pending_assign' ? '' : responsiblePersons[i % responsiblePersons.length],
            assignor: '系统管理员',
            dueDate,
            createdAt,
            updatedAt: createdAt,
            assignedAt: status !== 'pending_assign' ? new Date(createdAt.getTime() + 1 * 60 * 60 * 1000) : undefined,
            startedAt: status === 'in_progress' || status === 'completed' || status === 'reviewed'
              ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
              : undefined,
            completedAt: status === 'completed' || status === 'reviewed'
              ? new Date(createdAt.getTime() + (i % 3 + 1) * 24 * 60 * 60 * 1000)
              : undefined,
            reviewedAt: status === 'reviewed'
              ? new Date(createdAt.getTime() + (i % 3 + 2) * 24 * 60 * 60 * 1000)
              : undefined,
            completedBy: status === 'completed' || status === 'reviewed'
              ? responsiblePersons[i % responsiblePersons.length]
              : undefined,
            reviewedBy: status === 'reviewed'
              ? responsiblePersons[(i + 1) % responsiblePersons.length]
              : undefined,
            mediaIds: [],
            preMaintenanceRiskScore: assessment?.riskScore || 50,
            postMaintenanceRiskScore: status === 'completed' || status === 'reviewed'
              ? Math.max(5, (assessment?.riskScore || 50) - 20 - i * 3)
              : undefined,
            effectEvaluation: status === 'completed' || status === 'reviewed'
              ? '维护效果良好，风险等级下降，编钟状态明显改善'
              : undefined,
            reviewComment: status === 'reviewed'
              ? '复核通过，维护质量达标，符合验收标准'
              : undefined,
            sourceType: i < 3 ? 'risk_auto' : 'manual',
            suggestionId: undefined,
          };

          workOrders.push(workOrder);
        }
        newWorkOrders = workOrders;
        changed = true;
      }

      if (!changed) return prev;
      return {
        ...prev,
        maintenanceInfo: newInfo,
        assessments: newAssessments,
        todoList: newTodoList,
        workOrders: newWorkOrders,
      };
    });
  }, [bells]);

  const updateMaintenanceInfo = useCallback((bellId: string, updates: Partial<BellMaintenanceInfo>) => {
    setState((prev) => {
      const info = prev.maintenanceInfo[bellId];
      if (!info) return prev;

      const newInfo = { ...info, ...updates };
      const newInfoMap = { ...prev.maintenanceInfo, [bellId]: newInfo };

      const bell = bells.find((b) => b.id === bellId);
      if (!bell) return { ...prev, maintenanceInfo: newInfoMap };

      const newAssessment = calculateAssessment(bell, newInfo, prev.maintenanceRecords);
      const newAssessments = { ...prev.assessments, [bellId]: newAssessment };
      const newTodoList = generateTodoList(bells, newAssessments, newInfoMap);

      return {
        ...prev,
        maintenanceInfo: newInfoMap,
        assessments: newAssessments,
        todoList: newTodoList,
      };
    });
  }, [bells]);

  const addMaintenanceRecord = useCallback((bellId: string, record: Omit<MaintenanceRecord, 'id' | 'bellId'>) => {
    setState((prev) => {
      const newRecord: MaintenanceRecord = {
        ...record,
        id: generateId('rec'),
        bellId,
      };

      const newRecords = [newRecord, ...prev.maintenanceRecords];

      const info = prev.maintenanceInfo[bellId];
      if (!info) return { ...prev, maintenanceRecords: newRecords };

      let updatedInfo = info;
      if (record.type === 'inspection') {
        updatedInfo = { ...info, lastInspectionDate: new Date() };
      }
      if (['cleaning', 'repair', 'lubrication', 'tuning'].includes(record.type)) {
        updatedInfo = { ...updatedInfo, lastMaintenanceDate: new Date() };
      }

      const newInfoMap = { ...prev.maintenanceInfo, [bellId]: updatedInfo };

      const bell = bells.find((b) => b.id === bellId);
      if (!bell) return { ...prev, maintenanceRecords: newRecords, maintenanceInfo: newInfoMap };

      const newAssessment = calculateAssessment(bell, updatedInfo, newRecords);
      const newAssessments = { ...prev.assessments, [bellId]: newAssessment };
      const newTodoList = generateTodoList(bells, newAssessments, newInfoMap);

      return {
        ...prev,
        maintenanceRecords: newRecords,
        maintenanceInfo: newInfoMap,
        assessments: newAssessments,
        todoList: newTodoList,
      };
    });
  }, [bells]);

  const addInspectionMedia = useCallback((bellId: string, media: Omit<InspectionMedia, 'id' | 'timestamp' | 'bellId'>) => {
    setState((prev) => {
      const newMedia: InspectionMedia = {
        ...media,
        bellId,
        id: generateId('media'),
        timestamp: new Date(),
      };

      return {
        ...prev,
        inspectionMedia: [newMedia, ...prev.inspectionMedia],
      };
    });
  }, []);

  const removeInspectionMedia = useCallback((mediaId: string) => {
    setState((prev) => ({
      ...prev,
      inspectionMedia: prev.inspectionMedia.filter((m) => m.id !== mediaId),
    }));
  }, []);

  const completeTodoItem = useCallback((todoId: string, completedBy: string = '当前用户') => {
    setState((prev) => {
      const todo = prev.todoList.find((t) => t.id === todoId);
      if (!todo || todo.completed) return prev;

      const newTodoList = prev.todoList.map((t) =>
        t.id === todoId
          ? { ...t, completed: true, completedAt: new Date(), completedBy }
          : t
      );

      const newRecord: MaintenanceRecord = {
        id: generateId('rec'),
        bellId: todo.bellId,
        type: todo.type,
        description: `完成待办: ${todo.title}`,
        timestamp: new Date(),
        operator: completedBy,
        notes: `来自维护待办清单，优先级: ${todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}`,
        mediaIds: [],
      };

      const newRecords = [newRecord, ...prev.maintenanceRecords];

      const info = prev.maintenanceInfo[todo.bellId];
      if (!info) {
        return { ...prev, todoList: newTodoList, maintenanceRecords: newRecords };
      }

      let updatedInfo = info;
      if (todo.type === 'inspection') {
        updatedInfo = { ...info, lastInspectionDate: new Date() };
      }
      if (['cleaning', 'repair', 'lubrication', 'tuning'].includes(todo.type)) {
        updatedInfo = { ...updatedInfo, lastMaintenanceDate: new Date() };
      }

      const title = todo.title;
      const newWearCondition = { ...updatedInfo.wearCondition };
      let wearImproved = false;

      if (title.includes('裂纹')) {
        newWearCondition.crack = reduceWearLevel(newWearCondition.crack);
        wearImproved = true;
      }
      if (title.includes('除锈') || title.includes('锈蚀')) {
        newWearCondition.rust = reduceWearLevel(newWearCondition.rust);
        wearImproved = true;
      }
      if (title.includes('磨损')) {
        newWearCondition.wear = reduceWearLevel(newWearCondition.wear);
        wearImproved = true;
      }
      if (title.includes('清洁') || title.includes('保养') || title.includes('定期')) {
        if (newWearCondition.rust === 'mild') {
          newWearCondition.rust = 'none';
          wearImproved = true;
        }
        if (newWearCondition.wear === 'mild') {
          newWearCondition.wear = 'none';
          wearImproved = true;
        }
      }

      if (wearImproved) {
        updatedInfo = { ...updatedInfo, wearCondition: newWearCondition };
      }

      const newInfoMap = { ...prev.maintenanceInfo, [todo.bellId]: updatedInfo };

      const bell = bells.find((b) => b.id === todo.bellId);
      if (!bell) {
        return {
          ...prev,
          todoList: newTodoList,
          maintenanceRecords: newRecords,
          maintenanceInfo: newInfoMap,
        };
      }

      const newAssessment = calculateAssessment(bell, updatedInfo, newRecords);
      const newAssessments = { ...prev.assessments, [todo.bellId]: newAssessment };
      const generatedTodoList = generateTodoList(bells, newAssessments, newInfoMap);

      const mergedTodoList = [
        ...generatedTodoList,
        ...newTodoList.filter((t) => t.completed),
      ].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
        const prioDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (prioDiff !== 0) return prioDiff;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      return {
        ...prev,
        todoList: mergedTodoList,
        maintenanceRecords: newRecords,
        maintenanceInfo: newInfoMap,
        assessments: newAssessments,
      };
    });
  }, [bells]);

  const createWorkOrder = useCallback((params: {
    bellId: string;
    title: string;
    description: string;
    type: WorkOrderType;
    priority: 'high' | 'medium' | 'low';
    dueDate: Date;
    assignee?: string;
    sourceType: WorkOrder['sourceType'];
    suggestionId?: string;
  }) => {
    setState((prev) => {
      const bell = bells.find((b) => b.id === params.bellId);
      if (!bell) return prev;

      const assessment = prev.assessments[params.bellId];
      const info = prev.maintenanceInfo[params.bellId];

      const newWorkOrder: WorkOrder = {
        id: generateId('wo'),
        bellId: params.bellId,
        bellName: bell.name,
        bellPosition: bell.position,
        title: params.title,
        description: params.description,
        type: params.type,
        status: params.assignee ? 'in_progress' : 'pending_assign',
        priority: params.priority,
        riskLevel: assessment?.riskLevel || 'medium',
        assignee: params.assignee || '',
        assignor: '系统管理员',
        dueDate: params.dueDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedAt: params.assignee ? new Date() : undefined,
        startedAt: undefined,
        completedAt: undefined,
        reviewedAt: undefined,
        completedBy: undefined,
        reviewedBy: undefined,
        mediaIds: [],
        preMaintenanceRiskScore: assessment?.riskScore,
        postMaintenanceRiskScore: undefined,
        effectEvaluation: undefined,
        reviewComment: undefined,
        sourceType: params.sourceType,
        suggestionId: params.suggestionId,
      };

      return {
        ...prev,
        workOrders: [newWorkOrder, ...prev.workOrders],
      };
    });
  }, [bells]);

  const assignWorkOrder = useCallback((workOrderId: string, assignee: string, assignor: string = '系统管理员') => {
    setState((prev) => {
      const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
      if (!workOrder || workOrder.status !== 'pending_assign') return prev;

      const updatedWorkOrders = prev.workOrders.map((w) =>
        w.id === workOrderId
          ? {
              ...w,
              status: 'in_progress' as WorkOrderStatus,
              assignee,
              assignor,
              assignedAt: new Date(),
              startedAt: new Date(),
              updatedAt: new Date(),
            }
          : w
      );

      return {
        ...prev,
        workOrders: updatedWorkOrders,
      };
    });
  }, []);

  const startWorkOrder = useCallback((workOrderId: string) => {
    setState((prev) => {
      const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
      if (!workOrder || (workOrder.status !== 'pending_assign' && workOrder.status !== 'in_progress')) return prev;

      const updatedWorkOrders = prev.workOrders.map((w) =>
        w.id === workOrderId
          ? {
              ...w,
              status: 'in_progress' as WorkOrderStatus,
              startedAt: w.startedAt || new Date(),
              updatedAt: new Date(),
            }
          : w
      );

      return {
        ...prev,
        workOrders: updatedWorkOrders,
      };
    });
  }, []);

  const completeWorkOrder = useCallback((workOrderId: string, completedBy: string, effectEvaluation?: string, mediaIds?: string[]) => {
    setState((prev) => {
      const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
      if (!workOrder || workOrder.status !== 'in_progress') return prev;

      const assessment = prev.assessments[workOrder.bellId];
      const info = prev.maintenanceInfo[workOrder.bellId];

      const newRecord: MaintenanceRecord = {
        id: generateId('rec'),
        bellId: workOrder.bellId,
        type: workOrder.type,
        description: `工单完成: ${workOrder.title}`,
        timestamp: new Date(),
        operator: completedBy,
        notes: effectEvaluation,
        mediaIds: mediaIds || [],
      };

      const newRecords = [newRecord, ...prev.maintenanceRecords];

      let updatedInfo = info;
      if (info) {
        if (workOrder.type === 'inspection') {
          updatedInfo = { ...info, lastInspectionDate: new Date() };
        }
        if (['cleaning', 'repair', 'lubrication', 'tuning'].includes(workOrder.type)) {
          updatedInfo = { ...updatedInfo, lastMaintenanceDate: new Date() };
        }

        const title = workOrder.title;
        const newWearCondition = { ...updatedInfo.wearCondition };
        let wearImproved = false;

        if (title.includes('裂纹')) {
          newWearCondition.crack = reduceWearLevel(newWearCondition.crack);
          wearImproved = true;
        }
        if (title.includes('除锈') || title.includes('锈蚀')) {
          newWearCondition.rust = reduceWearLevel(newWearCondition.rust);
          wearImproved = true;
        }
        if (title.includes('磨损')) {
          newWearCondition.wear = reduceWearLevel(newWearCondition.wear);
          wearImproved = true;
        }
        if (title.includes('清洁') || title.includes('保养') || title.includes('定期')) {
          if (newWearCondition.rust === 'mild') {
            newWearCondition.rust = 'none';
            wearImproved = true;
          }
          if (newWearCondition.wear === 'mild') {
            newWearCondition.wear = 'none';
            wearImproved = true;
          }
        }

        if (wearImproved) {
          updatedInfo = { ...updatedInfo, wearCondition: newWearCondition };
        }
      }

      const newInfoMap = info ? { ...prev.maintenanceInfo, [workOrder.bellId]: updatedInfo } : prev.maintenanceInfo;

      const bell = bells.find((b) => b.id === workOrder.bellId);
      let newAssessments = prev.assessments;
      if (bell && updatedInfo) {
        const newAssessment = calculateAssessment(bell, updatedInfo, newRecords);
        newAssessments = { ...prev.assessments, [workOrder.bellId]: newAssessment };
      }

      const postRiskScore = newAssessments[workOrder.bellId]?.riskScore;

      const updatedWorkOrders = prev.workOrders.map((w) =>
        w.id === workOrderId
          ? {
              ...w,
              status: 'completed' as WorkOrderStatus,
              completedAt: new Date(),
              completedBy,
              maintenanceRecordId: newRecord.id,
              mediaIds: mediaIds || w.mediaIds,
              postMaintenanceRiskScore: postRiskScore,
              effectEvaluation: effectEvaluation || w.effectEvaluation,
              updatedAt: new Date(),
            }
          : w
      );

      const newTodoList = generateTodoList(bells, newAssessments, newInfoMap);

      return {
        ...prev,
        workOrders: updatedWorkOrders,
        maintenanceRecords: newRecords,
        maintenanceInfo: newInfoMap,
        assessments: newAssessments,
        todoList: newTodoList,
      };
    });
  }, [bells]);

  const reviewWorkOrder = useCallback((workOrderId: string, reviewedBy: string, reviewComment: string, passed: boolean) => {
    setState((prev) => {
      const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
      if (!workOrder || workOrder.status !== 'completed') return prev;

      if (!passed) {
        const updatedWorkOrders = prev.workOrders.map((w) =>
          w.id === workOrderId
            ? {
                ...w,
                status: 'in_progress' as WorkOrderStatus,
                reviewComment,
                reviewedBy,
                updatedAt: new Date(),
              }
            : w
        );
        return { ...prev, workOrders: updatedWorkOrders };
      }

      const updatedWorkOrders = prev.workOrders.map((w) =>
        w.id === workOrderId
          ? {
              ...w,
              status: 'reviewed' as WorkOrderStatus,
              reviewedAt: new Date(),
              reviewedBy,
              reviewComment,
              updatedAt: new Date(),
            }
          : w
      );

      return {
        ...prev,
        workOrders: updatedWorkOrders,
      };
    });
  }, []);

  const createWorkOrderFromRisk = useCallback((bellId: string) => {
    setState((prev) => {
      const bell = bells.find((b) => b.id === bellId);
      const assessment = prev.assessments[bellId];
      const info = prev.maintenanceInfo[bellId];

      if (!bell || !assessment) return prev;

      const existingOrder = prev.workOrders.find(
        (w) => w.bellId === bellId && (w.status === 'pending_assign' || w.status === 'in_progress')
      );
      if (existingOrder) return prev;

      const topSuggestion = assessment.suggestions[0];
      if (!topSuggestion) return prev;

      const priority = assessment.riskLevel === 'critical' || assessment.riskLevel === 'high' ? 'high' : 'medium';
      const dueDays = assessment.riskLevel === 'critical' ? 1 : assessment.riskLevel === 'high' ? 3 : 7;
      const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

      const newWorkOrder: WorkOrder = {
        id: generateId('wo'),
        bellId,
        bellName: bell.name,
        bellPosition: bell.position,
        title: topSuggestion.title,
        description: topSuggestion.description,
        type: topSuggestion.type === 'immediate' ? 'repair' : 'inspection',
        status: 'pending_assign',
        priority,
        riskLevel: assessment.riskLevel,
        assignee: '',
        assignor: '系统管理员',
        dueDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        mediaIds: [],
        preMaintenanceRiskScore: assessment.riskScore,
        sourceType: 'risk_auto',
        suggestionId: topSuggestion.id,
      };

      return {
        ...prev,
        workOrders: [newWorkOrder, ...prev.workOrders],
      };
    });
  }, [bells]);

  const batchCreateWorkOrdersFromHighRisk = useCallback(() => {
    setState((prev) => {
      const highRiskBells = Object.entries(prev.assessments)
        .filter(([, assessment]) => assessment.riskLevel === 'high' || assessment.riskLevel === 'critical')
        .map(([bellId, assessment]) => ({ bellId, assessment }));

      const newWorkOrders: WorkOrder[] = [];

      for (const { bellId, assessment } of highRiskBells) {
        const bell = bells.find((b) => b.id === bellId);
        if (!bell) continue;

        const existingOrder = prev.workOrders.find(
          (w) => w.bellId === bellId && (w.status === 'pending_assign' || w.status === 'in_progress')
        );
        if (existingOrder) continue;

        const topSuggestion = assessment.suggestions[0];
        if (!topSuggestion) continue;

        const priority = assessment.riskLevel === 'critical' ? 'high' : 'high';
        const dueDays = assessment.riskLevel === 'critical' ? 1 : 3;
        const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

        newWorkOrders.push({
          id: generateId('wo'),
          bellId,
          bellName: bell.name,
          bellPosition: bell.position,
          title: topSuggestion.title,
          description: topSuggestion.description,
          type: topSuggestion.type === 'immediate' ? 'repair' : 'inspection',
          status: 'pending_assign',
          priority,
          riskLevel: assessment.riskLevel,
          assignee: '',
          assignor: '系统管理员',
          dueDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          mediaIds: [],
          preMaintenanceRiskScore: assessment.riskScore,
          sourceType: 'risk_auto',
          suggestionId: topSuggestion.id,
        });
      }

      return {
        ...prev,
        workOrders: [...newWorkOrders, ...prev.workOrders],
      };
    });
  }, [bells]);

  const filterWorkOrders = useCallback((filter: WorkOrderFilter): WorkOrder[] => {
    return state.workOrders.filter((wo) => {
      if (filter.status && filter.status.length > 0 && !filter.status.includes(wo.status)) return false;
      if (filter.assignee && wo.assignee !== filter.assignee) return false;
      if (filter.riskLevel && filter.riskLevel.length > 0 && !filter.riskLevel.includes(wo.riskLevel)) return false;
      if (filter.priority && filter.priority.length > 0 && !filter.priority.includes(wo.priority)) return false;
      if (filter.type && filter.type.length > 0 && !filter.type.includes(wo.type)) return false;
      if (filter.dueDateFrom && new Date(wo.dueDate) < new Date(filter.dueDateFrom)) return false;
      if (filter.dueDateTo && new Date(wo.dueDate) > new Date(filter.dueDateTo)) return false;
      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase();
        if (
          !wo.title.toLowerCase().includes(keyword) &&
          !wo.bellName.toLowerCase().includes(keyword) &&
          !wo.description.toLowerCase().includes(keyword)
        ) return false;
      }
      return true;
    });
  }, [state.workOrders]);

  const getWorkOrdersByBell = useCallback((bellId: string): WorkOrder[] => {
    return state.workOrders.filter((w) => w.bellId === bellId);
  }, [state.workOrders]);

  const getWorkOrderById = useCallback((workOrderId: string): WorkOrder | null => {
    return state.workOrders.find((w) => w.id === workOrderId) || null;
  }, [state.workOrders]);

  const addMediaToWorkOrder = useCallback((workOrderId: string, mediaId: string) => {
    setState((prev) => ({
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === workOrderId && !w.mediaIds.includes(mediaId)
          ? { ...w, mediaIds: [...w.mediaIds, mediaId], updatedAt: new Date() }
          : w
      ),
    }));
  }, []);

  const getRiskComparisons = useCallback((): RiskComparison[] => {
    const completedOrders = state.workOrders.filter(
      (w) => (w.status === 'completed' || w.status === 'reviewed') &&
        w.preMaintenanceRiskScore !== undefined &&
        w.postMaintenanceRiskScore !== undefined
    );

    return completedOrders.map((wo) => {
      const preLevel = getRiskLevel(wo.preMaintenanceRiskScore!);
      const postLevel = getRiskLevel(wo.postMaintenanceRiskScore!);
      const scoreChange = wo.postMaintenanceRiskScore! - wo.preMaintenanceRiskScore!;
      const levelOrder = ['low', 'medium', 'high', 'critical'];
      const levelImproved = levelOrder.indexOf(postLevel) < levelOrder.indexOf(preLevel);

      return {
        bellId: wo.bellId,
        bellName: wo.bellName,
        preRiskScore: wo.preMaintenanceRiskScore!,
        preRiskLevel: preLevel,
        postRiskScore: wo.postMaintenanceRiskScore!,
        postRiskLevel: postLevel,
        scoreChange,
        levelImproved,
        workOrderId: wo.id,
        workOrderTitle: wo.title,
        completedDate: wo.completedAt || new Date(),
      };
    }).sort((a, b) => b.completedDate.getTime() - a.completedDate.getTime());
  }, [state.workOrders]);

  const getStatistics = useCallback((): MaintenanceStatistics => {
    const workOrders = state.workOrders;
    const now = Date.now();

    const overdueCount = workOrders.filter(
      (w) => (w.status === 'pending_assign' || w.status === 'in_progress') &&
        new Date(w.dueDate).getTime() < now
    ).length;

    const completedOrders = workOrders.filter((w) => w.completedAt && w.startedAt);
    const avgCompletionDays = completedOrders.length > 0
      ? completedOrders.reduce((sum, w) => {
          const days = (new Date(w.completedAt!).getTime() - new Date(w.startedAt!).getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / completedOrders.length
      : 0;

    const workOrdersByType: Record<WorkOrderType, number> = {
      inspection: 0,
      cleaning: 0,
      repair: 0,
      lubrication: 0,
      tuning: 0,
      other: 0,
    };
    workOrders.forEach((w) => {
      workOrdersByType[w.type] = (workOrdersByType[w.type] || 0) + 1;
    });

    const workOrdersByAssignee: Record<string, number> = {};
    workOrders.forEach((w) => {
      if (w.assignee) {
        workOrdersByAssignee[w.assignee] = (workOrdersByAssignee[w.assignee] || 0) + 1;
      }
    });

    const workOrdersByRiskLevel: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    workOrders.forEach((w) => {
      workOrdersByRiskLevel[w.riskLevel] = (workOrdersByRiskLevel[w.riskLevel] || 0) + 1;
    });

    const monthlyTrend: { month: string; completed: number; created: number }[] = [];
    const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const currentMonth = new Date().getMonth();

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const year = new Date().getFullYear() - (currentMonth - i < 0 ? 1 : 0);
      const monthStart = new Date(year, monthIndex, 1).getTime();
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59).getTime();

      const created = workOrders.filter(
        (w) => new Date(w.createdAt).getTime() >= monthStart && new Date(w.createdAt).getTime() <= monthEnd
      ).length;

      const completed = workOrders.filter(
        (w) => w.completedAt && new Date(w.completedAt).getTime() >= monthStart && new Date(w.completedAt).getTime() <= monthEnd
      ).length;

      monthlyTrend.push({ month: monthLabels[monthIndex], completed, created });
    }

    const reviewedOrders = workOrders.filter(
      (w) => w.status === 'reviewed' && w.postMaintenanceRiskScore !== undefined && w.preMaintenanceRiskScore !== undefined
    );
    const effectEvaluationAvg = reviewedOrders.length > 0
      ? reviewedOrders.reduce((sum, w) => {
          const improvement = w.preMaintenanceRiskScore! - w.postMaintenanceRiskScore!;
          return sum + improvement;
        }, 0) / reviewedOrders.length
      : 0;

    const highRiskBells = Object.values(state.assessments).filter((a) => a.riskLevel === 'high').length;
    const criticalRiskBells = Object.values(state.assessments).filter((a) => a.riskLevel === 'critical').length;
    const allScores = Object.values(state.assessments).map((a) => a.riskScore);
    const overallRiskScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

    return {
      totalWorkOrders: workOrders.length,
      pendingAssignCount: workOrders.filter((w) => w.status === 'pending_assign').length,
      inProgressCount: workOrders.filter((w) => w.status === 'in_progress').length,
      completedCount: workOrders.filter((w) => w.status === 'completed').length,
      reviewedCount: workOrders.filter((w) => w.status === 'reviewed').length,
      overdueCount,
      avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
      totalMaintenanceRecords: state.maintenanceRecords.length,
      highRiskBells,
      criticalRiskBells,
      overallRiskScore,
      workOrdersByType,
      workOrdersByAssignee,
      workOrdersByRiskLevel,
      monthlyTrend,
      effectEvaluationAvg: Math.round(effectEvaluationAvg * 10) / 10,
    };
  }, [state.workOrders, state.maintenanceRecords, state.assessments]);

  const getBellRecords = useCallback((bellId: string): MaintenanceRecord[] => {
    return state.maintenanceRecords.filter((r) => r.bellId === bellId);
  }, [state.maintenanceRecords]);

  const getBellMedia = useCallback((bellId: string): InspectionMedia[] => {
    return state.inspectionMedia.filter((m) => m.bellId === bellId);
  }, [state.inspectionMedia]);

  const getAssessment = useCallback((bellId: string): BellMaintenanceAssessment | null => {
    return state.assessments[bellId] || null;
  }, [state.assessments]);

  const getMaintenanceInfo = useCallback((bellId: string): BellMaintenanceInfo | null => {
    return state.maintenanceInfo[bellId] || null;
  }, [state.maintenanceInfo]);

  const overallRiskLevel = useMemo(() => {
    const scores = Object.values(state.assessments).map((a) => a.riskScore);
    if (scores.length === 0) return 'low' as RiskLevel;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return getRiskLevel(avgScore);
  }, [state.assessments]);

  const highRiskCount = useMemo(() => {
    return Object.values(state.assessments).filter(
      (a) => a.riskLevel === 'high' || a.riskLevel === 'critical'
    ).length;
  }, [state.assessments]);

  const pendingTodoCount = useMemo(() => {
    return state.todoList.filter((t) => !t.completed).length;
  }, [state.todoList]);

  return {
    state,
    maintenanceInfo: state.maintenanceInfo,
    maintenanceRecords: state.maintenanceRecords,
    inspectionMedia: state.inspectionMedia,
    assessments: state.assessments,
    todoList: state.todoList,
    workOrders: state.workOrders,
    overallRiskLevel,
    highRiskCount,
    pendingTodoCount,
    updateMaintenanceInfo,
    addMaintenanceRecord,
    addInspectionMedia,
    removeInspectionMedia,
    completeTodoItem,
    getBellRecords,
    getBellMedia,
    getAssessment,
    getMaintenanceInfo,
    createWorkOrder,
    assignWorkOrder,
    startWorkOrder,
    completeWorkOrder,
    reviewWorkOrder,
    createWorkOrderFromRisk,
    batchCreateWorkOrdersFromHighRisk,
    filterWorkOrders,
    getWorkOrdersByBell,
    getWorkOrderById,
    addMediaToWorkOrder,
    getRiskComparisons,
    getStatistics,
  };
}
