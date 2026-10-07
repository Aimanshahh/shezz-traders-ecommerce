import { Chip } from '@mui/material'

const META = {
  in_stock: { label: 'In stock', bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  partial: { label: 'Partial', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  sold: { label: 'Sold', bg: 'rgba(0,131,143,0.12)', color: '#00717A' },
  empty: { label: 'Empty', bg: 'rgba(100,116,139,0.14)', color: '#475569' },
}

export default function BoxStateChip({ state }) {
  const m = META[state] || META.empty
  return (
    <Chip
      label={m.label}
      size="small"
      sx={{ bgcolor: m.bg, color: m.color, fontWeight: 700, fontSize: '0.68rem', height: 22, borderRadius: 999 }}
    />
  )
}