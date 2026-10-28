import { useApp } from '../context/AppContext';

/**
 * Visual Identity 2.0 colors ("قرطاس أندلسي" by day, "موكا" by night).
 * Values match the approved design canvas. New screens use these instead of
 * hardcoded hex values; older screens move over in the design-system phase.
 */
export const PALETTE = {
  light: {
    bg: '#FAF6F0',
    bgAlt: '#F2EAE0',
    surface: '#FFFDF9',
    soft: '#F5ECE1',
    border: '#E8DFD5',
    divider: '#F2EAE0',
    ink: '#2D1E16',
    muted: '#6F5A4A',
    primary: '#8C5E3C',
    onPrimary: '#FFFDF9',
    primaryInk: '#5D3A22',
    hero: '#5D3A22',
    onHero: '#FAF1E6',
    onHeroMuted: '#E8D3B4',
    accent: '#C69255',
    accentInk: '#946528',
    quranInk: '#261912',
    success: '#4E7D5B',
    successBg: '#E7EFE9',
    successInk: '#3A6346',
    danger: '#B34743',
    dangerBg: '#F7E4E2',
    track: '#E8DFD5'
  },
  dark: {
    bg: '#1A1411',
    bgAlt: '#221B17',
    surface: '#2A211C',
    soft: '#3A2C22',
    border: '#43352C',
    divider: '#33281F',
    ink: '#F2E9DE',
    muted: '#B5A394',
    primary: '#D6A877',
    onPrimary: '#1A1411',
    primaryInk: '#D6A877',
    hero: '#3A2618',
    onHero: '#FAF1E6',
    onHeroMuted: '#E8D3B4',
    accent: '#C69255',
    accentInk: '#D6A877',
    quranInk: '#EFE4D3',
    success: '#7FB08B',
    successBg: '#24382A',
    successInk: '#9CCBA8',
    danger: '#E08A84',
    dangerBg: '#3A2220',
    track: '#43352C'
  }
};

export type Palette = typeof PALETTE.light;

export function usePalette(): Palette {
  const { themeMode } = useApp();
  return themeMode === 'dark' ? PALETTE.dark : PALETTE.light;
}
