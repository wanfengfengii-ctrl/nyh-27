import { Container, Title, Text, Stack, Grid, Paper, Group, Badge, NumberInput, Tooltip } from '@mantine/core';
import { Settings, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BellRack } from './components/BellRack/BellRack';
import { BellEditor } from './components/BellEditor/BellEditor';
import { FrequencyChart } from './components/FrequencyChart/FrequencyChart';
import { DeviationChart } from './components/DeviationChart/DeviationChart';
import { SchemeManager } from './components/SchemeManager/SchemeManager';
import { HistoryPanel } from './components/HistoryPanel/HistoryPanel';
import { ImportExport } from './components/ImportExport/ImportExport';
import { useBellSet } from './hooks/useBellSet';
import { getOutOfRangeCount } from './utils/cents';

export default function App() {
  const {
    schemes,
    activeScheme,
    activeSchemeId,
    bells,
    filteredAndSortedBells,
    selectedBell,
    selectedBellId,
    allowedDeviation,
    filterOutOfRange,
    sortBy,
    sortOrder,
    currentStrikePosition,
    compareSchemeIds,
    compareSchemes,
    canExport,
    operationHistory,
    reviewLogs,
    reviewStatus,
    selectBell,
    updateBell,
    updateBellFrequency,
    reorderBells,
    setAllowedDeviation,
    addBell,
    removeBell,
    importBells,
    createNewScheme,
    duplicateScheme,
    deleteScheme,
    setActiveScheme,
    toggleCompareScheme,
    addReviewLog,
    setCurrentStrikePosition,
    setFilterOutOfRange,
    setSortBy,
    setSortOrder,
  } = useBellSet();

  const outOfRangeCount = activeScheme
    ? getOutOfRangeCount(activeScheme.bells, currentStrikePosition, allowedDeviation)
    : 0;

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px 0' }}>
      <Container size="xl">
        <Stack gap="lg">
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" wrap="wrap">
              <div>
                <Title order={1} size="h2" c="bronze.7" mb="xs">
                  编钟校音与复核工作台
                </Title>
                <Text size="sm" c="dimmed">
                  多方案管理 · 多位置校音 · 录音识频 · 复核留痕 · 批量导入导出
                </Text>
              </div>
              <Group>
                <Badge size="lg" variant="light" color="bronze">
                  共 {bells.length} 口编钟
                </Badge>
                {outOfRangeCount > 0 && (
                  <Badge size="lg" color="red" variant="filled">
                    {outOfRangeCount} 口超限
                  </Badge>
                )}
                <Badge
                  size="lg"
                  color={reviewStatus === 'approved' ? 'green' : reviewStatus === 'rejected' ? 'red' : 'yellow'}
                  leftSection={
                    reviewStatus === 'approved' ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )
                  }
                >
                  {reviewStatus === 'approved' ? '已通过' : reviewStatus === 'rejected' ? '已驳回' : '待复核'}
                </Badge>
              </Group>
            </Group>
          </Paper>

          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 3, lg: 2 }}>
              <Stack gap="lg">
                <SchemeManager
                  schemes={schemes}
                  activeSchemeId={activeSchemeId}
                  compareSchemeIds={compareSchemeIds}
                  onSelectScheme={setActiveScheme}
                  onCreateScheme={createNewScheme}
                  onDuplicateScheme={duplicateScheme}
                  onDeleteScheme={deleteScheme}
                  onToggleCompare={toggleCompareScheme}
                />
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6, lg: 7 }}>
              <Stack gap="lg">
                <BellRack
                  bells={bells}
                  filteredBells={filteredAndSortedBells}
                  selectedBellId={selectedBellId}
                  allowedDeviation={allowedDeviation}
                  currentStrikePosition={currentStrikePosition}
                  filterOutOfRange={filterOutOfRange}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSelectBell={selectBell}
                  onReorder={reorderBells}
                  onAddBell={addBell}
                  onStrikePositionChange={setCurrentStrikePosition}
                  onFilterChange={setFilterOutOfRange}
                  onSortByChange={setSortBy}
                  onSortOrderChange={setSortOrder}
                />

                <Grid gutter="lg">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <FrequencyChart
                      bells={bells}
                      strikePosition={currentStrikePosition}
                      compareSchemes={compareSchemes}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <DeviationChart
                      bells={bells}
                      allowedDeviation={allowedDeviation}
                      strikePosition={currentStrikePosition}
                      compareSchemes={compareSchemes}
                    />
                  </Grid.Col>
                </Grid>

                <Paper p="sm" radius="md" withBorder>
                  <Group justify="space-between" wrap="wrap">
                    <Group gap="md">
                      <Group gap="xs">
                        <Text size="sm" c="dimmed">
                          编钟数量:
                        </Text>
                        <Badge size="sm" variant="light" color="bronze">
                          {bells.length} 口
                        </Badge>
                      </Group>

                      {activeScheme?.updatedAt && (
                        <Text size="xs" c="dimmed">
                          更新于 {formatDate(activeScheme.updatedAt)}
                        </Text>
                      )}
                    </Group>

                    <Group gap="md">
                      <Group gap="xs">
                        <Settings size={14} style={{ opacity: 0.6 }} />
                        <Text size="sm" c="dimmed">
                          允许偏差:
                        </Text>
                        <NumberInput
                          size="xs"
                          w={80}
                          value={allowedDeviation}
                          onChange={(v) =>
                            setAllowedDeviation(typeof v === 'number' ? v : 50)
                          }
                          min={1}
                          max={200}
                          rightSection={<Text size="xs" c="dimmed">音分</Text>}
                        />
                      </Group>

                      <ImportExport
                        bells={bells}
                        currentStrikePosition={currentStrikePosition}
                        onImport={importBells}
                        canExport={canExport}
                      />
                    </Group>
                  </Group>
                </Paper>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 3, lg: 3 }}>
              <Stack gap="lg">
                <BellEditor
                  bell={selectedBell}
                  allowedDeviation={allowedDeviation}
                  currentStrikePosition={currentStrikePosition}
                  onUpdate={updateBell}
                  onUpdateFrequency={updateBellFrequency}
                  onRemove={removeBell}
                  onStrikePositionChange={setCurrentStrikePosition}
                />

                <HistoryPanel
                  operationHistory={operationHistory}
                  reviewLogs={reviewLogs}
                  reviewStatus={reviewStatus}
                  canReview={true}
                  onReview={(status, comment) =>
                    activeScheme && addReviewLog(activeScheme.id, status, comment)
                  }
                />
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </div>
  );
}
