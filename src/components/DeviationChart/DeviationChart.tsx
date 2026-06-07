import { Paper, Title, Text, Group, Badge } from '@mantine/core';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { Bell } from '../../types/bell';
import { calculateCents } from '../../utils/cents';

interface DeviationChartProps {
  bells: Bell[];
  allowedDeviation: number;
}

export function DeviationChart({ bells, allowedDeviation }: DeviationChartProps) {
  const data = bells.map((bell) => {
    const cents = calculateCents(bell.targetFrequency, bell.measuredFrequency);
    const isOutOfRange = Math.abs(cents) > allowedDeviation;
    return {
      name: bell.name,
      position: bell.position,
      音分偏差: Number(cents.toFixed(2)),
      isOutOfRange,
      direction: cents > 0 ? '偏高' : cents < 0 ? '偏低' : '准确',
    };
  });

  const outOfRangeCount = data.filter((d) => d.isOutOfRange).length;
  const maxDeviation = Math.max(...data.map((d) => Math.abs(d['音分偏差'])), allowedDeviation);
  const yDomain = Math.ceil(Math.max(maxDeviation * 1.2, allowedDeviation * 1.5));

  const getBarColor = (entry: any) => {
    if (entry.isOutOfRange) {
      return '#B8453A';
    }
    return entry['音分偏差'] >= 0 ? '#5C7A9A' : '#4A7C59';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <Paper p="sm" shadow="sm" withBorder style={{ background: 'white' }}>
          <Text size="sm" fw={600} mb="xs">
            {label}
          </Text>
          <Text size="xs">
            音分偏差: {entry['音分偏差'] > 0 ? '+' : ''}
            {entry['音分偏差']} ct
          </Text>
          <Text size="xs" c={entry.isOutOfRange ? 'red' : 'dimmed'}>
            {entry.direction}
            {entry.isOutOfRange ? ' · 超限' : ''}
          </Text>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={4} size="h5">
            偏差分布
          </Title>
          <Text size="xs" c="dimmed">
            各编钟音分偏差柱状图
          </Text>
        </div>
        <Group gap="xs">
          <Badge size="sm" color="green" variant="light">
            正常 {data.length - outOfRangeCount}
          </Badge>
          {outOfRangeCount > 0 && (
            <Badge size="sm" color="red" variant="filled">
              超限 {outOfRangeCount}
            </Badge>
          )}
        </Group>
      </Group>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5ddd0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={60}
              stroke="#8a7755"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#8a7755"
              domain={[-yDomain, yDomain]}
              label={{ value: '音分 (ct)', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#8a7755" strokeWidth={1} />
            <ReferenceLine y={allowedDeviation} stroke="#B8453A" strokeDasharray="3 3" strokeWidth={1} label={{ value: `+${allowedDeviation}`, fontSize: 10, fill: '#B8453A' }} />
            <ReferenceLine y={-allowedDeviation} stroke="#B8453A" strokeDasharray="3 3" strokeWidth={1} label={{ value: `-${allowedDeviation}`, fontSize: 10, fill: '#B8453A' }} />
            <Bar dataKey="音分偏差" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
}
