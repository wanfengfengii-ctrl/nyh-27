import { Group, SegmentedControl, Button, Select, ActionIcon, Tooltip } from '@mantine/core';
import {
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  List,
  Scale,
  Hash,
  Type,
} from 'lucide-react';
import type { BellSetState, StrikePosition } from '../../types/bell';
import { STRIKE_POSITIONS } from '../../types/bell';

interface FilterSortToolbarProps {
  currentStrikePosition: StrikePosition;
  filterOutOfRange: boolean;
  sortBy: BellSetState['sortBy'];
  sortOrder: BellSetState['sortOrder'];
  onStrikePositionChange: (pos: StrikePosition) => void;
  onFilterChange: (value: boolean) => void;
  onSortByChange: (value: BellSetState['sortBy']) => void;
  onSortOrderChange: (value: BellSetState['sortOrder']) => void;
}

const sortOptions = [
  { value: 'position', label: '音位', icon: <Hash size={14} /> },
  { value: 'deviation', label: '偏差', icon: <ArrowUpDown size={14} /> },
  { value: 'weight', label: '重量', icon: <Scale size={14} /> },
  { value: 'name', label: '名称', icon: <Type size={14} /> },
];

export function FilterSortToolbar({
  currentStrikePosition,
  filterOutOfRange,
  sortBy,
  sortOrder,
  onStrikePositionChange,
  onFilterChange,
  onSortByChange,
  onSortOrderChange,
}: FilterSortToolbarProps) {
  return (
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Group gap="xs">
        <Tooltip label="敲击位置切换">
          <SegmentedControl
            size="xs"
            value={currentStrikePosition}
            onChange={(v) => onStrikePositionChange(v as StrikePosition)}
            data={STRIKE_POSITIONS.map((p) => ({ value: p, label: p }))}
          />
        </Tooltip>
      </Group>

      <Group gap="xs">
        <Tooltip label={filterOutOfRange ? '显示全部' : '只显示超限'}>
          <Button
            size="xs"
            variant={filterOutOfRange ? 'filled' : 'light'}
            color={filterOutOfRange ? 'red' : 'gray'}
            leftSection={<AlertTriangle size={14} />}
            onClick={() => onFilterChange(!filterOutOfRange)}
          >
            超限筛选
          </Button>
        </Tooltip>

        <Select
          size="xs"
          value={sortBy}
          onChange={(v) => v && onSortByChange(v as BellSetState['sortBy'])}
          data={sortOptions}
          leftSection={<ArrowUpDown size={14} />}
          style={{ width: 100 }}
        />

        <Tooltip label={sortOrder === 'asc' ? '升序' : '降序'}>
          <ActionIcon
            size="sm"
            variant="light"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
