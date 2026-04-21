/**
 * WMSU color theme – matches the frontend (frontend/src/index.css).
 * Used across the app for consistent branding.
 */

import { Platform } from 'react-native';

// WMSU palette (from frontend :root)
export const WMSU = {
  red: '#8B0000',
  redLight: '#A52A2A',
  redDark: '#6B0000',
  green: '#228B22',
  orange: '#FF8C00',
  blue: '#1E40AF',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  gray: '#E5E5E5',
} as const;

const tintColorLight = WMSU.red;
const tintColorDark = WMSU.redLight;

export const Colors = {
  light: {
    text: '#11181C',
    background: WMSU.grayLight,
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    link: WMSU.red,
    headerBg: WMSU.redLight,
    card: WMSU.white,
    border: WMSU.gray,
  },
  dark: {
    text: '#ECEDEE',
    background: '#1A1A1A',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    link: WMSU.redLight,
    headerBg: WMSU.redDark,
    card: '#252525',
    border: '#333',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
