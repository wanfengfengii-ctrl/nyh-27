import { useState } from 'react';
import {
  Paper,
  Title,
  Tabs,
  Timeline,
  Text,
  Badge,
  Group,
  Button,
  Modal,
  Textarea,
  Stack,
  Alert,
  Avatar,
} from '@mantine/core';
import {
  History,
  FileCheck,
  Plus,
  Trash2,
  Edit3,
  Move,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
} from 'lucide-react';
import type { OperationHistory, ReviewLog, ReviewStatus } from '../../types/bell';

interface HistoryPanelProps {
  operationHistory: OperationHistory[];
  reviewLogs: ReviewLog[];
  reviewStatus: ReviewStatus;
  canReview?: boolean;
  onReview?: (status: ReviewStatus, comment: string) => void;
}

const operationIconMap: Record<string, React.ReactNode> = {
  add: <Plus size={14} />,
  remove: <Trash2 size={14} />,
  update: <Edit3 size={14} />,
  reorder: <Move size={14} />,
  import: <Upload size={14} />,
  batch_add: <Plus size={14} />,
};

const operationColorMap: Record<string, string> = {
  add: 'green',
  remove: 'red',
  update: 'blue',
  reorder: 'violet',
  import: 'cyan',
  batch_add: 'teal',
};

const statusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }> = {
  approved: { label: '已通过', color: 'green', icon: <CheckCircle size={16} /> },
  pending: { label: '待复核', color: 'yellow', icon: <Clock size={16} /> },
  rejected: { label: '已驳回', color: 'red', icon: <XCircle size={16} /> },
};

export function HistoryPanel({
  operationHistory,
  reviewLogs,
  reviewStatus,
  canReview = true,
  onReview,
}: HistoryPanelProps) {
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleOpenReview = (action: 'approve' | 'reject') => {
    setReviewAction(action);
    setReviewComment('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = () => {
    if (onReview) {
      const status = reviewAction === 'approve' ? 'approved' : 'rejected';
      onReview(status, reviewComment);
      setReviewModalOpen(false);
    }
  };

  const status = statusConfig[reviewStatus];

  return (
    <>
      <Paper p="md" radius="md" withBorder h="100%">
        <Group justify="space-between" mb="md">
          <Title order={3} size="h4">
            历史与复核
          </Title>
          <Badge color={status.color} leftSection={status.icon} variant="light">
            {status.label}
          </Badge>
        </Group>

        {canReview && (
          <Group mb="md" grow>
            <Button
              size="xs"
              variant="light"
              color="green"
              leftSection={<CheckCircle size={14} />}
              onClick={() => handleOpenReview('approve')}
            >
              通过复核
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              leftSection={<XCircle size={14} />}
              onClick={() => handleOpenReview('reject')}
            >
              驳回方案
            </Button>
          </Group>
        )}

        {reviewStatus !== 'approved' && (
          <Alert icon={<AlertTriangle size={16} />} color="yellow" mb="md">
            <Text size="xs">未通过复核的方案无法导出最终版本</Text>
          </Alert>
        )}

        <Tabs defaultValue="history">
          <Tabs.List>
            <Tabs.Tab value="history" leftSection={<History size={14} />}>
              操作历史
            </Tabs.Tab>
            <Tabs.Tab value="review" leftSection={<FileCheck size={14} />}>
              复核日志
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="history" pt="md" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {operationHistory.length > 0 ? (
              <Timeline active={operationHistory.length - 1} bulletSize={20} lineWidth={2}>
                {operationHistory.slice(0, 20).map((item, index) => (
                  <Timeline.Item
                    key={item.id}
                    bullet={operationIconMap[item.type] || <Edit3 size={12} />}
                    color={operationColorMap[item.type] || 'gray'}
                    title={
                      <Group gap={4}>
                        <Text size="sm" fw={500}>
                          {item.description}
                        </Text>
                        {item.bellName && (
                          <Badge size="xs" variant="light">
                            {item.bellName}
                          </Badge>
                        )}
                      </Group>
                    }
                  >
                    <Text size="xs" c="dimmed">
                      {formatTime(item.timestamp)}
                    </Text>
                    {item.oldValue !== null && item.newValue !== null && (
                      <Text size="xs" c="dimmed" mt={2}>
                        {String(item.oldValue)} → {String(item.newValue)}
                      </Text>
                    )}
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                暂无操作记录
              </Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="review" pt="md" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {reviewLogs.length > 0 ? (
              <Stack gap="md">
                {reviewLogs.map((log) => {
                  const logStatus = statusConfig[log.status];
                  return (
                    <Paper key={log.id} p="sm" withBorder radius="sm">
                      <Group justify="space-between" mb="xs">
                        <Group gap={6}>
                          <Avatar size={24} color={logStatus.color} radius="xl">
                            <User size={12} />
                          </Avatar>
                          <Text size="sm" fw={500}>
                            {log.reviewer}
                          </Text>
                          <Badge size="xs" color={logStatus.color} variant="light">
                            {logStatus.label}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatTime(log.timestamp)}
                        </Text>
                      </Group>
                      {log.comment && (
                        <Text size="sm" c="dimmed">
                          {log.comment}
                        </Text>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                暂无复核记录
              </Text>
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Modal
        opened={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={reviewAction === 'approve' ? '通过复核' : '驳回方案'}
        size="md"
      >
        <Stack gap="md">
          {reviewAction === 'approve' ? (
            <Alert icon={<CheckCircle size={16} />} color="green">
              通过复核后，方案将标记为已通过，可以导出最终版本
            </Alert>
          ) : (
            <Alert icon={<XCircle size={16} />} color="red">
              驳回方案后，方案将标记为已驳回，需要修改后重新提交复核
            </Alert>
          )}

          <Textarea
            label="复核意见"
            placeholder={`请输入${reviewAction === 'approve' ? '通过' : '驳回'}意见...`}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            minRows={4}
            required={reviewAction === 'reject'}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setReviewModalOpen(false)}>
              取消
            </Button>
            <Button
              color={reviewAction === 'approve' ? 'green' : 'red'}
              onClick={handleSubmitReview}
            >
              确认{reviewAction === 'approve' ? '通过' : '驳回'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
