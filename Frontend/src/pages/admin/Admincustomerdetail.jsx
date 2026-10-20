import { useState, useEffect, useCallback } from 'react'
import { Navigate, Link as RouterLink, useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Snackbar, Avatar, Card, CardContent
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import ReceiptIcon from '@mui/icons-material/Receipt'
import DevicesIcon from '@mui/icons-material/Devices'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import AdminLayout from './AdminLayout.jsx'
import DeviceStatusChip from '../admin/DeviceStatusChip.jsx'
import { money, fmtDate, labelOf, PAYMENT_METHODS, WARRANTY_LABELS } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getCustomer, recordPayment, voidPayment, deleteCustomer, getProducts, saveCustomerPrices } from '../../services/api.js'

const th = { fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', textAlign: 'left', py: 1.5, px: 2, whiteSpace: 'nowrap' }
const td = { fontSize: '0.84rem', py: 1.5, px: 2, borderTop: '1px solid', borderColor: 'divider', verticalAlign: 'top' }

const PAY_STYLE = {
  paid: { label: 'Paid', bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  partial: { label: 'Partial', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  unpaid: { label: 'Unpaid', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
}

const today = () => new Date().toISOString().slice(0, 10)

// Modernized Stat Component
function Stat({ label, value, tone, icon, highlight }) {
  return (
    <Card elevation={0} sx={{ 
      border: '1px solid', 
      borderColor: highlight ? 'error.light' : 'divider', 
      bgcolor: highlight ? 'error.50' : 'background.paper',
      borderRadius: 2,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }
    }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary' }}>
            {label}
          </Typography>
          {icon && <Box sx={{ color: highlight ? 'error.main' : 'text.disabled', display: 'flex' }}>{icon}</Box>}
        </Stack>
        <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1, color: tone || 'text.primary' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default function AdminCustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(0)
  const [toast, setToast] = useState(null)

  const [ratesOpen, setRatesOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [rates, setRates] = useState({})
  const [savingRates, setSavingRates] = useState(false)
  const [ratesError, setRatesError] = useState('')

  const [payOpen, setPayOpen] = useState(false)
  const [pay, setPay] = useState({ amount: '', method: 'cash', date: today(), note: '', saleId: '' })
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  const [voiding, setVoiding] = useState(null)
  const [voidReason, setVoidReason] = useState('')

  const load = useCallback(async () => {
    try {
      setData(await getCustomer(id))
      setError('')
    } catch (err) {
      setError(err?.message || 'Could not load this customer.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const c = data?.customer
  const st = data?.stats || {}
  const openSales = (data?.sales || []).filter((s) => s.status === 'completed' && s.balance > 0)

  const openPay = (saleId = '') => {
    const sale = openSales.find((s) => s._id === saleId)
    setPay({ amount: sale ? String(sale.balance) : '', method: 'cash', date: today(), note: '', saleId })
    setPayError('')
    setPayOpen(true)
  }

  const submitPay = async () => {
    setPaying(true)
    setPayError('')
    try {
      await recordPayment(id, {
        amount: Number(pay.amount),
        method: pay.method,
        date: pay.date || undefined,
        note: pay.note,
        saleId: pay.saleId || undefined,
      })
      setPayOpen(false)
      setToast({ severity: 'success', text: 'Payment recorded.' })
      await load()
    } catch (err) {
      setPayError(err?.message || 'Could not record the payment.')
    } finally {
      setPaying(false)
    }
  }

  const openRates = () => {
    const next = {}
    ;(data?.prices || []).forEach((p) => { next[String(p.product)] = String(p.price) })
    setRates(next)
    setRatesError('')
    setRatesOpen(true)
  }

  const saveRates = async () => {
    setSavingRates(true)
    setRatesError('')
    try {
      const payload = products
        .filter((p) => { const v = rates[String(p._id)]; return v !== undefined && String(v).trim() !== '' })
        .map((p) => ({ productId: p._id, price: Number(rates[String(p._id)]) }))
      if (payload.some((r) => !Number.isFinite(r.price) || r.price < 0)) {
        throw new Error('Every rate must be a number of 0 or more.')
      }
      await saveCustomerPrices(id, payload)
      setRatesOpen(false)
      setToast({ severity: 'success', text: 'Customer rates saved.' })
      await load()
    } catch (err) {
      setRatesError(err?.message || 'Could not save the rates.')
    } finally {
      setSavingRates(false)
    }
  }

  const submitVoid = async () => {
    try {
      await voidPayment(voiding._id, voidReason)
      setVoiding(null)
      setVoidReason('')
      setToast({ severity: 'success', text: 'Payment voided.' })
      await load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not void the payment.' })
      setVoiding(null)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return
    try {
      await deleteCustomer(id)
      navigate('/admin/customers')
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not delete this customer.' })
    }
  }

  const balanceTone = st.balance > 0 ? '#C81E1E' : st.balance < 0 ? '#0F8A5F' : undefined
  const balanceText = st.balance < 0 ? `${money(-st.balance)} credit` : money(st.balance)

  return (
    <AdminLayout title="Customer">
      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
        <Button component={RouterLink} to="/admin/customers" startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none', color: 'text.secondary', mb: 2, fontWeight: 600 }}>
          Back to customers
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={32} sx={{ color: 'info.main' }} /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        ) : (
          <Stack spacing={3}>
            
            {/* HEADER SECTION */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3 }, '&:last-child': { pb: { xs: 2.5, md: 3 } } }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} spacing={3}>
                  
                  {/* Profile Info */}
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ width: 60, height: 60, bgcolor: 'info.main', fontSize: '1.5rem', fontWeight: 700 }}>
                      {c.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.2rem' }, lineHeight: 1, color: 'text.primary' }}>
                        {c.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mt: 0.5, fontWeight: 500 }}>
                        {[c.phone, c.city, c.address].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ width: { xs: '100%', lg: 'auto' } }}>
                    <Button 
                      onClick={() => openPay()} 
                      variant="contained" 
                      color="info" 
                      startIcon={<PaymentsOutlinedIcon />} 
                      sx={{ borderRadius: 1.5, fontWeight: 700, px: 3, py: 1, flex: { xs: 1, sm: 'none' }, boxShadow: 'none' }}
                    >
                      Record payment
                    </Button>
                    <Button onClick={openRates} variant="outlined" color="info" startIcon={<TuneOutlinedIcon />} sx={{ borderRadius: 1.5, fontWeight: 600, px: 2.5 }}>
                      Rates
                    </Button>
                    <Button component={RouterLink} to={`/admin/customers/${id}/statement`} variant="outlined" color="info" startIcon={<ReceiptLongOutlinedIcon />} sx={{ borderRadius: 1.5, fontWeight: 600, px: 2.5 }}>
                      Statement
                    </Button>
                    <Button component={RouterLink} to={`/admin/handover?from=${id}`} variant="outlined" color="info" startIcon={<SwapHorizIcon />} sx={{ borderRadius: 1.5, fontWeight: 600, px: 2.5 }}>
                      Handover
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* STATS GRID */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
              <Stat label="Invoices" value={st.purchases || 0} icon={<ReceiptIcon />} />
              <Stat label="Devices bought" value={st.devices || 0} icon={<DevicesIcon />} />
              <Stat label="Billed" value={money(st.spent)} icon={<AccountBalanceWalletIcon />} />
              <Stat label="Paid" value={money(st.paid)} tone="#0F8A5F" icon={<PaymentsOutlinedIcon />} />
              <Stat 
                label={st.balance < 0 ? 'Credit' : 'Balance due'} 
                value={balanceText} 
                tone={balanceTone} 
                icon={<AccountBalanceWalletIcon />} 
                highlight={st.balance > 0} 
              />
            </Box>

            {/* RESALE CHAIN */}
            {(data.passedOn.length > 0 || data.receivedFrom.length > 0) && (
              <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5, fontSize: '0.95rem' }}>Resale chain</Typography>
                <Stack spacing={1}>
                  {data.receivedFrom.map((g) => (
                    <Typography key={`in-${g.customer._id}`} sx={{ fontSize: '0.88rem', color: 'text.secondary' }}>
                      Received <b style={{ color: '#111' }}>{g.count}</b> device{g.count === 1 ? '' : 's'} from{' '}
                      <Box component={RouterLink} to={`/admin/customers/${g.customer._id}`} sx={{ color: 'info.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{g.customer.name}</Box>{' '}
                      <Box component="span" sx={{ color: 'text.disabled' }}>· last {fmtDate(g.lastDate)}</Box>
                    </Typography>
                  ))}
                  {data.passedOn.map((g) => (
                    <Typography key={`out-${g.customer._id}`} sx={{ fontSize: '0.88rem', color: 'text.secondary' }}>
                      Passed <b style={{ color: '#111' }}>{g.count}</b> device{g.count === 1 ? '' : 's'} on to{' '}
                      <Box component={RouterLink} to={`/admin/customers/${g.customer._id}`} sx={{ color: 'info.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{g.customer.name}</Box>{' '}
                      <Box component="span" sx={{ color: 'text.disabled' }}>· last {fmtDate(g.lastDate)}</Box>
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            {/* TABS & TABLES */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Tabs 
                  value={tab} 
                  onChange={(_, v) => setTab(v)} 
                  variant="scrollable" 
                  sx={{ 
                    px: 2, pt: 1,
                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.95rem', minWidth: 120 },
                    '& .Mui-selected': { color: 'info.main' },
                    '& .MuiTabs-indicator': { bgcolor: 'info.main', height: 3, borderRadius: '3px 3px 0 0' }
                  }}
                >
                  <Tab label={`Invoices (${data.sales.length})`} />
                  <Tab label={`Payments (${data.payments.length})`} />
                  <Tab label={`Devices (${data.devices.length})`} />
                </Tabs>
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                {tab === 0 && (
                  data.sales.length === 0 ? <Empty text="No invoices yet." /> : (
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                      <thead><tr>{['Invoice', 'Date', 'Devices', 'Total', 'Paid', 'Balance', 'Status', ''].map((h) => <Box key={h || 'x'} component="th" sx={th}>{h}</Box>)}</tr></thead>
                      <tbody>
                        {data.sales.map((s) => {
                          const ps = PAY_STYLE[s.paymentStatus] || PAY_STYLE.paid
                          return (
                            <tr key={s._id} style={{ transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <Box component="td" sx={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>
                                <Box component={RouterLink} to={`/admin/sales/${s._id}`} sx={{ color: 'info.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{s.invoiceNumber}</Box>
                              </Box>
                              <Box component="td" sx={td}>{fmtDate(s.saleDate)}</Box>
                              <Box component="td" sx={td}>{s.itemCount}</Box>
                              <Box component="td" sx={{ ...td, fontWeight: 600 }}>{money(s.total)}</Box>
                              <Box component="td" sx={td}>{money(s.paid)}</Box>
                              <Box component="td" sx={{ ...td, fontWeight: 700, color: s.balance > 0 ? '#C81E1E' : 'text.primary' }}>{money(s.balance)}</Box>
                              <Box component="td" sx={td}><Chip label={ps.label} size="small" sx={{ bgcolor: ps.bg, color: ps.color, fontWeight: 700, fontSize: '0.68rem', height: 22, borderRadius: 999 }} /></Box>
                              <Box component="td" sx={td}>
                                {s.balance > 0 && <Button size="small" variant="outlined" onClick={() => openPay(s._id)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, py: 0.5 }}>Pay</Button>}
                              </Box>
                            </tr>
                          )
                        })}
                      </tbody>
                    </Box>
                  )
                )}

                {tab === 1 && (
                  data.payments.length === 0 ? <Empty text="No separate payments recorded. Money paid at the time of sale is shown on the invoices." /> : (
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                      <thead><tr>{['Ref', 'Date', 'Amount', 'Method', 'Applied to', 'Received by', ''].map((h) => <Box key={h || 'x'} component="th" sx={th}>{h}</Box>)}</tr></thead>
                      <tbody>
                        {data.payments.map((p) => (
                          <tr key={p._id} style={p.voided ? { opacity: 0.55 } : undefined}>
                            <Box component="td" sx={{ ...td, fontFamily: 'monospace', fontWeight: 700, textDecoration: p.voided ? 'line-through' : 'none' }}>{p.reference}</Box>
                            <Box component="td" sx={td}>{fmtDate(p.date)}</Box>
                            <Box component="td" sx={{ ...td, fontWeight: 700 }}>{money(p.amount)}</Box>
                            <Box component="td" sx={td}>{labelOf(PAYMENT_METHODS, p.method)}</Box>
                            <Box component="td" sx={td}>
                              {p.voided ? <i>Voided{p.voidReason ? ` · ${p.voidReason}` : ''}</i> : (p.appliedTo?.join(', ') || 'On account')}
                              {p.note && !p.voided ? <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 0.5 }}>{p.note}</Typography> : null}
                            </Box>
                            <Box component="td" sx={td}>{p.receivedByName || '—'}</Box>
                            <Box component="td" sx={td}>
                              {!p.voided && <Button size="small" color="error" onClick={() => { setVoiding(p); setVoidReason('') }} sx={{ textTransform: 'none', fontWeight: 700 }}>Void</Button>}
                            </Box>
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  )
                )}

                {tab === 2 && (
                  data.devices.length === 0 ? <Empty text="No devices yet." /> : (
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                      <thead><tr>{['IMEI', 'Product', 'Box', 'Got it via', 'Date', 'Status', 'Warranty', 'Now with'].map((h) => <Box key={h} component="th" sx={th}>{h}</Box>)}</tr></thead>
                      <tbody>
                        {data.devices.map((d) => (
                          <tr key={`${d._id}-${d.source}-${d.date}`}>
                            <Box component="td" sx={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>
                              <Box component={RouterLink} to={`/admin/devices/${d._id}`} sx={{ color: 'info.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{d.imei}</Box>
                            </Box>
                            <Box component="td" sx={td}>{d.productName || '—'}</Box>
                            <Box component="td" sx={{ ...td, fontFamily: 'monospace' }}>{d.boxCode || '—'}</Box>
                            <Box component="td" sx={td}>{d.source === 'invoice' ? d.invoiceNumber : `From ${d.fromName}`}</Box>
                            <Box component="td" sx={td}>{fmtDate(d.date)}</Box>
                            <Box component="td" sx={td}><DeviceStatusChip status={d.status} /></Box>
                            <Box component="td" sx={td}>{d.warranty ? `${WARRANTY_LABELS[d.warranty.state] || d.warranty.state} · ${fmtDate(d.warranty.endDate)}` : '—'}</Box>
                            <Box component="td" sx={td}>{d.heldBy ? <b>{d.heldBy}</b> : 'This customer'}</Box>
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  )
                )}
              </Box>
            </Card>

            {/* DELETE CUSTOMER */}
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Button onClick={handleDelete} sx={{ textTransform: 'none', color: 'error.main', fontWeight: 600, borderRadius: 1.5 }}>Delete customer</Button>
              <Typography component="span" sx={{ fontSize: '0.78rem', color: 'text.secondary', ml: 1 }}>Only works when they have no invoices, payments or devices.</Typography>
            </Box>
          </Stack>
        )}
      </Box>

      {/* RATES DIALOG */}
      <Dialog open={ratesOpen} onClose={() => !savingRates && setRatesOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Rates for {c?.name}</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', mb: 2.5 }}>
            One rate per device type. The salesperson never sees these values; they are applied on the server when a sale is submitted. Leave a field blank if this customer has no rate for that device type.
          </Typography>
          {ratesError && <Alert severity="error" sx={{ mb: 2 }}>{ratesError}</Alert>}
          <Stack spacing={2}>
            {products.length === 0 ? (
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>No product types exist yet. Create products first.</Typography>
            ) : products.map((product) => (
              <Stack key={product._id} direction="row" alignItems="center" spacing={2}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>{product.name}</Typography>
                  <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>{product.category}</Typography>
                </Box>
                <TextField
                  size="small"
                  type="number"
                  label="Rate (Rs.)"
                  value={rates[String(product._id)] ?? ''}
                  onChange={(e) => setRates((prev) => ({ ...prev, [String(product._id)]: e.target.value }))}
                  inputProps={{ min: 0, style: { textAlign: 'right' } }}
                  sx={{ width: 150 }}
                />
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRatesOpen(false)} disabled={savingRates} sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={saveRates} disabled={savingRates || products.length === 0} variant="contained" color="info" sx={{ borderRadius: 1.5, fontWeight: 700, px: 3 }}>
            {savingRates ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save rates'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PAYMENT DIALOG */}
      <Dialog open={payOpen} onClose={() => !paying && setPayOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Record payment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {payError && <Alert severity="error">{payError}</Alert>}
            <TextField label="Amount (Rs.)" type="number" size="small" autoFocus value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} helperText={st.balance > 0 ? `Total balance due: ${money(st.balance)}` : undefined} />
            <TextField select label="Apply to" size="small" value={pay.saleId} onChange={(e) => {
              const sale = openSales.find((s) => s._id === e.target.value)
              setPay({ ...pay, saleId: e.target.value, amount: sale && !pay.amount ? String(sale.balance) : pay.amount })
            }}>
              <MenuItem value="">Oldest unpaid invoices first</MenuItem>
              {openSales.map((s) => <MenuItem key={s._id} value={s._id}>{s.invoiceNumber} · due {money(s.balance)}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField select label="Method" size="small" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
              <TextField label="Date" type="date" size="small" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
            <TextField label="Note (optional)" size="small" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPayOpen(false)} disabled={paying} sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={submitPay} disabled={paying || !(Number(pay.amount) > 0)} variant="contained" color="info" sx={{ borderRadius: 1.5, fontWeight: 700, px: 3 }}>
            {paying ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* VOID DIALOG */}
      <Dialog open={!!voiding} onClose={() => setVoiding(null)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Void {voiding?.reference}?</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: '0.88rem', mb: 2 }}>
            The {money(voiding?.amount)} payment stays in the ledger as voided, and the invoices it covered owe that money again.
          </Typography>
          <TextField label="Reason (optional)" size="small" fullWidth value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setVoiding(null)} sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={submitVoid} color="error" variant="contained" sx={{ borderRadius: 1.5, fontWeight: 700, px: 3 }}>Void payment</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity={toast?.severity || 'success'} variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>{toast?.text}</Alert>
      </Snackbar>
    </AdminLayout>
  )
}

function Empty({ text }) {
  return <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.9rem', py: 8, px: 3, fontWeight: 500 }}>{text}</Typography>
}