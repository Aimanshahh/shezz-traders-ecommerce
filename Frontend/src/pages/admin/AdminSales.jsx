import { useState, useEffect, useCallback } from 'react'
import { Navigate, Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, InputBase, TextField, Snackbar, Alert,
  CircularProgress, Chip, Card, CardContent, IconButton, Pagination, ButtonBase, Skeleton, Divider
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

// One shared template for the header and every row, so columns line up exactly.
const GRID = '118px 108px minmax(0, 1.7fr) 72px 96px 128px minmax(150px, 1fr) 24px'

const PILL_FIELD = {
  '& .MuiOutlinedInput-root': { borderRadius: 999, height: 40, bgcolor: 'background.paper', fontSize: '0.86rem' },
  '& .MuiInputLabel-root': { fontSize: '0.84rem' },
}

const PAY_FILTERS = [
  { value: 'all', label: 'Any payment' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
]

const balanceOf = (s) =>
  Math.max(
    0,
    Number(s.total || 0) - Number(s.returnedAmount || 0) - Number(s.amountPaid || 0) - Number(s.paidLater || 0) + Number(s.refundedAmount || 0)
  )

const PAY_STYLE = {
  paid: { label: 'Paid', bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  partial: { label: 'Partial', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  unpaid: { label: 'Pending payment', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
}

const SALE_STATUS_STYLE = {
  pending: { label: 'Pending review', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  rejected: { label: 'Rejected', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
  void: { label: 'Void', bg: 'rgba(100,116,139,0.12)', color: '#475569' },
}

const STATUS_TABS = [
  { value: 'active', label: 'Invoiced' },
  { value: 'pending', label: 'Pending review' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

// A safe local money formatter to prevent 'Rs. ...' if API data is missing
const safeMoney = (val) => {
  const num = Number(val)
  if (isNaN(num)) return 'Rs. 0'
  return `Rs. ${num.toLocaleString()}`
}

export default function AdminSales() {
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [totals, setTotals] = useState({ revenue: 0, devices: 0, count: 0 })
  const [pending, setPending] = useState({ count: 0, outstanding: 0, overdue: 0 })
  const [review, setReview] = useState({ count: 0, value: 0 })
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status')
  const [status, setStatus] = useState(
    ['pending', 'rejected', 'completed', 'all'].includes(initialStatus) ? initialStatus : 'active'
  )
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
      const data = await getSales({ q: debouncedSearch, from, to, payment: payment === 'all' ? '' : payment, status, page, limit: 25 })
      setSales(data.sales)
      
      // Defensive fallbacks: If API misses these fields, default to 0
      setTotals({
        revenue: data?.totals?.revenue ?? 0,
        devices: data?.totals?.devices ?? 0,
        count: data?.totals?.count ?? 0,
      })
      setPending({
        count: data?.pending?.count ?? 0,
        outstanding: data?.pending?.outstanding ?? 0,
        overdue: data?.pending?.overdue ?? 0,
      })
      setReview({
        count: data?.review?.count ?? 0,
        value: data?.review?.value ?? 0,
      })
      
      setTotal(data.total)
      setPages(data.pages || 1)
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Failed to load sales.' })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, from, to, payment, status, page])

  useEffect(() => {
    load()
  }, [load])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const hasFilters = debouncedSearch || from || to || payment !== 'all' || status !== 'active'
  const payFilterActive = ['unpaid', 'partial', 'pending'].includes(payment) ? 'pending' : payment

  const clearFilters = () => {
    setSearch('')
    setFrom('')
    setTo('')
    setPayment('all')
    setStatus('active')
    setPage(1)
  }

  const pendingView = status === 'pending'

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

        {/* MODERN UNIFIED SUMMARY BAR (Replaces the 4/5 boxes) */}
        <Card elevation={0} sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3, 
          overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          
          {/* Section 1: Performance */}
          <Box sx={{ 
            flex: '1.2', p: 3, 
            borderBottom: { xs: '1px solid', md: 'none' }, 
            borderRight: { xs: 'none', md: '1px solid' }, borderColor: 'divider',
            display: 'flex', alignItems: 'center', gap: 3
          }}>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex' }}>
              <AttachMoneyIcon fontSize="large" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
                {pendingView ? 'Quoted Value' : 'Total Revenue'}
              </Typography>
              {loading ? <Skeleton width={120} height={36} /> : (
                <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1, color: 'text.primary' }}>
                  {safeMoney(totals?.revenue)}
                </Typography>
              )}
              <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                  <strong style={{ color: '#111' }}>{totals?.count || 0}</strong> Sales
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>
                  <strong style={{ color: '#111' }}>{totals?.devices || 0}</strong> Devices
                </Typography>
              </Stack>
            </Box>
          </Box>

          {/* Section 2: Pending Payments */}
          <Box 
            onClick={() => { setPayment('pending'); setStatus('active'); setPage(1) }}
            sx={{ 
              flex: '1', p: 3, cursor: 'pointer', transition: 'background-color 0.2s',
              borderBottom: { xs: '1px solid', md: 'none' }, 
              borderRight: { xs: 'none', md: '1px solid' }, borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
              Pending Payment
            </Typography>
            {loading ? <Skeleton width={100} height={32} /> : (
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1, color: pending?.outstanding > 0 ? '#f59e0b' : 'text.primary' }}>
                {safeMoney(pending?.outstanding)}
              </Typography>
            )}
            <Typography sx={{ fontSize: '0.75rem', color: pending?.overdue > 0 ? '#C81E1E' : 'text.secondary', mt: 1, fontWeight: 500 }}>
              {pending?.count ? `${pending.count} invoice${pending.count === 1 ? '' : 's'}${pending?.overdue ? ` · ${pending.overdue} overdue` : ''}` : 'Nothing pending'}
            </Typography>
          </Box>

          {/* Section 3: Awaiting Review */}
          <Box 
            onClick={() => { setStatus('pending'); setPayment('all'); setPage(1) }}
            sx={{ 
              flex: '1', p: 3, cursor: 'pointer', transition: 'background-color 0.2s',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
              Awaiting Review
            </Typography>
            {loading ? <Skeleton width={60} height={32} /> : (
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1, color: review?.count > 0 ? '#0ea5e9' : 'text.primary' }}>
                {review?.count || 0}
              </Typography>
            )}
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1, fontWeight: 500 }}>
              {review?.count ? `${safeMoney(review.value)} at submitted rates` : 'Nothing waiting'}
            </Typography>
          </Box>
        </Card>

        {/* Filters: one toolbar, every control 40px tall and vertically centred */}
        <Stack direction="row" alignItems="center" useFlexGap flexWrap="wrap" sx={{ mb: 2.5, gap: 1.5 }}>
          <Box
            sx={{
              flex: '1 1 280px', minWidth: 240, display: 'flex', alignItems: 'center', gap: 1, px: 2, height: 40, borderRadius: 999,
              border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
              '&:focus-within': { borderColor: 'info.main', boxShadow: '0 0 0 3px rgba(14,165,233,0.12)' },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <InputBase
              placeholder="Search invoice, customer, phone or IMEI…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: '0.86rem', flex: 1 }}
            />
            {search && (
              <IconButton size="small" onClick={() => setSearch('')} sx={{ color: 'text.secondary' }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* Invoice / submission status */}
          <Box sx={{ display: 'flex', height: 40, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: '3px', gap: '2px' }}>
            {STATUS_TABS.map((t) => {
              const active = status === t.value
              return (
                <ButtonBase
                  key={t.value}
                  onClick={() => { setStatus(t.value); setPage(1) }}
                  sx={{
                    px: 2, borderRadius: 999, fontSize: '0.8rem', fontWeight: 700,
                    color: active ? '#fff' : 'text.secondary',
                    bgcolor: active ? 'info.main' : 'transparent',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                    '&:hover': { bgcolor: active ? 'info.main' : 'action.hover' },
                  }}
                >
                  {t.label}{t.value === 'pending' && review.count ? ` (${review.count})` : ''}
                </ButtonBase>
              )
            })}
          </Box>

          {/* Payment segmented filter */}
          <Box sx={{ display: 'flex', height: 40, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: '3px', gap: '2px' }}>
            {PAY_FILTERS.map((f) => {
              const active = payFilterActive === f.value
              return (
                <ButtonBase
                  key={f.value}
                  onClick={() => { setPayment(f.value); setPage(1) }}
                  sx={{
                    px: 2, borderRadius: 999, fontSize: '0.8rem', fontWeight: 700,
                    color: active ? '#fff' : 'text.secondary',
                    bgcolor: active ? 'info.main' : 'transparent',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                    '&:hover': { bgcolor: active ? 'info.main' : 'action.hover' },
                  }}
                >
                  {f.label}
                </ButtonBase>
              )
            })}
          </Box>

          <TextField
            size="small"
            type="date"
            label="From"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160, ...PILL_FIELD }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1) }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 160, ...PILL_FIELD }}
          />
          {hasFilters && (
            <Button onClick={clearFilters} startIcon={<ClearIcon />} sx={{ height: 40, borderRadius: 999, textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>
              Clear
            </Button>
          )}
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
                  display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, columnGap: 2, px: 3, py: 1.5, alignItems: 'center',
                  bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider',
                }}
              >
                {[
                  { h: pendingView ? 'Reference' : 'Invoice' },
                  { h: 'Date' },
                  { h: 'Customer' },
                  { h: 'Devices', align: 'center' },
                  { h: 'Source' },
                  { h: 'Total', align: 'right' },
                  { h: 'Status' },
                  { h: '' },
                ].map(({ h, align }) => (
                  <Typography key={h || 'x'} sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary', textAlign: align || 'left', pl: h === 'Status' ? 2 : 0 }}>
                    {h}
                  </Typography>
                ))}
              </Box>
              {/* Rows */}
              {sales.map((s, i) => {
                const pay = PAY_STYLE[s.paymentStatus] || PAY_STYLE.paid
                const owing = s.status === 'completed' && s.paymentStatus !== 'paid' ? balanceOf(s) : 0
                const overdue = owing > 0 && s.dueDate && new Date(s.dueDate) < new Date()
                const dueLine = owing > 0
                  ? `${money(owing)} due${s.dueDate ? ` · ${overdue ? 'overdue since' : 'by'} ${fmtDate(s.dueDate)}` : ''}`
                  : ''
                const saleStatus = s.status && s.status !== 'completed' ? SALE_STATUS_STYLE[s.status] : null
                const statusChip = saleStatus ? (
                  <Chip label={saleStatus.label} size="small" sx={{ bgcolor: saleStatus.bg, color: saleStatus.color, fontWeight: 700, fontSize: '0.68rem', height: 22, borderRadius: 999 }} />
                ) : (
                  <Chip label={pay.label} size="small" sx={{ bgcolor: pay.bg, color: pay.color, fontWeight: 700, fontSize: '0.68rem', height: 22, borderRadius: 999 }} />
                )
                return (
                  <Box
                    key={s._id}
                    onClick={() => navigate(s.status === 'pending' ? `/admin/sales/${s._id}/review` : `/admin/sales/${s._id}`)}
                    sx={{
                      px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 1.75 }, cursor: 'pointer',
                      borderBottom: i === sales.length - 1 ? 'none' : '1px solid', borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover', '& .chevron': { transform: 'translateX(4px)', color: 'info.main' } },
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {/* Desktop row */}
                    <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, columnGap: 2, alignItems: 'center' }}>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>{s.invoiceNumber}</Typography>
                      <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>{fmtDate(s.saleDate)}</Typography>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: '0.88rem', fontWeight: 600 }}>{s.customerSnapshot?.name}</Typography>
                        <Typography noWrap sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>{s.customerSnapshot?.phone}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.86rem', textAlign: 'center' }}>{s.itemCount}</Typography>
                      <Typography noWrap sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>{labelOf(SALE_SOURCES, s.source)}</Typography>
                      <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '1.05rem', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {money(s.total)}
                      </Typography>
                      <Box sx={{ minWidth: 0, pl: 2 }}>
                        {statusChip}
                        {dueLine && (
                          <Typography noWrap sx={{ fontSize: '0.7rem', fontWeight: 600, mt: 0.4, color: overdue ? '#C81E1E' : 'text.secondary' }}>
                            {dueLine}
                          </Typography>
                        )}
                      </Box>
                      <ChevronRightIcon className="chevron" sx={{ color: 'text.secondary', transition: 'transform 0.2s ease, color 0.2s ease' }} />
                    </Box>

                    {/* Mobile row */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}>{s.invoiceNumber}</Typography>
                        <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.customerSnapshot?.name}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                          {s.itemCount} {s.itemCount === 1 ? 'device' : 'devices'} · {fmtDate(s.saleDate)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '1.05rem', whiteSpace: 'nowrap' }}>{money(s.total)}</Typography>
                        {statusChip}
                        {dueLine && (
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, mt: 0.4, color: overdue ? '#C81E1E' : 'text.secondary' }}>
                            {`${money(owing)} due${s.dueDate ? ` · ${overdue ? 'overdue' : fmtDate(s.dueDate)}` : ''}`}
                          </Typography>
                        )}
                      </Box>
                    </Box>
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