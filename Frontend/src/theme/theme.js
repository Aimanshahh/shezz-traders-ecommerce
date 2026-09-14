import { createTheme, alpha } from '@mui/material/styles'

// ── Brand palette (pulled from logo) ───────────────
export const BRAND = {
  red: '#E31E24',
  redDark: '#B71C1C',
  redLight: '#FF5252',
  navy: '#1A2433',
  navySoft: '#2E3A4D',
  teal: '#00B8D4',
  tealDark: '#00838F',
  tealDeep: '#006064',
  orange: '#fb3708',
  ink: '#0F1115',
  grey: '#5F6368',
  line: '#DADFE3',
  paper: '#FAFAFA',
}

// Reusable gradient for headings / hero text
export const brandGradient =
  'linear-gradient(135deg, #00B8D4 0%, #E31E24 55%, #F57C00 100%)'

const theme = createTheme({
  palette: {
    primary: {
      main: BRAND.orange,
      dark: BRAND.tealDark,
      light: BRAND.teal,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: BRAND.navy,
      light: BRAND.navySoft,
      contrastText: '#FFFFFF',
    },
    info: {
      main: BRAND.tealDark,
      light: BRAND.teal,
      dark: BRAND.tealDeep,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: BRAND.orange,
      contrastText: '#FFFFFF',
    },
    error: {
      main: BRAND.red,
      dark: BRAND.redDark,
    },
    success: {
      main: BRAND.teal,
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: BRAND.paper,
    },
    text: {
      primary: BRAND.ink,
      secondary: BRAND.grey,
    },
    divider: BRAND.line,
  },

  typography: {
    fontFamily: ['Inter', 'sans-serif'].join(','),
    h1: {
      fontFamily: '"Barlow Condensed", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontFamily: '"Barlow Condensed", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.01em',
    },
    h3: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 },
    subtitle1: {
      fontFamily: '"Barlow Condensed", sans-serif',
      fontWeight: 600,
      fontSize: '1.15rem',
    },
    button: { textTransform: 'none', fontWeight: 600 },
  },

  shape: { borderRadius: 4 },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          padding: '10px 24px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'color 0.3s ease',
          zIndex: 0,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundColor: BRAND.navy,
            transform: 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 0.3s ease',
            zIndex: -1,
          },
          '&:hover::before': { transform: 'scaleX(1)' },
        },
        containedInfo: {
          '&::before': { backgroundColor: BRAND.tealDeep },
        },
        containedWarning: {
          '&::before': { backgroundColor: BRAND.redDark },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': { borderWidth: 1.5 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: 'none', border: `1px solid ${BRAND.line}` },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: 'none' },
      },
    },
  },
})

export default theme