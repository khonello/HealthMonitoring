import { Platform } from 'react-native';

const iosShadow = (
  color: string,
  offset: { width: number; height: number },
  opacity: number,
  radius: number
) =>
  Platform.OS === 'ios'
    ? { shadowColor: color, shadowOffset: offset, shadowOpacity: opacity, shadowRadius: radius }
    : {};

export const Shadows = {
  sm: {
    ...iosShadow('#0F172A', { width: 0, height: 1 }, 0.05, 4),
    elevation: 1,
  },
  md: {
    ...iosShadow('#0F172A', { width: 0, height: 3 }, 0.08, 10),
    elevation: 3,
  },
  lg: {
    ...iosShadow('#0F172A', { width: 0, height: 6 }, 0.10, 18),
    elevation: 6,
  },
  xl: {
    ...iosShadow('#0F172A', { width: 0, height: 10 }, 0.14, 28),
    elevation: 10,
  },
  card: {
    ...iosShadow('#0F172A', { width: 0, height: 2 }, 0.07, 12),
    elevation: 3,
  },
  tabBar: {
    ...iosShadow('#0F172A', { width: 0, height: -2 }, 0.06, 12),
    elevation: 8,
  },
} as const;
