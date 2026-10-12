import { useState, useEffect, useCallback } from 'react'
import { Navigate, Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, InputBase, TextField, MenuItem, Snackbar, Alert,
  CircularProgress, Chip, Card, CardContent, IconButton, Pagination, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ClearIcon from '@mui/icons-material/Clear'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import DevicesIcon from '@mui/icons-material/Devices'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom'
import AdminLayout from './AdminLayout.jsx'
import { money, fmtDate, labelOf, SALE_SOURCES } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getSales } from '../../services/api.js'

const GRID = { xs: '1fr auto', md: '1fr 1fr 2fr 1fr 1fr 1.2fr 40px' }

const PAY_STYLE = {
  paid: { label: 'Paid', bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  partial: { label: 'Partial', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  unpaid: { label: 'Pending payment', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
}

export default function AdminSales() {
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [totals, setTotals] = useState({ revenue: 0, devices: 0, count: 0 })
  const [pending, setPending] = useState({ count: 0, outstanding: 0, overdue: 0 })
  const [payment, setPayment] = useState('all')
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSales({ q: debouncedSearch, from, to, payment: payment === 'all' ? '' : payment, page, limit: 25 })
      setSales(data.sales)
      setTotals(data.totals)
      setPending(data.pending || { count: 0, outstanding: 0, overdue: 0 })
      setTotal(data.total)
      setPages(data.pages || 1)
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Failed to load sales.' })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, from, to, payment, page])

  useEffect(() => {
    load()
  }, [load])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const hasFilters = debouncedSearch || from || to || payment !== 'all'

  const clearFilters = () => {
    setSearch('')
    setFrom('')
    setTo('')
    setPayment('all')
    setPage(1)
  }

  const tiles = [
    { label: 'Sales', value: totals.count, icon: <PointOfSaleIcon />, color: '#0ea5e9' },
    { label: 'Devices sold', value: totals.devices, icon: <DevicesIcon />, color: '#8b5cf6' },
    { label: 'Revenue', value: money(totals.revenue), icon: <AttachMoneyIcon />, color: '#10b981' },
    {
      label: 'Pending payment',
      value: money(pending.outstanding),
      sub: pending.count ? `${pending.count} invoice${pending.count === 1 ? '' : 's'}${pending.overdue ? ` · ${pending.overdue} overdue` : ''}` : 'Nothing pending',
      icon: <HourglassBottomIcon />,
      color: '#f59e0b',
      onClick: () => { setPayment('pending'); setPage(1) },
    },
  ]

  return (
    <AdminLayout title="Sales / invoices">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.1, mb: 0.5 }}
            >
              Offline sales
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Every invoice created from the CRM. Website orders stay in Orders.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/admin/sales/new"
            variant="contained"
            color="info"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 999, fontWeight: 700, px: 2.5, boxShadow: '0 4px 14px rgba(14,165,233,0.4)' }}
          >
            New sale
          </Button>
        </Stack>

        {/* Summary Tiles */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          {tiles.map((t) => (
            <Card key={t.label} elevation={0} onClick={t.onClick} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, cursor: t.onClick ? 'pointer' : 'default' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${t.color}15`, color: t.color, display: 'flex' }}>
                  {t.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}>
                    {t.label}
                  </Typography>
                  <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1.2 }}>
                    {t.value}
                  </Typography>
                  {t.sub && <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{t.sub}</Typography>}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Filters */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems="flex-start">
          {/* Search Box */}
          <Box
            sx={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: 999,
              border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
              '&:focus-within': { borderColor: 'info.main', boxShadow: '0 0 0 3px rgba(14,165,233,0.1)' },
              width: '100%', height: 40, mt: { xs: 0, md: 2.5 } // Align with date inputs on desktop
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <InputBase
              placeholder="Search invoice, customer, phone or IMEI…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: '0.88rem', flex: 1 }}
            />
            {search && (
              <IconButton size="small" onClick={() => setSearch('')} sx={{ color: 'text.secondary' }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Date Filters - Fixed Layout */}
          <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ width: { xs: '100%', md: 'auto' } }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block', ml: 0.5 }}>
                From
              </Typography>
              <TextField
                size="small"
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1) }}
                sx={{ width: 140, '& input': { py: 1.1 } }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block', ml: 0.5 }}>
                To
              </Typography>
              <TextField
                size="small"
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1) }}
                sx={{ width: 140, '& input': { py: 1.1 } }}
              />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5, display: 'block', ml: 0.5 }}>
                Payment
              </Typography>
              <TextField
                select
                size="small"
                value={payment}
                onChange={(e) => { setPayment(e.target.value); setPage(1) }}
                sx={{ width: 160, '& .MuiSelect-select': { py: 1.1 } }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending (any)</MenuItem>
                <MenuItem value="unpaid">Pending payment</MenuItem>
                <MenuItem value="partial">Part paid</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </TextField>
            </Box>
            {hasFilters && (
              <Box sx={{ mt: 2.75 }}>
                <Tooltip title="Clear filters">
                  <IconButton onClick={clearFilters} size="small" sx={{ bgcolor: 'action.hover', borderRadius: 1, height: 40, width: 40 }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Stack>
        </Stack>

        {/* Table Area */}
        <Box sx={{ borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} sx={{ color: 'info.main' }} />
            </Box>
          ) : sales.length === 0 ? (
            <Box sx={{ textAlign: 'center', px: 3, py: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'action.hover', mb: 2, display: 'flex' }}>
                <ReceiptLongIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
              </Box>
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '1.35rem', mb: 0.75 }}>
                {hasFilters ? 'No matching sales' : 'No sales yet'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
                {hasFilters ? 'Try a different search or dates.' : 'Create your first sale to see it here.'}
              </Typography>
              {!hasFilters && (
                <Button
                  component={RouterLink}
                  to="/admin/sales/new"
                  variant="outlined"
                  color="info"
                  startIcon={<AddIcon />}
                  sx={{ borderRadius: 999, fontWeight: 700 }}
                >
                  New sale
                </Button>
              )}
            </Box>
          ) : (
            <>
              {/* Header */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 3, py: 1.75,
                  bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider',
                }}
              >
                {['Invoice', 'Date', 'Customer', 'Devices', 'Source', 'Total', ''].map((h) => (
                  <Typography key={h || 'x'} sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}>
                    {h}
                  </Typography>
                ))}
              </Box>
              {/* Rows */}
              {sales.map((s, i) => {
                const pay = PAY_STYLE[s.paymentStatus] || PAY_STYLE.paid
                return (
                  <Box
                    key={s._id}
                    onClick={() => navigate(`/admin/sales/${s._id}`)}
                    sx={{
                      display: 'grid', gridTemplateColumns: GRID, gap: 2, alignItems: 'center',
                      px: { xs: 2, md: 3 }, py: 1.75, cursor: 'pointer',
                      borderBottom: i === sales.length - 1 ? 'none' : '1px solid', borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover', '& .chevron': { transform: 'translateX(4px)' } },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>{s.invoiceNumber}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', display: { xs: 'block', md: 'none' } }}>
                        {s.customerSnapshot?.name} · {s.itemCount} devices · {fmtDate(s.saleDate)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>
                      {fmtDate(s.saleDate)}
                    </Typography>
                    <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>{s.customerSnapshot?.name}</Typography>
                      <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>{s.customerSnapshot?.phone}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.84rem', display: { xs: 'none', md: 'block' } }}>{s.itemCount}</Typography>
                    <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>
                      {labelOf(SALE_SOURCES, s.source)}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap' }}>
                        {money(s.total)}
                      </Typography>
                      <Chip label={pay.label} size="small" sx={{ bgcolor: pay.bg, color: pay.color, fontWeight: 700, fontSize: '0.66rem', height: 20, borderRadius: 999 }} />
                      {s.paymentStatus !== 'paid' && s.dueDate && (
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap', color: new Date(s.dueDate) < new Date() ? '#C81E1E' : 'text.secondary' }}>
                          {new Date(s.dueDate) < new Date() ? 'Overdue · ' : 'Due '}{fmtDate(s.dueDate)}
                        </Typography>
                      )}
                    </Stack>
                    <ChevronRightIcon className="chevron" sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' }, transition: 'transform 0.2s ease' }} />
                  </Box>
                )
              })}
            </>
          )}
        </Box>

        {/* Pagination */}
        {!loading && total > 0 && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total} {total === 1 ? 'sale' : 'sales'}
            </Typography>
            <Pagination
              count={pages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
              size="small"
              siblingCount={1}
              boundaryCount={1}
            />
          </Stack>
        )}
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity={toast?.severity || 'success'} variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </AdminLayout>
  )
}