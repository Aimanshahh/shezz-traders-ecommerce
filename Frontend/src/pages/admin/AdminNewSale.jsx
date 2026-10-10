import { useState, useEffect, useRef, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Divider,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined'
import AdminLayout from './AdminLayout.jsx'
import IMEIScanner from '../admin/IMEIScanner.jsx'
import {
  money, fmtDate, PAYMENT_METHODS, SALE_SOURCES, WARRANTY_LABELS,
} from '../../components/admin/format.js'
import { isAdminLoggedIn, getAdminUser } from '../../lib/adminAuth.js'
import { resolveCode, createSale, lookupCustomer } from '../../services/api.js'

const TONE_COLOR = { success: '#0F8A5F', info: '#475569', error: '#C81E1E' }

// Consistent border style for all components
const BORDER_COLOR = '#CBD5E1' // slate-300
const INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: BORDER_COLOR },
    '&:hover fieldset': { borderColor: '#94A3B8' },
    '&.Mui-focused fieldset': { borderColor: '#0ea5e9' },
  },
}

function reasonText(item) {
  if (item.sale) {
    const w = item.sale.warranty
    return `${item.status} · ${item.sale.invoiceNumber} · ${item.sale.customerName} · ${fmtDate(item.sale.saleDate)}${
      w ? ` · warranty ${WARRANTY_LABELS[w.state] || w.state}` : ''
    }`
  }
  return item.status
}

const toLine = (i) => ({
  imei: i.imei,
  productName: i.product?.name || '—',
  box: i.box || '',
  unitPrice: String(i.product?.price ?? 0),
})

export default function AdminNewSale() {
  const navigate = useNavigate()
  const admin = getAdminUser()

  const [customer, setCustomer] = useState({ name: '', phone: '', city: '', address: '' })
  const [customerId, setCustomerId] = useState('')
  const [matched, setMatched] = useState(null)

  const [lines, setLines] = useState([])
  const linesRef = useRef([])
  const [feed, setFeed] = useState([])
  const [confirm, setConfirm] = useState(null)

  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [source, setSource] = useState('offline')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.unitPrice) || 0), 0),
    [lines]
  )
  const discountNum = Math.max(Number(discount) || 0, 0)
  const total = Math.max(subtotal - discountNum, 0)

  const pushFeed = (entry) => setFeed((f) => [entry, ...f].slice(0, 8))

  const addLines = (items, label) => {
    setLines((prev) => {
      const have = new Set(prev.map((l) => l.imei))
      return [...prev, ...items.filter((i) => !have.has(i.imei)).map(toLine)]
    })
    pushFeed({
      tone: 'success',
      text: `Added ${items.length} device${items.length === 1 ? '' : 's'}${label ? ` from ${label}` : ''}`,
    })
  }

  const handleScan = async (code) => {
    try {
      const r = await resolveCode(code)
      if (r.kind === 'invalid' || r.kind === 'not_found') {
        pushFeed({ tone: 'error', text: `${code}: ${r.message}` })
        return
      }
      const present = new Set(linesRef.current.map((l) => l.imei))
      const fresh = r.items.filter((i) => !present.has(i.imei))
      const addable = fresh.filter((i) => i.available)
      const blocked = fresh.filter((i) => !i.available)

      if (r.kind === 'device') {
        if (fresh.length === 0) pushFeed({ tone: 'info', text: `Already in this sale: ${r.label}` })
        else if (blocked.length) pushFeed({ tone: 'error', text: `${r.label}: ${reasonText(blocked[0])}` })
        else addLines(addable, '')
        return
      }

      if (r.items.length === 0) {
        pushFeed({ tone: 'info', text: `${r.label} has no devices` })
      } else if (fresh.length === 0) {
        pushFeed({ tone: 'info', text: `All devices from ${r.label} are already in this sale` })
      } else if (blocked.length) {
        setConfirm({ label: r.label, addable, blocked })
      } else {
        addLines(addable, r.label)
      }
    } catch (err) {
      pushFeed({ tone: 'error', text: `${code}: ${err?.message || 'failed'}` })
    }
  }

  const handlePhoneBlur = async () => {
    const phone = customer.phone.trim()
    if (phone.length < 7) return
    try {
      const r = await lookupCustomer(phone)
      if (r.customer) {
        setCustomerId(r.customer._id)
        setMatched({ ...r.customer, stats: r.stats })
        setCustomer((c) => ({
          phone: c.phone,
          name: r.customer.name,
          city: c.city || r.customer.city || '',
          address: c.address || r.customer.address || '',
        }))
      } else {
        setCustomerId('')
        setMatched(null)
      }
    } catch {
      /* lookup is only a convenience */
    }
  }

  const setPrice = (imei, value) =>
    setLines((prev) => prev.map((l) => (l.imei === imei ? { ...l, unitPrice: value } : l)))

  const removeLine = (imei) => setLines((prev) => prev.filter((l) => l.imei !== imei))

  const canSubmit =
    lines.length > 0 &&
    customer.phone.trim().length >= 7 &&
    (customerId || customer.name.trim()) &&
    discountNum <= subtotal

  const handleComplete = async () => {
    setError('')
    setSubmitting(true)
    try {
      const sale = await createSale({
        customerId: customerId || undefined,
        customer: customerId ? undefined : customer,
        items: lines.map((l) => ({ imei: l.imei, unitPrice: Number(l.unitPrice) || 0 })),
        discount: discountNum,
        paymentMethod,
        amountPaid: amountPaid === '' ? undefined : Number(amountPaid),
        source,
        notes,
      })
      navigate(`/admin/sales/${sale._id}`)
    } catch (err) {
      setError(err?.message || 'Could not complete the sale.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  return (
    <AdminLayout title="New sale">
      <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.8fr 1fr' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          {/* LEFT COLUMN: Customer & Devices */}
          <Stack spacing={3}>
            
            {/* Customer Card */}
            <Card elevation={0} sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOutlinedIcon sx={{ color: 'text.secondary' }} /> Customer Details
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                  <TextField
                    label="Phone Number"
                    size="small"
                    value={customer.phone}
                    onChange={(e) => {
                      setCustomer((c) => ({ ...c, phone: e.target.value }))
                      setCustomerId('')
                      setMatched(null)
                    }}
                    onBlur={handlePhoneBlur}
                    inputProps={{ inputMode: 'tel' }}
                    required
                    variant="outlined"
                    sx={INPUT_SX}
                  />
                  <TextField
                    label="Full Name"
                    size="small"
                    value={customer.name}
                    onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    disabled={!!customerId}
                    required={!customerId}
                    variant="outlined"
                    sx={INPUT_SX}
                  />
                  <TextField
                    label="City"
                    size="small"
                    value={customer.city}
                    onChange={(e) => setCustomer((c) => ({ ...c, city: e.target.value }))}
                    variant="outlined"
                    sx={INPUT_SX}
                  />
                  <TextField
                    label="Address"
                    size="small"
                    value={customer.address}
                    onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                    variant="outlined"
                    sx={INPUT_SX}
                  />
                </Box>
                {matched && (
                  <Alert severity="info" icon={<PersonOutlinedIcon />} sx={{ mt: 3, borderRadius: 1.5, border: `1px solid ${BORDER_COLOR}`, bgcolor: '#F0F9FF' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      Returning Customer
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem' }}>
                      {matched.name} · {matched.stats.purchases} {matched.stats.purchases === 1 ? 'purchase' : 'purchases'} · {money(matched.stats.spent)} spent
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Devices Card */}
            <Card elevation={0} sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Inventory2OutlinedIcon sx={{ color: 'text.secondary' }} /> Add Devices
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
                  Scan an IMEI to add one device, or scan a box/carton barcode to add everything inside.
                </Typography>
                
                <IMEIScanner
                  onScan={handleScan}
                  placeholder="Scan IMEI, box or carton code, then press Enter"
                  buttonLabel="Add Device"
                />

                {/* Scanner Feed */}
                {feed.length > 0 && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: '#F8FAFC', borderRadius: 1.5, border: `1px solid ${BORDER_COLOR}`, maxHeight: 150, overflowY: 'auto' }}>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
                      Scanner Log
                    </Typography>
                    {feed.map((f, i) => (
                      <Stack key={`${f.text}-${i}`} direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: TONE_COLOR[f.tone], flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: i === 0 ? 'text.primary' : 'text.secondary' }}>
                          {f.text}
                        </Typography>
                      </Stack>
                    ))}
                  </Box>
                )}

                {/* Device List */}
                <Box sx={{ mt: 4 }}>
                  {lines.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#F8FAFC', borderRadius: 2, border: `2px dashed ${BORDER_COLOR}` }}>
                      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        No devices added yet. Scan a code to get started.
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
                        {lines.length} {lines.length === 1 ? 'Device' : 'Devices'} in this sale
                      </Typography>
                      
                      {/* List Header */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 40px', gap: 2, px: 2, pb: 1.5, borderBottom: `2px solid ${BORDER_COLOR}` }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary' }}>DEVICE / IMEI</Typography>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textAlign: 'right' }}>PRICE</Typography>
                        <Box />
                      </Box>

                      {/* List Rows */}
                      {lines.map((l) => (
                        <Box
                          key={l.imei}
                          sx={{
                            display: 'grid', gridTemplateColumns: '1fr 100px 40px', gap: 2, alignItems: 'center',
                            py: 1.5, px: 2, borderBottom: `1px solid ${BORDER_COLOR}`,
                            '&:last-child': { borderBottom: `1px solid ${BORDER_COLOR}` },
                            '&:hover': { bgcolor: 'action.hover' },
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600, color: 'text.primary' }}>
                              {l.imei}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
                              {l.productName}
                              {l.box ? ` · Box ${l.box}` : ''}
                            </Typography>
                          </Box>
                          <TextField
                            size="small"
                            type="number"
                            value={l.unitPrice}
                            onChange={(e) => setPrice(l.imei, e.target.value)}
                            inputProps={{ min: 0, style: { textAlign: 'right', fontSize: '0.85rem' } }}
                            variant="outlined"
                            sx={INPUT_SX}
                          />
                          <IconButton 
                            size="small" 
                            onClick={() => removeLine(l.imei)} 
                            aria-label="Remove device"
                            sx={{ color: 'error.main', border: `1px solid ${BORDER_COLOR}`, borderRadius: 1, '&:hover': { bgcolor: 'error.50', borderColor: 'error.main' } }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Stack>

          {/* RIGHT COLUMN: Summary */}
          <Card 
            elevation={0} 
            sx={{ 
              border: `1px solid ${BORDER_COLOR}`, borderRadius: 2,
              position: { lg: 'sticky' }, top: { lg: 90 } 
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongOutlinedIcon sx={{ color: 'text.secondary' }} /> Order Summary
              </Typography>

              {/* TOTALS SECTION - FIXED ALIGNMENT & OUTLINES */}
              <Stack spacing={2.5} sx={{ mb: 4 }}>
                {/* Subtotal Row */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                  <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', fontWeight: 500 }}>Subtotal</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'text.primary' }}>{money(subtotal)}</Typography>
                </Stack>
                
                {/* Discount Row */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                  <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', fontWeight: 500 }}>Discount</Typography>
                  <Box sx={{ width: 120 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      inputProps={{ min: 0, style: { textAlign: 'right', fontSize: '0.85rem' } }}
                      error={discountNum > subtotal}
                      helperText={discountNum > subtotal ? 'Too high' : ''}
                      variant="outlined"
                      sx={INPUT_SX}
                      fullWidth
                    />
                  </Box>
                </Stack>
                
                <Divider sx={{ borderColor: BORDER_COLOR, my: 0.5 }} />
                
                {/* Total Row */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'text.primary' }}>Total</Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: '"Barlow Condensed", sans-serif', color: 'text.primary' }}>
                    {money(total)}
                  </Typography>
                </Stack>
              </Stack>

              <Divider sx={{ my: 3, borderColor: BORDER_COLOR }} />

              {/* Payment Details */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 2 }}>
                Payment & Source
              </Typography>
              <Stack spacing={2.5} sx={{ mb: 3 }}>
                <TextField select label="Payment Method" size="small" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} variant="outlined" sx={INPUT_SX}>
                  {PAYMENT_METHODS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Amount Paid"
                  size="small"
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  inputProps={{ min: 0 }}
                  helperText="Leave empty if paid in full"
                  variant="outlined"
                  sx={INPUT_SX}
                />
                <TextField select label="Sale Source" size="small" value={source} onChange={(e) => setSource(e.target.value)} variant="outlined" sx={INPUT_SX}>
                  {SALE_SOURCES.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </TextField>
                <TextField 
                  label="Sold By" 
                  size="small" 
                  value={admin?.name || 'Admin'} 
                  disabled 
                  variant="outlined"
                  InputProps={{ readOnly: true, sx: { bgcolor: 'action.hover' } }}
                  sx={INPUT_SX}
                />
              </Stack>

              <Divider sx={{ my: 3, borderColor: BORDER_COLOR }} />

              {/* Notes */}
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 2 }}>
                Additional Notes
              </Typography>
              <TextField
                label="Notes (optional)"
                size="small"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                minRows={2}
                fullWidth
                variant="outlined"
                sx={INPUT_SX}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 3, borderRadius: 1.5, border: `1px solid #FCA5A5` }}>
                  {error}
                </Alert>
              )}

              <Button
                onClick={handleComplete}
                disabled={!canSubmit || submitting}
                variant="contained"
                color="info"
                fullWidth
                size="large"
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <AddCircleOutlinedIcon />}
                sx={{ 
                  mt: 4, borderRadius: 999, fontWeight: 700, py: 1.5,
                  boxShadow: '0 4px 14px rgba(14,165,233,0.4)',
                  '&:hover': { boxShadow: '0 6px 20px rgba(14,165,233,0.5)' }
                }}
              >
                {submitting ? 'Processing...' : 'Complete Sale'}
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, border: `1px solid ${BORDER_COLOR}` } }}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Some devices in {confirm?.label} cannot be sold</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', mb: 2, color: 'text.secondary' }}>
            {confirm?.addable.length} device(s) can be added. {confirm?.blocked.length} device(s) cannot:
          </Typography>
          <Box sx={{ maxHeight: 220, overflowY: 'auto', p: 2, borderRadius: 1.5, bgcolor: '#F8FAFC', border: `1px solid ${BORDER_COLOR}` }}>
            {confirm?.blocked.map((b) => (
              <Typography key={b.imei} sx={{ fontSize: '0.8rem', fontFamily: 'monospace', py: 1, borderBottom: `1px solid ${BORDER_COLOR}`, '&:last-child': { borderBottom: 'none' } }}>
                {b.imei} — {reasonText(b)}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={() => setConfirm(null)} sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="info"
            disabled={!confirm?.addable.length}
            onClick={() => {
              addLines(confirm.addable, confirm.label)
              setConfirm(null)
            }}
            sx={{ textTransform: 'none', borderRadius: 999, fontWeight: 700, px: 3 }}
          >
            Add {confirm?.addable.length} Available
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  )
}