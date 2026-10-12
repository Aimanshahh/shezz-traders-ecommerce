import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined'
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getAdminReport } from '../../services/api.js'
import { money, fmtDate } from '../../components/admin/format.js'

const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 8)}01`

export default function AdminReports() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getAdminReport({ from, to })
      .then((result) => { if (alive) { setData(result); setError('') } })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load the report.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [from, to])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const exportCsv = () => {
    if (!data) return
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [
      ['Date', 'Invoices', 'Devices sold', 'Gross sales', 'Return credits', 'Net sales', 'Collected'],
      ...data.dailySales.map((row) => [row.date, row.count, row.devices, row.gross, row.credits, row.net, row.collected]),
    ]
    const csv = rows.map((row) => row.map(quote).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `shezz-admin-report-${from}-${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const sales = data?.summary.sales
  const returns = data?.summary.returns
  const orders = data?.summary.orders
  const tiles = [
    { label: 'CRM invoices', value: sales ? sales.count : 0, note: `${sales?.devices || 0} devices sold`, icon: PointOfSaleOutlinedIcon, color: '#087F86' },
    { label: 'Gross CRM sales', value: money(sales?.gross || 0), note: `${money(sales?.credits || 0)} return credits`, icon: AssessmentOutlinedIcon, color: '#2563EB' },
    { label: 'Net CRM sales', value: money(sales?.net || 0), note: `${money(sales?.collected || 0)} collected`, icon: ReceiptLongOutlinedIcon, color: '#0F8A5F' },
    { label: 'Online orders', value: orders?.count || 0, note: `${orders?.pending || 0} pending · ${money(orders?.revenue || 0)} recognized`, icon: ReceiptLongOutlinedIcon, color: '#B45309' },
    { label: 'Resolved returns', value: returns?.count || 0, note: `${returns?.replacements || 0} replacements · ${money(returns?.refunds || 0)} refunded`, icon: AssignmentReturnOutlinedIcon, color: '#C2410C' },
  ]

  return (
    <AdminLayout title="Reports">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ xs: 'flex-start', lg: 'center' }} justifyContent="space-between" spacing={{ xs: 2, lg: 4 }} sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: 'rgba(8,127,134,0.1)', color: 'info.main' }}>
              <AssessmentOutlinedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: { xs: '1.6rem', md: '1.85rem' }, lineHeight: 1.1 }}>Reports</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mt: 0.35 }}>Compare storefront orders with CRM activity.</Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ width: { xs: '100%', lg: 'auto' }, p: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            <Typography sx={{ px: 1, fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Period</Typography>
            <TextField size="small" type="date" label="From" value={from} onChange={(e) => { setLoading(true); setFrom(e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 145, '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
            <TextField size="small" type="date" label="To" value={to} onChange={(e) => { setLoading(true); setTo(e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 145, '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
            <Button onClick={exportCsv} disabled={!data || loading} variant="contained" color="info" startIcon={<DownloadOutlinedIcon />} sx={{ whiteSpace: 'nowrap', borderRadius: 999, px: 2.25, alignSelf: { xs: 'stretch', sm: 'center' } }}>Export CSV</Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && !data ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box> : data && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(2, 1fr)', xl: 'repeat(5, 1fr)' }, gap: 1.5, mb: 3, opacity: loading ? 0.6 : 1 }}>
              {tiles.map((tile) => <Box key={tile.label} sx={{ position: 'relative', minWidth: 0, p: 2, pl: 2.25, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', '&::before': { content: '""', position: 'absolute', inset: '0 auto 0 0', width: 4, bgcolor: tile.color } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.35 }}>{tile.label}</Typography>
                  <Box sx={{ color: tile.color, display: 'flex' }}><tile.icon sx={{ fontSize: 19 }} /></Box>
                </Stack>
                <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: { xs: '1.4rem', md: '1.55rem' }, fontWeight: 800, mt: 1, overflowWrap: 'anywhere', lineHeight: 1.1 }}>{tile.value}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.65, lineHeight: 1.35 }}>{tile.note}</Typography>
              </Box>)}
            </Box>

            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ px: { xs: 2, md: 2.5 }, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>Daily CRM sales</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem', mt: 0.3 }}>Invoice activity from {fmtDate(from)} to {fmtDate(to)}</Typography>
                </Box>
                <Typography sx={{ color: 'info.main', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Net performance</Typography>
              </Stack>
              {data.dailySales.length === 0 ? <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 7, fontSize: '0.86rem' }}>No CRM invoices in this period.</Typography> : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                    <thead><tr>{['Date', 'Invoices', 'Devices', 'Gross', 'Return credits', 'Net sales', 'Collected'].map((label, index) => <Box key={label} component="th" sx={{ px: { xs: 1.5, md: 2 }, py: 1.35, textAlign: index >= 3 ? 'right' : index > 0 ? 'center' : 'left', bgcolor: 'action.hover', fontSize: '0.66rem', color: 'text.secondary', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</Box>)}</tr></thead>
                    <tbody>{data.dailySales.map((row) => <Box component="tr" key={row.date} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <Cell align="left">{fmtDate(row.date)}</Cell><Cell align="center">{row.count}</Cell><Cell align="center">{row.devices}</Cell><Cell align="right">{money(row.gross)}</Cell><Cell align="right">{money(row.credits)}</Cell><Cell align="right" strong>{money(row.net)}</Cell><Cell align="right">{money(row.collected)}</Cell>
                    </Box>)}</tbody>
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </AdminLayout>
  )
}

function Cell({ children, strong, align = 'left' }) {
  return <Box component="td" sx={{ px: { xs: 1.5, md: 2 }, py: 1.5, fontSize: '0.84rem', fontWeight: strong ? 800 : 400, color: strong ? '#087F86' : 'text.primary', textAlign: align, whiteSpace: 'nowrap' }}>{children}</Box>
}
