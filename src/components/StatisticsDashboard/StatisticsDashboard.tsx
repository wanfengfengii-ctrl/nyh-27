import { useMemo } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  SimpleGrid,
  Card,
  ThemeIcon,
  Progress,
  Badge,
  RingProgress,
  Divider,
  ScrollArea,
} from '@mantine/core';
import {
  BarChart3,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Zap,
  Target,
  Activity,
} from 'lucide-react';
import type {
  MaintenanceStatistics,
  RiskComparison,
  WorkOrderType,
  RiskLevel,
} from '../../types/bell';
import {
  WORK_ORDER_TYPES,
  RISK_LEVELS,
} from '../../types/bell';

interface StatisticsDashboardProps {
  statistics: MaintenanceStatistics;
  riskComparisons: RiskComparison[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subValue,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  subValue?: string;
}) {
  return (
    <Card p="md" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <ThemeIcon size="lg" color={color} variant="light">
          <Icon size={20} />
        </ThemeIcon>
        {subValue && (
          <Badge size="sm" variant="light" color={color}>
            {subValue}
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed" mb={4}>{label}</Text>
      <Title order={3} size="h3" c={color}>{value}</Title>
    </Card>
  );
}

function TypeDistribution({ data }: { data: Record<WorkOrderType, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <Card p="md" radius="md" withBorder>
      <Group mb="md">
        <ThemeIcon size="md" color="blue" variant="light">
          <FileText size={18} />
        </ThemeIcon>
        <Title order={4} size="h5">工单类型分布</Title>
      </Group>
      <Stack gap="sm">
        {WORK_ORDER_TYPES.map((type) => {
          const count = data[type.value] || 0;
          const percent = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={type.value}>
              <Group justify="space-between" mb={4}>
                <Group gap="xs">
                  <Badge size="xs" color={type.color} variant="light">
                    {type.label}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">{count} ({percent.toFixed(1)}%)</Text>
              </Group>
              <Progress value={percent} color={type.color} size="sm" />
            </div>
          );
        })}
      </Stack>
    </Card>
  );
}

function RiskDistribution({ data }: { data: Record<RiskLevel, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const criticalCount = data.critical || 0;
  const highCount = data.high || 0;

  return (
    <Card p="md" radius="md" withBorder>
      <Group mb="md">
        <ThemeIcon size="md" color="red" variant="light">
          <ShieldAlert size={18} />
        </ThemeIcon>
        <Title order={4} size="h5">风险等级分布</Title>
      </Group>
      <Group grow mb="md">
        <RingProgress
          size={100}
          thickness={10}
          roundCaps
          sections={[
            { value: data.low || 0, color: 'green' },
            { value: data.medium || 0, color: 'yellow' },
            { value: data.high || 0, color: 'orange' },
            { value: data.critical || 0, color: 'red' },
          ]}
          label={
            <Text ta="center" size="sm" fw={700}>
              {total}
            </Text>
          }
        />
        <Stack gap="xs">
          <Group justify="space-between">
            <Badge size="xs" color="red" variant="filled">危急</Badge>
            <Text size="sm" fw={600}>{criticalCount}</Text>
          </Group>
          <Group justify="space-between">
            <Badge size="xs" color="orange" variant="filled">高风险</Badge>
            <Text size="sm" fw={600}>{highCount}</Text>
          </Group>
          <Group justify="space-between">
            <Badge size="xs" color="yellow" variant="filled">中等</Badge>
            <Text size="sm" fw={600}>{data.medium || 0}</Text>
          </Group>
          <Group justify="space-between">
            <Badge size="xs" color="green" variant="filled">低风险</Badge>
            <Text size="sm" fw={600}>{data.low || 0}</Text>
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

function AssigneeRanking({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxCount = entries.length > 0 ? entries[0][1] : 1;

  return (
    <Card p="md" radius="md" withBorder>
      <Group mb="md">
        <ThemeIcon size="md" color="violet" variant="light">
          <Users size={18} />
        </ThemeIcon>
        <Title order={4} size="h5">责任人工作量</Title>
      </Group>
      <Stack gap="sm">
        {entries.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">暂无数据</Text>
        ) : (
          entries.map(([name, count], index) => (
            <div key={name}>
              <Group justify="space-between" mb={4}>
                <Group gap="xs">
                  <Badge size="xs" color={index === 0 ? 'yellow' : index === 1 ? 'gray' : index === 2 ? 'orange' : 'gray'} variant="filled">
                    {index + 1}
                  </Badge>
                  <Text size="sm">{name}</Text>
                </Group>
                <Text size="sm" fw={600}>{count} 单</Text>
              </Group>
              <Progress value={(count / maxCount) * 100} color="violet" size="sm" variant="light" />
            </div>
          ))
        )}
      </Stack>
    </Card>
  );
}

function MonthlyTrend({ data }: { data: { month: string; completed: number; created: number }[] }) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.completed, d.created)), 1);

  return (
    <Card p="md" radius="md" withBorder>
      <Group mb="md">
        <ThemeIcon size="md" color="teal" variant="light">
          <TrendingUp size={18} />
        </ThemeIcon>
        <Title order={4} size="h5">月度趋势</Title>
      </Group>
      <Group grow align="flex-end" style={{ height: 150 }}>
        {data.map((item) => (
          <Stack key={item.month} gap="xs" align="center" style={{ height: '100%', justifyContent: 'flex-end' }}>
            <Stack gap={2} style={{ width: '100%', alignItems: 'center' }}>
              <div
                style={{
                  width: '60%',
                  height: `${(item.completed / maxValue) * 100}px`,
                  backgroundColor: 'var(--mantine-color-green-5)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: item.completed > 0 ? 4 : 0,
                }}
                title={`完成: ${item.completed}`}
              />
              <div
                style={{
                  width: '60%',
                  height: `${(item.created / maxValue) * 100}px`,
                  backgroundColor: 'var(--mantine-color-blue-5)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: item.created > 0 ? 4 : 0,
                }}
                title={`创建: ${item.created}`}
              />
            </Stack>
            <Text size="xs" c="dimmed">{item.month}</Text>
          </Stack>
        ))}
      </Group>
      <Group justify="center" gap="md" mt="md">
        <Group gap="xs">
          <div style={{ width: 12, height: 12, backgroundColor: 'var(--mantine-color-blue-5)', borderRadius: 2 }} />
          <Text size="xs" c="dimmed">创建</Text>
        </Group>
        <Group gap="xs">
          <div style={{ width: 12, height: 12, backgroundColor: 'var(--mantine-color-green-5)', borderRadius: 2 }} />
          <Text size="xs" c="dimmed">完成</Text>
        </Group>
      </Group>
    </Card>
  );
}

function RiskComparisonList({ comparisons }: { comparisons: RiskComparison[] }) {
  return (
    <Card p="md" radius="md" withBorder>
      <Group mb="md">
        <ThemeIcon size="md" color="green" variant="light">
          <CheckCircle2 size={18} />
        </ThemeIcon>
        <div>
          <Title order={4} size="h5">维护效果对比</Title>
          <Text size="xs" c="dimmed">维护前后风险评分变化</Text>
        </div>
      </Group>
      <ScrollArea h={220}>
        <Stack gap="sm">
          {comparisons.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">暂无已完成工单的对比数据</Text>
          ) : (
            comparisons.slice(0, 10).map((item) => (
              <Paper key={item.workOrderId} p="sm" radius="sm" withBorder>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500} lineClamp={1}>
                    {item.bellName} - {item.workOrderTitle}
                  </Text>
                  <Badge
                    size="xs"
                    color={item.levelImproved ? 'green' : 'red'}
                    variant="light"
                  >
                    {item.levelImproved ? '等级下降' : '等级未变'}
                  </Badge>
                </Group>
                <Group grow>
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed" ta="center">维护前</Text>
                    <Text size="md" fw={700} ta="center" c={
                      item.preRiskLevel === 'critical' ? 'red' :
                      item.preRiskLevel === 'high' ? 'orange' :
                      item.preRiskLevel === 'medium' ? 'yellow' : 'green'
                    }>
                      {item.preRiskScore}
                    </Text>
                  </Stack>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text size="lg" c={item.scoreChange < 0 ? 'green' : 'red'}>
                      {item.scoreChange > 0 ? '↑' : '↓'} {Math.abs(item.scoreChange)}
                    </Text>
                  </div>
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed" ta="center">维护后</Text>
                    <Text size="md" fw={700} ta="center" c="green">
                      {item.postRiskScore}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))
          )}
        </Stack>
      </ScrollArea>
    </Card>
  );
}

function WorkflowStatus({ statistics }: { statistics: MaintenanceStatistics }) {
  const steps = [
    { label: '待派单', count: statistics.pendingAssignCount, color: 'yellow' },
    { label: '处理中', count: statistics.inProgressCount, color: 'blue' },
    { label: '已完成', count: statistics.completedCount, color: 'green' },
    { label: '已复核', count: statistics.reviewedCount, color: 'teal' },
  ];

  return (
    <Card p="md" radius="md" withBorder>
      <Group mb="md">
        <ThemeIcon size="md" color="blue" variant="light">
          <Activity size={18} />
        </ThemeIcon>
        <Title order={4} size="h5">工单流转状态</Title>
      </Group>
      <Group grow>
        {steps.map((step, index) => (
          <div key={step.label} style={{ flex: 1, textAlign: 'center' }}>
            <RingProgress
              size={70}
              thickness={8}
              roundCaps
              sections={[{ value: Math.min(100, step.count * 10), color: step.color }]}
              label={
                <Text ta="center" size="lg" fw={700}>
                  {step.count}
                </Text>
              }
            />
            <Text size="xs" c="dimmed" mt={4}>{step.label}</Text>
            {index < steps.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: '35px',
                  right: '-10px',
                  fontSize: '20px',
                  color: 'var(--mantine-color-gray-4)',
                }}
              />
            )}
          </div>
        ))}
      </Group>
    </Card>
  );
}

export function StatisticsDashboard({
  statistics,
  riskComparisons,
}: StatisticsDashboardProps) {
  const completionRate = useMemo(() => {
    const total = statistics.totalWorkOrders;
    if (total === 0) return 0;
    const completed = statistics.completedCount + statistics.reviewedCount;
    return Math.round((completed / total) * 100);
  }, [statistics]);

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" wrap="wrap" mb="md">
          <Group>
            <ThemeIcon size="xl" color="teal" variant="light">
              <BarChart3 size={24} />
            </ThemeIcon>
            <div>
              <Title order={3} size="h4">维护统计看板</Title>
              <Text size="sm" c="dimmed">工单统计 · 风险分析 · 效果评估</Text>
            </div>
          </Group>
          <Group>
            <Badge size="lg" variant="light" color="teal">
              完成率 {completionRate}%
            </Badge>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 2, md: 3, lg: 6 }}>
          <StatCard
            icon={ClipboardCheck}
            label="工单总数"
            value={statistics.totalWorkOrders}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="待派单"
            value={statistics.pendingAssignCount}
            color="yellow"
          />
          <StatCard
            icon={Zap}
            label="处理中"
            value={statistics.inProgressCount}
            color="blue"
          />
          <StatCard
            icon={CheckCircle2}
            label="已完成"
            value={statistics.completedCount + statistics.reviewedCount}
            color="green"
            subValue={`${completionRate}%`}
          />
          <StatCard
            icon={AlertTriangle}
            label="逾期工单"
            value={statistics.overdueCount}
            color="red"
          />
          <StatCard
            icon={Target}
            label="平均完成"
            value={`${statistics.avgCompletionDays} 天`}
            color="violet"
          />
        </SimpleGrid>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Stack gap="md">
          <WorkflowStatus statistics={statistics} />
          <TypeDistribution data={statistics.workOrdersByType} />
        </Stack>
        <Stack gap="md">
          <RiskDistribution data={statistics.workOrdersByRiskLevel} />
          <AssigneeRanking data={statistics.workOrdersByAssignee} />
        </Stack>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <MonthlyTrend data={statistics.monthlyTrend} />
        <RiskComparisonList comparisons={riskComparisons} />
      </SimpleGrid>

      <Card p="md" radius="md" withBorder>
        <Group mb="md">
          <ThemeIcon size="md" color="red" variant="light">
            <ShieldAlert size={18} />
          </ThemeIcon>
          <div>
            <Title order={4} size="h5">整体风险概览</Title>
            <Text size="xs" c="dimmed">编钟整体健康状态</Text>
          </div>
        </Group>
        <SimpleGrid cols={3}>
          <Paper p="md" withBorder radius="sm" ta="center">
            <RingProgress
              size={100}
              thickness={10}
              roundCaps
              sections={[{ value: statistics.overallRiskScore, color: statistics.overallRiskScore < 25 ? 'green' : statistics.overallRiskScore < 50 ? 'yellow' : statistics.overallRiskScore < 75 ? 'orange' : 'red' }]}
              label={
                <Text ta="center" size="xl" fw={700}>
                  {statistics.overallRiskScore}
                </Text>
              }
            />
            <Text size="sm" c="dimmed" mt="xs">整体风险评分</Text>
          </Paper>
          <Paper p="md" withBorder radius="sm" ta="center">
            <ThemeIcon size="xl" color="orange" variant="light" mb="sm">
              <AlertTriangle size={28} />
            </ThemeIcon>
            <Title order={2} size="h2" c="orange">{statistics.highRiskBells}</Title>
            <Text size="sm" c="dimmed">高风险编钟</Text>
          </Paper>
          <Paper p="md" withBorder radius="sm" ta="center">
            <ThemeIcon size="xl" color="red" variant="light" mb="sm">
              <ShieldAlert size={28} />
            </ThemeIcon>
            <Title order={2} size="h2" c="red">{statistics.criticalRiskBells}</Title>
            <Text size="sm" c="dimmed">危急风险编钟</Text>
          </Paper>
        </SimpleGrid>
        <Divider my="md" label="维护效果" labelPosition="center" />
        <Group justify="center" gap="md">
          <ThemeIcon size="md" color="green" variant="light">
            <TrendingUp size={18} />
          </ThemeIcon>
          <Text size="sm">
            平均风险评分降低 <Text component="span" fw={700} c="green">{statistics.effectEvaluationAvg} 分</Text>
          </Text>
        </Group>
      </Card>
    </Stack>
  );
}
