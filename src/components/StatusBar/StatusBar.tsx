import { Paper, Group, Text, Button, Badge, NumberInput, Tooltip } from '@mantine/core';
import { CheckCircle2, AlertTriangle, Settings } from 'lucide-react';

interface StatusBarProps {
  confirmed: boolean;
  confirmedAt: Date | null;
  allowedDeviation: number;
  onConfirm: () => void;
  onAllowedDeviationChange: (value: number) => void;
  bellCount: number;
}

export function StatusBar({
  confirmed,
  confirmedAt,
  allowedDeviation,
  onConfirm,
  onAllowedDeviationChange,
  bellCount,
}: StatusBarProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Paper p="sm" radius="md" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              编钟数量:
            </Text>
            <Badge size="sm" variant="light" color="bronze">
              {bellCount} 口
            </Badge>
          </Group>

          <Group gap="xs">
            <Text size="sm" c="dimmed">
              状态:
            </Text>
            {confirmed ? (
              <Badge size="sm" color="green" leftSection={<CheckCircle2 size={12} />}>
                已确认
              </Badge>
            ) : (
              <Tooltip label="音列已调整，需重新复核确认">
                <Badge size="sm" color="yellow" leftSection={<AlertTriangle size={12} />}>
                  待复核
                </Badge>
              </Tooltip>
            )}
          </Group>

          {confirmed && confirmedAt && (
            <Text size="xs" c="dimmed">
              确认于 {formatDate(confirmedAt)}
            </Text>
          )}
        </Group>

        <Group gap="md">
          <Group gap="xs">
            <Settings size={14} style={{ opacity: 0.6 }} />
            <Text size="sm" c="dimmed">
              允许偏差:
            </Text>
            <NumberInput
              size="xs"
              w={80}
              value={allowedDeviation}
              onChange={(v) => onAllowedDeviationChange(typeof v === 'number' ? v : 50)}
              min={1}
              max={200}
              rightSection={<Text size="xs" c="dimmed">音分</Text>}
            />
          </Group>

          <Button
            size="sm"
            onClick={onConfirm}
            variant={confirmed ? 'light' : 'filled'}
            color={confirmed ? 'gray' : 'bronze'}
            leftSection={confirmed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          >
            {confirmed ? '重新确认' : '确认音列'}
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
