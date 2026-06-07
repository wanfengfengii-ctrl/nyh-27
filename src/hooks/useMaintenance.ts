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

    return {
      maintenanceInfo,
      maintenanceRecords,
      inspectionMedia,
      assessments,
      todoList,
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

      if (!changed) return prev;
      return {
        ...prev,
        maintenanceInfo: newInfo,
        assessments: newAssessments,
        todoList: newTodoList,
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
  };
}
