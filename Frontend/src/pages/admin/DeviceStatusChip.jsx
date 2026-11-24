import { Chip } from '@mui/material'
import { ADMIN, chipSx } from '../../theme/adminTheme.js'

// label + colours; STATUS_META is also read by the device screens for filter labels.
export const STATUS_META = {
  available: { label: 'Available', bg: ADMIN.successSoft, color: ADMIN.success },
  reserved: { label: 'Reserved', bg: ADMIN.warningSoft, color: ADMIN.warning },
  sold: { label: 'Sold', bg: ADMIN.accentSoft, color: ADMIN.accent },
  returned: { label: 'Returned', bg: ADMIN.warningSoft, color: ADMIN.warning },
  replacement: { label: 'Replacement', bg: ADMIN.infoSoft, color: ADMIN.info },
  faulty: { label: 'Faulty', bg: ADMIN.dangerSoft, color: ADMIN.danger },
  lost: { label: 'Lost', bg: 'rgba(100,116,139,0.12)', color: '#475569' },
  deactivated: { label: 'Deactivated', bg: 'rgba(100,116,139,0.12)', color: '#475569' },
  box: { label: 'Box', bg: ADMIN.warningSoft, color: ADMIN.warning },
  not_found: { label: 'Not registered', bg: ADMIN.dangerSoft, color: ADMIN.danger },
  invalid: { label: 'Invalid', bg: ADMIN.dangerSoft, color: ADMIN.danger },
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
    bg: 'rgba(100,116,139,0.12)',
    color: '#475569',
  }
  return <Chip label={meta.label} size="small" sx={chipSx(meta.bg, meta.color)} />
}
