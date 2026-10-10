import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
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
    { label: 'CRM invoices', value: sales ? sales.count : 0, note: `${sales?.devices || 0} devices sold` },
    { label: 'Gross CRM sales', value: money(sales?.gross || 0), note: `${money(sales?.credits || 0)} return credits` },
    { label: 'Net CRM sales', value: money(sales?.net || 0), note: `${money(sales?.collected || 0)} collected after refunds` },
    { label: 'Online orders', value: orders?.count || 0, note: `${orders?.pending || 0} pending · ${money(orders?.revenue || 0)} recognized` },
    { label: 'Resolved returns', value: returns?.count || 0, note: `${returns?.replacements || 0} replacements · ${money(returns?.refunds || 0)} cash refunded` },
  ]

  return (
    <AdminLayout title="Reports">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.8rem' }}>Reports</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>Online orders and CRM invoices are reported separately.</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField size="small" type="date" label="From" value={from} onChange={(e) => { setLoading(true); setFrom(e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="date" label="To" value={to} onChange={(e) => { setLoading(true); setTo(e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} />
            <Button onClick={exportCsv} disabled={!data || loading} variant="outlined" startIcon={<DownloadOutlinedIcon />} sx={{ whiteSpace: 'nowrap', borderRadius: 1 }}>CSV</Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && !data ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box> : data && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(5, 1fr)' }, gap: 1.5, mb: 3, opacity: loading ? 0.6 : 1 }}>
              {tiles.map((tile) => <Box key={tile.label} sx={{ minWidth: 0, p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>{tile.label}</Typography>
                <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.55rem', fontWeight: 800, mt: 0.6, overflowWrap: 'anywhere' }}>{tile.value}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.72rem', mt: 0.4 }}>{tile.note}</Typography>
              </Box>)}
            </Box>

            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700 }}>Daily CRM sales</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>{fmtDate(from)} – {fmtDate(to)}</Typography>
              </Box>
              {data.dailySales.length === 0 ? <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 7, fontSize: '0.86rem' }}>No CRM invoices in this period.</Typography> : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                    <thead><tr>{['Date', 'Invoices', 'Devices', 'Gross', 'Return credits', 'Net sales', 'Collected'].map((label) => <Box key={label} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', bgcolor: 'action.hover', fontSize: '0.68rem', color: 'text.secondary', textTransform: 'uppercase' }}>{label}</Box>)}</tr></thead>
                    <tbody>{data.dailySales.map((row) => <Box component="tr" key={row.date} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <Cell>{fmtDate(row.date)}</Cell><Cell>{row.count}</Cell><Cell>{row.devices}</Cell><Cell>{money(row.gross)}</Cell><Cell>{money(row.credits)}</Cell><Cell strong>{money(row.net)}</Cell><Cell>{money(row.collected)}</Cell>
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

function Cell({ children, strong }) {
  return <Box component="td" sx={{ px: 2, py: 1.5, fontSize: '0.84rem', fontWeight: strong ? 700 : 400, whiteSpace: 'nowrap' }}>{children}</Box>
}
