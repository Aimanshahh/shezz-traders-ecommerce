import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Stack, Card, CardContent, TextField, MenuItem, Button, Alert,
  CircularProgress, Chip, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import AdminLayout from './AdminLayout.jsx'
import { money, fmtDate, PAYMENT_METHODS, SALE_SOURCES } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { approveSale, getSale, rejectSale, getCustomer } from '../../services/api.js'

const BORDER = '#CBD5E1'
const INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#94A3B8' },
    '&.Mui-focused fieldset': { borderColor: '#0ea5e9' },
  },
}

const round2 = (n) => Math.round(n * 100) / 100

export default function AdminSaleReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [prices, setPrices] = useState({})
  const [extraPrices, setExtraPrices] = useState({})
  const [discount, setDiscount] = useState('0')
  
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [payMode, setPayMode] = useState('full')
  const [amountPaid, setAmountPaid] = useState('')
  const [dueDate, setDueDate] = useState('')
  
  const [source, setSource] = useState('offline')
  const [notes, setNotes] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')

  const [approving, setApproving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const inDays = (n) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    const pad = (x) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  useEffect(() => {
    let alive = true
    getSale(id)
      .then(async (result) => {
        if (!alive) return
        setData(result)
        
        const sale = result.sale
        const custId = sale?.customer?._id || sale?.customer

        // Fetch specific customer rates to initialize the inputs
        let rateMap = {}
        if (custId) {
          try {
            const fullCust = await getCustomer(custId)
            ;(fullCust.prices || []).forEach(p => { rateMap[p.product] = p.price })
          } catch (e) { /* ignore */ }
        }

        const next = {}
        ;(result.items || []).forEach((item) => {
          const pid = item.product?._id || item.product
          const rate = (pid && rateMap[pid] !== undefined) ? rateMap[pid] : item.unitPrice
          next[item.imei] = String(rate)
        })
        setPrices(next)

        const nextExtras = {}
        ;(result.sale?.extras || []).forEach((extra) => {
          const pid = extra.product?._id || extra.product
          const rate = (pid && rateMap[pid] !== undefined) ? rateMap[pid] : extra.unitPrice
          nextExtras[pid] = String(rate)
        })
        setExtraPrices(nextExtras)

        setDiscount(String(sale?.discount || 0))
        setPaymentMethod(sale?.paymentMethod || 'cash')
        setSource(sale?.source || 'offline')
        setNotes(sale?.notes || '')
        
        const sTotal = sale?.total || 0
        const sPaid = sale?.amountPaid || 0
        
        if (sale?.status === 'pending') {
          if (sPaid >= sTotal && sTotal > 0) {
            setPayMode('full')
          } else if (sPaid === 0) {
            setPayMode('later')
          } else {
            setPayMode('part')
            setAmountPaid(String(sPaid))
          }
          setDueDate(sale?.dueDate ? sale.dueDate.slice(0, 10) : '')
        }
      })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load this sale.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  const sale = data?.sale
  
  const lines = useMemo(
    () => (data?.items || []).map((i) => ({ ...i, price: Number(prices[i.imei] ?? i.unitPrice) || 0 })),
    [data, prices]
  )

  const extraLines = useMemo(() => {
    return (sale?.extras || []).map((e) => {
      const pid = e.product?._id || e.product
      const price = Number(extraPrices[pid] ?? e.unitPrice) || 0
      return {
        ...e,
        productId: pid,
        price,
        lineTotal: round2(price * e.quantity)
      }
    })
  }, [sale, extraPrices])

  const subtotal = round2(
    lines.reduce((sum, l) => sum + l.price, 0) + 
    extraLines.reduce((sum, e) => sum + e.lineTotal, 0)
  )
  
  const discountNum = Math.max(Number(discount) || 0, 0)
  const total = round2(Math.max(subtotal - discountNum, 0))
  
  const paidNow = payMode === 'full' ? total : payMode === 'later' ? 0 : Math.max(Number(amountPaid) || 0, 0)
  const pendingBalance = Math.max(total - paidNow, 0)
  
  const discountInvalid = discountNum > subtotal
  const partInvalid = payMode === 'part' && (!(Number(amountPaid) > 0) || Number(amountPaid) >= total)

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const handleApprove = async () => {
    setActionError('')
    if (discountInvalid) {
      setActionError('The discount cannot be more than the subtotal.')
      return
    }
    if (partInvalid) {
      setActionError('Part payment must be greater than 0 and less than the total.')
      return
    }
    
    setApproving(true)
    try {
      await approveSale(id, {
        items: lines.map((l) => ({ imei: l.imei, unitPrice: l.price })),
        extras: extraLines.map((e) => ({ productId: e.productId, quantity: e.quantity, unitPrice: e.price })),
        discount: discountNum,
        paymentMethod,
        amountPaid: payMode === 'full' ? undefined : payMode === 'later' ? 0 : Number(amountPaid),
        dueDate: payMode === 'full' ? undefined : dueDate || undefined,
        source,
        notes,
        reviewNotes,
      })
      navigate(`/admin/sales/${id}`, { replace: true })
    } catch (err) {
      setActionError(err?.message || 'Could not approve this sale.')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    setRejecting(true)
    try {
      await rejectSale(id, reason)
      setRejectOpen(false)
      navigate('/admin/sales?status=rejected', { replace: true })
    } catch (err) {
      setActionError(err?.message || 'Could not reject this sale.')
      setRejectOpen(false)
    } finally {
      setRejecting(false)
    }
  }

  return (
    <AdminLayout title="Review submitted sale">
      <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 4 }}>
        <Button component={RouterLink} to="/admin/sales?status=pending" startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none', color: 'text.secondary', mb: 2 }}>
          Back to pending sales
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} sx={{ color: 'info.main' }} /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        ) : sale?.status !== 'pending' ? (
          <Alert
            severity={sale?.status === 'rejected' ? 'error' : 'info'}
            sx={{ borderRadius: 2 }}
            action={
              sale?.status === 'completed' ? (
                <Button color="inherit" size="small" component={RouterLink} to={`/admin/sales/${id}`}>Open invoice</Button>
              ) : null
            }
          >
            This sale is already {sale?.status}. {sale?.rejectionReason ? `Reason: ${sale.rejectionReason}` : ''}
          </Alert>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.55fr 1fr' }, gap: 3, alignItems: 'start' }}>
            <Stack spacing={2.5}>
              <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} flexWrap="wrap" useFlexGap>
                    <Box>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem' }}>{sale.saleNumber}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>
                        Submitted {fmtDate(sale.submittedAt)} by {sale.salespersonName || 'salesperson'}
                      </Typography>
                    </Box>
                    <Chip label="Pending review" sx={{ bgcolor: 'rgba(245,158,11,0.14)', color: '#B45309', fontWeight: 700, borderRadius: 999 }} />
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(14,165,233,0.1)', color: 'info.main', display: 'grid', placeItems: 'center' }}>
                      <PersonOutlinedIcon />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{sale.customerSnapshot?.name}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {[sale.customerSnapshot?.phone, sale.customerSnapshot?.city].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                  <Typography sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ReceiptLongOutlinedIcon sx={{ color: 'text.secondary' }} /> Items &amp; rates
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
                    The rates stored on the submission. Correct a line here before approving if needed.
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px', gap: 2, px: 1, pb: 1, borderBottom: `2px solid ${BORDER}` }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>Device / IMEI</Typography>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>Rate</Typography>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', textAlign: 'right' }}>Line total</Typography>
                  </Box>

                  {lines.map((line) => (
                    <Box key={line.imei} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px', gap: 2, alignItems: 'center', py: 1.25, px: 1, borderBottom: `1px solid ${BORDER}` }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.86rem', fontWeight: 700 }}>{line.imei}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                          {line.productName}{line.boxCode ? ` · Box ${line.boxCode}` : ''}
                        </Typography>
                      </Box>
                      <TextField
                        size="small"
                        type="number"
                        value={prices[line.imei] ?? ''}
                        onChange={(e) => setPrices((prev) => ({ ...prev, [line.imei]: e.target.value }))}
                        inputProps={{ min: 0, style: { textAlign: 'right', fontSize: '0.84rem' } }}
                        sx={INPUT_SX}
                      />
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, textAlign: 'right' }}>{money(line.price)}</Typography>
                    </Box>
                  ))}

                  {extraLines.length > 0 && (
                    <>
                      <Box sx={{ mt: 3, mb: 1, px: 1 }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Other Components</Typography>
                      </Box>
                      {extraLines.map((extra) => (
                        <Box key={extra.productId} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px', gap: 2, alignItems: 'center', py: 1.25, px: 1, borderBottom: `1px solid ${BORDER}` }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.86rem', fontWeight: 700 }}>{extra.name}</Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Qty: {extra.quantity}</Typography>
                          </Box>
                          <TextField
                            size="small"
                            type="number"
                            value={extraPrices[extra.productId] ?? ''}
                            onChange={(e) => setExtraPrices((prev) => ({ ...prev, [extra.productId]: e.target.value }))}
                            inputProps={{ min: 0, style: { textAlign: 'right', fontSize: '0.84rem' } }}
                            sx={INPUT_SX}
                          />
                          <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, textAlign: 'right' }}>{money(extra.lineTotal)}</Typography>
                        </Box>
                      ))}
                    </>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 0.5 }}>
                      Review note (optional)
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Why a rate or the discount was changed"
                      sx={INPUT_SX}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Stack>

            <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, position: { lg: 'sticky' }, top: { lg: 88 } }}>
              <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                <Typography sx={{ fontWeight: 800, mb: 2 }}>Payment details</Typography>

                <Stack spacing={1.75}>
                  <TextField select label="Payment method" size="small" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} fullWidth sx={INPUT_SX}>
                    {PAYMENT_METHODS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                  </TextField>
                  <TextField select label="Sale source" size="small" value={source} onChange={(e) => setSource(e.target.value)} fullWidth sx={INPUT_SX}>
                    {SALE_SOURCES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                  </TextField>
                  
                  <TextField
                    label="Discount"
                    size="small"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    error={discountInvalid}
                    helperText={discountInvalid ? 'More than the subtotal' : ''}
                    fullWidth
                    sx={INPUT_SX}
                  />

                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={payMode}
                    onChange={(_, v) => { 
                      if (v) {
                        setPayMode(v)
                        if (v === 'full') setAmountPaid('')
                        if (v === 'later') setAmountPaid('0')
                      } 
                    }}
                  >
                    <ToggleButton value="full" sx={{ textTransform: 'none', fontWeight: 600 }}>Paid in full</ToggleButton>
                    <ToggleButton value="part" sx={{ textTransform: 'none', fontWeight: 600 }}>Part paid</ToggleButton>
                    <ToggleButton value="later" sx={{ textTransform: 'none', fontWeight: 600 }}>Pay later</ToggleButton>
                  </ToggleButtonGroup>

                  {payMode === 'part' && (
                    <TextField
                      label="Amount received now"
                      size="small"
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      inputProps={{ min: 0 }}
                      error={amountPaid !== '' && partInvalid}
                      helperText={amountPaid !== '' && partInvalid ? 'Must be more than 0 and less than the total' : `Balance ${money(pendingBalance)} stays pending`}
                      fullWidth
                      sx={INPUT_SX}
                    />
                  )}

                  {payMode !== 'full' && (
                    <Box>
                      <TextField
                        label="Payment due by (optional)"
                        size="small"
                        type="date"
                        fullWidth
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: inDays(0) }}
                        sx={INPUT_SX}
                      />
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button size="small" variant="outlined" onClick={() => setDueDate(inDays(1))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>Tomorrow</Button>
                        <Button size="small" variant="outlined" onClick={() => setDueDate(inDays(2))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>2 days</Button>
                        <Button size="small" variant="outlined" onClick={() => setDueDate(inDays(7))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>1 week</Button>
                      </Stack>
                    </Box>
                  )}

                  <TextField
                    label="Invoice notes (optional)"
                    size="small"
                    multiline
                    minRows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    sx={INPUT_SX}
                  />

                  <TextField 
                    label="Submitted By" 
                    size="small" 
                    value={sale.salespersonName || 'Salesperson'} 
                    disabled 
                    fullWidth
                    InputProps={{ readOnly: true, sx: { bgcolor: 'action.hover' } }}
                    sx={INPUT_SX}
                  />
                </Stack>

                <Divider sx={{ my: 2.5, borderColor: BORDER }} />

                <Stack spacing={1.25} sx={{ mb: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>Subtotal</Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{money(subtotal)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>Discount</Typography>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>− {money(discountNum)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: '1rem', fontWeight: 800 }}>Invoice total</Typography>
                    <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.4rem', fontWeight: 800 }}>{money(total)}</Typography>
                  </Stack>
                  
                  {payMode !== 'full' && (
                    <>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>Received now</Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{money(paidNow)}</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'warning.dark' }}>
                          Balance due
                        </Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: 'warning.dark' }}>
                          {money(pendingBalance)}
                        </Typography>
                      </Stack>
                    </>
                  )}
                </Stack>

                {actionError && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{actionError}</Alert>}

                <Button
                  onClick={handleApprove}
                  disabled={approving || discountInvalid || partInvalid}
                  variant="contained"
                  color="info"
                  fullWidth
                  size="large"
                  startIcon={approving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <CheckCircleOutlineIcon />}
                  sx={{ borderRadius: 999, fontWeight: 700, py: 1.35, mb: 1.25 }}
                >
                  {approving ? 'Approving…' : 'Approve & create invoice'}
                </Button>

                <Button
                  onClick={() => { setReason(''); setRejectOpen(true) }}
                  disabled={approving}
                  variant="outlined"
                  color="error"
                  fullWidth
                  startIcon={<CloseOutlinedIcon />}
                  sx={{ borderRadius: 999, fontWeight: 700 }}
                >
                  Reject sale
                </Button>

                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', textAlign: 'center', mt: 1.5 }}>
                  Approving takes the devices out of available inventory and creates the invoice.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>

      <Dialog open={rejectOpen} onClose={() => !rejecting && setRejectOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Reject {sale?.saleNumber}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.86rem', color: 'text.secondary', mb: 2 }}>
            The devices stay available in inventory. The salesperson will see your reason.
          </Typography>
          <TextField
            label="Reason"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectOpen(false)} disabled={rejecting} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleReject} disabled={rejecting} color="error" variant="contained" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
            {rejecting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Reject sale'}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  )
}