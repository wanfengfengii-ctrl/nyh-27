import { Container, Title, Text, Stack, Grid, Paper } from '@mantine/core';
import { BellRack } from './components/BellRack/BellRack';
import { BellEditor } from './components/BellEditor/BellEditor';
import { FrequencyChart } from './components/FrequencyChart/FrequencyChart';
import { DeviationChart } from './components/DeviationChart/DeviationChart';
import { StatusBar } from './components/StatusBar/StatusBar';
import { useBellSet } from './hooks/useBellSet';

export default function App() {
  const {
    bells,
    selectedBell,
    selectedBellId,
    confirmed,
    confirmedAt,
    allowedDeviation,
    selectBell,
    updateBell,
    reorderBells,
    confirmBellSet,
    setAllowedDeviation,
    addBell,
    removeBell,
  } = useBellSet();

  return (
    <div style={{ minHeight: '100vh', padding: '20px 0' }}>
      <Container size="xl">
        <Stack gap="lg">
          <Paper p="md" radius="md" withBorder>
            <div style={{ textAlign: 'center' }}>
              <Title order={1} size="h2" c="bronze.7" mb="xs">
                编钟音列分析系统
              </Title>
              <Text size="sm" c="dimmed">
                记录编钟音列 · 分析实测频率 · 辅助调整排列
              </Text>
            </div>
          </Paper>

          <BellRack
            bells={bells}
            selectedBellId={selectedBellId}
            allowedDeviation={allowedDeviation}
            onSelectBell={selectBell}
            onReorder={reorderBells}
            onAddBell={addBell}
          />

          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
              <BellEditor
                bell={selectedBell}
                allowedDeviation={allowedDeviation}
                onUpdate={updateBell}
                onRemove={removeBell}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
              <Stack gap="lg">
                <Grid gutter="lg">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <FrequencyChart bells={bells} />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <DeviationChart bells={bells} allowedDeviation={allowedDeviation} />
                  </Grid.Col>
                </Grid>

                <StatusBar
                  confirmed={confirmed}
                  confirmedAt={confirmedAt}
                  allowedDeviation={allowedDeviation}
                  onConfirm={confirmBellSet}
                  onAllowedDeviationChange={setAllowedDeviation}
                  bellCount={bells.length}
                />
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </div>
  );
}
