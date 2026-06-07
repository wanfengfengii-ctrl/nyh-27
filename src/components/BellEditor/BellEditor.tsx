import {
  Paper,
  Title,
  Text,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  Badge,
  Divider,
  Alert,
  ActionIcon,
} from '@mantine/core';
import { Volume2, Trash2, Info } from 'lucide-react';
import type { Bell, StrikePosition } from '../../types/bell';
import { STRIKE_POSITIONS } from '../../types/bell';
import { getDeviationResult, formatCents } from '../../utils/cents';
import { validateFrequency, validateWeight } from '../../utils/validation';
import { useAudio } from '../../hooks/useAudio';

interface BellEditorProps {
  bell: Bell | null;
  allowedDeviation: number;
  onUpdate: (id: string, updates: Partial<Bell>) => void;
  onRemove: (id: string) => void;
}

export function BellEditor({ bell, allowedDeviation, onUpdate, onRemove }: BellEditorProps) {
  const { playBellSound } = useAudio();

  if (!bell) {
    return (
      <Paper p="md" radius="md" withBorder h="100%">
        <Title order={3} size="h4" mb="md">
          编钟详情
        </Title>
        <Text c="dimmed" ta="center" py="xl">
          请从上方音列中选择一口编钟
        </Text>
      </Paper>
    );
  }

  const deviation = getDeviationResult(bell.targetFrequency, bell.measuredFrequency, allowedDeviation);

  const handleNameChange = (value: string) => {
    onUpdate(bell.id, { name: value });
  };

  const handleTargetFreqChange = (value: number | '') => {
    const num = typeof value === 'number' ? value : 0;
    onUpdate(bell.id, { targetFrequency: num });
  };

  const handleMeasuredFreqChange = (value: number | '') => {
    const num = typeof value === 'number' ? value : 0;
    onUpdate(bell.id, { measuredFrequency: num });
  };

  const handleWeightChange = (value: number | '') => {
    const num = typeof value === 'number' ? value : 0;
    onUpdate(bell.id, { weight: num });
  };

  const handleStrikePositionChange = (value: string | null) => {
    if (value) {
      onUpdate(bell.id, { strikePosition: value as StrikePosition });
    }
  };

  const targetFreqValid = validateFrequency(bell.targetFrequency);
  const measuredFreqValid = validateFrequency(bell.measuredFrequency);
  const weightValid = validateWeight(bell.weight);

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3} size="h4">
          编钟详情
        </Title>
        <Group gap="xs">
          <ActionIcon variant="light" color="bronze" onClick={() => playBellSound(bell.measuredFrequency)} title="播放音高">
            <Volume2 size={18} />
          </ActionIcon>
          <ActionIcon variant="light" color="red" onClick={() => onRemove(bell.id)} title="删除编钟">
            <Trash2 size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <Group mb="md">
        <Badge size="lg" variant="light" color="bronze">
          第 {bell.position} 位
        </Badge>
        <Badge
          size="lg"
          color={deviation.isOutOfRange ? 'red' : deviation.direction === 'sharp' ? 'blue' : 'green'}
          variant={deviation.isOutOfRange ? 'filled' : 'light'}
        >
          {formatCents(deviation.cents)}
          {deviation.isOutOfRange ? ' · 超限' : ''}
        </Badge>
      </Group>

      {deviation.isOutOfRange && (
        <Alert icon={<Info size={16} />} color="red" title="音分偏差超限" mb="md">
          当前偏差 {formatCents(deviation.cents)}，超出允许范围 ±{allowedDeviation} 音分
        </Alert>
      )}

      <Stack gap="md">
        <TextInput
          label="编钟名称"
          value={bell.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="请输入编钟名称"
        />

        <Divider label="频率参数" labelPosition="center" />

        <NumberInput
          label="目标频率"
          description="理想音高频率 (Hz)"
          value={bell.targetFrequency}
          onChange={handleTargetFreqChange}
          min={0}
          decimalScale={2}
          fixedDecimalScale
          error={!targetFreqValid ? '频率必须大于零' : false}
          rightSection={<Text size="xs" c="dimmed">Hz</Text>}
        />

        <NumberInput
          label="实测频率"
          description="实际测量的频率 (Hz)"
          value={bell.measuredFrequency}
          onChange={handleMeasuredFreqChange}
          min={0}
          decimalScale={2}
          fixedDecimalScale
          error={!measuredFreqValid ? '频率必须大于零' : false}
          rightSection={<Text size="xs" c="dimmed">Hz</Text>}
        />

        <Group grow>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              音分偏差
            </Text>
            <Text size="lg" fw={600} c={deviation.isOutOfRange ? 'red' : 'bronze.6'}>
              {formatCents(deviation.cents)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              偏差方向
            </Text>
            <Text size="lg" fw={600}>
              {deviation.direction === 'sharp' ? '偏高' : deviation.direction === 'flat' ? '偏低' : '准确'}
            </Text>
          </div>
        </Group>

        <Divider label="物理参数" labelPosition="center" />

        <NumberInput
          label="重量"
          description="编钟重量 (kg)"
          value={bell.weight}
          onChange={handleWeightChange}
          min={0}
          decimalScale={2}
          fixedDecimalScale
          error={!weightValid ? '重量必须大于零' : false}
          rightSection={<Text size="xs" c="dimmed">kg</Text>}
        />

        <Select
          label="敲击位置"
          description="测量时的敲击位置"
          value={bell.strikePosition}
          onChange={handleStrikePositionChange}
          data={STRIKE_POSITIONS.map((p) => ({ value: p, label: p }))}
        />
      </Stack>

      <Group mt="xl">
        <Button fullWidth variant="light" color="bronze" onClick={() => playBellSound(bell.measuredFrequency)} leftSection={<Volume2 size={16} />}>
          试听音高
        </Button>
      </Group>
    </Paper>
  );
}
