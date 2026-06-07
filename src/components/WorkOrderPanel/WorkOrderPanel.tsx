import { useState, useMemo } from 'react';
import {
  Paper,
  Title,
  Text,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  Badge,
  Divider,
  Tabs,
  ActionIcon,
  Modal,
  Textarea,
  SimpleGrid,
  Card,
  ScrollArea,
  ThemeIcon,
  NumberInput,
} from '@mantine/core';
import {
  ClipboardList,
  User,
  Calendar,
  AlertTriangle,
  Filter,
  Plus,
  CheckCircle,
  Clock,
  Play,
  Eye,
  MessageSquare,
  ArrowRight,
  TrendingDown,
  Zap,
  FileText,
  Image as ImageIcon,
  Music,
  X,
  ChevronDown,
} from 'lucide-react';
import type {
  WorkOrder,
  WorkOrderStatus,
  WorkOrderFilter,
  WorkOrderType,
  RiskLevel,
  Bell,
  InspectionMedia,
} from '../../types/bell';
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_TYPES,
  RISK_LEVELS,
} from '../../types/bell';

interface WorkOrderPanelProps {
  workOrders: WorkOrder[];
  bells: Bell[];
  highRiskCount: number;
  media: InspectionMedia[];
  onCreateWorkOrder: (params: {
    bellId: string;
    title: string;
    description: string;
    type: WorkOrderType;
    priority: 'high' | 'medium' | 'low';
    dueDate: Date;
    assignee?: string;
    sourceType: WorkOrder['sourceType'];
  }) => void;
  onAssignWorkOrder: (workOrderId: string, assignee: string) => void;
  onStartWorkOrder: (workOrderId: string) => void;
  onCompleteWorkOrder: (workOrderId: string, completedBy: string, effectEvaluation?: string, mediaIds?: string[]) => void;
  onReviewWorkOrder: (workOrderId: string, reviewedBy: string, reviewComment: string, passed: boolean) => void;
  onBatchCreateFromHighRisk: () => void;
  onAddMediaToWorkOrder: (workOrderId: string, mediaId: string) => void;
  onCreateFromRisk: (bellId: string) => void;
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

const getSourceTypeLabel = (sourceType: WorkOrder['sourceType']) => {
  switch (sourceType) {
    case 'manual': return '手动创建';
    case 'risk_auto': return '风险自动生成';
    case 'maintenance_cycle': return '保养周期';
    case 'suggestion': return '保养建议';
    default: return sourceType;
  }
};

const getSourceTypeColor = (sourceType: WorkOrder['sourceType']) => {
  switch (sourceType) {
    case 'manual': return 'gray';
    case 'risk_auto': return 'red';
    case 'maintenance_cycle': return 'blue';
    case 'suggestion': return 'green';
    default: return 'gray';
  }
};

function WorkOrderCard({
  workOrder,
  onView,
  onAssign,
  onStart,
  onComplete,
  onReview,
}: {
  workOrder: WorkOrder;
  onView: () => void;
  onAssign: () => void;
  onStart: () => void;
  onComplete: () => void;
  onReview: () => void;
}) {
  const statusConfig = WORK_ORDER_STATUSES.find((s) => s.value === workOrder.status) || WORK_ORDER_STATUSES[0];
  const riskConfig = RISK_LEVELS.find((r) => r.value === workOrder.riskLevel) || RISK_LEVELS[0];
  const typeConfig = WORK_ORDER_TYPES.find((t) => t.value === workOrder.type) || WORK_ORDER_TYPES[0];

  const daysUntilDue = () => {
    const now = new Date();
    const due = new Date(workOrder.dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const days = daysUntilDue();
  const isOverdue = days < 0 && (workOrder.status === 'pending_assign' || workOrder.status === 'in_progress');

  return (
    <Card p="sm" radius="sm" withBorder>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <Badge size="xs" color={statusConfig.color} variant="filled">
            {statusConfig.label}
          </Badge>
          <Badge size="xs" color={riskConfig.color} variant="light">
            {riskConfig.label}
          </Badge>
          <Badge size="xs" color={getPriorityColor(workOrder.priority)} variant="light">
            优先级: {getPriorityLabel(workOrder.priority)}
          </Badge>
        </Group>
        <Badge size="xs" color={getSourceTypeColor(workOrder.sourceType)} variant="outline">
          {getSourceTypeLabel(workOrder.sourceType)}
        </Badge>
      </Group>

      <Group justify="space-between" mb="xs">
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={600} lineClamp={1}>
            {workOrder.title}
          </Text>
          <Text size="xs" c="dimmed">
            第 {workOrder.bellPosition} 位 · {workOrder.bellName}
          </Text>
        </div>
      </Group>

      <Group gap="md" mb="xs">
        <Group gap="xs">
          <User size={12} />
          <Text size="xs" c="dimmed">
            {workOrder.assignee || '未派单'}
          </Text>
        </Group>
        <Group gap="xs">
          <Calendar size={12} />
          <Text size="xs" c={isOverdue ? 'red' : 'dimmed'}>
            {isOverdue ? `已逾期 ${Math.abs(days)} 天` : days === 0 ? '今日到期' : `${days} 天后到期`}
          </Text>
        </Group>
      </Group>

      {workOrder.preMaintenanceRiskScore !== undefined && workOrder.postMaintenanceRiskScore !== undefined && (
        <Group gap="xs" mb="xs">
          <TrendingDown size={12} />
          <Text size="xs" c="green">
            风险: {workOrder.preMaintenanceRiskScore} → {workOrder.postMaintenanceRiskScore}
          </Text>
        </Group>
      )}

      <Group justify="space-between" mt="xs">
        <Badge size="xs" color={typeConfig.color} variant="light">
          {typeConfig.label}
        </Badge>
        <Group gap="xs">
          {workOrder.status === 'pending_assign' && (
            <Button size="xs" variant="light" color="blue" leftSection={<User size={12} />} onClick={onAssign}>
              派单
            </Button>
          )}
          {workOrder.status === 'in_progress' && (
            <Button size="xs" variant="light" color="green" leftSection={<CheckCircle size={12} />} onClick={onComplete}>
              完成
            </Button>
          )}
          {workOrder.status === 'completed' && (
            <Button size="xs" variant="light" color="teal" leftSection={<Eye size={12} />} onClick={onReview}>
              复核
            </Button>
          )}
          <ActionIcon size="sm" variant="subtle" onClick={onView}>
            <Eye size={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}

function WorkOrderDetailModal({
  opened,
  onClose,
  workOrder,
  media,
}: {
  opened: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  media: InspectionMedia[];
}) {
  if (!workOrder) return null;

  const statusConfig = WORK_ORDER_STATUSES.find((s) => s.value === workOrder.status) || WORK_ORDER_STATUSES[0];
  const riskConfig = RISK_LEVELS.find((r) => r.value === workOrder.riskLevel) || RISK_LEVELS[0];
  const typeConfig = WORK_ORDER_TYPES.find((t) => t.value === workOrder.type) || WORK_ORDER_TYPES[0];

  const orderMedia = media.filter((m) => workOrder.mediaIds.includes(m.id));
  const images = orderMedia.filter((m) => m.type === 'image');
  const audios = orderMedia.filter((m) => m.type === 'audio');

  return (
    <Modal opened={opened} onClose={onClose} title="工单详情" size="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Group>
            <Badge size="lg" color={statusConfig.color} variant="filled">
              {statusConfig.label}
            </Badge>
            <Badge size="lg" color={riskConfig.color} variant="light">
              {riskConfig.label}
            </Badge>
          </Group>
          <Badge size="lg" color={typeConfig.color} variant="outline">
            {typeConfig.label}
          </Badge>
        </Group>

        <div>
          <Title order={4} size="h5" mb="xs">
            {workOrder.title}
          </Title>
          <Text size="sm" c="dimmed">
            第 {workOrder.bellPosition} 位 · {workOrder.bellName}
          </Text>
        </div>

        <SimpleGrid cols={2}>
          <Paper p="sm" withBorder radius="sm">
            <Text size="xs" c="dimmed" mb="xs">派单人</Text>
            <Text size="sm" fw={500}>{workOrder.assignor}</Text>
          </Paper>
          <Paper p="sm" withBorder radius="sm">
            <Text size="xs" c="dimmed" mb="xs">责任人</Text>
            <Text size="sm" fw={500}>{workOrder.assignee || '未派单'}</Text>
          </Paper>
          <Paper p="sm" withBorder radius="sm">
            <Text size="xs" c="dimmed" mb="xs">创建时间</Text>
            <Text size="sm" fw={500}>{formatDateTime(workOrder.createdAt)}</Text>
          </Paper>
          <Paper p="sm" withBorder radius="sm">
            <Text size="xs" c="dimmed" mb="xs">到期时间</Text>
            <Text size="sm" fw={500}>{formatDateTime(workOrder.dueDate)}</Text>
          </Paper>
          {workOrder.assignedAt && (
            <Paper p="sm" withBorder radius="sm">
              <Text size="xs" c="dimmed" mb="xs">派单时间</Text>
              <Text size="sm" fw={500}>{formatDateTime(workOrder.assignedAt)}</Text>
            </Paper>
          )}
          {workOrder.startedAt && (
            <Paper p="sm" withBorder radius="sm">
              <Text size="xs" c="dimmed" mb="xs">开始时间</Text>
              <Text size="sm" fw={500}>{formatDateTime(workOrder.startedAt)}</Text>
            </Paper>
          )}
          {workOrder.completedAt && (
            <Paper p="sm" withBorder radius="sm">
              <Text size="xs" c="dimmed" mb="xs">完成时间</Text>
              <Text size="sm" fw={500}>{formatDateTime(workOrder.completedAt)}</Text>
            </Paper>
          )}
          {workOrder.reviewedAt && (
            <Paper p="sm" withBorder radius="sm">
              <Text size="xs" c="dimmed" mb="xs">复核时间</Text>
              <Text size="sm" fw={500}>{formatDateTime(workOrder.reviewedAt)}</Text>
            </Paper>
          )}
        </SimpleGrid>

        <Divider label="工单描述" labelPosition="center" />
        <Text size="sm">{workOrder.description}</Text>

        {workOrder.preMaintenanceRiskScore !== undefined && workOrder.postMaintenanceRiskScore !== undefined && (
          <>
            <Divider label="风险对比" labelPosition="center" />
            <Group grow>
              <Paper p="sm" withBorder radius="sm">
                <Text size="xs" c="dimmed" ta="center" mb="xs">维护前风险</Text>
                <Text size="lg" fw={700} ta="center" c={riskConfig.color}>
                  {workOrder.preMaintenanceRiskScore}
                </Text>
              </Paper>
              <ArrowRight size={24} style={{ alignSelf: 'center' }} />
              <Paper p="sm" withBorder radius="sm">
                <Text size="xs" c="dimmed" ta="center" mb="xs">维护后风险</Text>
                <Text size="lg" fw={700} ta="center" c="green">
                  {workOrder.postMaintenanceRiskScore}
                </Text>
              </Paper>
            </Group>
          </>
        )}

        {workOrder.effectEvaluation && (
          <>
            <Divider label="效果评估" labelPosition="center" />
            <Text size="sm">{workOrder.effectEvaluation}</Text>
          </>
        )}

        {workOrder.reviewComment && (
          <>
            <Divider label="复核意见" labelPosition="center" />
            <Text size="sm">{workOrder.reviewComment}</Text>
          </>
        )}

        {orderMedia.length > 0 && (
          <>
            <Divider label="相关资料" labelPosition="center" />
            {images.length > 0 && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>图片 ({images.length})</Text>
                <SimpleGrid cols={4}>
                  {images.map((img) => (
                    <Card key={img.id} p="xs" radius="sm" withBorder>
                      <img
                        src={img.url}
                        alt={img.name}
                        style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <Text size="xs" mt="xs" truncate>{img.name}</Text>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            )}
            {audios.length > 0 && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>音频 ({audios.length})</Text>
                {audios.map((audio) => (
                  <Card key={audio.id} p="xs" radius="sm" withBorder>
                    <Group justify="space-between" mb="xs">
                      <Text size="xs">{audio.name}</Text>
                    </Group>
                    <audio controls style={{ width: '100%', height: 32 }} src={audio.url} />
                  </Card>
                ))}
              </Stack>
            )}
          </>
        )}

        {workOrder.notes && (
          <>
            <Divider label="备注" labelPosition="center" />
            <Text size="sm">{workOrder.notes}</Text>
          </>
        )}
      </Stack>
    </Modal>
  );
}

function AssignModal({
  opened,
  onClose,
  onSubmit,
  assignees,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (assignee: string) => void;
  assignees: string[];
}) {
  const [assignee, setAssignee] = useState('');

  const handleSubmit = () => {
    if (!assignee.trim()) return;
    onSubmit(assignee.trim());
    setAssignee('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="派单" size="sm">
      <Stack gap="md">
        <Select
          label="选择责任人"
          placeholder="请选择或输入责任人"
          value={assignee}
          onChange={(v) => v && setAssignee(v)}
          data={assignees.map((a) => ({ value: a, label: a }))}
          searchable
          allowDeselect={false}
        />
        <Group justify="end">
          <Button variant="subtle" onClick={onClose}>取消</Button>
          <Button color="blue" onClick={handleSubmit} disabled={!assignee.trim()}>
            确认派单
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function CompleteModal({
  opened,
  onClose,
  onSubmit,
  availableMedia,
  onAddMedia,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (completedBy: string, effectEvaluation: string, mediaIds: string[]) => void;
  availableMedia: InspectionMedia[];
  onAddMedia: (mediaId: string) => void;
}) {
  const [completedBy, setCompletedBy] = useState('');
  const [effectEvaluation, setEffectEvaluation] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!completedBy.trim()) return;
    onSubmit(completedBy.trim(), effectEvaluation.trim(), selectedMediaIds);
    setCompletedBy('');
    setEffectEvaluation('');
    setSelectedMediaIds([]);
    onClose();
  };

  const toggleMedia = (mediaId: string) => {
    setSelectedMediaIds((prev) =>
      prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title="完成工单" size="md">
      <Stack gap="md">
        <TextInput
          label="完成人"
          value={completedBy}
          onChange={(e) => setCompletedBy(e.target.value)}
          placeholder="请输入完成人姓名"
          leftSection={<User size={14} />}
        />
        <Textarea
          label="效果评估"
          value={effectEvaluation}
          onChange={(e) => setEffectEvaluation(e.target.value)}
          placeholder="请描述维护效果和处理结果..."
          minRows={3}
        />

        {availableMedia.length > 0 && (
          <>
            <Divider label="关联资料" labelPosition="center" />
            <SimpleGrid cols={3}>
              {availableMedia.map((m) => (
                <Card
                  key={m.id}
                  p="xs"
                  radius="sm"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedMediaIds.includes(m.id) ? 'var(--mantine-color-blue-5)' : undefined,
                    backgroundColor: selectedMediaIds.includes(m.id) ? 'var(--mantine-color-blue-0)' : undefined,
                  }}
                  onClick={() => toggleMedia(m.id)}
                >
                  {m.type === 'image' ? (
                    <img
                      src={m.url}
                      alt={m.name}
                      style={{ width: '100%', height: 50, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <ThemeIcon size="md" color="purple" variant="light">
                      <Music size={16} />
                    </ThemeIcon>
                  )}
                  <Text size="xs" mt="xs" truncate>{m.name}</Text>
                </Card>
              ))}
            </SimpleGrid>
          </>
        )}

        <Group justify="end">
          <Button variant="subtle" onClick={onClose}>取消</Button>
          <Button color="green" onClick={handleSubmit} disabled={!completedBy.trim()}>
            确认完成
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ReviewModal({
  opened,
  onClose,
  onSubmit,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (reviewedBy: string, reviewComment: string, passed: boolean) => void;
}) {
  const [reviewedBy, setReviewedBy] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  const handleSubmit = (passed: boolean) => {
    if (!reviewedBy.trim()) return;
    onSubmit(reviewedBy.trim(), reviewComment.trim(), passed);
    setReviewedBy('');
    setReviewComment('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="复核工单" size="sm">
      <Stack gap="md">
        <TextInput
          label="复核人"
          value={reviewedBy}
          onChange={(e) => setReviewedBy(e.target.value)}
          placeholder="请输入复核人姓名"
          leftSection={<User size={14} />}
        />
        <Textarea
          label="复核意见"
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
          placeholder="请输入复核意见..."
          minRows={3}
        />
        <Group justify="space-between">
          <Button variant="subtle" onClick={onClose}>取消</Button>
          <Group>
            <Button color="red" variant="outline" onClick={() => handleSubmit(false)} disabled={!reviewedBy.trim()}>
              驳回
            </Button>
            <Button color="teal" onClick={() => handleSubmit(true)} disabled={!reviewedBy.trim()}>
              通过
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}

function CreateWorkOrderModal({
  opened,
  onClose,
  onSubmit,
  bells,
}: {
  opened: boolean;
  onClose: () => void;
  onSubmit: (params: {
    bellId: string;
    title: string;
    description: string;
    type: WorkOrderType;
    priority: 'high' | 'medium' | 'low';
    dueDate: Date;
    assignee?: string;
  }) => void;
  bells: Bell[];
}) {
  const [bellId, setBellId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkOrderType>('inspection');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDays, setDueDays] = useState<number>(7);
  const [assignee, setAssignee] = useState('');

  const handleSubmit = () => {
    if (!bellId || !title.trim()) return;
    const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);
    onSubmit({
      bellId,
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      dueDate,
      assignee: assignee.trim() || undefined,
    });
    setBellId('');
    setTitle('');
    setDescription('');
    setType('inspection');
    setPriority('medium');
    setDueDays(7);
    setAssignee('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="创建工单" size="md">
      <Stack gap="md">
        <Select
          label="选择编钟"
          placeholder="请选择编钟"
          value={bellId}
          onChange={(v) => v && setBellId(v)}
          data={bells.map((b) => ({ value: b.id, label: `第${b.position}位 · ${b.name}` }))}
          searchable
          allowDeselect={false}
        />
        <TextInput
          label="工单标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入工单标题"
        />
        <Textarea
          label="工单描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="请详细描述工单内容..."
          minRows={3}
        />
        <Group grow>
          <Select
            label="工单类型"
            value={type}
            onChange={(v) => v && setType(v as WorkOrderType)}
            data={WORK_ORDER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Select
            label="优先级"
            value={priority}
            onChange={(v) => v && setPriority(v as 'high' | 'medium' | 'low')}
            data={[
              { value: 'high', label: '高' },
              { value: 'medium', label: '中' },
              { value: 'low', label: '低' },
            ]}
          />
        </Group>
        <NumberInput
          label="到期时间"
          description="几天后到期"
          value={dueDays}
          onChange={(v) => setDueDays(typeof v === 'number' ? v : 7)}
          min={1}
          max={365}
          rightSection={<Text size="xs" c="dimmed">天</Text>}
        />
        <TextInput
          label="责任人 (可选)"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="指定责任人将自动开始处理"
          leftSection={<User size={14} />}
        />
        <Group justify="end">
          <Button variant="subtle" onClick={onClose}>取消</Button>
          <Button
            color="bronze"
            onClick={handleSubmit}
            disabled={!bellId || !title.trim()}
          >
            创建
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function WorkOrderPanel({
  workOrders,
  bells,
  highRiskCount,
  media,
  onCreateWorkOrder,
  onAssignWorkOrder,
  onStartWorkOrder,
  onCompleteWorkOrder,
  onReviewWorkOrder,
  onBatchCreateFromHighRisk,
  onAddMediaToWorkOrder,
  onCreateFromRisk,
}: WorkOrderPanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>('all');
  const [filter, setFilter] = useState<WorkOrderFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [keyword, setKeyword] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const assignees = useMemo(() => {
    const set = new Set<string>();
    workOrders.forEach((w) => {
      if (w.assignee) set.add(w.assignee);
      if (w.completedBy) set.add(w.completedBy);
      if (w.reviewedBy) set.add(w.reviewedBy);
    });
    return Array.from(set);
  }, [workOrders]);

  const filteredOrders = useMemo(() => {
    let result = workOrders;

    if (activeTab !== 'all') {
      result = result.filter((w) => w.status === activeTab);
    }

    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(kw) ||
          w.bellName.toLowerCase().includes(kw) ||
          w.description.toLowerCase().includes(kw)
      );
    }

    if (filter.assignee) {
      result = result.filter((w) => w.assignee === filter.assignee);
    }
    if (filter.riskLevel && filter.riskLevel.length > 0) {
      result = result.filter((w) => filter.riskLevel!.includes(w.riskLevel));
    }
    if (filter.priority && filter.priority.length > 0) {
      result = result.filter((w) => filter.priority!.includes(w.priority));
    }
    if (filter.type && filter.type.length > 0) {
      result = result.filter((w) => filter.type!.includes(w.type));
    }
    if (filter.dueDateFrom) {
      result = result.filter((w) => new Date(w.dueDate) >= new Date(filter.dueDateFrom!));
    }
    if (filter.dueDateTo) {
      result = result.filter((w) => new Date(w.dueDate) <= new Date(filter.dueDateTo!));
    }

    return result;
  }, [workOrders, activeTab, keyword, filter]);

  const handleView = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setDetailModalOpen(true);
  };

  const handleAssign = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setAssignModalOpen(true);
  };

  const handleComplete = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setCompleteModalOpen(true);
  };

  const handleReview = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setReviewModalOpen(true);
  };

  const counts = useMemo(() => ({
    all: workOrders.length,
    pending_assign: workOrders.filter((w) => w.status === 'pending_assign').length,
    in_progress: workOrders.filter((w) => w.status === 'in_progress').length,
    completed: workOrders.filter((w) => w.status === 'completed').length,
    reviewed: workOrders.filter((w) => w.status === 'reviewed').length,
  }), [workOrders]);

  return (
    <Stack gap="md">
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" wrap="wrap" mb="md">
          <Group>
            <ThemeIcon size="xl" color="blue" variant="light">
              <ClipboardList size={24} />
            </ThemeIcon>
            <div>
              <Title order={3} size="h4">
                维护工单管理
              </Title>
              <Text size="sm" c="dimmed">
                工单流转 · 风险追踪 · 效果评估
              </Text>
            </div>
          </Group>
          <Group>
            <Button
              size="sm"
              variant="light"
              color="red"
              leftSection={<Zap size={14} />}
              onClick={onBatchCreateFromHighRisk}
            >
              高风险一键生成工单
            </Button>
            <Button
              size="sm"
              variant="light"
              color="bronze"
              leftSection={<Plus size={14} />}
              onClick={() => setCreateModalOpen(true)}
            >
              创建工单
            </Button>
          </Group>
        </Group>

        <Group mb="md">
          <TextInput
            placeholder="搜索工单标题、编钟名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            leftSection={<Filter size={14} />}
            style={{ flex: 1, minWidth: 200 }}
            size="sm"
          />
          <Button
            size="sm"
            variant={showFilters ? 'filled' : 'light'}
            leftSection={<Filter size={14} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
            <ChevronDown size={14} />
          </Button>
        </Group>

        {showFilters && (
          <Paper p="md" radius="sm" withBorder bg="gray.0" mb="md">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
              <Select
                label="责任人"
                placeholder="全部"
                value={filter.assignee || null}
                onChange={(v) => setFilter({ ...filter, assignee: v || undefined })}
                data={assignees.map((a) => ({ value: a, label: a }))}
                clearable
                size="sm"
              />
              <Select
                label="风险等级"
                placeholder="全部"
                value={filter.riskLevel?.[0] || null}
                onChange={(v) => setFilter({ ...filter, riskLevel: v ? [v as RiskLevel] : undefined })}
                data={RISK_LEVELS.map((r) => ({ value: r.value, label: r.label }))}
                clearable
                size="sm"
              />
              <Select
                label="优先级"
                placeholder="全部"
                value={filter.priority?.[0] || null}
                onChange={(v) => setFilter({ ...filter, priority: v ? [v as 'high' | 'medium' | 'low'] : undefined })}
                data={[
                  { value: 'high', label: '高' },
                  { value: 'medium', label: '中' },
                  { value: 'low', label: '低' },
                ]}
                clearable
                size="sm"
              />
              <Select
                label="工单类型"
                placeholder="全部"
                value={filter.type?.[0] || null}
                onChange={(v) => setFilter({ ...filter, type: v ? [v as WorkOrderType] : undefined })}
                data={WORK_ORDER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                clearable
                size="sm"
              />
            </SimpleGrid>
          </Paper>
        )}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="all">
              全部 ({counts.all})
            </Tabs.Tab>
            <Tabs.Tab value="pending_assign">
              待派单 ({counts.pending_assign})
            </Tabs.Tab>
            <Tabs.Tab value="in_progress">
              处理中 ({counts.in_progress})
            </Tabs.Tab>
            <Tabs.Tab value="completed">
              已完成 ({counts.completed})
            </Tabs.Tab>
            <Tabs.Tab value="reviewed">
              已复核 ({counts.reviewed})
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Paper>

      <ScrollArea h={500} offsetScrollbars>
        {filteredOrders.length === 0 ? (
          <Paper p="xl" withBorder>
            <Text ta="center" c="dimmed">暂无工单</Text>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {filteredOrders.map((wo) => (
              <WorkOrderCard
                key={wo.id}
                workOrder={wo}
                onView={() => handleView(wo)}
                onAssign={() => handleAssign(wo)}
                onStart={() => onStartWorkOrder(wo.id)}
                onComplete={() => handleComplete(wo)}
                onReview={() => handleReview(wo)}
              />
            ))}
          </SimpleGrid>
        )}
      </ScrollArea>

      <WorkOrderDetailModal
        opened={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        workOrder={selectedWorkOrder}
        media={media}
      />

      <AssignModal
        opened={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        assignees={assignees}
        onSubmit={(assignee) => {
          if (selectedWorkOrder) {
            onAssignWorkOrder(selectedWorkOrder.id, assignee);
          }
        }}
      />

      <CompleteModal
        opened={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        availableMedia={media}
        onAddMedia={(mediaId) => {
          if (selectedWorkOrder) {
            onAddMediaToWorkOrder(selectedWorkOrder.id, mediaId);
          }
        }}
        onSubmit={(completedBy, effectEvaluation, mediaIds) => {
          if (selectedWorkOrder) {
            onCompleteWorkOrder(selectedWorkOrder.id, completedBy, effectEvaluation, mediaIds);
          }
        }}
      />

      <ReviewModal
        opened={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={(reviewedBy, reviewComment, passed) => {
          if (selectedWorkOrder) {
            onReviewWorkOrder(selectedWorkOrder.id, reviewedBy, reviewComment, passed);
          }
        }}
      />

      <CreateWorkOrderModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        bells={bells}
        onSubmit={(params) => {
          onCreateWorkOrder({ ...params, sourceType: 'manual' });
        }}
      />
    </Stack>
  );
}
