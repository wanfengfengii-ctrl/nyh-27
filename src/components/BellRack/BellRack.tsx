import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Paper, Title, Group, Button, Text } from '@mantine/core';
import { Plus } from 'lucide-react';
import type { Bell } from '../../types/bell';
import { BellCard } from './BellCard';

interface BellRackProps {
  bells: Bell[];
  selectedBellId: string | null;
  allowedDeviation: number;
  onSelectBell: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onAddBell: () => void;
}

export function BellRack({
  bells,
  selectedBellId,
  allowedDeviation,
  onSelectBell,
  onReorder,
  onAddBell,
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

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3} size="h4">
          编钟音列
        </Title>
        <Button size="sm" leftSection={<Plus size={16} />} variant="light" color="bronze" onClick={onAddBell}>
          添加编钟
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="sm">
        拖拽编钟调整排列顺序 · 点击选中查看详情
      </Text>

      <Paper p="sm" bg="darkWood.0" style={{ borderRadius: 8, overflowX: 'auto' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={bells.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
            <Group gap="sm" style={{ minWidth: 'max-content' }}>
              {bells.map((bell) => (
                <BellCard
                  key={bell.id}
                  bell={bell}
                  selected={selectedBellId === bell.id}
                  allowedDeviation={allowedDeviation}
                  onSelect={onSelectBell}
                />
              ))}
              {bells.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" w="100%" py="xl">
                  暂无编钟，点击上方按钮添加
                </Text>
              )}
            </Group>
          </SortableContext>
        </DndContext>
      </Paper>
    </Paper>
  );
}
