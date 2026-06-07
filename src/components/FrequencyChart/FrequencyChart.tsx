import { Paper, Title, Text } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Bell } from '../../types/bell';

interface FrequencyChartProps {
  bells: Bell[];
}

export function FrequencyChart({ bells }: FrequencyChartProps) {
  const data = bells.map((bell) => ({
    name: bell.name,
    position: bell.position,
    目标频率: bell.targetFrequency,
    实测频率: bell.measuredFrequency,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper p="sm" shadow="sm" withBorder style={{ background: 'white' }}>
          <Text size="sm" fw={600} mb="xs">
            {label}
          </Text>
          {payload.map((entry: any, index: number) => (
            <Text key={index} size="xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)} Hz
            </Text>
          ))}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Title order={4} size="h5" mb="md">
        频率曲线
      </Title>
      <Text size="xs" c="dimmed" mb="sm">
        目标频率与实测频率对比
      </Text>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
              label={{ value: 'Hz', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="目标频率"
              stroke="#9a7d3d"
              strokeWidth={2}
              dot={{ fill: '#9a7d3d', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="实测频率"
              stroke="#C9A962"
              strokeWidth={2}
              dot={{ fill: '#C9A962', r: 3 }}
              activeDot={{ r: 5 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
}
