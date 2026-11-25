import type { RequirementStatus } from '@/domain/types';

export interface Palette {
  canvas: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  teal: string;
  tealDeep: string;
  onTeal: string;
  brass: string;
  coral: string;
  grove: string;
  amber: string;
  input: string;
  compliantBg: string;
  expiringBg: string;
  expiredBg: string;
  missingBg: string;
  overlay: string;
}

export const light: Palette = {
  canvas: '#D9D0C2',
  bg: '#F3EEE4',
  surface: '#FFFBF5',
  ink: '#1A2B30',
  muted: '#5C6B70',
  line: '#E4D9C8',
  teal: '#0F6B66',
  tealDeep: '#0B3D3A',
  onTeal: '#F6F1E7',
  brass: '#A56B1D',
  coral: '#B23C38',
  grove: '#1C7A4E',
  amber: '#C4841D',
  input: '#FFFBF5',
  compliantBg: '#E5F5EC',
  expiringBg: '#FBF3E2',
  expiredBg: '#FBE8E6',
  missingBg: '#EEEAE3',
  overlay: 'rgba(16, 24, 27, 0.45)',
};

export const dark: Palette = {
  canvas: '#070C0E',
  bg: '#10181B',
  surface: '#1A262B',
  ink: '#F4EEE4',
  muted: '#A8B4B7',
  line: '#2C3C42',
  teal: '#3EAAA3',
  tealDeep: '#143330',
  onTeal: '#F6F1E7',
  brass: '#E0B15A',
  coral: '#F08A84',
  grove: '#7DCEA5',
  amber: '#E0B15A',
  input: '#121C20',
  compliantBg: '#16352A',
  expiringBg: '#3A2E16',
  expiredBg: '#3A1C1C',
  missingBg: '#243034',
  overlay: 'rgba(0, 0, 0, 0.62)',
};

export function statusColor(colors: Palette, status: RequirementStatus): string {
  switch (status) {
    case 'compliant':
      return colors.grove;
    case 'expiring':
      return colors.amber;
    case 'expired':
      return colors.coral;
    case 'missing':
      return colors.muted;
    default: {
      const neverStatus: never = status;
      return neverStatus;
    }
  }
}

export function statusBackground(colors: Palette, status: RequirementStatus): string {
  switch (status) {
    case 'compliant':
      return colors.compliantBg;
    case 'expiring':
      return colors.expiringBg;
    case 'expired':
      return colors.expiredBg;
    case 'missing':
      return colors.missingBg;
    default: {
      const neverStatus: never = status;
      return neverStatus;
    }
  }
}
