import { describe, it, expect } from 'vitest';
import type { Bell, BellMaintenanceAssessment, BellMaintenanceInfo, MaintenanceTodoItem } from '../../types/bell';
import {
  generateTodoList,
  completeTodoItem,
  mergeTodoLists,
  getPendingTodoCount,
} from '../todoList';

function createTestBell(overrides: Partial<Bell> = {}): Bell {
  return {
    id: 'bell-1',
    name: '测试编钟',
    position: 1,
    weight: 15,
    strikePosition: '正鼓',
    frequencies: {
      '正鼓': { target: 440, measured: 442 },
      '右鼓': { target: 494, measured: 495 },
      '左鼓': { target: 484, measured: 486 },
      '钲部': { target: 418, measured: 420 },
    },
    note: 'A4',
    ...overrides,
  };
}

function createTestAssessment(overrides: Partial<BellMaintenanceAssessment> = {}): BellMaintenanceAssessment {
  return {
    bellId: 'bell-1',
    riskLevel: 'medium',
    riskScore: 50,
    frequencyDeviationScore: 50,
    weightChangeScore: 50,
    wearConditionScore: 50,
    maintenanceHistoryScore: 50,
    suggestions: [],
    nextMaintenanceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

function createTestMaintenanceInfo(overrides: Partial<BellMaintenanceInfo> = {}): BellMaintenanceInfo {
  return {
    bellId: 'bell-1',
    materialCondition: 'good',
    wearCondition: { crack: 'none', rust: 'mild', wear: 'none' },
    lastMaintenanceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    maintenanceCycleDays: 90,
    environment: { temperature: 22, humidity: 50, timestamp: new Date() },
    responsiblePerson: '张师傅',
    originalWeight: 15,
    lastInspectionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

describe('todoList service', () => {
  describe('generateTodoList', () => {
    it('should generate todo list from bells and assessments', () => {
      const bells = [
        createTestBell({ id: 'bell-1', name: '钟1', position: 1 }),
        createTestBell({ id: 'bell-2', name: '钟2', position: 2 }),
      ];

      const assessments: Record<string, BellMaintenanceAssessment> = {
        'bell-1': createTestAssessment({ bellId: 'bell-1', riskLevel: 'high', riskScore: 75 }),
        'bell-2': createTestAssessment({ bellId: 'bell-2', riskLevel: 'low', riskScore: 25 }),
      };

      const maintenanceInfo: Record<string, BellMaintenanceInfo> = {
        'bell-1': createTestMaintenanceInfo({ bellId: 'bell-1' }),
        'bell-2': createTestMaintenanceInfo({ bellId: 'bell-2' }),
      };

      const result = generateTodoList(bells, assessments, maintenanceInfo);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      for (const todo of result) {
        expect(todo.id).toBeTruthy();
        expect(todo.bellId).toBeTruthy();
        expect(todo.title).toBeTruthy();
        expect(todo.completed).toBe(false);
        expect(todo.dueDate).toBeInstanceOf(Date);
      }
    });

    it('should return empty array for empty bells', () => {
      const result = generateTodoList([], {}, {});
      expect(result).toEqual([]);
    });
  });

  describe('completeTodoItem', () => {
    const todoList: MaintenanceTodoItem[] = [
      {
        id: 'todo-1',
        bellId: 'bell-1',
        bellName: '钟1',
        bellPosition: 1,
        type: 'cleaning',
        title: '清洁保养',
        dueDate: new Date(),
        priority: 'medium',
        riskLevel: 'medium',
        completed: false,
      },
      {
        id: 'todo-2',
        bellId: 'bell-1',
        bellName: '钟1',
        bellPosition: 1,
        type: 'inspection',
        title: '例行检查',
        dueDate: new Date(),
        priority: 'low',
        riskLevel: 'low',
        completed: true,
        completedAt: new Date(),
        completedBy: '张师傅',
      },
    ];

    const maintenanceInfo: Record<string, BellMaintenanceInfo> = {
      'bell-1': createTestMaintenanceInfo({ bellId: 'bell-1' }),
    };

    it('should complete a pending todo item', () => {
      const result = completeTodoItem(todoList, 'todo-1', '李师傅', maintenanceInfo);
      expect(result).not.toBeNull();
      expect(result?.updatedTodoList[0].completed).toBe(true);
      expect(result?.updatedTodoList[0].completedBy).toBe('李师傅');
      expect(result?.updatedTodoList[0].completedAt).toBeInstanceOf(Date);
      expect(result?.newRecord).toBeTruthy();
      expect(result?.newRecord.type).toBe('cleaning');
    });

    it('should return null for already completed todo', () => {
      const result = completeTodoItem(todoList, 'todo-2', '李师傅', maintenanceInfo);
      expect(result).toBeNull();
    });

    it('should return null for non-existent todo', () => {
      const result = completeTodoItem(todoList, 'todo-99', '李师傅', maintenanceInfo);
      expect(result).toBeNull();
    });

    it('should update maintenance info lastMaintenanceDate for cleaning type', () => {
      const result = completeTodoItem(todoList, 'todo-1', '李师傅', maintenanceInfo);
      expect(result?.updatedInfo).not.toBeNull();
      expect(result?.updatedInfo?.lastMaintenanceDate).toBeInstanceOf(Date);
    });
  });

  describe('mergeTodoLists', () => {
    it('should merge generated todos with completed ones', () => {
      const generated: MaintenanceTodoItem[] = [
        {
          id: 'todo-1',
          bellId: 'bell-1',
          bellName: '钟1',
          bellPosition: 1,
          type: 'cleaning',
          title: '清洁保养',
          dueDate: new Date(),
          priority: 'medium',
          riskLevel: 'medium',
          completed: false,
        },
        {
          id: 'todo-2',
          bellId: 'bell-1',
          bellName: '钟1',
          bellPosition: 1,
          type: 'inspection',
          title: '例行检查',
          dueDate: new Date(),
          priority: 'low',
          riskLevel: 'low',
          completed: false,
        },
      ];

      const completed: MaintenanceTodoItem[] = [
        {
          id: 'todo-old-1',
          bellId: 'bell-1',
          bellName: '钟1',
          bellPosition: 1,
          type: 'repair',
          title: '修复工作',
          dueDate: new Date(),
          priority: 'high',
          riskLevel: 'high',
          completed: true,
          completedAt: new Date(),
          completedBy: '张师傅',
        },
      ];

      const result = mergeTodoLists(generated, completed);
      expect(result.length).toBe(3);
      expect(result.filter(t => t.completed)).toHaveLength(1);
      expect(result.filter(t => !t.completed)).toHaveLength(2);
    });

    it('should handle empty completed list', () => {
      const generated: MaintenanceTodoItem[] = [
        {
          id: 'todo-1',
          bellId: 'bell-1',
          bellName: '钟1',
          bellPosition: 1,
          type: 'cleaning',
          title: '清洁保养',
          dueDate: new Date(),
          priority: 'medium',
          riskLevel: 'medium',
          completed: false,
        },
      ];

      const result = mergeTodoLists(generated, []);
      expect(result).toHaveLength(1);
      expect(result[0].completed).toBe(false);
    });
  });

  describe('getPendingTodoCount', () => {
    const todoList: MaintenanceTodoItem[] = [
      {
        id: 'todo-1',
        bellId: 'bell-1',
        bellName: '钟1',
        bellPosition: 1,
        type: 'cleaning',
        title: '清洁保养',
        dueDate: new Date(),
        priority: 'medium',
        riskLevel: 'medium',
        completed: false,
      },
      {
        id: 'todo-2',
        bellId: 'bell-1',
        bellName: '钟1',
        bellPosition: 1,
        type: 'inspection',
        title: '例行检查',
        dueDate: new Date(),
        priority: 'low',
        riskLevel: 'low',
        completed: false,
      },
      {
        id: 'todo-3',
        bellId: 'bell-2',
        bellName: '钟2',
        bellPosition: 2,
        type: 'repair',
        title: '修复工作',
        dueDate: new Date(),
        priority: 'high',
        riskLevel: 'high',
        completed: true,
      },
    ];

    it('should count pending todos correctly', () => {
      const count = getPendingTodoCount(todoList);
      expect(count).toBe(2);
    });

    it('should return 0 for empty list', () => {
      expect(getPendingTodoCount([])).toBe(0);
    });

    it('should return 0 when all are completed', () => {
      const allCompleted = todoList.map(t => ({ ...t, completed: true }));
      expect(getPendingTodoCount(allCompleted)).toBe(0);
    });
  });
});
