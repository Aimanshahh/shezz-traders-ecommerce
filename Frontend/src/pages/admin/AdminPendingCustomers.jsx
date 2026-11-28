import { useEffect, useState } from 'react'
import { Navigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, Alert, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
} from '@mui/material'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { ADMIN_SHELL } from '../../lib/stockShell.js'
import {
  getPendingCustomers, resolvePendingCustomer, rejectPendingCustomer, getCustomers,
} from '../../services/api.js'

const TABS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' },
]

const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function Tile({ label, value, color = 'inherit' }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.45rem', lineHeight: 1.15, color }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  )
}

export default function AdminPendingCustomers({ shell = ADMIN_SHELL }) {
  const { Layout, base, isLoggedIn, loginTo } = shell

  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({ pending: 0, resolved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [active, setActive] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [chosen, setChosen] = useState('')
  const [saving, setSaving] = useState(false)

  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = () => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  useEffect(() => {
    if (!isLoggedIn()) return undefined
    let alive = true
    getPendingCustomers(status)
      .then((data) => {
        if (!alive) return
        setItems(data.items || [])
        setSummary(data.summary || { pending: 0, resolved: 0, rejected: 0 })
        setError('')
      })
      .catch((err) => {
        if (alive) setError(err?.message || 'Could not load the queue.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [status, isLoggedIn, reloadKey])

  if (!isLoggedIn()) return <Navigate to={loginTo} replace />

  const openLink = (item) => {
    setActive(item)
    setChosen(item.suggestedCustomer?._id || '')
    setQuery(item.rawCustomerName || '')
    setResults([])
    setError('')
    setNotice('')
    if (item.rawCustomerName) search(item.rawCustomerName)
  }

  const search = async (value) => {
    const q = String(value ?? '').trim()
    if (!q) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const data = await getCustomers({ q, limit: 8 })
      setResults(data.customers || [])
    } catch (err) {
      setError(err?.message || 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const confirmLink = async () => {
    if (!active || !chosen) return
    setSaving(true)
    try {
      const data = await resolvePendingCustomer(active._id, chosen)
      setNotice(`${active.imei} linked to the customer and invoice ${data.invoiceNumber} created.`)
      setActive(null)
      refresh()
    } catch (err) {
      setError(err?.message || 'Could not link the customer.')
    } finally {
      setSaving(false)
    }
  }

  const confirmReject = async () => {
    if (!rejecting) return
    setSaving(true)
    try {
      await rejectPendingCustomer(rejecting._id, reason)
      setNotice(`${rejecting.imei} marked as rejected. The device stays out of stock.`)
      setRejecting(null)
      setReason('')
      refresh()
    } catch (err) {
      setError(err?.message || 'Could not reject the record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Pending customers">
      <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.45rem' }, mb: 0.5 }}>
          Pending customers
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
          Sold devices imported from the old sheet whose customer is not in Shezz Traders yet. Each one
          waits here until Operations/Admin verifies the customer. They are sold, so they never appear
          in available stock.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2.5, maxWidth: 520 }}>
          <Tile label="Waiting" value={summary.pending} color="#B45309" />
          <Tile label="Resolved" value={summary.resolved} color="#047857" />
          <Tile label="Rejected" value={summary.rejected} />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              size="small"
              variant={status === tab.key ? 'contained' : 'outlined'}
              color="info"
              onClick={() => {
                if (status === tab.key) return
                setLoading(true)
                setStatus(tab.key)
              }}
              sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
            >
              {tab.label}
            </Button>
          ))}
          <Button
            size="small"
            onClick={refresh}
            sx={{ ml: 'auto', textTransform: 'none', color: 'text.secondary' }}
          >
            Refresh
          </Button>
        </Stack>

        {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={26} /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
              {status === 'pending' ? 'Nothing is waiting for a customer.' : 'No records in this list.'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {items.map((item) => (
              <Box
                key={item._id}
                sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {item.rawCustomerName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                      {item.imei} · {item.productName || 'device'} · arrived {item.receivedMonth || '—'} · sold{' '}
                      {formatDate(item.saleDate)}
                    </Typography>
                    {item.suggestionNote && (
                      <Typography sx={{ fontSize: '0.75rem', color: '#B45309', mt: 0.5 }}>
                        {item.suggestionNote}
                        {item.suggestedCustomer?.name ? ` (suggested: ${item.suggestedCustomer.name})` : ''}
                      </Typography>
                    )}
                  </Box>

                  {item.status === 'pending' ? (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="info"
                        onClick={() => openLink(item)}
                        sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
                      >
                        Link customer
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => { setRejecting(item); setReason('') }}
                        sx={{ textTransform: 'none' }}
                      >
                        Reject
                      </Button>
                    </Stack>
                  ) : (
                    <Chip
                      size="small"
                      label={item.status === 'resolved' ? `Linked${item.resolvedAt ? ` ${formatDate(item.resolvedAt)}` : ''}` : 'Rejected'}
                      color={item.status === 'resolved' ? 'success' : 'default'}
                    />
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 2.5 }}>
          Need a customer that does not exist yet? Create them on the{' '}
          <Box component={RouterLink} to={`${base}/customers`} sx={{ color: 'inherit', fontWeight: 700 }}>
            Customers
          </Box>{' '}
          screen first, then link the device here.
        </Typography>
      </Box>

      <Dialog open={Boolean(active)} onClose={() => setActive(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Link the customer</DialogTitle>
        <DialogContent>
          {active && (
            <>
              <Typography sx={{ fontSize: '0.88rem', mb: 0.5 }}>
                Sheet name: <strong>{active.rawCustomerName}</strong>
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
                {active.imei} · {active.productName} · sold {formatDate(active.saleDate)}. Linking creates the
                historical invoice and sets the device's owner. The sheet name is kept on the device history.
              </Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  fullWidth
                  label="Search existing customers by name or phone"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(query) }}
                />
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => search(query)}
                  disabled={searching}
                  sx={{ textTransform: 'none', minWidth: 92 }}
                  startIcon={searching ? <CircularProgress size={14} /> : <SearchOutlinedIcon />}
                >
                  Search
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {results.length === 0 ? (
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                  No customers loaded. Search by the name written in the sheet.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {results.map((customer) => (
                    <Box
                      key={customer._id}
                      onClick={() => setChosen(customer._id)}
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: chosen === customer._id ? 'info.main' : 'divider',
                        bgcolor: chosen === customer._id ? 'action.selected' : 'transparent',
                      }}
                    >
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>{customer.name}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {customer.phone || 'no phone'} · {customer.city || 'no city'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActive(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            color="info"
            onClick={confirmLink}
            disabled={!chosen || saving}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Link and create invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rejecting)} onClose={() => setRejecting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject this customer name</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', mb: 1.5 }}>
            “{rejecting?.rawCustomerName}” leaves the waiting list. The device stays sold and out of stock;
            nothing is deleted.
          </Typography>
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmReject} disabled={saving} sx={{ borderRadius: 999 }}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
