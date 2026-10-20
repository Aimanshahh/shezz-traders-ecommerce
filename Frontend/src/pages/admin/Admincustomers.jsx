import { useState, useEffect } from 'react'
import { Navigate, useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, InputBase, Snackbar, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AddIcon from '@mui/icons-material/Add'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import AdminLayout from './AdminLayout.jsx'
import { money, fmtDate } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getCustomers, createCustomer } from '../../services/api.js'

const EMPTY_FORM = { name: '', phone: '', city: '', address: '', email: '' }

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

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let alive = true
    getCustomers({ q, page, limit: 25 })
      .then((data) => {
        if (!alive) return
        setRows(data.customers)
        setTotal(data.total)
        setPages(data.pages || 1)
      })
      .catch((err) => { if (alive) setToast(err?.message || 'Failed to load customers.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [q, page])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const pageDue = rows.reduce((s, r) => s + Math.max(r.stats?.balance || 0, 0), 0)

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setToast({ severity: 'error', text: 'Enter the customer name.' })
      return
    }
    setCreating(true)
    try {
      const customer = await createCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        email: form.email.trim(),
      })
      setCreateOpen(false)
      setToast({ severity: 'success', text: `${customer.name} was added.` })
      navigate(`/admin/customers/${customer._id}`)
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not create this customer.' })
    } finally {
      setCreating(false)
    }
  }

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
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: 'rgba(8,127,134,0.1)', color: 'info.main' }}><PeopleAltOutlinedIcon /></Box>
            <Box>
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, lineHeight: 1.1, mb: 0.45 }}>Customers &amp; ledgers</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Customer accounts, payments, device ownership and statements.</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
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
            <Button
              variant="contained"
              color="info"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}
            >
              New customer
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(2, minmax(0, 260px))' }, gap: 1.5, mb: 2.5 }}>
          {[
            { label: 'Customers', value: total, icon: PeopleAltOutlinedIcon, tone: '#087F86' },
            { label: 'Due on this page', value: money(pageDue), icon: AccountBalanceWalletOutlinedIcon, tone: pageDue > 0 ? '#C2410C' : '#0F8A5F' },
          ].map((t) => (
            <Box key={t.label} sx={{ position: 'relative', p: 2, pl: 2.25, borderRadius: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', inset: '0 auto 0 0', width: 4, bgcolor: t.tone } }}>
              <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}>{t.label}</Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.2, mt: 0.45 }}>{t.value}</Typography><t.icon sx={{ color: t.tone, fontSize: 20 }} /></Stack>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, mb: 2.5, borderRadius: 999,
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            '&:focus-within': { borderColor: 'info.main', boxShadow: '0 0 0 3px rgba(8,127,134,0.08)' },
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <InputBase placeholder="Search name, phone or city…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ fontSize: '0.88rem', flex: 1 }} />
        </Box>

        <Box sx={{ borderRadius: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
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
                {q ? 'Try a different search.' : 'Add a customer before their first sale, or make the sale and they are created for you.'}
              </Typography>
              {!q && (
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<PersonAddAltOutlinedIcon />}
                  onClick={openCreate}
                  sx={{ borderRadius: 999, fontWeight: 700, mt: 2 }}
                >
                  New customer
                </Button>
              )}
            </Box>
          ) : (
            <>
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 3, py: 1.5, bgcolor: '#F4F8F8', borderBottom: '1px solid', borderColor: 'divider' }}>
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
                        {c.phone && <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}> · {c.phone}</Box>}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>{c.phone || '—'}</Typography>
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

      <Dialog
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>New customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
              required
            />
            <TextField
              label="Mobile (optional)"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              inputProps={{ inputMode: 'tel' }}
              fullWidth
              helperText="Used to find this customer on the staff screen"
            />
            <TextField
              label="City (optional)"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Email (optional)"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Address (optional)"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ textTransform: 'none', color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            variant="contained"
            color="info"
            sx={{ textTransform: 'none', borderRadius: 999, fontWeight: 700, px: 3 }}
          >
            {creating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Add customer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity={toast?.severity || 'error'} variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>{toast?.text || toast}</Alert>
      </Snackbar>
    </AdminLayout>
  )
}