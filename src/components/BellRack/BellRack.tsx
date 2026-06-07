import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Paper, Title, Group, Button, Text, Badge } from '@mantine/core';
import { Plus, AlertTriangle } from 'lucide-react';
import type { Bell, StrikePosition } from '../../types/bell';
import { BellCard } from './BellCard';
import { FilterSortToolbar } from '../FilterSortToolbar/FilterSortToolbar';

interface BellRackProps {
  bells: Bell[];
  filteredBells: Bell[];
  selectedBellId: string | null;
  allowedDeviation: number;
  currentStrikePosition: StrikePosition;
  filterOutOfRange: boolean;
  sortBy: 'position' | 'deviation' | 'weight' | 'name';
  sortOrder: 'asc' | 'desc';
  onSelectBell: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onAddBell: () => void;
  onStrikePositionChange: (pos: StrikePosition) => void;
  onFilterChange: (value: boolean) => void;
  onSortByChange: (value: 'position' | 'deviation' | 'weight' | 'name') => void;
  onSortOrderChange: (value: 'asc' | 'desc') => void;
}

export function BellRack({
  bells,
  filteredBells,
  selectedBellId,
  allowedDeviation,
  currentStrikePosition,
  filterOutOfRange,
  sortBy,
  sortOrder,
  onSelectBell,
  onReorder,
  onAddBell,
  onStrikePositionChange,
  onFilterChange,
  onSortByChange,
  onSortOrderChange,
}: BellRackProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  const displayBells = sortBy === 'position' && !filterOutOfRange ? bells : filteredBells;

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap="md">
          <Title order={3} size="h4">
            编钟音列
          </Title>
          <Badge size="sm" variant="light" color="bronze">
            共 {bells.length} 口
            {filterOutOfRange && ` · 超限 ${filteredBells.length} 口`}
          </Badge>
          {filterOutOfRange && (
            <Badge size="sm" color="red" leftSection={<AlertTriangle size={12} />} variant="light">
              超限筛选中
            </Badge>
          )}
        </Group>
        <Button size="sm" leftSection={<Plus size={16} />} variant="light" color="bronze" onClick={onAddBell}>
          添加编钟
        </Button>
      </Group>

      <FilterSortToolbar
        currentStrikePosition={currentStrikePosition}
        filterOutOfRange={filterOutOfRange}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onStrikePositionChange={onStrikePositionChange}
        onFilterChange={onFilterChange}
        onSortByChange={onSortByChange}
        onSortOrderChange={onSortOrderChange}
      />

      <Text size="sm" c="dimmed" my="sm">
        拖拽编钟调整排列顺序 · 点击选中查看详情 · 切换敲击位置查看对应频率
      </Text>

      <Paper p="sm" bg="darkWood.0" style={{ borderRadius: 8, overflowX: 'auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayBells.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
            <Group gap="sm" style={{ minWidth: 'max-content' }}>
              {displayBells.map((bell) => (
                <BellCard
                  key={bell.id}
                  bell={bell}
                  selected={selectedBellId === bell.id}
                  allowedDeviation={allowedDeviation}
                  strikePosition={currentStrikePosition}
                  onSelect={onSelectBell}
                />
              ))}
              {displayBells.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" w="100%" py="xl">
                  {filterOutOfRange ? '没有超限的编钟' : '暂无编钟，点击上方按钮添加'}
                </Text>
              )}
            </Group>
          </SortableContext>
        </DndContext>
      </Paper>
    </Paper>
  );
}
