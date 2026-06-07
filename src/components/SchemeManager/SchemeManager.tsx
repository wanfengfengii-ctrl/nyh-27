import { useState } from 'react';
import {
  Paper,
  Title,
  Button,
  Group,
  List,
  Badge,
  Text,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Textarea,
  Tooltip,
  Stack,
} from '@mantine/core';
import { Plus, Copy, Trash2, CheckCircle, Clock, XCircle, MoreHorizontal, GitCompare } from 'lucide-react';
import type { BellScheme, ReviewStatus } from '../../types/bell';

interface SchemeManagerProps {
  schemes: BellScheme[];
  activeSchemeId: string | null;
  compareSchemeIds: string[];
  onSelectScheme: (id: string) => void;
  onCreateScheme: (name: string, description: string) => void;
  onDuplicateScheme: (id: string, newName: string) => void;
  onDeleteScheme: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

const statusConfig: Record<ReviewStatus, { label: string; color: string; icon: React.ReactNode }> = {
  approved: { label: '已通过', color: 'green', icon: <CheckCircle size={14} /> },
  pending: { label: '待复核', color: 'yellow', icon: <Clock size={14} /> },
  rejected: { label: '已驳回', color: 'red', icon: <XCircle size={14} /> },
};

export function SchemeManager({
  schemes,
  activeSchemeId,
  compareSchemeIds,
  onSelectScheme,
  onCreateScheme,
  onDuplicateScheme,
  onDeleteScheme,
  onToggleCompare,
}: SchemeManagerProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [targetSchemeId, setTargetSchemeId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const handleCreateSubmit = () => {
    if (newName.trim()) {
      onCreateScheme(newName.trim(), newDescription.trim());
      setCreateModalOpen(false);
      setNewName('');
      setNewDescription('');
    }
  };

  const handleDuplicateClick = (schemeId: string) => {
    const scheme = schemes.find((s) => s.id === schemeId);
    setTargetSchemeId(schemeId);
    setNewName(`${scheme?.name || '方案'} 副本`);
    setDuplicateModalOpen(true);
  };

  const handleDuplicateSubmit = () => {
    if (targetSchemeId && newName.trim()) {
      onDuplicateScheme(targetSchemeId, newName.trim());
      setDuplicateModalOpen(false);
      setTargetSchemeId(null);
      setNewName('');
    }
  };

  return (
    <>
      <Paper p="md" radius="md" withBorder h="100%">
        <Group justify="space-between" mb="md">
          <Title order={3} size="h4">
            音列方案
          </Title>
          <Button
            size="xs"
            leftSection={<Plus size={14} />}
            variant="light"
            color="bronze"
            onClick={() => setCreateModalOpen(true)}
          >
            新建
          </Button>
        </Group>

        <List spacing="xs" size="sm">
          {schemes.map((scheme) => {
            const status = statusConfig[scheme.reviewStatus];
            const isActive = scheme.id === activeSchemeId;
            const isComparing = compareSchemeIds.includes(scheme.id);

            return (
              <List.Item
                key={scheme.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--mantine-color-bronze-0)' : 'transparent',
                  border: isActive ? '1px solid var(--mantine-color-bronze-3)' : '1px solid transparent',
                }}
                onClick={() => onSelectScheme(scheme.id)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={isActive ? 600 : 500} lineClamp={1}>
                      {scheme.name}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {scheme.bells.length} 口钟 · {scheme.description || '无描述'}
                    </Text>
                    <Group gap={4} mt={4}>
                      <Badge size="xs" color={status.color} variant="light" leftSection={status.icon}>
                        {status.label}
                      </Badge>
                      {isComparing && (
                        <Badge size="xs" color="blue" variant="light" leftSection={<GitCompare size={10} />}>
                          对比中
                        </Badge>
                      )}
                    </Group>
                  </div>
                  <Menu shadow="md" width={140}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={<GitCompare size={14} />}
                        onClick={() => onToggleCompare(scheme.id)}
                        disabled={scheme.id === activeSchemeId}
                      >
                        {isComparing ? '取消对比' : '加入对比'}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<Copy size={14} />}
                        onClick={() => handleDuplicateClick(scheme.id)}
                      >
                        复制方案
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<Trash2 size={14} />}
                        color="red"
                        onClick={() => onDeleteScheme(scheme.id)}
                        disabled={schemes.length <= 1}
                      >
                        删除方案
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </List.Item>
            );
          })}
        </List>

        {schemes.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            暂无方案，点击新建创建
          </Text>
        )}
      </Paper>

      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="新建音列方案"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="方案名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="请输入方案名称"
            required
          />
          <Textarea
            label="方案描述"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="请输入方案描述（可选）"
            minRows={3}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setCreateModalOpen(false)}>
              取消
            </Button>
            <Button color="bronze" onClick={handleCreateSubmit} disabled={!newName.trim()}>
              创建
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="复制方案"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="新方案名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="请输入新方案名称"
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setDuplicateModalOpen(false)}>
              取消
            </Button>
            <Button color="bronze" onClick={handleDuplicateSubmit} disabled={!newName.trim()}>
              复制
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
