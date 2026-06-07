import type { Bell, ImportResult, ExportFormat, StrikePosition, BellScheme } from '../types/bell';
import { STRIKE_POSITIONS } from '../types/bell';
import { createEmptyBell } from '../data/mockBells';

export function parseBellsFromJSON(jsonStr: string): ImportResult {
  try {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data)) {
      return { success: false, error: 'JSON 数据必须是数组格式' };
    }

    const bells: Bell[] = data.map((item: any, index: number) => {
      const position = item.position || index + 1;
      const bell = createEmptyBell(position);
      bell.id = item.id || `bell-import-${Date.now()}-${index}`;
      bell.name = item.name || `编钟 ${position}`;
      bell.weight = item.weight ?? 10;
      bell.strikePosition = STRIKE_POSITIONS.includes(item.strikePosition)
        ? item.strikePosition
        : '正鼓';
      bell.note = item.note || '';

      if (item.frequencies && typeof item.frequencies === 'object') {
        STRIKE_POSITIONS.forEach((pos) => {
          if (item.frequencies[pos]) {
            bell.frequencies[pos].target = item.frequencies[pos].target ?? 440;
            bell.frequencies[pos].measured = item.frequencies[pos].measured ?? 440;
          }
        });
      } else if (item.targetFrequency || item.measuredFrequency) {
        const target = item.targetFrequency ?? 440;
        const measured = item.measuredFrequency ?? 440;
        bell.frequencies['正鼓'] = { target, measured };
      }

      return bell;
    });

    return { success: true, bells };
  } catch (e) {
    return { success: false, error: `JSON 解析失败: ${(e as Error).message}` };
  }
}

export function parseBellsFromCSV(csvStr: string): ImportResult {
  try {
    const lines = csvStr.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: 'CSV 数据至少需要表头和一行数据' };
    }

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    const getColIndex = (names: string[]): number => {
      for (const name of names) {
        const idx = headers.findIndex((h) => h.toLowerCase().trim() === name.toLowerCase().trim());
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const nameIdx = getColIndex(['name', '名称', '编钟名称']);
    const posIdx = getColIndex(['position', '位置', '音位']);
    const weightIdx = getColIndex(['weight', '重量']);
    const targetFreqIdx = getColIndex(['targetFrequency', 'target', '目标频率']);
    const measuredFreqIdx = getColIndex(['measuredFrequency', 'measured', '实测频率']);
    const noteIdx = getColIndex(['note', '音名']);

    const bells: Bell[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const position = posIdx >= 0 ? parseInt(values[posIdx]) || i : i;
      const bell = createEmptyBell(position);

      if (nameIdx >= 0) bell.name = values[nameIdx] || `编钟 ${position}`;
      if (weightIdx >= 0) bell.weight = parseFloat(values[weightIdx]) || 10;
      if (noteIdx >= 0) bell.note = values[noteIdx] || '';

      if (targetFreqIdx >= 0) {
        const target = parseFloat(values[targetFreqIdx]) || 440;
        bell.frequencies['正鼓'].target = target;
      }
      if (measuredFreqIdx >= 0) {
        const measured = parseFloat(values[measuredFreqIdx]) || 440;
        bell.frequencies['正鼓'].measured = measured;
      }

      bells.push(bell);
    }

    if (bells.length === 0) {
      return { success: false, error: '未解析到有效的编钟数据' };
    }

    return { success: true, bells };
  } catch (e) {
    return { success: false, error: `CSV 解析失败: ${(e as Error).message}` };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function exportBellsToJSON(bells: Bell[]): string {
  const exportData = bells.map((bell) => ({
    id: bell.id,
    name: bell.name,
    position: bell.position,
    weight: bell.weight,
    strikePosition: bell.strikePosition,
    note: bell.note,
    frequencies: bell.frequencies,
  }));
  return JSON.stringify(exportData, null, 2);
}

export function exportBellsToCSV(bells: Bell[], strikePosition: StrikePosition = '正鼓'): string {
  const headers = ['位置', '名称', '音名', '目标频率(Hz)', '实测频率(Hz)', '重量(kg)', '敲击位置'];
  const rows = bells.map((bell) => [
    bell.position.toString(),
    bell.name,
    bell.note || '',
    bell.frequencies[strikePosition].target.toFixed(2),
    bell.frequencies[strikePosition].measured.toFixed(2),
    bell.weight.toFixed(2),
    bell.strikePosition,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

export function exportSchemeToJSON(scheme: BellScheme): string {
  const exportData = {
    name: scheme.name,
    description: scheme.description,
    reviewStatus: scheme.reviewStatus,
    bells: scheme.bells.map((bell) => ({
      id: bell.id,
      name: bell.name,
      position: bell.position,
      weight: bell.weight,
      strikePosition: bell.strikePosition,
      note: bell.note,
      frequencies: bell.frequencies,
    })),
  };
  return JSON.stringify(exportData, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateBatchBellTemplate(format: ExportFormat): string {
  const sampleBells: Bell[] = [
    { ...createEmptyBell(1), name: '示例钟1', note: 'C4', weight: 15.5 },
    { ...createEmptyBell(2), name: '示例钟2', note: 'D4', weight: 14.0 },
    { ...createEmptyBell(3), name: '示例钟3', note: 'E4', weight: 12.5 },
  ];

  sampleBells.forEach((b, i) => {
    const baseFreq = 261.63 * Math.pow(2, i / 12);
    b.frequencies['正鼓'] = { target: baseFreq, measured: baseFreq * 1.005 };
    b.frequencies['右鼓'] = { target: baseFreq * 1.125, measured: baseFreq * 1.123 };
    b.frequencies['左鼓'] = { target: baseFreq * 1.1, measured: baseFreq * 1.098 };
    b.frequencies['钲部'] = { target: baseFreq * 0.95, measured: baseFreq * 0.952 };
  });

  if (format === 'json') {
    return exportBellsToJSON(sampleBells);
  } else {
    return exportBellsToCSV(sampleBells);
  }
}
