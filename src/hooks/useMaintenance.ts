import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  Bell,
  BellMaintenanceInfo,
  MaintenanceRecord,
  InspectionMedia,
  BellMaintenanceAssessment,
  MaintenanceState,
  WorkOrder,
  WorkOrderFilter,
  WorkOrderType,
  MaintenanceStatistics,
  RiskComparison,
  WearLevel,
  MaterialCondition,
} from '../types/bell';
import { generateId } from '../utils/common';
import {
  calculateAssessment,
  calculateOverallRiskLevel,
  countHighRiskBells,
  applyWearImprovement,
} from '../services/riskAssessment';
import {
  createWorkOrder,
  assignWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  reviewWorkOrder,
  addMediaToWorkOrder,
  filterWorkOrders,
  getWorkOrdersByBell,
  getWorkOrderById,
  hasActiveWorkOrder,
  createWorkOrderFromAssessment,
  batchCreateWorkOrdersFromHighRisk,
  getRiskComparisons,
  calculateStatistics,
} from '../services/workOrder';
import {
  generateTodoList,
  completeTodoItem as completeTodoItemService,
  mergeTodoLists,
  getPendingTodoCount,
} from '../services/todoList';

function createInitialMaintenanceInfo(
  bells: Bell[]
): Record<string, BellMaintenanceInfo> {
  const maintenanceInfo: Record<string, BellMaintenanceInfo> = {};

  bells.forEach((bell, index) => {
    const daysAgo = 30 + index * 15;
    const lastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const inspectionDate = new Date(Date.now() - Math.floor(daysAgo * 0.7) * 24 * 60 * 60 * 1000);

    const crackLevels: WearLevel[] = [
      'none',
      'none',
      'mild',
      'none',
      'mild',
      'moderate',
      'none',
      'mild',
      'none',
      'none',
      'severe',
      'none',
    ];
    const rustLevels: WearLevel[] = [
      'mild',
      'none',
      'mild',
      'moderate',
      'none',
      'mild',
      'none',
      'none',
      'severe',
      'mild',
      'moderate',
      'none',
    ];
    const wearLevels: WearLevel[] = [
      'mild',
      'none',
      'none',
      'mild',
      'moderate',
      'mild',
      'none',
      'none',
      'mild',
      'none',
      'moderate',
      'mild',
    ];
    const materialConditions: MaterialCondition[] = [
      'good',
      'excellent',
      'good',
      'fair',
      'good',
      'fair',
      'good',
      'excellent',
      'poor',
      'good',
      'fair',
      'good',
    ];

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
  });

  return maintenanceInfo;
}

function createInitialMaintenanceRecords(bells: Bell[]): MaintenanceRecord[] {
  const records: MaintenanceRecord[] = [];

  bells.forEach((bell, index) => {
    const daysAgo = 30 + index * 15;
    const inspectionDate = new Date(Date.now() - Math.floor(daysAgo * 0.7) * 24 * 60 * 60 * 1000);
    const lastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    records.push({
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
      records.push({
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

  return records;
}

function createInitialAssessments(
  bells: Bell[],
  maintenanceInfo: Record<string, BellMaintenanceInfo>,
  records: MaintenanceRecord[]
): Record<string, BellMaintenanceAssessment> {
  const assessments: Record<string, BellMaintenanceAssessment> = {};
  for (const bell of bells) {
    if (maintenanceInfo[bell.id]) {
      assessments[bell.id] = calculateAssessment(bell, maintenanceInfo[bell.id], records);
    }
  }
  return assessments;
}

function createInitialWorkOrders(
  bells: Bell[],
  assessments: Record<string, BellMaintenanceAssessment>
): WorkOrder[] {
  const workOrders: WorkOrder[] = [];
  const responsiblePersons = ['张师傅', '李工', '王师傅', '赵老师'];
  const workOrderTypes: WorkOrderType[] = [
    'inspection',
    'cleaning',
    'repair',
    'lubrication',
    'tuning',
    'other',
  ];
  const statuses = ['pending_assign', 'in_progress', 'completed', 'reviewed'] as const;
  const priorities: ('high' | 'medium' | 'low')[] = ['low', 'medium', 'high', 'high'];

  for (let i = 0; i < Math.min(bells.length, 8); i++) {
    const bell = bells[i];
    const assessment = assessments[bell.id];
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
      assignedAt:
        status !== 'pending_assign'
          ? new Date(createdAt.getTime() + 1 * 60 * 60 * 1000)
          : undefined,
      startedAt:
        status === 'in_progress' || status === 'completed' || status === 'reviewed'
          ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000)
          : undefined,
      completedAt:
        status === 'completed' || status === 'reviewed'
          ? new Date(createdAt.getTime() + ((i % 3) + 1) * 24 * 60 * 60 * 1000)
          : undefined,
      reviewedAt:
        status === 'reviewed'
          ? new Date(createdAt.getTime() + ((i % 3) + 2) * 24 * 60 * 60 * 1000)
          : undefined,
      completedBy:
        status === 'completed' || status === 'reviewed'
          ? responsiblePersons[i % responsiblePersons.length]
          : undefined,
      reviewedBy:
        status === 'reviewed'
          ? responsiblePersons[(i + 1) % responsiblePersons.length]
          : undefined,
      mediaIds: [],
      preMaintenanceRiskScore: assessment?.riskScore || 50,
      postMaintenanceRiskScore:
        status === 'completed' || status === 'reviewed'
          ? Math.max(5, (assessment?.riskScore || 50) - 20 - i * 3)
          : undefined,
      effectEvaluation:
        status === 'completed' || status === 'reviewed'
          ? '维护效果良好，风险等级下降，编钟状态明显改善'
          : undefined,
      reviewComment: status === 'reviewed' ? '复核通过，维护质量达标，符合验收标准' : undefined,
      sourceType: i < 3 ? 'risk_auto' : 'manual',
      suggestionId: undefined,
    };

    workOrders.push(workOrder);
  }

  return workOrders;
}

function createInitialState(bells: Bell[]): MaintenanceState {
  const maintenanceInfo = createInitialMaintenanceInfo(bells);
  const maintenanceRecords = createInitialMaintenanceRecords(bells);
  const inspectionMedia: InspectionMedia[] = [];
  const assessments = createInitialAssessments(bells, maintenanceInfo, maintenanceRecords);
  const todoList = generateTodoList(bells, assessments, maintenanceInfo);
  const workOrders = createInitialWorkOrders(bells, assessments);

  return {
    maintenanceInfo,
    maintenanceRecords,
    inspectionMedia,
    assessments,
    todoList,
    workOrders,
  };
}

export function useMaintenance(bells: Bell[]) {
  const [state, setState] = useState<MaintenanceState>(() => createInitialState(bells));

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
        newWorkOrders = createInitialWorkOrders(bells, newAssessments);
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

  const updateMaintenanceInfo = useCallback(
    (bellId: string, updates: Partial<BellMaintenanceInfo>) => {
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
    },
    [bells]
  );

  const addMaintenanceRecord = useCallback(
    (bellId: string, record: Omit<MaintenanceRecord, 'id' | 'bellId'>) => {
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
        if (!bell)
          return { ...prev, maintenanceRecords: newRecords, maintenanceInfo: newInfoMap };

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
    },
    [bells]
  );

  const addInspectionMedia = useCallback(
    (bellId: string, media: Omit<InspectionMedia, 'id' | 'timestamp' | 'bellId'>) => {
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
    },
    []
  );

  const removeInspectionMedia = useCallback((mediaId: string) => {
    setState((prev) => ({
      ...prev,
      inspectionMedia: prev.inspectionMedia.filter((m) => m.id !== mediaId),
    }));
  }, []);

  const completeTodoItem = useCallback(
    (todoId: string, completedBy: string = '当前用户') => {
      setState((prev) => {
        const result = completeTodoItemService(
          prev.todoList,
          todoId,
          completedBy,
          prev.maintenanceInfo
        );
        if (!result) return prev;

        const { updatedTodoList, newRecord, updatedInfo } = result;

        const newRecords = [newRecord, ...prev.maintenanceRecords];

        if (!updatedInfo) {
          return { ...prev, todoList: updatedTodoList, maintenanceRecords: newRecords };
        }

        const newInfoMap = { ...prev.maintenanceInfo, [newRecord.bellId]: updatedInfo };

        const bell = bells.find((b) => b.id === newRecord.bellId);
        if (!bell) {
          return {
            ...prev,
            todoList: updatedTodoList,
            maintenanceRecords: newRecords,
            maintenanceInfo: newInfoMap,
          };
        }

        const newAssessment = calculateAssessment(bell, updatedInfo, newRecords);
        const newAssessments = { ...prev.assessments, [newRecord.bellId]: newAssessment };
        const generatedTodoList = generateTodoList(bells, newAssessments, newInfoMap);

        const mergedTodoList = mergeTodoLists(
          generatedTodoList,
          updatedTodoList.filter((t) => t.completed)
        );

        return {
          ...prev,
          todoList: mergedTodoList,
          maintenanceRecords: newRecords,
          maintenanceInfo: newInfoMap,
          assessments: newAssessments,
        };
      });
    },
    [bells]
  );

  const createWorkOrderHandler = useCallback(
    (params: {
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

        const newWorkOrder = createWorkOrder({
          bellId: params.bellId,
          bellName: bell.name,
          bellPosition: bell.position,
          title: params.title,
          description: params.description,
          type: params.type,
          priority: params.priority,
          dueDate: params.dueDate,
          assignee: params.assignee,
          riskLevel: assessment?.riskLevel,
          preMaintenanceRiskScore: assessment?.riskScore,
          sourceType: params.sourceType,
          suggestionId: params.suggestionId,
        });

        return {
          ...prev,
          workOrders: [newWorkOrder, ...prev.workOrders],
        };
      });
    },
    [bells]
  );

  const assignWorkOrderHandler = useCallback(
    (workOrderId: string, assignee: string, assignor: string = '系统管理员') => {
      setState((prev) => {
        const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
        if (!workOrder) return prev;

        const updated = assignWorkOrder(workOrder, assignee, assignor);
        if (updated === workOrder) return prev;

        return {
          ...prev,
          workOrders: prev.workOrders.map((w) => (w.id === workOrderId ? updated : w)),
        };
      });
    },
    []
  );

  const startWorkOrderHandler = useCallback((workOrderId: string) => {
    setState((prev) => {
      const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
      if (!workOrder) return prev;

      const updated = startWorkOrder(workOrder);
      if (updated === workOrder) return prev;

      return {
        ...prev,
        workOrders: prev.workOrders.map((w) => (w.id === workOrderId ? updated : w)),
      };
    });
  }, []);

  const completeWorkOrderHandler = useCallback(
    (
      workOrderId: string,
      completedBy: string,
      effectEvaluation?: string,
      mediaIds?: string[]
    ) => {
      setState((prev) => {
        const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
        if (!workOrder || workOrder.status !== 'in_progress') return prev;

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

          const { wearCondition: newWearCondition, improved } = applyWearImprovement(
            updatedInfo.wearCondition,
            workOrder.title
          );

          if (improved) {
            updatedInfo = { ...updatedInfo, wearCondition: newWearCondition };
          }
        }

        const newInfoMap = info
          ? { ...prev.maintenanceInfo, [workOrder.bellId]: updatedInfo }
          : prev.maintenanceInfo;

        const bell = bells.find((b) => b.id === workOrder.bellId);
        let newAssessments = prev.assessments;
        if (bell && updatedInfo) {
          const newAssessment = calculateAssessment(bell, updatedInfo, newRecords);
          newAssessments = { ...prev.assessments, [workOrder.bellId]: newAssessment };
        }

        const postRiskScore = newAssessments[workOrder.bellId]?.riskScore;

        const updatedWorkOrder = completeWorkOrder(workOrder, {
          completedBy,
          effectEvaluation,
          postMaintenanceRiskScore: postRiskScore,
          mediaIds,
          maintenanceRecordId: newRecord.id,
        });

        const updatedWorkOrders = prev.workOrders.map((w) =>
          w.id === workOrderId ? updatedWorkOrder : w
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
    },
    [bells]
  );

  const reviewWorkOrderHandler = useCallback(
    (workOrderId: string, reviewedBy: string, reviewComment: string, passed: boolean) => {
      setState((prev) => {
        const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
        if (!workOrder || workOrder.status !== 'completed') return prev;

        const updated = reviewWorkOrder(workOrder, { reviewedBy, reviewComment, passed });

        return {
          ...prev,
          workOrders: prev.workOrders.map((w) => (w.id === workOrderId ? updated : w)),
        };
      });
    },
    []
  );

  const createWorkOrderFromRisk = useCallback(
    (bellId: string) => {
      setState((prev) => {
        const bell = bells.find((b) => b.id === bellId);
        const assessment = prev.assessments[bellId];

        if (!bell || !assessment) return prev;
        if (hasActiveWorkOrder(prev.workOrders, bellId)) return prev;

        const workOrder = createWorkOrderFromAssessment(bell, assessment);
        if (!workOrder) return prev;

        return {
          ...prev,
          workOrders: [workOrder, ...prev.workOrders],
        };
      });
    },
    [bells]
  );

  const batchCreateWorkOrdersFromHighRiskHandler = useCallback(() => {
    setState((prev) => {
      const newWorkOrders = batchCreateWorkOrdersFromHighRisk(
        bells,
        prev.assessments,
        prev.workOrders
      );

      if (newWorkOrders.length === 0) return prev;

      return {
        ...prev,
        workOrders: [...newWorkOrders, ...prev.workOrders],
      };
    });
  }, [bells]);

  const filterWorkOrdersHandler = useCallback(
    (filter: WorkOrderFilter): WorkOrder[] => {
      return filterWorkOrders(state.workOrders, filter);
    },
    [state.workOrders]
  );

  const getWorkOrdersByBellHandler = useCallback(
    (bellId: string): WorkOrder[] => {
      return getWorkOrdersByBell(state.workOrders, bellId);
    },
    [state.workOrders]
  );

  const getWorkOrderByIdHandler = useCallback(
    (workOrderId: string): WorkOrder | null => {
      return getWorkOrderById(state.workOrders, workOrderId);
    },
    [state.workOrders]
  );

  const addMediaToWorkOrderHandler = useCallback((workOrderId: string, mediaId: string) => {
    setState((prev) => {
      const workOrder = prev.workOrders.find((w) => w.id === workOrderId);
      if (!workOrder) return prev;

      const updated = addMediaToWorkOrder(workOrder, mediaId);
      if (updated === workOrder) return prev;

      return {
        ...prev,
        workOrders: prev.workOrders.map((w) => (w.id === workOrderId ? updated : w)),
      };
    });
  }, []);

  const getRiskComparisonsHandler = useCallback((): RiskComparison[] => {
    return getRiskComparisons(state.workOrders);
  }, [state.workOrders]);

  const getStatisticsHandler = useCallback((): MaintenanceStatistics => {
    return calculateStatistics(
      state.workOrders,
      state.assessments,
      state.maintenanceRecords.length
    );
  }, [state.workOrders, state.assessments, state.maintenanceRecords]);

  const getBellRecords = useCallback(
    (bellId: string): MaintenanceRecord[] => {
      return state.maintenanceRecords.filter((r) => r.bellId === bellId);
    },
    [state.maintenanceRecords]
  );

  const getBellMedia = useCallback(
    (bellId: string): InspectionMedia[] => {
      return state.inspectionMedia.filter((m) => m.bellId === bellId);
    },
    [state.inspectionMedia]
  );

  const getAssessment = useCallback(
    (bellId: string): BellMaintenanceAssessment | null => {
      return state.assessments[bellId] || null;
    },
    [state.assessments]
  );

  const getMaintenanceInfo = useCallback(
    (bellId: string): BellMaintenanceInfo | null => {
      return state.maintenanceInfo[bellId] || null;
    },
    [state.maintenanceInfo]
  );

  const overallRiskLevel = useMemo(() => {
    return calculateOverallRiskLevel(state.assessments);
  }, [state.assessments]);

  const highRiskCount = useMemo(() => {
    return countHighRiskBells(state.assessments);
  }, [state.assessments]);

  const pendingTodoCount = useMemo(() => {
    return getPendingTodoCount(state.todoList);
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
    createWorkOrder: createWorkOrderHandler,
    assignWorkOrder: assignWorkOrderHandler,
    startWorkOrder: startWorkOrderHandler,
    completeWorkOrder: completeWorkOrderHandler,
    reviewWorkOrder: reviewWorkOrderHandler,
    createWorkOrderFromRisk,
    batchCreateWorkOrdersFromHighRisk: batchCreateWorkOrdersFromHighRiskHandler,
    filterWorkOrders: filterWorkOrdersHandler,
    getWorkOrdersByBell: getWorkOrdersByBellHandler,
    getWorkOrderById: getWorkOrderByIdHandler,
    addMediaToWorkOrder: addMediaToWorkOrderHandler,
    getRiskComparisons: getRiskComparisonsHandler,
    getStatistics: getStatisticsHandler,
  };
}
