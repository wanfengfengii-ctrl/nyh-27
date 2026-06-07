import { useState, useRef } from 'react';
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
  Progress,
  Tabs,
  ActionIcon,
  Modal,
  Textarea,
  SimpleGrid,
  Card,
  ScrollArea,
  ThemeIcon,
  RingProgress,
} from '@mantine/core';
import {
  Wrench,
  AlertTriangle,
  Calendar,
  User,
  Thermometer,
  Droplets,
  Image as ImageIcon,
  Music,
  Upload,
  Trash2,
  CheckCircle,
  Clock,
  ShieldAlert,
  Activity,
  History,
  Plus,
  X,
  FileText,
} from 'lucide-react';
import type {
  Bell,
  BellMaintenanceInfo,
  BellMaintenanceAssessment,
  MaintenanceRecord,
  MaintenanceTodoItem,
  InspectionMedia,
  WearCondition,
  WearLevel,
  MaterialCondition,
} from '../../types/bell';
import {
  MATERIAL_CONDITIONS,
  WEAR_LEVELS,
  MAINTENANCE_TYPES,
  RISK_LEVELS,
} from '../../types/bell';
import { formatWeight } from '../../utils/cents';

interface MaintenancePanelProps {
  selectedBell: Bell | null;
  maintenanceInfo: BellMaintenanceInfo | null;
  assessment: BellMaintenanceAssessment | null;
  records: MaintenanceRecord[];
  todoList: MaintenanceTodoItem[];
  media: InspectionMedia[];
  overallRiskLevel: string;
  highRiskCount: number;
  pendingTodoCount: number;
  onUpdateInfo: (bellId: string, updates: Partial<BellMaintenanceInfo>) => void;
  onAddRecord: (bellId: string, record: Omit<MaintenanceRecord, 'id' | 'bellId'>) => void;
  onAddMedia: (bellId: string, media: Omit<InspectionMedia, 'id' | 'timestamp'>) => void;
  onRemoveMedia: (mediaId: string) => void;
  onCompleteTodo: (todoId: string) => void;
}

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '未记录';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '未记录';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function RiskGauge({ score, label }: { score: number; label: string }) {
  const color = score < 25 ? 'green' : score < 50 ? 'yellow' : score < 75 ? 'orange' : 'red';
  return (
    <Stack align="center" gap="xs">
      <RingProgress
        size={80}
        thickness={8}
        roundCaps
        sections={[{ value: score, color }]}
        label={
          <Text ta="center" size="lg" fw={700}>
            {score}
          </Text>
        }
      />
      <Text size="xs" c="dimmed" ta="center">
        {label}
      </Text>
    </Stack>
  );
}

function RiskAssessmentCard({ assessment }: { assessment: BellMaintenanceAssessment }) {
  const riskConfig = RISK_LEVELS.find((r) => r.value === assessment.riskLevel) || RISK_LEVELS[0];

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group>
          <ThemeIcon size="lg" color={riskConfig.color} variant="light">
            <ShieldAlert size={20} />
          </ThemeIcon>
          <div>
            <Title order={4} size="h5">
              维护风险评估
            </Title>
            <Text size="xs" c="dimmed">
              基于频率偏差、重量变化、磨损情况和维护历史
            </Text>
          </div>
        </Group>
        <Badge size="lg" color={riskConfig.color} variant="filled">
          {riskConfig.label}
        </Badge>
      </Group>

      <SimpleGrid cols={4} mb="md">
        <RiskGauge score={assessment.frequencyDeviationScore} label="频率偏差" />
        <RiskGauge score={assessment.weightChangeScore} label="重量变化" />
        <RiskGauge score={assessment.wearConditionScore} label="磨损状况" />
        <RiskGauge score={assessment.maintenanceHistoryScore} label="维护逾期" />
      </SimpleGrid>

      <Divider label="综合风险评分" labelPosition="center" mb="md" />

      <Stack gap="xs" mb="md">
        <Group justify="space-between">
          <Text size="sm">综合风险评分</Text>
          <Text size="sm" fw={600} c={riskConfig.color}>
            {assessment.riskScore} / 100
          </Text>
        </Group>
        <Progress value={assessment.riskScore} color={riskConfig.color} size="lg" />
      </Stack>

      <Divider label="保养建议" labelPosition="center" mb="md" />

      <Stack gap="sm">
        {assessment.suggestions.map((sug) => (
          <Card key={sug.id} p="sm" radius="sm" withBorder>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <ThemeIcon
                  size="sm"
                  color={
                    sug.type === 'immediate'
                      ? 'red'
                      : sug.type === 'short_term'
                      ? 'orange'
                      : sug.type === 'long_term'
                      ? 'blue'
                      : 'green'
                  }
                  variant="light"
                >
                  <Wrench size={12} />
                </ThemeIcon>
                <Text size="sm" fw={600}>
                  {sug.title}
                </Text>
              </Group>
              <Badge
                size="xs"
                color={
                  sug.type === 'immediate'
                    ? 'red'
                    : sug.type === 'short_term'
                    ? 'orange'
                    : sug.type === 'long_term'
                    ? 'blue'
                    : 'green'
                }
                variant="light"
              >
                {sug.type === 'immediate'
                  ? '立即处理'
                  : sug.type === 'short_term'
                  ? '短期'
                  : sug.type === 'long_term'
                  ? '长期'
                  : '预防性'}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" mb="xs">
              {sug.description}
            </Text>
            {sug.estimatedCost && (
              <Text size="xs" c="bronze.6">
                预估费用: ¥{sug.estimatedCost.toLocaleString()}
              </Text>
            )}
          </Card>
        ))}
      </Stack>

      <Group justify="space-between" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
        <Group gap="xs">
          <Calendar size={14} />
          <Text size="xs" c="dimmed">
            下次保养日期
          </Text>
        </Group>
        <Text size="sm" fw={600}>
          {formatDate(assessment.nextMaintenanceDate)}
        </Text>
      </Group>
    </Paper>
  );
}

function MaintenanceInfoForm({
  bell,
  info,
  onUpdate,
}: {
  bell: Bell;
  info: BellMaintenanceInfo;
  onUpdate: (updates: Partial<BellMaintenanceInfo>) => void;
}) {
  const handleWearChange = (field: keyof WearCondition, value: string | null) => {
    onUpdate({
      wearCondition: {
        ...info.wearCondition,
        [field]: value as WearLevel,
      },
    });
  };

  const handleEnvironmentChange = (field: 'temperature' | 'humidity', value: number | string) => {
    const num = typeof value === 'number' ? value : parseFloat(value) || 0;
    onUpdate({
      environment: {
        temperature: info.environment?.temperature ?? 22,
        humidity: info.environment?.humidity ?? 50,
        timestamp: new Date(),
        ...info.environment,
        [field]: num,
      },
    });
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Group mb="md">
        <ThemeIcon size="lg" color="bronze" variant="light">
          <FileText size={20} />
        </ThemeIcon>
        <div>
          <Title order={4} size="h5">
            编钟维护信息
          </Title>
          <Text size="xs" c="dimmed">
            记录材质状态、磨损情况和环境信息
          </Text>
        </div>
      </Group>

      <Stack gap="md">
        <Group grow>
          <Select
            label="材质状态"
            value={info.materialCondition}
            onChange={(v) => v && onUpdate({ materialCondition: v as MaterialCondition })}
            data={MATERIAL_CONDITIONS.map((m) => ({ value: m.value, label: m.label }))}
            size="sm"
          />
          <TextInput
            label="维护责任人"
            value={info.responsiblePerson}
            onChange={(e) => onUpdate({ responsiblePerson: e.target.value })}
            placeholder="请输入责任人姓名"
            size="sm"
            leftSection={<User size={14} />}
          />
        </Group>

        <Divider label="磨损状况" labelPosition="center" />

        <SimpleGrid cols={3}>
          <Select
            label="裂纹情况"
            value={info.wearCondition.crack}
            onChange={(v) => handleWearChange('crack', v)}
            data={WEAR_LEVELS.map((w) => ({ value: w.value, label: w.label }))}
            size="sm"
          />
          <Select
            label="锈蚀情况"
            value={info.wearCondition.rust}
            onChange={(v) => handleWearChange('rust', v)}
            data={WEAR_LEVELS.map((w) => ({ value: w.value, label: w.label }))}
            size="sm"
          />
          <Select
            label="磨损情况"
            value={info.wearCondition.wear}
            onChange={(v) => handleWearChange('wear', v)}
            data={WEAR_LEVELS.map((w) => ({ value: w.value, label: w.label }))}
            size="sm"
          />
        </SimpleGrid>

        <Textarea
          label="磨损描述"
          value={info.wearCondition.description || ''}
          onChange={(e) =>
            onUpdate({ wearCondition: { ...info.wearCondition, description: e.target.value } })
          }
          placeholder="请详细描述磨损情况..."
          size="sm"
          minRows={2}
        />

        <Divider label="保养信息" labelPosition="center" />

        <Group grow>
          <NumberInput
            label="保养周期"
            description="两次保养间隔天数"
            value={info.maintenanceCycleDays}
            onChange={(v) => onUpdate({ maintenanceCycleDays: typeof v === 'number' ? v : 90 })}
            min={7}
            max={365}
            size="sm"
            rightSection={<Text size="xs" c="dimmed">天</Text>}
          />
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              上次保养日期
            </Text>
            <Text size="sm" fw={500}>
              {formatDate(info.lastMaintenanceDate)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              上次检测日期
            </Text>
            <Text size="sm" fw={500}>
              {formatDate(info.lastInspectionDate)}
            </Text>
          </div>
        </Group>

        <Divider label="环境监测" labelPosition="center" />

        <Group grow>
          <NumberInput
            label="环境温度"
            value={info.environment?.temperature ?? 22}
            onChange={(v) => handleEnvironmentChange('temperature', v)}
            size="sm"
            min={-10}
            max={50}
            decimalScale={1}
            rightSection={<Text size="xs" c="dimmed">°C</Text>}
            leftSection={<Thermometer size={14} />}
          />
          <NumberInput
            label="环境湿度"
            value={info.environment?.humidity ?? 50}
            onChange={(v) => handleEnvironmentChange('humidity', v)}
            size="sm"
            min={0}
            max={100}
            decimalScale={1}
            rightSection={<Text size="xs" c="dimmed">%</Text>}
            leftSection={<Droplets size={14} />}
          />
        </Group>

        <Divider label="重量记录" labelPosition="center" />

        <Group grow>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              原始重量
            </Text>
            <Text size="sm" fw={500}>
              {formatWeight(info.originalWeight)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              当前重量
            </Text>
            <Text size="sm" fw={500}>
              {formatWeight(bell.weight)}
            </Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" mb={4}>
              变化率
            </Text>
            <Text
              size="sm"
              fw={600}
              c={
                info.originalWeight > 0 &&
                Math.abs((bell.weight - info.originalWeight) / info.originalWeight) * 100 > 3
                  ? 'red'
                  : 'green'
              }
            >
              {info.originalWeight > 0
                ? `${((bell.weight - info.originalWeight) / info.originalWeight) * 100 > 0 ? '+' : ''}${(((bell.weight - info.originalWeight) / info.originalWeight) * 100).toFixed(2)}%`
                : '-'}
            </Text>
          </div>
        </Group>

        <Divider label="备注" labelPosition="center" />

        <Textarea
          value={info.remarks || ''}
          onChange={(e) => onUpdate({ remarks: e.target.value })}
          placeholder="其他备注信息..."
          size="sm"
          minRows={2}
        />
      </Stack>
    </Paper>
  );
}

function MediaUploader({
  bellId,
  media,
  onAddMedia,
  onRemoveMedia,
}: {
  bellId: string;
  media: InspectionMedia[];
  onAddMedia: (bellId: string, media: Omit<InspectionMedia, 'id' | 'timestamp'>) => void;
  onRemoveMedia: (mediaId: string) => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        onAddMedia(bellId, {
          type: 'image',
          name: file.name,
          url,
          description: '',
        });
      };
      reader.readAsDataURL(file);
    });

    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      onAddMedia(bellId, {
        type: 'audio',
        name: file.name,
        url,
        description: '',
      });
    });

    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const images = media.filter((m) => m.type === 'image');
  const audios = media.filter((m) => m.type === 'audio');

  return (
    <Paper p="md" radius="md" withBorder>
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon size="lg" color="blue" variant="light">
            <ImageIcon size={20} />
          </ThemeIcon>
          <div>
            <Title order={4} size="h5">
              检测资料
            </Title>
            <Text size="xs" c="dimmed">
              上传检测图片和音频样本
            </Text>
          </div>
        </Group>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            color="blue"
            leftSection={<Upload size={14} />}
            onClick={() => imageInputRef.current?.click()}
          >
            上传图片
          </Button>
          <Button
            size="xs"
            variant="light"
            color="purple"
            leftSection={<Music size={14} />}
            onClick={() => audioInputRef.current?.click()}
          >
            上传音频
          </Button>
        </Group>
      </Group>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleAudioUpload}
      />

      <Tabs defaultValue="images">
        <Tabs.List grow>
          <Tabs.Tab value="images" leftSection={<ImageIcon size={14} />}>
            图片 ({images.length})
          </Tabs.Tab>
          <Tabs.Tab value="audio" leftSection={<Music size={14} />}>
            音频 ({audios.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="images" pt="md">
          {images.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              暂无检测图片，点击上方按钮上传
            </Text>
          ) : (
            <SimpleGrid cols={3}>
              {images.map((img) => (
                <Card key={img.id} p="xs" radius="sm" withBorder>
                  <div
                    style={{
                      width: '100%',
                      height: 80,
                      backgroundColor: 'var(--mantine-color-gray-1)',
                      borderRadius: 4,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <ActionIcon
                      size="xs"
                      color="red"
                      variant="filled"
                      style={{ position: 'absolute', top: 4, right: 4 }}
                      onClick={() => onRemoveMedia(img.id)}
                    >
                      <X size={10} />
                    </ActionIcon>
                  </div>
                  <Text size="xs" mt="xs" truncate title={img.name}>
                    {img.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatDateTime(img.timestamp)}
                  </Text>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="audio" pt="md">
          {audios.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              暂无音频样本，点击上方按钮上传
            </Text>
          ) : (
            <Stack gap="sm">
              {audios.map((audio) => (
                <Card key={audio.id} p="sm" radius="sm" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <ThemeIcon size="sm" color="purple" variant="light">
                        <Music size={14} />
                      </ThemeIcon>
                      <Text size="sm" fw={500} truncate style={{ maxWidth: 200 }} title={audio.name}>
                        {audio.name}
                      </Text>
                    </Group>
                    <ActionIcon
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={() => onRemoveMedia(audio.id)}
                    >
                      <Trash2 size={12} />
                    </ActionIcon>
                  </Group>
                  <audio controls style={{ width: '100%', height: 32 }} src={audio.url}>
                    您的浏览器不支持音频播放
                  </audio>
                  <Text size="xs" c="dimmed" mt="xs">
                    {formatDateTime(audio.timestamp)}
                  </Text>
                </Card>
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

function MaintenanceRecordList({ records }: { records: MaintenanceRecord[] }) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Group mb="md">
        <ThemeIcon size="lg" color="green" variant="light">
          <History size={20} />
        </ThemeIcon>
        <div>
          <Title order={4} size="h5">
            维护历史记录
          </Title>
          <Text size="xs" c="dimmed">
            共 {records.length} 条记录
          </Text>
        </div>
      </Group>

      {records.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl" size="sm">
          暂无维护记录
        </Text>
      ) : (
        <ScrollArea h={300}>
          <Stack gap="xs">
            {records.map((record) => {
              const typeConfig = MAINTENANCE_TYPES.find((t) => t.value === record.type);
              return (
                <Card key={record.id} p="sm" radius="sm" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <Badge size="xs" color={typeConfig?.color || 'gray'} variant="light">
                        {typeConfig?.label || record.type}
                      </Badge>
                      <Text size="sm" fw={500}>
                        {record.description}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {formatDateTime(record.timestamp)}
                    </Text>
                  </Group>
                  <Group gap="md">
                    <Text size="xs" c="dimmed">
                      操作人: {record.operator}
                    </Text>
                    {record.mediaIds.length > 0 && (
                      <Text size="xs" c="dimmed">
                        附件: {record.mediaIds.length} 个
                      </Text>
                    )}
                  </Group>
                  {record.notes && (
                    <Text size="xs" c="dimmed" mt="xs">
                      备注: {record.notes}
                    </Text>
                  )}
                </Card>
              );
            })}
          </Stack>
        </ScrollArea>
      )}
    </Paper>
  );
}

function AddRecordModal({
  opened,
  onClose,
  onSubmit,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (record: Omit<MaintenanceRecord, 'id' | 'bellId'>) => void;
}) {
  const [type, setType] = useState<MaintenanceRecord['type']>('inspection');
  const [description, setDescription] = useState('');
  const [operator, setOperator] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!description.trim() || !operator.trim()) return;
    onSubmit({
      type,
      description: description.trim(),
      operator: operator.trim(),
      notes: notes.trim() || undefined,
      mediaIds: [],
      timestamp: new Date(),
    });
    setDescription('');
    setOperator('');
    setNotes('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="添加维护记录" size="sm">
      <Stack gap="md">
        <Select
          label="维护类型"
          value={type}
          onChange={(v) => v && setType(v as MaintenanceRecord['type'])}
          data={MAINTENANCE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />
        <TextInput
          label="描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="请输入维护内容描述"
        />
        <TextInput
          label="操作人"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          placeholder="请输入操作人姓名"
          leftSection={<User size={14} />}
        />
        <Textarea
          label="备注"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="可选：添加备注信息"
          minRows={3}
        />
        <Group justify="end">
          <Button variant="subtle" onClick={onClose}>
            取消
          </Button>
          <Button
            color="bronze"
            onClick={handleSubmit}
            disabled={!description.trim() || !operator.trim()}
          >
            添加
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function MaintenanceTodoList({
  todoList,
  onComplete,
}: {
  todoList: MaintenanceTodoItem[];
  onComplete: (todoId: string) => void;
}) {
  const pending = todoList.filter((t) => !t.completed);
  const completed = todoList.filter((t) => t.completed);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '';
    }
  };

  const daysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Paper p="md" radius="md" withBorder>
      <Group mb="md" justify="space-between">
        <Group>
          <ThemeIcon size="lg" color="orange" variant="light">
            <Clock size={20} />
          </ThemeIcon>
          <div>
            <Title order={4} size="h5">
              待处理维护清单
            </Title>
            <Text size="xs" c="dimmed">
              共 {pending.length} 项待处理
            </Text>
          </div>
        </Group>
        <Badge size="lg" color={pending.length > 0 ? 'orange' : 'green'} variant="filled">
          {pending.length} 待处理
        </Badge>
      </Group>

      <Tabs defaultValue="pending">
        <Tabs.List grow>
          <Tabs.Tab value="pending">待处理 ({pending.length})</Tabs.Tab>
          <Tabs.Tab value="completed">已完成 ({completed.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pending" pt="md">
          {pending.length === 0 ? (
            <Group justify="center" py="xl">
              <ThemeIcon size="lg" color="green" variant="light">
                <CheckCircle size={24} />
              </ThemeIcon>
              <Text c="dimmed">所有维护任务已完成</Text>
            </Group>
          ) : (
            <Stack gap="sm">
              {pending.map((item) => {
                const riskConfig = RISK_LEVELS.find((r) => r.value === item.riskLevel);
                const days = daysUntilDue(item.dueDate);
                const isOverdue = days < 0;
                return (
                  <Card key={item.id} p="sm" radius="sm" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Badge size="xs" color={riskConfig?.color || 'gray'} variant="light">
                          {riskConfig?.label}
                        </Badge>
                        <Badge size="xs" color={getPriorityColor(item.priority)} variant="filled">
                          优先级: {getPriorityLabel(item.priority)}
                        </Badge>
                      </Group>
                      <Badge size="xs" color={isOverdue ? 'red' : 'blue'} variant="light">
                        {isOverdue ? `已逾期 ${Math.abs(days)} 天` : days === 0 ? '今日到期' : `${days} 天后`}
                      </Badge>
                    </Group>
                    <Group justify="space-between" mb="xs">
                      <div>
                        <Text size="sm" fw={600}>
                          第 {item.bellPosition} 位 · {item.bellName}
                        </Text>
                        <Text size="sm">{item.title}</Text>
                      </div>
                      <Button
                        size="xs"
                        variant="light"
                        color="green"
                        leftSection={<CheckCircle size={12} />}
                        onClick={() => onComplete(item.id)}
                      >
                        完成
                      </Button>
                    </Group>
                    <Text size="xs" c="dimmed">
                      到期日期: {formatDate(item.dueDate)}
                    </Text>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="completed" pt="md">
          {completed.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              暂无已完成的维护任务
            </Text>
          ) : (
            <Stack gap="xs">
              {completed.map((item) => (
                <Card key={item.id} p="sm" radius="sm" withBorder bg="gray.0">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <ThemeIcon size="sm" color="green" variant="light">
                        <CheckCircle size={12} />
                      </ThemeIcon>
                      <Text size="sm" c="dimmed" style={{ textDecoration: 'line-through' }}>
                        第 {item.bellPosition} 位 · {item.bellName}: {item.title}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {formatDate(item.completedAt)}
                    </Text>
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

export function MaintenancePanel({
  selectedBell,
  maintenanceInfo,
  assessment,
  records,
  todoList,
  media,
  overallRiskLevel,
  highRiskCount,
  pendingTodoCount,
  onUpdateInfo,
  onAddRecord,
  onAddMedia,
  onRemoveMedia,
  onCompleteTodo,
}: MaintenancePanelProps) {
  const [addRecordModalOpen, setAddRecordModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('info');

  const overallRiskConfig = RISK_LEVELS.find((r) => r.value === overallRiskLevel) || RISK_LEVELS[0];

  if (!selectedBell || !maintenanceInfo || !assessment) {
    return (
      <Paper p="md" radius="md" withBorder h="100%">
        <Title order={3} size="h4" mb="md">
          维护诊断与养护计划
        </Title>
        <Text c="dimmed" ta="center" py="xl">
          请从上方选择一口编钟查看维护信息
        </Text>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" wrap="wrap">
          <Group>
            <ThemeIcon size="xl" color={overallRiskConfig.color} variant="light">
              <ShieldAlert size={24} />
            </ThemeIcon>
            <div>
              <Title order={3} size="h4">
                维护诊断与养护计划
              </Title>
              <Text size="sm" c="dimmed">
                综合评估编钟状态，提供养护建议
              </Text>
            </div>
          </Group>
          <Group>
            <Badge size="lg" color={overallRiskConfig.color} variant="filled" leftSection={<Activity size={12} />}>
              整体风险: {overallRiskConfig.label}
            </Badge>
            <Badge size="lg" color="red" variant="light" leftSection={<AlertTriangle size={12} />}>
              {highRiskCount} 口高风险
            </Badge>
            <Badge size="lg" color="orange" variant="light" leftSection={<Clock size={12} />}>
              {pendingTodoCount} 项待办
            </Badge>
          </Group>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Stack gap="md">
          <RiskAssessmentCard assessment={assessment} />
          <MediaUploader
            bellId={selectedBell.id}
            media={media}
            onAddMedia={onAddMedia}
            onRemoveMedia={onRemoveMedia}
          />
        </Stack>

        <Stack gap="md">
          <Paper p="md" radius="md" withBorder>
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List grow>
                <Tabs.Tab value="info" leftSection={<FileText size={14} />}>
                  维护信息
                </Tabs.Tab>
                <Tabs.Tab value="records" leftSection={<History size={14} />}>
                  历史记录
                </Tabs.Tab>
                <Tabs.Tab value="todo" leftSection={<Clock size={14} />}>
                  待办清单
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="info" pt="md">
                <MaintenanceInfoForm
                  bell={selectedBell}
                  info={maintenanceInfo}
                  onUpdate={(updates) => onUpdateInfo(selectedBell.id, updates)}
                />
              </Tabs.Panel>

              <Tabs.Panel value="records" pt="md">
                <Stack gap="md">
                  <Group justify="end">
                    <Button
                      size="sm"
                      variant="light"
                      color="bronze"
                      leftSection={<Plus size={14} />}
                      onClick={() => setAddRecordModalOpen(true)}
                    >
                      添加记录
                    </Button>
                  </Group>
                  <MaintenanceRecordList records={records} />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="todo" pt="md">
                <MaintenanceTodoList todoList={todoList} onComplete={onCompleteTodo} />
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Stack>
      </SimpleGrid>

      <AddRecordModal
        opened={addRecordModalOpen}
        onClose={() => setAddRecordModalOpen(false)}
        onSubmit={(record) => onAddRecord(selectedBell.id, record)}
      />
    </Stack>
  );
}
