import { createTheme } from '@mui/material/styles'
import base from './theme.js'

// ── Admin design tokens ───────────────────────────────
// One accent (teal), one neutral scale, and three status colours. Everything in
// the admin console should be built from these instead of ad-hoc hex values.
export const ADMIN = {
  accent: '#0F766E',
  accentDark: '#115E59',
  accentLight: '#14B8A6',
  accentSoft: 'rgba(15,118,110,0.08)',
  ink: '#0F172A',
  body: '#334155',
  muted: '#64748B',
  line: '#E2E8F0',
  canvas: '#F6F7F9',
  surface: '#FFFFFF',
  sidebar: '#0B1324',
  sidebarLine: 'rgba(255,255,255,0.07)',
  success: '#047857',
  successSoft: 'rgba(4,120,87,0.1)',
  warning: '#B45309',
  warningSoft: 'rgba(180,83,9,0.1)',
  danger: '#B91C1C',
  dangerSoft: 'rgba(185,28,28,0.09)',
  info: '#1D4ED8',
  infoSoft: 'rgba(29,78,216,0.09)',
}

export const INK = ADMIN.ink
export const MUTED = ADMIN.muted

const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif'

// Keeps one consistent pill style for every status chip.
export const chipSx = (bg, color) => ({
  bgcolor: bg,
  color,
  fontWeight: 600,
  fontSize: '0.72rem',
  height: 24,
  borderRadius: 999,
  '& .MuiChip-label': { px: 1.25 },
})

const adminTheme = createTheme(base, {
  palette: {
    primary: {
      main: ADMIN.accent,
      dark: ADMIN.accentDark,
      light: ADMIN.accentLight,
      contrastText: '#FFFFFF',
    },
    secondary: { main: ADMIN.sidebar, light: '#1E293B', contrastText: '#FFFFFF' },
    info: {
      main: ADMIN.accent,
      dark: ADMIN.accentDark,
      light: ADMIN.accentLight,
      contrastText: '#FFFFFF',
    },
    success: { main: ADMIN.success, light: ADMIN.successSoft, contrastText: '#FFFFFF' },
    warning: { main: ADMIN.warning, light: ADMIN.warningSoft, contrastText: '#FFFFFF' },
    error: { main: ADMIN.danger, dark: '#991B1B', light: ADMIN.dangerSoft, contrastText: '#FFFFFF' },
    background: { default: ADMIN.canvas, paper: ADMIN.surface },
    text: { primary: ADMIN.ink, secondary: ADMIN.muted, disabled: '#94A3B8' },
    divider: ADMIN.line,
    action: {
      hover: 'rgba(15,23,42,0.04)',
      selected: 'rgba(15,118,110,0.08)',
      focus: 'rgba(15,118,110,0.12)',
    },
  },

  typography: {
    fontFamily: FONT,
    h1: { fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontFamily: FONT, fontWeight: 650 },
    h6: { fontFamily: FONT, fontWeight: 650 },
    subtitle1: { fontFamily: FONT, fontWeight: 600, fontSize: '1rem' },
    subtitle2: { fontFamily: FONT, fontWeight: 600 },
    body1: { fontSize: '0.9rem', lineHeight: 1.6 },
    body2: { fontSize: '0.84rem', lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 600 },
  },

  // Kept at 4 so the numeric radii already used across admin pages stay at their
  // intended sizes (borderRadius: 2 → 8px). Larger radii below are explicit px.
  shape: { borderRadius: 4 },

  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          minHeight: 38,
          fontSize: '0.86rem',
          fontWeight: 600,
          letterSpacing: 0,
          lineHeight: 1.2,
          position: 'static',
          overflow: 'visible',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
        },
        sizeSmall: { minHeight: 32, padding: '6px 12px', fontSize: '0.8rem', borderRadius: 7 },
        contained: { '&::before': { content: 'none' }, '&:hover': { boxShadow: 'none' } },
        outlined: { borderColor: ADMIN.line, '&:hover': { borderColor: ADMIN.accent, borderWidth: 1 } },
        text: { '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.875rem',
          backgroundColor: ADMIN.surface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: ADMIN.line },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5, borderColor: ADMIN.accent },
        },
        inputSizeSmall: { padding: '9px 12px' },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '0.85rem' } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: '0.74rem', marginLeft: 2 } } },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, border: `1px solid ${ADMIN.line}`, boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' }, rounded: { borderRadius: 12 } },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.72rem', borderRadius: 999, height: 24 },
        labelSmall: { paddingLeft: 10, paddingRight: 10 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.86rem',
          minHeight: 44,
          minWidth: 100,
          padding: '10px 16px',
          color: ADMIN.muted,
          '&.Mui-selected': { color: ADMIN.ink },
        },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 14, border: `1px solid ${ADMIN.line}`, boxShadow: '0 24px 60px rgba(15,23,42,0.18)' } } },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1rem', fontWeight: 700, padding: '18px 22px' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '20px 22px' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '14px 22px 18px' } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: ADMIN.line, fontSize: '0.84rem', padding: '12px 16px' },
        head: {
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: ADMIN.muted,
          backgroundColor: '#F8FAFC',
        },
      },
    },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 10, border: `1px solid ${ADMIN.line}`, boxShadow: '0 12px 30px rgba(15,23,42,0.12)' } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: '0.86rem', minHeight: 36 } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: ADMIN.ink, fontSize: '0.74rem', borderRadius: 6, padding: '6px 9px' },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 8, fontSize: '0.84rem' } } },
    MuiLinearProgress: { styleOverrides: { root: { height: 6, borderRadius: 999, backgroundColor: '#EEF2F6' }, bar: { borderRadius: 999 } } },
    MuiDivider: { styleOverrides: { root: { borderColor: ADMIN.line } } },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 10 } } },
  },
})

export default adminTheme
