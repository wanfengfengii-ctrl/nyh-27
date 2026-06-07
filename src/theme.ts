import { createTheme, MantineColorsTuple } from '@mantine/core';

const bronze: MantineColorsTuple = [
  '#faf3e8',
  '#f0e4cf',
  '#e2cfa3',
  '#d4b878',
  '#c9a962',
  '#b8954a',
  '#9a7d3d',
  '#7c6331',
  '#5e4a25',
  '#403219',
];

const darkWood: MantineColorsTuple = [
  '#f5f0e8',
  '#e5ddd0',
  '#cec2ad',
  '#b6a689',
  '#a08d6d',
  '#8a7755',
  '#6e5d42',
  '#524531',
  '#3a2f22',
  '#23190f',
];

export const theme = createTheme({
  colors: {
    bronze,
    darkWood,
  },
  primaryColor: 'bronze',
  primaryShade: 6,
  fontFamily: '"Noto Sans SC", system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'monospace',
  headings: {
    fontFamily: '"Noto Serif SC", Georgia, serif',
    fontWeight: '600',
  },
  defaultRadius: 'md',
  components: {
    Card: {
      defaultProps: {
        shadow: 'sm',
        withBorder: true,
      },
      styles: {
        root: {
          borderColor: 'rgba(185, 150, 95, 0.3)',
        },
      },
    },
    Button: {
      defaultProps: {
        radius: 'sm',
      },
    },
  },
});
