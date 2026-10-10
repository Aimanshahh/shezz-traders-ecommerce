import { useState, useEffect, useCallback } from 'react'
import { Navigate, useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, InputBase, Snackbar, Alert, CircularProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AdminLayout from './AdminLayout.jsx'
import { money, fmtDate } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getCustomers } from '../../services/api.js'

const GRID = { xs: '1fr auto', md: '2fr 1fr 1fr 1.2fr 1.2fr 1.2fr 1.1fr 40px' }
const HEADS = ['Customer', 'Phone', 'Devices', 'Billed', 'Paid', 'Balance due', 'Last purchase', '']

export default function AdminCustomers() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCustomers({ q, page, limit: 25 })
      setRows(data.customers)
      setTotal(data.total)
      setPages(data.pages || 1)
    } catch (err) {
      setToast(err?.message || 'Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }, [q, page])

  useEffect(() => {
    load()
  }, [load])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const pageDue = rows.reduce((s, r) => s + Math.max(r.stats?.balance || 0, 0), 0)

  return (
    <AdminLayout title="Customers">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.75rem' }, lineHeight: 1.1, mb: 0.5 }}>
              Customers &amp; ledgers
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Everyone you have sold to offline. Open a customer to see purchases, payments and their statement.
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/admin/handover"
            variant="outlined"
            color="info"
            startIcon={<SwapHorizIcon />}
            sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}
          >
            Dealer handover
          </Button>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
          {[
            { label: 'Customers', value: total },
            { label: 'Due on this page', value: money(pageDue) },
          ].map((t) => (
            <Box key={t.label} sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}>
                {t.label}
              </Typography>
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1.2 }}>
                {t.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, mb: 3, borderRadius: 999,
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            '&:focus-within': { borderColor: 'info.main' },
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <InputBase placeholder="Search name, phone or city…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ fontSize: '0.88rem', flex: 1 }} />
        </Box>

        <Box sx={{ borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} sx={{ color: 'info.main' }} />
            </Box>
          ) : rows.length === 0 ? (
            <Box sx={{ textAlign: 'center', px: 3, py: 8 }}>
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '1.35rem', mb: 0.75 }}>
                {q ? 'No matching customers' : 'No customers yet'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {q ? 'Try a different search.' : 'Customers appear here after their first sale.'}
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 3, py: 1.75, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                {HEADS.map((h) => (
                  <Typography key={h || 'x'} sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}>
                    {h}
                  </Typography>
                ))}
              </Box>
              {rows.map((c, i) => {
                const st = c.stats || {}
                const due = st.balance > 0
                return (
                  <Box
                    key={c._id}
                    onClick={() => navigate(`/admin/customers/${c._id}`)}
                    sx={{
                      display: 'grid', gridTemplateColumns: GRID, gap: 2, alignItems: 'center',
                      px: { xs: 2, md: 3 }, py: 1.75, cursor: 'pointer',
                      borderBottom: i === rows.length - 1 ? 'none' : '1px solid', borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{c.name}</Typography>
                      <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>
                        {c.city || '—'}
                        <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}> · {c.phone}</Box>
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>{c.phone}</Typography>
                    <Typography sx={{ fontSize: '0.84rem', display: { xs: 'none', md: 'block' } }}>{st.devices || 0}</Typography>
                    <Typography sx={{ fontSize: '0.84rem', display: { xs: 'none', md: 'block' } }}>{money(st.spent)}</Typography>
                    <Typography sx={{ fontSize: '0.84rem', display: { xs: 'none', md: 'block' } }}>{money(st.paid)}</Typography>
                    <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '1rem', color: due ? '#C81E1E' : st.balance < 0 ? '#0F8A5F' : 'text.primary' }}>
                      {st.balance < 0 ? `${money(-st.balance)} credit` : money(st.balance)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>{fmtDate(st.lastPurchase)}</Typography>
                    <ChevronRightIcon sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }} />
                  </Box>
                )
              })}
            </>
          )}
        </Box>

        {!loading && total > 0 && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              {total} {total === 1 ? 'customer' : 'customers'} · page {page} of {pages}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} sx={{ textTransform: 'none' }}>Previous</Button>
              <Button size="small" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} sx={{ textTransform: 'none' }}>Next</Button>
            </Stack>
          </Stack>
        )}
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity="error" variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>{toast}</Alert>
      </Snackbar>
    </AdminLayout>
  )
}