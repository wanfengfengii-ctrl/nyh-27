import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Text, Badge, Group, ActionIcon, useMantineTheme } from '@mantine/core';
import { Volume2, GripVertical } from 'lucide-react';
import type { Bell } from '../../types/bell';
import { getDeviationResult, formatCents } from '../../utils/cents';
import { useAudio } from '../../hooks/useAudio';
import './BellCard.css';

interface BellCardProps {
  bell: Bell;
  selected: boolean;
  allowedDeviation: number;
  onSelect: (id: string) => void;
}

export function BellCard({ bell, selected, allowedDeviation, onSelect }: BellCardProps) {
  const theme = useMantineTheme();
  const { playBellSound } = useAudio();
  const deviation = getDeviationResult(bell.targetFrequency, bell.measuredFrequency, allowedDeviation);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bell.id,
  });

  const cardStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) as any,
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderWidth: selected ? 2 : 1,
    borderStyle: 'solid',
    borderColor: selected ? theme.colors.bronze[5] : theme.colors.bronze[2],
    background: selected ? theme.colors.bronze[0] : theme.white,
    minWidth: 110,
    flex: '0 0 auto',
    cursor: 'pointer',
  };

  const deviationColor = deviation.isOutOfRange ? 'red' : deviation.direction === 'sharp' ? 'blue' : 'green';

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playBellSound(bell.measuredFrequency);
  };

  return (
    <Card
      ref={setNodeRef as any}
      style={cardStyle}
      padding="sm"
      onClick={() => onSelect(bell.id)}
      shadow={selected ? 'md' : 'sm'}
      className={`bell-card ${selected ? 'selected' : ''}`}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <GripVertical size={16} style={{ opacity: 0.5 }} />
        </div>
        <Badge size="sm" variant="light" color="bronze">
          第{bell.position}位
        </Badge>
        <ActionIcon size="sm" variant="subtle" color="bronze" onClick={handlePlayClick}>
          <Volume2 size={14} />
        </ActionIcon>
      </div>

      <Text size="sm" fw={600} lineClamp={1} ta="center" mb="xs">
        {bell.name}
      </Text>

      <Text size="xs" c="dimmed" ta="center">
        {bell.measuredFrequency.toFixed(2)} Hz
      </Text>

      <Group justify="center" mt={6}>
        <Badge size="xs" color={deviationColor} variant={deviation.isOutOfRange ? 'filled' : 'light'}>
          {formatCents(deviation.cents)}
        </Badge>
      </Group>

      <div
        style={{
          width: '100%',
          height: 4,
          marginTop: 8,
          borderRadius: 2,
          background: 'linear-gradient(to right, #5C4A3D, #C9A962, #5C4A3D)',
          opacity: 0.3,
        }}
      />
    </Card>
  );
}
