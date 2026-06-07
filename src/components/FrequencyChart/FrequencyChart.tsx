import { Paper, Title, Text, Badge, Group } from '@mantine/core';
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
import type { Bell, BellScheme, StrikePosition } from '../../types/bell';

interface FrequencyChartProps {
  bells: Bell[];
  strikePosition: StrikePosition;
  compareSchemes?: BellScheme[];
}

const schemeColors = [
  { main: '#C9A962', target: '#9a7d3d' },
  { main: '#5C7A9A', target: '#3d5a7a' },
  { main: '#7A9A5C', target: '#5a7a3d' },
  { main: '#9A5C7A', target: '#7a3d5a' },
];

export function FrequencyChart({ bells, strikePosition, compareSchemes = [] }: FrequencyChartProps) {
  const baseData = bells.map((bell) => ({
    name: bell.name,
    position: bell.position,
    [`目标频率`]: bell.frequencies[strikePosition].target,
    [`实测频率`]: bell.frequencies[strikePosition].measured,
  }));

  const allSchemes = [{ name: '当前方案', bells, colors: schemeColors[0] }].concat(
    compareSchemes.map((s, i) => ({
      name: s.name,
      bells: s.bells,
      colors: schemeColors[(i + 1) % schemeColors.length],
    }))
  );

  const data = baseData.map((item, idx) => {
    const combined: any = { ...item };
    compareSchemes.forEach((scheme, si) => {
      const bell = scheme.bells[idx];
      if (bell) {
        combined[`${scheme.name} 目标`] = bell.frequencies[strikePosition].target;
        combined[`${scheme.name} 实测`] = bell.frequencies[strikePosition].measured;
      }
    });
    return combined;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper p="sm" shadow="sm" withBorder style={{ background: 'white', maxWidth: 280 }}>
          <Text size="sm" fw={600} mb="xs">
            {label} · {strikePosition}
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
      <Group justify="space-between" mb="md">
        <div>
          <Title order={4} size="h5">
            频率曲线
          </Title>
          <Text size="xs" c="dimmed">
            {strikePosition} · 目标频率与实测频率对比
          </Text>
        </div>
        {compareSchemes.length > 0 && (
          <Badge size="sm" color="blue" variant="light">
            {compareSchemes.length + 1} 方案对比
          </Badge>
        )}
      </Group>

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
            <Legend wrapperStyle={{ fontSize: 11 }} />

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

            {compareSchemes.map((scheme, idx) => (
              <Line
                key={`${scheme.id}-target`}
                type="monotone"
                dataKey={`${scheme.name} 目标`}
                stroke={schemeColors[(idx + 1) % schemeColors.length].target}
                strokeWidth={1.5}
                strokeOpacity={0.7}
                dot={false}
              />
            ))}
            {compareSchemes.map((scheme, idx) => (
              <Line
                key={`${scheme.id}-measured`}
                type="monotone"
                dataKey={`${scheme.name} 实测`}
                stroke={schemeColors[(idx + 1) % schemeColors.length].main}
                strokeWidth={1.5}
                strokeOpacity={0.7}
                strokeDasharray="3 3"
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
}
