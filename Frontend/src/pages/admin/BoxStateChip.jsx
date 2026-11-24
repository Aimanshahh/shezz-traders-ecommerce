import { Chip } from '@mui/material'
import { ADMIN, chipSx } from '../../theme/adminTheme.js'

const META = {
  in_stock: { label: 'In stock', bg: ADMIN.successSoft, color: ADMIN.success },
  partial: { label: 'Partial', bg: ADMIN.warningSoft, color: ADMIN.warning },
  sold: { label: 'Sold', bg: ADMIN.accentSoft, color: ADMIN.accent },
  empty: { label: 'Empty', bg: 'rgba(100,116,139,0.12)', color: '#475569' },
}

export default function BoxStateChip({ state }) {
  const m = META[state] || META.empty
  return <Chip label={m.label} size="small" sx={chipSx(m.bg, m.color)} />
}
