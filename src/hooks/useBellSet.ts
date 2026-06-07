import { useState, useCallback, useMemo } from 'react';
import type {
  Bell,
  BellSetState,
  BellScheme,
  StrikePosition,
  OperationHistory,
  ReviewLog,
  ReviewStatus,
  OperationField,
} from '../types/bell';
import { mockSchemes, createEmptyBell } from '../data/mockBells';
import { getBellCents, isBellOutOfRange } from '../utils/cents';

const initialSchemes: BellScheme[] = mockSchemes.map((s, i) => ({
  ...s,
  isActive: i === 0,
}));

const initialState: BellSetState = {
  schemes: initialSchemes,
  activeSchemeId: initialSchemes[0]?.id ?? null,
  selectedBellId: initialSchemes[0]?.bells[0]?.id ?? null,
  allowedDeviation: 50,
  filterOutOfRange: false,
  sortBy: 'position',
  sortOrder: 'asc',
  currentStrikePosition: '正鼓',
  compareSchemeIds: [],
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useBellSet() {
  const [state, setState] = useState<BellSetState>(initialState);

  const activeScheme = useMemo(
    () => state.schemes.find((s) => s.id === state.activeSchemeId) ?? null,
    [state.schemes, state.activeSchemeId]
  );

  const bells = useMemo(() => activeScheme?.bells ?? [], [activeScheme]);

  const selectedBell = useMemo(
    () => bells.find((b) => b.id === state.selectedBellId) ?? null,
    [bells, state.selectedBellId]
  );

  const compareSchemes = useMemo(
    () => state.schemes.filter((s) => state.compareSchemeIds.includes(s.id)),
    [state.schemes, state.compareSchemeIds]
  );

  const filteredAndSortedBells = useMemo(() => {
    let result = [...bells];

    if (state.filterOutOfRange) {
      result = result.filter((b) =>
        isBellOutOfRange(b, state.currentStrikePosition, state.allowedDeviation)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (state.sortBy) {
        case 'position':
          comparison = a.position - b.position;
          break;
        case 'deviation':
          comparison =
            Math.abs(getBellCents(b, state.currentStrikePosition)) -
            Math.abs(getBellCents(a, state.currentStrikePosition));
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return state.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [bells, state.filterOutOfRange, state.sortBy, state.sortOrder, state.currentStrikePosition, state.allowedDeviation]);

  const addOperationHistory = useCallback(
    (schemeId: string, history: Omit<OperationHistory, 'id' | 'timestamp'>) => {
      setState((prev) => ({
        ...prev,
        schemes: prev.schemes.map((s) =>
          s.id === schemeId
            ? {
                ...s,
                operationHistory: [
                  {
                    ...history,
                    id: generateId('hist'),
                    timestamp: new Date(),
                  },
                  ...s.operationHistory,
                ],
                updatedAt: new Date(),
              }
            : s
        ),
      }));
    },
    []
  );

  const updateSchemeBells = useCallback(
    (schemeId: string, updater: (bells: Bell[]) => Bell[]) => {
      setState((prev) => ({
        ...prev,
        schemes: prev.schemes.map((s) =>
          s.id === schemeId ? { ...s, bells: updater(s.bells), updatedAt: new Date() } : s
        ),
      }));
    },
    []
  );

  const selectBell = useCallback((bellId: string | null) => {
    setState((prev) => ({ ...prev, selectedBellId: bellId }));
  }, []);

  const updateBell = useCallback(
    (bellId: string, updates: Partial<Bell>) => {
      if (!activeScheme) return;

      const bell = activeScheme.bells.find((b) => b.id === bellId);
      if (!bell) return;

      let field: OperationField | undefined;
      let oldValue: string | number | null = null;
      let newValue: string | number | null = null;

      if (updates.name !== undefined && updates.name !== bell.name) {
        field = 'name';
        oldValue = bell.name;
        newValue = updates.name;
      } else if (updates.weight !== undefined && updates.weight !== bell.weight) {
        field = 'weight';
        oldValue = bell.weight;
        newValue = updates.weight;
      } else if (updates.strikePosition !== undefined && updates.strikePosition !== bell.strikePosition) {
        field = 'strikePosition';
        oldValue = bell.strikePosition;
        newValue = updates.strikePosition;
      } else if (updates.frequencies !== undefined) {
        field = 'frequencies';
        oldValue = null;
        newValue = null;
      }

      updateSchemeBells(activeScheme.id, (prevBells) =>
        prevBells.map((b) => (b.id === bellId ? { ...b, ...updates } : b))
      );

      if (field) {
        addOperationHistory(activeScheme.id, {
          type: 'update',
          bellId,
          bellName: updates.name || bell.name,
          field,
          oldValue,
          newValue,
          description: `修改${field === 'name' ? '名称' : field === 'weight' ? '重量' : field === 'strikePosition' ? '敲击位置' : '频率参数'}`,
        });
      }
    },
    [activeScheme, updateSchemeBells, addOperationHistory]
  );

  const updateBellFrequency = useCallback(
    (bellId: string, strikePosition: StrikePosition, type: 'target' | 'measured', value: number) => {
      if (!activeScheme) return;

      const bell = activeScheme.bells.find((b) => b.id === bellId);
      if (!bell) return;

      const oldValue = bell.frequencies[strikePosition][type];

      updateSchemeBells(activeScheme.id, (prevBells) =>
        prevBells.map((b) =>
          b.id === bellId
            ? {
                ...b,
                frequencies: {
                  ...b.frequencies,
                  [strikePosition]: {
                    ...b.frequencies[strikePosition],
                    [type]: value,
                  },
                },
              }
            : b
        )
      );

      addOperationHistory(activeScheme.id, {
        type: 'update',
        bellId,
        bellName: bell.name,
        field: type === 'target' ? 'targetFrequency' : 'measuredFrequency',
        oldValue,
        newValue: value,
        description: `修改${strikePosition}${type === 'target' ? '目标' : '实测'}频率`,
      });
    },
    [activeScheme, updateSchemeBells, addOperationHistory]
  );

  const reorderBells = useCallback(
    (activeId: string, overId: string) => {
      if (!activeScheme) return;

      const oldIndex = activeScheme.bells.findIndex((b) => b.id === activeId);
      const newIndex = activeScheme.bells.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newBells = [...activeScheme.bells];
      const [removed] = newBells.splice(oldIndex, 1);
      newBells.splice(newIndex, 0, removed);

      const updatedBells = newBells.map((bell, index) => ({
        ...bell,
        position: index + 1,
      }));

      updateSchemeBells(activeScheme.id, () => updatedBells);

      addOperationHistory(activeScheme.id, {
        type: 'reorder',
        bellId: activeId,
        bellName: removed.name,
        field: 'position',
        oldValue: oldIndex + 1,
        newValue: newIndex + 1,
        description: `调整位置从第${oldIndex + 1}位到第${newIndex + 1}位`,
      });
    },
    [activeScheme, updateSchemeBells, addOperationHistory]
  );

  const setAllowedDeviation = useCallback((value: number) => {
    setState((prev) => ({ ...prev, allowedDeviation: value }));
  }, []);

  const addBell = useCallback(() => {
    if (!activeScheme) return;

    const newBell = createEmptyBell(activeScheme.bells.length + 1);

    updateSchemeBells(activeScheme.id, (prevBells) => [...prevBells, newBell]);
    setState((prev) => ({ ...prev, selectedBellId: newBell.id }));

    addOperationHistory(activeScheme.id, {
      type: 'add',
      bellId: newBell.id,
      bellName: newBell.name,
      description: `添加新钟 "${newBell.name}"`,
    });
  }, [activeScheme, updateSchemeBells, addOperationHistory]);

  const removeBell = useCallback(
    (bellId: string) => {
      if (!activeScheme) return;

      const bell = activeScheme.bells.find((b) => b.id === bellId);
      if (!bell) return;

      const filtered = activeScheme.bells.filter((b) => b.id !== bellId);
      const updated = filtered.map((b, index) => ({ ...b, position: index + 1 }));
      const nextSelected = updated.length > 0 ? updated[0].id : null;

      updateSchemeBells(activeScheme.id, () => updated);
      setState((prev) => ({
        ...prev,
        selectedBellId: prev.selectedBellId === bellId ? nextSelected : prev.selectedBellId,
      }));

      addOperationHistory(activeScheme.id, {
        type: 'remove',
        bellId,
        bellName: bell.name,
        description: `删除编钟 "${bell.name}"`,
      });
    },
    [activeScheme, updateSchemeBells, addOperationHistory]
  );

  const batchAddBells = useCallback(
    (newBells: Bell[]) => {
      if (!activeScheme) return;

      const bellsWithPosition = newBells.map((b, i) => ({
        ...b,
        position: activeScheme.bells.length + i + 1,
      }));

      updateSchemeBells(activeScheme.id, (prevBells) => [...prevBells, ...bellsWithPosition]);

      addOperationHistory(activeScheme.id, {
        type: 'batch_add',
        description: `批量添加 ${newBells.length} 口编钟`,
      });
    },
    [activeScheme, updateSchemeBells, addOperationHistory]
  );

  const importBells = useCallback(
    (importedBells: Bell[], replace: boolean = false) => {
      if (!activeScheme) return;

      const bellsWithIds = importedBells.map((b, i) => ({
        ...b,
        id: b.id || generateId('bell'),
        position: replace ? i + 1 : activeScheme.bells.length + i + 1,
      }));

      updateSchemeBells(activeScheme.id, (prevBells) =>
        replace ? bellsWithIds : [...prevBells, ...bellsWithIds]
      );

      addOperationHistory(activeScheme.id, {
        type: 'import',
        description: `${replace ? '导入替换' : '导入追加'} ${importedBells.length} 口编钟`,
      });
    },
    [activeScheme, updateSchemeBells, addOperationHistory]
  );

  const createNewScheme = useCallback((name: string, description: string = '') => {
    const newScheme: BellScheme = {
      id: generateId('scheme'),
      name,
      description,
      bells: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewStatus: 'pending',
      reviewLogs: [],
      operationHistory: [],
      isActive: false,
    };

    setState((prev) => ({
      ...prev,
      schemes: [...prev.schemes, newScheme],
    }));

    return newScheme.id;
  }, []);

  const duplicateScheme = useCallback((schemeId: string, newName: string) => {
    const sourceScheme = state.schemes.find((s) => s.id === schemeId);
    if (!sourceScheme) return null;

    const newScheme: BellScheme = {
      ...JSON.parse(JSON.stringify(sourceScheme)),
      id: generateId('scheme'),
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewStatus: 'pending',
      reviewLogs: [],
      operationHistory: [],
      isActive: false,
    };

    setState((prev) => ({
      ...prev,
      schemes: [...prev.schemes, newScheme],
    }));

    return newScheme.id;
  }, [state.schemes]);

  const deleteScheme = useCallback((schemeId: string) => {
    setState((prev) => {
      const filtered = prev.schemes.filter((s) => s.id !== schemeId);
      const newActiveId =
        prev.activeSchemeId === schemeId ? (filtered[0]?.id ?? null) : prev.activeSchemeId;
      const newSelectedId =
        newActiveId === prev.activeSchemeId
          ? prev.selectedBellId
          : filtered.find((s) => s.id === newActiveId)?.bells[0]?.id ?? null;

      return {
        ...prev,
        schemes: filtered,
        activeSchemeId: newActiveId,
        selectedBellId: newSelectedId,
        compareSchemeIds: prev.compareSchemeIds.filter((id) => id !== schemeId),
      };
    });
  }, []);

  const setActiveScheme = useCallback((schemeId: string) => {
    setState((prev) => {
      const scheme = prev.schemes.find((s) => s.id === schemeId);
      return {
        ...prev,
        activeSchemeId: schemeId,
        selectedBellId: scheme?.bells[0]?.id ?? null,
        schemes: prev.schemes.map((s) => ({ ...s, isActive: s.id === schemeId })),
      };
    });
  }, []);

  const updateScheme = useCallback(
    (schemeId: string, updates: Partial<BellScheme>) => {
      setState((prev) => ({
        ...prev,
        schemes: prev.schemes.map((s) =>
          s.id === schemeId ? { ...s, ...updates, updatedAt: new Date() } : s
        ),
      }));
    },
    []
  );

  const toggleCompareScheme = useCallback((schemeId: string) => {
    setState((prev) => ({
      ...prev,
      compareSchemeIds: prev.compareSchemeIds.includes(schemeId)
        ? prev.compareSchemeIds.filter((id) => id !== schemeId)
        : [...prev.compareSchemeIds, schemeId],
    }));
  }, []);

  const addReviewLog = useCallback(
    (schemeId: string, status: ReviewStatus, comment: string, reviewer: string = '当前用户') => {
      const log: ReviewLog = {
        id: generateId('review'),
        timestamp: new Date(),
        status,
        comment,
        reviewer,
        schemeId,
      };

      setState((prev) => ({
        ...prev,
        schemes: prev.schemes.map((s) =>
          s.id === schemeId
            ? {
                ...s,
                reviewStatus: status,
                reviewLogs: [log, ...s.reviewLogs],
                updatedAt: new Date(),
              }
            : s
        ),
      }));
    },
    []
  );

  const setCurrentStrikePosition = useCallback((position: StrikePosition) => {
    setState((prev) => ({ ...prev, currentStrikePosition: position }));
  }, []);

  const setFilterOutOfRange = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, filterOutOfRange: value }));
  }, []);

  const setSortBy = useCallback(
    (value: BellSetState['sortBy']) => {
      setState((prev) => ({ ...prev, sortBy: value }));
    },
    []
  );

  const setSortOrder = useCallback((value: BellSetState['sortOrder']) => {
    setState((prev) => ({ ...prev, sortOrder: value }));
  }, []);

  const canExport = useMemo(() => {
    return activeScheme?.reviewStatus === 'approved';
  }, [activeScheme]);

  return {
    state,
    schemes: state.schemes,
    activeScheme,
    activeSchemeId: state.activeSchemeId,
    bells,
    filteredAndSortedBells,
    selectedBell,
    selectedBellId: state.selectedBellId,
    allowedDeviation: state.allowedDeviation,
    filterOutOfRange: state.filterOutOfRange,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    currentStrikePosition: state.currentStrikePosition,
    compareSchemeIds: state.compareSchemeIds,
    compareSchemes,
    canExport,
    operationHistory: activeScheme?.operationHistory ?? [],
    reviewLogs: activeScheme?.reviewLogs ?? [],
    reviewStatus: activeScheme?.reviewStatus ?? 'pending',
    selectBell,
    updateBell,
    updateBellFrequency,
    reorderBells,
    setAllowedDeviation,
    addBell,
    removeBell,
    batchAddBells,
    importBells,
    createNewScheme,
    duplicateScheme,
    deleteScheme,
    setActiveScheme,
    updateScheme,
    toggleCompareScheme,
    addReviewLog,
    setCurrentStrikePosition,
    setFilterOutOfRange,
    setSortBy,
    setSortOrder,
  };
}
