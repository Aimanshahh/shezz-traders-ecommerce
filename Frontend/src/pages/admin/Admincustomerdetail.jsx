import { useState, useEffect, useCallback } from 'react'
import { Navigate, Link as RouterLink, useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Snackbar,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AdminLayout from './AdminLayout.jsx'
import DeviceStatusChip from '../admin/DeviceStatusChip.jsx'
import { money, fmtDate, labelOf, PAYMENT_METHODS, WARRANTY_LABELS } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getCustomer, recordPayment, voidPayment, deleteCustomer } from '../../services/api.js'

const card = { p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }
const th = { fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', textAlign: 'left', py: 1.25, px: 1.5, whiteSpace: 'nowrap' }
const td = { fontSize: '0.84rem', py: 1.25, px: 1.5, borderTop: '1px solid', borderColor: 'divider', verticalAlign: 'top' }

const PAY_STYLE = {
  paid: { label: 'Paid', bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  partial: { label: 'Partial', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  unpaid: { label: 'Unpaid', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
}

const today = () => new Date().toISOString().slice(0, 10)

function Stat({ label, value, tone }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.2, color: tone || 'text.primary' }}>{value}</Typography>
    </Box>
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
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Button component={RouterLink} to="/admin/customers" startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none', color: 'text.secondary', mb: 2 }}>
          Back to customers
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} sx={{ color: 'info.main' }} /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        ) : (
          <Stack spacing={3}>
            <Box sx={card}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.9rem', lineHeight: 1.1 }}>{c.name}</Typography>
                  <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mt: 0.5 }}>
                    {[c.phone, c.city, c.address].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button onClick={() => openPay()} variant="contained" color="info" startIcon={<PaymentsOutlinedIcon />} sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}>
                    Record payment
                  </Button>
                  <Button component={RouterLink} to={`/admin/customers/${id}/statement`} variant="outlined" color="info" startIcon={<ReceiptLongOutlinedIcon />} sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}>
                    Statement
                  </Button>
                  <Button component={RouterLink} to={`/admin/handover?from=${id}`} variant="outlined" color="info" startIcon={<SwapHorizIcon />} sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}>
                    Hand over devices
                  </Button>
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
              <Stat label="Invoices" value={st.purchases || 0} />
              <Stat label="Devices bought" value={st.devices || 0} />
              <Stat label="Billed" value={money(st.spent)} />
              <Stat label="Paid" value={money(st.paid)} tone="#0F8A5F" />
              <Stat label={st.balance < 0 ? 'Credit' : 'Balance due'} value={balanceText} tone={balanceTone} />
            </Box>

            {(data.passedOn.length > 0 || data.receivedFrom.length > 0) && (
              <Box sx={card}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Resale chain</Typography>
                <Stack spacing={1}>
                  {data.receivedFrom.map((g) => (
                    <Typography key={`in-${g.customer._id}`} sx={{ fontSize: '0.88rem' }}>
                      Received <b>{g.count}</b> device{g.count === 1 ? '' : 's'} from{' '}
                      <Box component={RouterLink} to={`/admin/customers/${g.customer._id}`} sx={{ color: 'info.main', fontWeight: 600 }}>{g.customer.name}</Box>{' '}
                      <Box component="span" sx={{ color: 'text.secondary' }}>· last {fmtDate(g.lastDate)}</Box>
                    </Typography>
                  ))}
                  {data.passedOn.map((g) => (
                    <Typography key={`out-${g.customer._id}`} sx={{ fontSize: '0.88rem' }}>
                      Passed <b>{g.count}</b> device{g.count === 1 ? '' : 's'} on to{' '}
                      <Box component={RouterLink} to={`/admin/customers/${g.customer._id}`} sx={{ color: 'info.main', fontWeight: 600 }}>{g.customer.name}</Box>{' '}
                      <Box component="span" sx={{ color: 'text.secondary' }}>· last {fmtDate(g.lastDate)}</Box>
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            <Box sx={{ ...card, p: 0, overflow: 'hidden' }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tab label={`Invoices (${data.sales.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
                <Tab label={`Payments (${data.payments.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
                <Tab label={`Devices (${data.devices.length})`} sx={{ textTransform: 'none', fontWeight: 700 }} />
              </Tabs>

              <Box sx={{ overflowX: 'auto' }}>
                {tab === 0 && (
                  data.sales.length === 0 ? <Empty text="No invoices yet." /> : (
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                      <thead><tr>{['Invoice', 'Date', 'Devices', 'Total', 'Paid', 'Balance', 'Status', ''].map((h) => <Box key={h || 'x'} component="th" sx={th}>{h}</Box>)}</tr></thead>
                      <tbody>
                        {data.sales.map((s) => {
                          const ps = PAY_STYLE[s.paymentStatus] || PAY_STYLE.paid
                          return (
                            <tr key={s._id}>
                              <Box component="td" sx={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>
                                <Box component={RouterLink} to={`/admin/sales/${s._id}`} sx={{ color: 'info.main' }}>{s.invoiceNumber}</Box>
                              </Box>
                              <Box component="td" sx={td}>{fmtDate(s.saleDate)}</Box>
                              <Box component="td" sx={td}>{s.itemCount}</Box>
                              <Box component="td" sx={td}>{money(s.total)}</Box>
                              <Box component="td" sx={td}>{money(s.paid)}</Box>
                              <Box component="td" sx={{ ...td, fontWeight: 700, color: s.balance > 0 ? '#C81E1E' : 'text.primary' }}>{money(s.balance)}</Box>
                              <Box component="td" sx={td}><Chip label={ps.label} size="small" sx={{ bgcolor: ps.bg, color: ps.color, fontWeight: 700, fontSize: '0.66rem', height: 20, borderRadius: 999 }} /></Box>
                              <Box component="td" sx={td}>
                                {s.balance > 0 && <Button size="small" onClick={() => openPay(s._id)} sx={{ textTransform: 'none', fontWeight: 700 }}>Pay</Button>}
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
                              {p.note && !p.voided ? <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>{p.note}</Typography> : null}
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
                              <Box component={RouterLink} to={`/admin/devices/${d._id}`} sx={{ color: 'info.main' }}>{d.imei}</Box>
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
            </Box>

            <Box>
              <Button onClick={handleDelete} sx={{ textTransform: 'none', color: '#C81E1E', fontWeight: 600 }}>Delete customer</Button>
              <Typography component="span" sx={{ fontSize: '0.78rem', color: 'text.secondary', ml: 1 }}>Only works when they have no invoices, payments or devices.</Typography>
            </Box>
          </Stack>
        )}
      </Box>

      <Dialog open={payOpen} onClose={() => !paying && setPayOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Record payment</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayOpen(false)} disabled={paying} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={submitPay} disabled={paying || !(Number(pay.amount) > 0)} variant="contained" color="info" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
            {paying ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save payment'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!voiding} onClose={() => setVoiding(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Void {voiding?.reference}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.88rem', mb: 2 }}>
            The {money(voiding?.amount)} payment stays in the ledger as voided, and the invoices it covered owe that money again.
          </Typography>
          <TextField label="Reason (optional)" size="small" fullWidth value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVoiding(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={submitVoid} color="error" variant="contained" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>Void payment</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity={toast?.severity || 'success'} variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>{toast?.text}</Alert>
      </Snackbar>
    </AdminLayout>
  )
}

function Empty({ text }) {
  return <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.88rem', py: 6, px: 3 }}>{text}</Typography>
}