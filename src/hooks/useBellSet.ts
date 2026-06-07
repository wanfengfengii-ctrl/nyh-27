import { useState, useCallback } from 'react';
import type { Bell, BellSetState, StrikePosition } from '../types/bell';
import { mockBells } from '../data/mockBells';

const initialState: BellSetState = {
  bells: mockBells,
  selectedBellId: mockBells[0]?.id ?? null,
  confirmed: true,
  confirmedAt: new Date(),
  allowedDeviation: 50,
};

export function useBellSet() {
  const [state, setState] = useState<BellSetState>(initialState);

  const selectBell = useCallback((bellId: string | null) => {
    setState((prev) => ({ ...prev, selectedBellId: bellId }));
  }, []);

  const updateBell = useCallback((bellId: string, updates: Partial<Bell>) => {
    setState((prev) => ({
      ...prev,
      bells: prev.bells.map((b) => (b.id === bellId ? { ...b, ...updates } : b)),
      confirmed: false,
      confirmedAt: null,
    }));
  }, []);

  const reorderBells = useCallback((activeId: string, overId: string) => {
    setState((prev) => {
      const oldIndex = prev.bells.findIndex((b) => b.id === activeId);
      const newIndex = prev.bells.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const newBells = [...prev.bells];
      const [removed] = newBells.splice(oldIndex, 1);
      newBells.splice(newIndex, 0, removed);

      const updatedBells = newBells.map((bell, index) => ({
        ...bell,
        position: index + 1,
      }));

      return {
        ...prev,
        bells: updatedBells,
        confirmed: false,
        confirmedAt: null,
      };
    });
  }, []);

  const confirmBellSet = useCallback(() => {
    setState((prev) => ({
      ...prev,
      confirmed: true,
      confirmedAt: new Date(),
    }));
  }, []);

  const setAllowedDeviation = useCallback((value: number) => {
    setState((prev) => ({ ...prev, allowedDeviation: value }));
  }, []);

  const selectedBell = state.bells.find((b) => b.id === state.selectedBellId) ?? null;

  const addBell = useCallback(() => {
    setState((prev) => {
      const newBell: Bell = {
        id: `bell-${Date.now()}`,
        name: `新编钟 ${prev.bells.length + 1}`,
        position: prev.bells.length + 1,
        targetFrequency: 440,
        measuredFrequency: 440,
        weight: 10,
        strikePosition: '正鼓' as StrikePosition,
      };
      return {
        ...prev,
        bells: [...prev.bells, newBell],
        selectedBellId: newBell.id,
        confirmed: false,
        confirmedAt: null,
      };
    });
  }, []);

  const removeBell = useCallback((bellId: string) => {
    setState((prev) => {
      const filtered = prev.bells.filter((b) => b.id !== bellId);
      const updated = filtered.map((bell, index) => ({
        ...bell,
        position: index + 1,
      }));
      const nextSelected = updated.length > 0 ? updated[0].id : null;
      return {
        ...prev,
        bells: updated,
        selectedBellId: prev.selectedBellId === bellId ? nextSelected : prev.selectedBellId,
        confirmed: false,
        confirmedAt: null,
      };
    });
  }, []);

  return {
    state,
    bells: state.bells,
    selectedBell,
    selectedBellId: state.selectedBellId,
    confirmed: state.confirmed,
    confirmedAt: state.confirmedAt,
    allowedDeviation: state.allowedDeviation,
    selectBell,
    updateBell,
    reorderBells,
    confirmBellSet,
    setAllowedDeviation,
    addBell,
    removeBell,
  };
}
