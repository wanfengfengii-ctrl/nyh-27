import type {
  Bell,
  StrikePosition,
  BellMaintenanceInfo,
} from '../types/bell';

export function validateFrequency(value: number): boolean {
  return value > 0 && isFinite(value);
}

export function validateWeight(value: number): boolean {
  return value > 0 && isFinite(value);
}

export function validateBell(
  bell: Bell,
  strikePosition: StrikePosition = '正鼓'
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!bell.name.trim()) {
    errors.push('编钟名称不能为空');
  }

  const freq = bell.frequencies[strikePosition];
  if (!validateFrequency(freq.target)) {
    errors.push(`${strikePosition}目标频率必须大于零`);
  }

  if (!validateFrequency(freq.measured)) {
    errors.push(`${strikePosition}实测频率必须大于零`);
  }

  if (!validateWeight(bell.weight)) {
    errors.push('重量必须大于零');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateWorkOrder(params: {
  title: string;
  description: string;
  bellId: string;
  dueDate: Date;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.bellId) {
    errors.push('请选择编钟');
  }

  if (!params.title.trim()) {
    errors.push('工单标题不能为空');
  } else if (params.title.trim().length > 100) {
    errors.push('工单标题不能超过100个字符');
  }

  if (params.description.length > 500) {
    errors.push('工单描述不能超过500个字符');
  }

  if (!params.dueDate || isNaN(new Date(params.dueDate).getTime())) {
    errors.push('请设置有效的到期日期');
  } else if (new Date(params.dueDate).getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    errors.push('到期日期不能早于今天');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateMaintenanceInfo(info: BellMaintenanceInfo): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (info.maintenanceCycleDays < 7) {
    errors.push('保养周期不能少于7天');
  }
  if (info.maintenanceCycleDays > 365) {
    errors.push('保养周期不能超过365天');
  }

  if (info.originalWeight <= 0) {
    errors.push('原始重量必须大于零');
  }

  if (info.environment) {
    if (info.environment.temperature < -50 || info.environment.temperature > 80) {
      errors.push('环境温度不在合理范围内');
    }
    if (info.environment.humidity < 0 || info.environment.humidity > 100) {
      errors.push('环境湿度不在合理范围内');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateMaintenanceRecord(record: {
  description: string;
  operator: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!record.description.trim()) {
    errors.push('维护描述不能为空');
  }

  if (!record.operator.trim()) {
    errors.push('操作人不能为空');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateReview(params: {
  comment: string;
  reviewer: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.reviewer.trim()) {
    errors.push('复核人不能为空');
  }

  if (!params.comment.trim()) {
    errors.push('复核意见不能为空');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateImportData(data: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('数据格式错误，应为数组');
    return { valid: false, errors };
  }

  if (data.length === 0) {
    errors.push('导入数据为空');
    return { valid: false, errors };
  }

  data.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`第 ${index + 1} 条数据格式错误`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
