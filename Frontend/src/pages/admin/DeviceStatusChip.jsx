import { Chip } from '@mui/material'

export const STATUS_META = {
  available: { label: 'Available', bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  reserved: { label: 'Reserved', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  sold: { label: 'Sold', bg: 'rgba(0,131,143,0.12)', color: '#00717A' },
  returned: { label: 'Returned', bg: 'rgba(251,55,8,0.1)', color: '#C2410C' },
  replacement: { label: 'Replacement', bg: 'rgba(99,102,241,0.12)', color: '#4338CA' },
  faulty: { label: 'Faulty', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
  lost: { label: 'Lost', bg: 'rgba(100,116,139,0.14)', color: '#475569' },
  deactivated: { label: 'Deactivated', bg: 'rgba(100,116,139,0.14)', color: '#475569' },
  box: { label: 'Box', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  not_found: { label: 'Not registered', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
  invalid: { label: 'Invalid', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
}

export const DEVICE_STATUS_LIST = [
  'available',
  'reserved',
  'sold',
  'returned',
  'replacement',
  'faulty',
  'lost',
  'deactivated',
]

export default function DeviceStatusChip({ status }) {
  const meta = STATUS_META[status] || {
    label: status,
    bg: 'rgba(100,116,139,0.14)',
    color: '#475569',
  }
  return (
    <Chip
      label={meta.label}
      size="small"
      sx={{
        bgcolor: meta.bg,
        color: meta.color,
        fontWeight: 700,
        fontSize: '0.68rem',
        height: 22,
        borderRadius: 999,
      }}
    />
  )
}