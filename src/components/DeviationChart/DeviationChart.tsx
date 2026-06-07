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
  Legend,
} from 'recharts';
import type { Bell, BellScheme, StrikePosition } from '../../types/bell';
import { getBellCents } from '../../utils/cents';

interface DeviationChartProps {
  bells: Bell[];
  allowedDeviation: number;
  strikePosition: StrikePosition;
  compareSchemes?: BellScheme[];
}

const schemeColors = ['#C9A962', '#5C7A9A', '#7A9A5C', '#9A5C7A'];

export function DeviationChart({
  bells,
  allowedDeviation,
  strikePosition,
  compareSchemes = [],
}: DeviationChartProps) {
  const allSchemes = [{ name: '当前方案', bells }].concat(
    compareSchemes.map((s) => ({ name: s.name, bells: s.bells }))
  );

  const allPositions = new Set<number>();
  allSchemes.forEach((scheme) => {
    scheme.bells.forEach((bell) => allPositions.add(bell.position));
  });
  const sortedPositions = Array.from(allPositions).sort((a, b) => a - b);

  const data = sortedPositions.map((pos) => {
    const baseBell = bells.find((b) => b.position === pos);
    const baseCents = baseBell ? getBellCents(baseBell, strikePosition) : 0;
    const isOutOfRange = Math.abs(baseCents) > allowedDeviation;

    const result: any = {
      position: pos,
      name: baseBell ? baseBell.name : `第${pos}位`,
      当前方案: baseBell ? Number(baseCents.toFixed(2)) : null,
      isOutOfRange,
      direction: baseCents > 0 ? '偏高' : baseCents < 0 ? '偏低' : '准确',
    };

    compareSchemes.forEach((scheme) => {
      const schemeBell = scheme.bells.find((b) => b.position === pos);
      if (schemeBell) {
        const schemeCents = getBellCents(schemeBell, strikePosition);
        result[scheme.name] = Number(schemeCents.toFixed(2));
      }
    });

    return result;
  });

  const outOfRangeCount = data.filter((d) => d.isOutOfRange && d['当前方案'] !== null).length;
  const maxDeviation = Math.max(
    ...data.map((d) => {
      let max = 0;
      if (d['当前方案'] !== null) {
        max = Math.abs(d['当前方案']);
      }
      compareSchemes.forEach((s) => {
        if (d[s.name] !== undefined) {
          max = Math.max(max, Math.abs(d[s.name]));
        }
      });
      return max;
    }),
    allowedDeviation
  );
  const yDomain = Math.ceil(Math.max(maxDeviation * 1.2, allowedDeviation * 1.5));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper p="sm" shadow="sm" withBorder style={{ background: 'white', maxWidth: 280 }}>
          <Text size="sm" fw={600} mb="xs">
            {label} · {strikePosition}
          </Text>
          {payload.map((entry: any, index: number) => {
            const value = entry.value;
            const isOutOfRange = Math.abs(value) > allowedDeviation;
            return (
              <Text key={index} size="xs" style={{ color: entry.color }}>
                {entry.name}: {value > 0 ? '+' : ''}
                {value} ct
                {isOutOfRange && ' · 超限'}
              </Text>
            );
          })}
        </Paper>
      );
    }
    return null;
  };

  const hasCompare = compareSchemes.length > 0;

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={4} size="h5">
            偏差分布
          </Title>
          <Text size="xs" c="dimmed">
            {strikePosition} · 各编钟音分偏差
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
          {hasCompare && (
            <Badge size="sm" color="blue" variant="light">
              {compareSchemes.length + 1} 方案
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
            {hasCompare && <Legend wrapperStyle={{ fontSize: 11 }} />}
            <ReferenceLine y={0} stroke="#8a7755" strokeWidth={1} />
            <ReferenceLine
              y={allowedDeviation}
              stroke="#B8453A"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: `+${allowedDeviation}`, fontSize: 10, fill: '#B8453A' }}
            />
            <ReferenceLine
              y={-allowedDeviation}
              stroke="#B8453A"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{ value: `-${allowedDeviation}`, fontSize: 10, fill: '#B8453A' }}
            />

            {hasCompare ? (
              <>
                <Bar dataKey="当前方案" fill={schemeColors[0]} radius={[4, 4, 0, 0]} />
                {compareSchemes.map((scheme, idx) => (
                  <Bar
                    key={scheme.id}
                    dataKey={scheme.name}
                    fill={schemeColors[(idx + 1) % schemeColors.length]}
                    fillOpacity={0.6}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </>
            ) : (
              <Bar dataKey="当前方案" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isOutOfRange ? '#B8453A' : entry['当前方案'] >= 0 ? '#5C7A9A' : '#4A7C59'}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Paper>
  );
}
