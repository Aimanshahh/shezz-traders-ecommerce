import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, CircularProgress, InputBase, MenuItem, Pagination,
  Stack, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getReturnCases } from '../../services/api.js'
import { fmtDate } from '../../components/admin/format.js'

const statusTone = {
  open: { label: 'Open', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'default' },
}

export default function AdminReturns() {
  const [cases, setCases] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [openCount, setOpenCount] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('open')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let alive = true
    getReturnCases({ status: status === 'all' ? '' : status, q: query, page, limit: 25 })
      .then((data) => {
        if (!alive) return
        setCases(data.cases)
        setTotal(data.total)
        setPages(data.pages || 1)
        setOpenCount(data.openCount)
        setError('')
      })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load return cases.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [status, query, page])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  return (
    <AdminLayout title="Returns & warranty">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: { xs: '1.55rem', md: '1.85rem' } }}>
              Returns & warranty claims
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.86rem' }}>
              {openCount} open {openCount === 1 ? 'case' : 'cases'} awaiting resolution
            </Typography>
          </Box>
          <Button component={RouterLink} to="/admin/returns/new" variant="contained" color="info" startIcon={<AddIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>
            Open a case
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, px: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', borderRadius: 1, '&:focus-within': { borderColor: 'info.main' } }}>
            <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <InputBase placeholder="Search case, IMEI, invoice or customer…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, py: 1, fontSize: '0.88rem' }} />
          </Box>
          <TextField select size="small" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} sx={{ minWidth: 180 }}>
            <MenuItem value="open">Open cases</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="all">All cases</MenuItem>
          </TextField>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={30} /></Box>
          ) : cases.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{query ? 'No matching cases' : 'No cases here'}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{query ? 'Try another search.' : status === 'open' ? 'Open a case when a sold device is returned.' : 'Cases will appear here when they are created.'}</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '1fr 1.2fr 1fr 1.4fr 1fr 120px', gap: 2, px: 2.5, py: 1.5, bgcolor: 'action.hover' }}>
                {['Case', 'Device', 'Invoice', 'Customer', 'Opened', 'Status'].map((label) => <Typography key={label} sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>{label}</Typography>)}
              </Box>
              {cases.map((item) => {
                const tone = statusTone[item.status] || statusTone.open
                return (
                  <Box key={item._id} component={RouterLink} to={`/admin/returns/${item._id}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '1fr 1.2fr 1fr 1.4fr 1fr 120px' }, gap: 2, alignItems: 'center', px: 2.5, py: 1.75, borderTop: '1px solid', borderColor: 'divider', textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Box>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'info.main' }}>{item.caseNumber}</Typography>
                      <Typography sx={{ display: { xs: 'block', md: 'none' }, fontSize: '0.76rem', color: 'text.secondary' }}>{item.imei} · {item.invoiceNumber}</Typography>
                    </Box>
                    <Typography sx={{ display: { xs: 'none', md: 'block' }, fontFamily: 'monospace', fontSize: '0.84rem' }}>{item.imei}<Typography component="span" sx={{ display: 'block', fontFamily: 'inherit', fontSize: '0.72rem', color: 'text.secondary' }}>{item.productName}</Typography></Typography>
                    <Typography sx={{ display: { xs: 'none', md: 'block' }, fontFamily: 'monospace', fontSize: '0.84rem' }}>{item.invoiceNumber}</Typography>
                    <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.84rem' }}>{item.holderName || item.customer?.name || '—'}</Typography>
                    <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.82rem', color: 'text.secondary' }}>{fmtDate(item.openedAt)}</Typography>
                    <Chip size="small" label={tone.label} color={tone.color} variant={item.status === 'open' ? 'filled' : 'outlined'} sx={{ justifySelf: 'start' }} />
                  </Box>
                )
              })}
            </>
          )}
        </Box>
        {!loading && pages > 1 && <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}><Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{total} cases</Typography><Pagination count={pages} page={page} onChange={(_, value) => setPage(value)} size="small" /></Stack>}
      </Box>
    </AdminLayout>
  )
}
