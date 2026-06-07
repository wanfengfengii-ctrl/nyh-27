import { useState, useRef } from 'react';
import {
  Button,
  Group,
  Menu,
  Text,
  Modal,
  Tabs,
  Textarea,
  Alert,
  Badge,
  Stack,
  Radio,
  FileButton,
} from '@mantine/core';
import { Upload, Download, FileJson, FileSpreadsheet, AlertCircle, Check } from 'lucide-react';
import type { Bell, ExportFormat, ImportResult } from '../../types/bell';
import {
  parseBellsFromJSON,
  parseBellsFromCSV,
  exportBellsToJSON,
  exportBellsToCSV,
  downloadFile,
  generateBatchBellTemplate,
} from '../../utils/importExport';

interface ImportExportProps {
  bells: Bell[];
  currentStrikePosition: string;
  onImport: (bells: Bell[], replace: boolean) => void;
  canExport: boolean;
}

export function ImportExport({ bells, currentStrikePosition, onImport, canExport }: ImportExportProps) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (format: ExportFormat) => {
    if (!canExport) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = exportBellsToJSON(bells);
      filename = `编钟音列方案_${new Date().toLocaleDateString()}.json`;
      mimeType = 'application/json';
    } else {
      content = exportBellsToCSV(bells, currentStrikePosition as any);
      filename = `编钟音列方案_${new Date().toLocaleDateString()}.csv`;
      mimeType = 'text/csv';
    }

    downloadFile(content, filename, mimeType);
  };

  const handleDownloadTemplate = (format: ExportFormat) => {
    const content = generateBatchBellTemplate(format);
    const filename = `编钟批量录入模板.${format}`;
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';
    downloadFile(content, filename, mimeType);
  };

  const handleParsePaste = () => {
    if (!importText.trim()) {
      setImportResult({ success: false, error: '请输入数据内容' });
      return;
    }

    const trimmed = importText.trim();
    let result: ImportResult;

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      result = parseBellsFromJSON(trimmed);
    } else {
      result = parseBellsFromCSV(trimmed);
    }

    setImportResult(result);
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    const text = await file.text();
    setImportText(text);

    let result: ImportResult;
    if (file.name.toLowerCase().endsWith('.json')) {
      result = parseBellsFromJSON(text);
    } else {
      result = parseBellsFromCSV(text);
    }

    setImportResult(result);
  };

  const handleConfirmImport = () => {
    if (importResult?.success && importResult.bells) {
      onImport(importResult.bells, importMode === 'replace');
      setImportModalOpen(false);
      setImportText('');
      setImportResult(null);
    }
  };

  return (
    <>
      <Group gap="xs">
        <Menu shadow="md" width={160}>
          <Menu.Target>
            <Button
              size="sm"
              variant="light"
              color="bronze"
              leftSection={<Upload size={16} />}
              onClick={() => setImportModalOpen(true)}
            >
              批量导入
            </Button>
          </Menu.Target>
        </Menu>

        <Menu shadow="md" width={180}>
          <Menu.Target>
            <Button
              size="sm"
              variant="light"
              color="green"
              leftSection={<Download size={16} />}
              disabled={!canExport}
              title={canExport ? '' : '方案需通过复核后才能导出'}
            >
              导出方案
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>导出格式</Menu.Label>
            <Menu.Item
              leftSection={<FileJson size={16} />}
              onClick={() => handleExport('json')}
              disabled={!canExport}
            >
              导出为 JSON
            </Menu.Item>
            <Menu.Item
              leftSection={<FileSpreadsheet size={16} />}
              onClick={() => handleExport('csv')}
              disabled={!canExport}
            >
              导出为 CSV
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>下载模板</Menu.Label>
            <Menu.Item
              leftSection={<FileJson size={16} />}
              onClick={() => handleDownloadTemplate('json')}
            >
              JSON 模板
            </Menu.Item>
            <Menu.Item
              leftSection={<FileSpreadsheet size={16} />}
              onClick={() => handleDownloadTemplate('csv')}
            >
              CSV 模板
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Modal
        opened={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="批量导入编钟"
        size="lg"
      >
        <Stack gap="md">
          {!canExport && (
            <Alert icon={<AlertCircle size={16} />} color="yellow" title="注意">
              当前方案未通过复核，导入操作将重置复核状态
            </Alert>
          )}

          <Radio.Group
            value={importMode}
            onChange={(v) => setImportMode(v as 'append' | 'replace')}
            label="导入方式"
          >
            <Group mt="xs">
              <Radio value="append" label="追加到现有方案" />
              <Radio value="replace" label="替换当前方案" />
            </Group>
          </Radio.Group>

          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="paste" leftSection={<FileSpreadsheet size={14} />}>
                粘贴数据
              </Tabs.Tab>
              <Tabs.Tab value="file" leftSection={<Upload size={14} />}>
                文件上传
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="paste" pt="md">
              <Textarea
                placeholder={`粘贴 JSON 或 CSV 格式的数据...\n\nCSV 格式示例：\n位置,名称,音名,目标频率,实测频率,重量,敲击位置\n1,宫钟,C4,261.63,260.50,15.5,正鼓`}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportResult(null);
                }}
                minRows={10}
                autosize
              />
              <Group justify="flex-end" mt="sm">
                <Button size="sm" variant="light" onClick={handleParsePaste}>
                  解析数据
                </Button>
              </Group>
            </Tabs.Panel>

            <Tabs.Panel value="file" pt="md">
              <Group justify="center" py="xl">
                <FileButton
                  accept=".json,.csv,.txt"
                  onChange={handleFileSelect}
                >
                  {(props) => (
                    <Button {...props} variant="light" color="bronze" leftSection={<Upload size={16} />}>
                      选择文件
                    </Button>
                  )}
                </FileButton>
              </Group>
              <Text size="xs" c="dimmed" ta="center">
                支持 JSON 和 CSV 格式文件
              </Text>
            </Tabs.Panel>
          </Tabs>

          {importResult && (
            <Alert
              icon={importResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
              color={importResult.success ? 'green' : 'red'}
              title={importResult.success ? '解析成功' : '解析失败'}
            >
              {importResult.success ? (
                <Text size="sm">
                  成功解析 <Badge size="sm">{importResult.bells?.length || 0}</Badge> 口编钟数据
                </Text>
              ) : (
                <Text size="sm">{importResult.error}</Text>
              )}
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setImportModalOpen(false)}>
              取消
            </Button>
            <Button
              color="bronze"
              onClick={handleConfirmImport}
              disabled={!importResult?.success}
            >
              确认导入
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
