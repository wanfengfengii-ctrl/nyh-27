import { useState } from 'react';
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
  Tabs,
  Progress,
  Tooltip,
} from '@mantine/core';
import { Volume2, Trash2, Info, Mic, MicOff, Check, RefreshCw } from 'lucide-react';
import type { Bell, StrikePosition } from '../../types/bell';
import { STRIKE_POSITIONS } from '../../types/bell';
import { getBellDeviation, formatCents, formatFrequency } from '../../utils/cents';
import { validateFrequency, validateWeight } from '../../utils/validation';
import { useAudio } from '../../hooks/useAudio';
import { usePitchDetection } from '../../hooks/usePitchDetection';

interface BellEditorProps {
  bell: Bell | null;
  allowedDeviation: number;
  currentStrikePosition: StrikePosition;
  onUpdate: (id: string, updates: Partial<Bell>) => void;
  onUpdateFrequency: (bellId: string, pos: StrikePosition, type: 'target' | 'measured', value: number) => void;
  onRemove: (id: string) => void;
  onStrikePositionChange: (pos: StrikePosition) => void;
}

export function BellEditor({
  bell,
  allowedDeviation,
  currentStrikePosition,
  onUpdate,
  onUpdateFrequency,
  onRemove,
  onStrikePositionChange,
}: BellEditorProps) {
  const { playBellSound } = useAudio();
  const { isRecording, duration, detectedFrequency, confidence, startRecording, stopRecording } =
    usePitchDetection();
  const [recordingPos, setRecordingPos] = useState<StrikePosition>('正鼓');

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

  const deviation = getBellDeviation(bell, currentStrikePosition, allowedDeviation);
  const currentFreq = bell.frequencies[currentStrikePosition];

  const handleNameChange = (value: string) => {
    onUpdate(bell.id, { name: value });
  };

  const handleWeightChange = (value: number | '') => {
    const num = typeof value === 'number' ? value : 0;
    onUpdate(bell.id, { weight: num });
  };

  const handleNoteChange = (value: string) => {
    onUpdate(bell.id, { note: value });
  };

  const handleTargetFreqChange = (pos: StrikePosition, value: number | string) => {
    const num = typeof value === 'number' ? value : parseFloat(value) || 0;
    onUpdateFrequency(bell.id, pos, 'target', num);
  };

  const handleMeasuredFreqChange = (pos: StrikePosition, value: number | string) => {
    const num = typeof value === 'number' ? value : parseFloat(value) || 0;
    onUpdateFrequency(bell.id, pos, 'measured', num);
  };

  const handleStartRecording = (pos: StrikePosition) => {
    setRecordingPos(pos);
    startRecording();
  };

  const handleStopRecording = () => {
    const freq = stopRecording();
    if (freq && freq > 0) {
      onUpdateFrequency(bell.id, recordingPos, 'measured', Math.round(freq * 100) / 100);
    }
  };

  const handleApplyDetected = () => {
    if (detectedFrequency && detectedFrequency > 0) {
      onUpdateFrequency(bell.id, recordingPos, 'measured', Math.round(detectedFrequency * 100) / 100);
    }
  };

  const targetFreqValid = validateFrequency(currentFreq.target);
  const measuredFreqValid = validateFrequency(currentFreq.measured);
  const weightValid = validateWeight(bell.weight);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'green';
    if (conf >= 50) return 'yellow';
    return 'red';
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3} size="h4">
          编钟详情
        </Title>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="bronze"
            onClick={() => playBellSound(currentFreq.measured)}
            title="播放音高"
          >
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

        <Group grow>
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
          <TextInput
            label="音名"
            description="音名标记"
            value={bell.note || ''}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="如 C4, D5"
          />
        </Group>

        <Divider label="频率参数（按敲击位置）" labelPosition="center" />

        <Tabs value={currentStrikePosition} onChange={(v) => v && onStrikePositionChange(v as StrikePosition)}>
          <Tabs.List grow>
            {STRIKE_POSITIONS.map((pos) => {
              const d = getBellDeviation(bell, pos, allowedDeviation);
              return (
                <Tabs.Tab
                  key={pos}
                  value={pos}
                  rightSection={
                    <Badge
                      size="xs"
                      color={d.isOutOfRange ? 'red' : 'gray'}
                      variant={d.isOutOfRange ? 'filled' : 'light'}
                    >
                      {formatCents(d.cents)}
                    </Badge>
                  }
                >
                  {pos}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          {STRIKE_POSITIONS.map((pos) => (
            <Tabs.Panel key={pos} value={pos} pt="md">
              <Stack gap="sm">
                <Group grow>
                  <NumberInput
                    label="目标频率"
                    description="理想音高频率"
                    value={bell.frequencies[pos].target}
                    onChange={(v) => handleTargetFreqChange(pos, v)}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    size="sm"
                    rightSection={<Text size="xs" c="dimmed">Hz</Text>}
                  />
                  <NumberInput
                    label="实测频率"
                    description="实际测量的频率"
                    value={bell.frequencies[pos].measured}
                    onChange={(v) => handleMeasuredFreqChange(pos, v)}
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    size="sm"
                    rightSection={
                      <Tooltip label="录音识别">
                        <ActionIcon
                          size="sm"
                          color={isRecording && recordingPos === pos ? 'red' : 'bronze'}
                          variant={isRecording && recordingPos === pos ? 'filled' : 'light'}
                          onClick={
                            isRecording && recordingPos === pos
                              ? handleStopRecording
                              : () => handleStartRecording(pos)
                          }
                        >
                          {isRecording && recordingPos === pos ? <MicOff size={14} /> : <Mic size={14} />}
                        </ActionIcon>
                      </Tooltip>
                    }
                  />
                </Group>

                {isRecording && recordingPos === pos && (
                  <Paper p="sm" bg="dark.0" radius="sm">
                    <Group justify="space-between" mb="xs">
                      <Badge size="sm" color="red" variant="filled">
                        录音中 {duration.toFixed(1)}s
                      </Badge>
                      {detectedFrequency && (
                        <Badge size="sm" color={getConfidenceColor(confidence)} variant="light">
                          置信度 {confidence.toFixed(0)}%
                        </Badge>
                      )}
                    </Group>
                    {detectedFrequency && (
                      <>
                        <Text size="lg" fw={600} ta="center" mb="xs">
                          {detectedFrequency.toFixed(2)} Hz
                        </Text>
                        <Group justify="center" mb="xs">
                          <Button
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<Check size={14} />}
                            onClick={handleStopRecording}
                          >
                            应用此频率
                          </Button>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={handleStopRecording}
                          >
                            取消
                          </Button>
                        </Group>
                      </>
                    )}
                    <Progress
                      size="xs"
                      value={Math.min(100, (duration / 3) * 100)}
                      color="red"
                      striped
                      animated
                    />
                    <Text size="xs" c="dimmed" ta="center" mt="xs">
                      敲击编钟以识别主频，建议录制 2-3 秒
                    </Text>
                  </Paper>
                )}

                {!isRecording && detectedFrequency && recordingPos === pos && (
                  <Alert icon={<Check size={14} />} color="green">
                    <Group justify="space-between">
                      <Text size="sm">
                        上次识别: {detectedFrequency.toFixed(2)} Hz（置信度 {confidence.toFixed(0)}%）
                      </Text>
                      <Button
                        size="xs"
                        variant="light"
                        color="green"
                        onClick={handleApplyDetected}
                      >
                        应用
                      </Button>
                    </Group>
                  </Alert>
                )}

                <Group grow>
                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      音分偏差
                    </Text>
                    <Text
                      size="md"
                      fw={600}
                      c={deviation.isOutOfRange ? 'red' : 'bronze.6'}
                    >
                      {formatCents(getBellDeviation(bell, pos, allowedDeviation).cents)}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      偏差方向
                    </Text>
                    <Text size="md" fw={600}>
                      {getBellDeviation(bell, pos, allowedDeviation).direction === 'sharp'
                        ? '偏高'
                        : getBellDeviation(bell, pos, allowedDeviation).direction === 'flat'
                        ? '偏低'
                        : '准确'}
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Tabs.Panel>
          ))}
        </Tabs>

        <Divider label="当前敲击位置" labelPosition="center" />

        <Select
          label="默认敲击位置"
          description="当前显示和计算使用的敲击位置"
          value={bell.strikePosition}
          onChange={(v) => v && onUpdate(bell.id, { strikePosition: v as StrikePosition })}
          data={STRIKE_POSITIONS.map((p) => ({ value: p, label: p }))}
        />
      </Stack>

      <Group mt="xl">
        <Button
          fullWidth
          variant="light"
          color="bronze"
          onClick={() => playBellSound(currentFreq.measured)}
          leftSection={<Volume2 size={16} />}
        >
          试听 {currentStrikePosition} 音高
        </Button>
      </Group>
    </Paper>
  );
}
