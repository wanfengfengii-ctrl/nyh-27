import type {
  Bell,
  BellMaintenanceAssessment,
  BellMaintenanceInfo,
  MaintenanceTodoItem,
  MaintenanceRecord,
} from '../types/bell';
import { generateId } from '../utils/common';
import { applyWearImprovement } from './riskAssessment';

export function generateTodoList(
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
      assessment.riskLevel === 'critical'
        ? 'high'
        : assessment.riskLevel === 'high'
        ? 'high'
        : assessment.riskLevel === 'medium'
        ? 'medium'
        : 'low';

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
          dueDate: new Date(
            Date.now() +
              (assessment.riskLevel === 'critical' ? 1 : 7) * 24 * 60 * 60 * 1000
          ),
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
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const prioDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (prioDiff !== 0) return prioDiff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  return todos;
}

export interface CompleteTodoResult {
  updatedTodoList: MaintenanceTodoItem[];
  newRecord: MaintenanceRecord;
  updatedInfo: BellMaintenanceInfo | null;
  wearImproved: boolean;
}

export function completeTodoItem(
  todoList: MaintenanceTodoItem[],
  todoId: string,
  completedBy: string = '当前用户',
  infoMap: Record<string, BellMaintenanceInfo>
): CompleteTodoResult | null {
  const todo = todoList.find((t) => t.id === todoId);
  if (!todo || todo.completed) return null;

  const newTodoList = todoList.map((t) =>
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
    notes: `来自维护待办清单，优先级: ${
      todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'
    }`,
    mediaIds: [],
  };

  const info = infoMap[todo.bellId];
  if (!info) {
    return {
      updatedTodoList: newTodoList,
      newRecord,
      updatedInfo: null,
      wearImproved: false,
    };
  }

  let updatedInfo = { ...info };

  if (todo.type === 'inspection') {
    updatedInfo = { ...updatedInfo, lastInspectionDate: new Date() };
  }
  if (['cleaning', 'repair', 'lubrication', 'tuning'].includes(todo.type)) {
    updatedInfo = { ...updatedInfo, lastMaintenanceDate: new Date() };
  }

  const { wearCondition: newWearCondition, improved } = applyWearImprovement(
    updatedInfo.wearCondition,
    todo.title
  );

  if (improved) {
    updatedInfo = { ...updatedInfo, wearCondition: newWearCondition };
  }

  return {
    updatedTodoList: newTodoList,
    newRecord,
    updatedInfo,
    wearImproved: improved,
  };
}

export function mergeTodoLists(
  generatedTodos: MaintenanceTodoItem[],
  existingCompletedTodos: MaintenanceTodoItem[]
): MaintenanceTodoItem[] {
  const merged = [...generatedTodos, ...existingCompletedTodos.filter((t) => t.completed)];
  merged.sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const prioDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (prioDiff !== 0) return prioDiff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  return merged;
}

export function getPendingTodoCount(todoList: MaintenanceTodoItem[]): number {
  return todoList.filter((t) => !t.completed).length;
}
