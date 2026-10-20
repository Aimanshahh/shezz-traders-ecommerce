import { useState, useEffect, useRef, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, Divider, Checkbox, ToggleButton, ToggleButtonGroup,
  Autocomplete
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
import { resolveCode, createSale, getProducts, getCustomers, getCustomer } from '../../services/api.js'

const TONE_COLOR = { success: '#0F8A5F', info: '#475569', error: '#C81E1E' }

const BORDER_COLOR = '#CBD5E1'
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

export default function AdminNewSale() {
  const navigate = useNavigate()
  const admin = getAdminUser()

  // Customer States
  const [customers, setCustomers] = useState([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customer, setCustomer] = useState({ name: '', phone: '', city: '', address: '' })
  const [customerId, setCustomerId] = useState('')
  const [matched, setMatched] = useState(null)
  const [customerRates, setCustomerRates] = useState({})

  const [lines, setLines] = useState([])
  const linesRef = useRef([])
  const [feed, setFeed] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [boxPicker, setBoxPicker] = useState(null)
  const [selectedBoxImeis, setSelectedBoxImeis] = useState([])
  const [products, setProducts] = useState([])
  const [extras, setExtras] = useState([])
  const [bulkPrice, setBulkPrice] = useState('')

  const [discount, setDiscount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [payMode, setPayMode] = useState('full') // full | part | later
  const [amountPaid, setAmountPaid] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [source, setSource] = useState('offline')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

  // Fetch customers for autocomplete
  useEffect(() => {
    let alive = true
    const t = setTimeout(async () => {
      setLoadingCustomers(true)
      try {
        const data = await getCustomers({ q: customerQuery, limit: 50 })
        if (alive) setCustomers(data.customers || [])
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoadingCustomers(false)
      }
    }, 300)
    return () => { alive = false; clearTimeout(t) }
  }, [customerQuery])

  // Update prices if customer rates change
  useEffect(() => {
    if (Object.keys(customerRates).length === 0 && !customerId) return;
    
    setLines((prev) =>
      prev.map((l) => {
        if (l.productId && customerRates[l.productId] !== undefined) {
          return { ...l, unitPrice: String(customerRates[l.productId]) };
        }
        return l;
      })
    );
    
    setExtras((prev) =>
      prev.map((e) => {
        if (customerRates[e.productId] !== undefined) {
          return { ...e, unitPrice: String(customerRates[e.productId]) };
        }
        return e;
      })
    );
  }, [customerRates, customerId]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.unitPrice) || 0), 0),
    [lines]
  )
  const discountNum = Math.max(Number(discount) || 0, 0)
  const extrasTotal = extras.reduce((sum, extra) => sum + (Number(extra.unitPrice) || 0) * (Number(extra.quantity) || 0), 0)
  const saleSubtotal = subtotal + extrasTotal
  const total = Math.max(saleSubtotal - discountNum, 0)
  const paidNow = payMode === 'full' ? total : payMode === 'later' ? 0 : Math.max(Number(amountPaid) || 0, 0)
  const pendingBalance = Math.max(total - paidNow, 0)
  const partInvalid = payMode === 'part' && (!(Number(amountPaid) > 0) || Number(amountPaid) >= total)
  
  const inDays = (n) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    const pad = (x) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }

  const pushFeed = (entry) => setFeed((f) => [entry, ...f].slice(0, 8))

  const getRate = (pid, defaultPrice) => {
    return (pid && customerRates[pid] !== undefined) ? customerRates[pid] : defaultPrice;
  }

  const toLine = (i) => {
    const pid = i.product?._id;
    const defaultPrice = i.product?.price ?? 0;
    return {
      imei: i.imei,
      productId: pid,
      productName: i.product?.name || '—',
      box: i.box || '',
      unitPrice: String(getRate(pid, defaultPrice)),
    }
  }

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

  const addExtra = (productId) => {
    const product = products.find((item) => String(item._id || item.id) === String(productId))
    if (!product) return
    const price = getRate(productId, product.price || 0)
    
    setExtras((current) => current.some((extra) => extra.productId === String(productId))
      ? current
      : [...current, { productId: String(productId), name: product.name, quantity: 1, unitPrice: String(price) }])
  }

  const updateExtra = (productId, field, value) => setExtras((current) => current.map((extra) => extra.productId === productId ? { ...extra, [field]: value } : extra))

  const handleSelectCustomer = async (cust) => {
    if (!cust) {
      setCustomerId('')
      setMatched(null)
      setCustomer({ name: '', phone: '', city: '', address: '' })
      setCustomerRates({})
      return
    }
    
    setCustomerId(cust._id)
    setMatched(cust)
    setCustomer({
      name: cust.name,
      phone: cust.phone || '',
      city: cust.city || '',
      address: cust.address || '',
    })

    // Fetch custom rates
    try {
      const fullCust = await getCustomer(cust._id)
      const rateMap = {}
      ;(fullCust.prices || []).forEach(p => { rateMap[p.product] = p.price })
      setCustomerRates(rateMap)
    } catch (e) {
      setCustomerRates({})
    }
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
      } else if (r.kind !== 'device') {
        setSelectedBoxImeis(addable.map((item) => item.imei))
        setBoxPicker({ label: r.label, items: addable, blocked })
      } else if (blocked.length) {
        setConfirm({ label: r.label, addable, blocked })
      } else {
        addLines(addable, r.label)
      }
    } catch (err) {
      pushFeed({ tone: 'error', text: `${code}: ${err?.message || 'failed'}` })
    }
  }

  const setPrice = (imei, value) =>
    setLines((prev) => prev.map((l) => (l.imei === imei ? { ...l, unitPrice: value } : l)))

  const applyPriceToAll = () => {
    if (bulkPrice === '') return
    setLines((prev) => prev.map((l) => ({ ...l, unitPrice: bulkPrice })))
    setBulkPrice('')
  }

  const removeLine = (imei) => setLines((prev) => prev.filter((l) => l.imei !== imei))

  const canSubmit =
    lines.length > 0 &&
    (customerId || customer.name.trim()) &&
    discountNum <= saleSubtotal &&
    !partInvalid

  const handleComplete = async () => {
    setError('')
    setSubmitting(true)
    try {
      const sale = await createSale({
        customerId: customerId || undefined,
        customer: customerId ? undefined : customer,
        items: lines.map((l) => ({ imei: l.imei, unitPrice: Number(l.unitPrice) || 0 })),
        extras: extras.map((extra) => ({ productId: extra.productId, quantity: Number(extra.quantity) || 1, unitPrice: Number(extra.unitPrice) || 0 })),
        discount: discountNum,
        paymentMethod,
        amountPaid: payMode === 'full' ? undefined : payMode === 'later' ? 0 : Number(amountPaid),
        dueDate: payMode === 'full' ? undefined : dueDate || undefined,
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
      <Box sx={{ maxWidth: 1280, mx: 'auto', pb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: { xs: '1.55rem', md: '1.85rem' }, lineHeight: 1.1 }}>Create invoice</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mt: 0.35 }}>Capture the customer, scan available devices, then complete payment details.</Typography>
          </Box>
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.55fr 1fr' },
            gap: { xs: 2.5, lg: 3 },
            alignItems: 'start',
          }}
        >
          <Stack spacing={3}>
            {/* Customer Card */}
            <Card elevation={0} sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 1.5 }}>
              <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 2.25, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOutlinedIcon sx={{ color: 'text.secondary' }} /> Customer Details
                </Typography>
                
                <Box sx={{ mb: 2.5 }}>
                  <Autocomplete
                    options={customers}
                    value={matched || null}
                    loading={loadingCustomers}
                    onChange={(_, value) => handleSelectCustomer(value)}
                    onInputChange={(_, value, reason) => { if (reason !== 'reset') setCustomerQuery(value) }}
                    getOptionLabel={(option) => [option.name, option.phone].filter(Boolean).join(' · ')}
                    isOptionEqualToValue={(option, value) => String(option._id) === String(value._id)}
                    noOptionsText="No customer found. Enter details manually below."
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search existing customer by name or phone"
                        size="small"
                        sx={INPUT_SX}
                      />
                    )}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                  <TextField
                    label="Full Name"
                    size="small"
                    value={customer.name}
                    onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    disabled={!!customerId}
                    required={!customerId}
                    helperText={!customerId ? 'Required for new customer' : 'Selected customer'}
                    variant="outlined"
                    sx={INPUT_SX}
                  />
                  <TextField
                    label="Mobile number (optional)"
                    size="small"
                    value={customer.phone}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                    disabled={!!customerId}
                    inputProps={{ inputMode: 'tel' }}
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
                      {matched.name} · {matched.stats?.purchases || 0} {matched.stats?.purchases === 1 ? 'purchase' : 'purchases'} · {money(matched.stats?.spent || 0)} spent
                    </Typography>
                    {matched.stats?.balance > 0 && (
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'warning.dark' }}>
                        Already owes {money(matched.stats.balance)} from earlier invoices
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.8rem', color: 'info.main', mt: 0.5, fontWeight: 600 }}>
                      Applied specific rates for this customer.
                    </Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Devices Card */}
            <Card elevation={0} sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 1.5 }}>
              <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
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

                <Box sx={{ mt: 3 }}>
                  {lines.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#F8FAFC', borderRadius: 2, border: `2px dashed ${BORDER_COLOR}` }}>
                      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                        No devices added yet. Scan a code to get started.
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ mb: 1.5, gap: 1 }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                          {lines.length} {lines.length === 1 ? 'Device' : 'Devices'} in this sale
                        </Typography>
                        {lines.length > 1 && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <TextField
                              size="small"
                              type="number"
                              placeholder="Same price for all"
                              value={bulkPrice}
                              onChange={(e) => setBulkPrice(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') applyPriceToAll() }}
                              inputProps={{ min: 0, style: { textAlign: 'right', fontSize: '0.82rem' } }}
                              sx={{ width: 150, ...INPUT_SX }}
                            />
                            <Button size="small" variant="outlined" color="info" disabled={bulkPrice === ''} onClick={applyPriceToAll} sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              Apply to all
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 40px', gap: 2, px: 2, pb: 1.5, borderBottom: `2px solid ${BORDER_COLOR}` }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary' }}>DEVICE / IMEI</Typography>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textAlign: 'right' }}>PRICE</Typography>
                        <Box />
                      </Box>

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

            {/* Other Components Card */}
            <Card elevation={0} sx={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: 1.5 }}>
              <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AddCircleOutlinedIcon sx={{ color: 'text.secondary' }} /> Other components
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>Add cables, accessories or other stocked products to this invoice.</Typography>
                <TextField select size="small" label="Add a product" value="" onChange={(event) => addExtra(event.target.value)} fullWidth sx={INPUT_SX}>
                  <MenuItem value="" disabled>Select a product</MenuItem>
                  {products.map((product) => {
                    const price = getRate(product._id || product.id, product.price || 0)
                    return <MenuItem key={product._id || product.id} value={product._id || product.id}>{product.name} · {money(price)}</MenuItem>
                  })}
                </TextField>
                {extras.length > 0 && <Stack spacing={1} sx={{ mt: 2 }}>
                  {extras.map((extra) => <Box key={extra.productId} sx={{ display: 'grid', gridTemplateColumns: '1fr 70px 105px 36px', gap: 1, alignItems: 'center', p: 1, bgcolor: '#F8FAFC', border: `1px solid ${BORDER_COLOR}`, borderRadius: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 0 }}>{extra.name}</Typography>
                    <TextField size="small" type="number" value={extra.quantity} onChange={(event) => updateExtra(extra.productId, 'quantity', event.target.value)} inputProps={{ min: 1, style: { textAlign: 'center' } }} sx={INPUT_SX} />
                    <TextField size="small" type="number" value={extra.unitPrice} onChange={(event) => updateExtra(extra.productId, 'unitPrice', event.target.value)} inputProps={{ min: 0, style: { textAlign: 'right' } }} sx={INPUT_SX} />
                    <IconButton size="small" onClick={() => setExtras((current) => current.filter((item) => item.productId !== extra.productId))} sx={{ color: 'error.main' }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Box>)}
                </Stack>}
              </CardContent>
            </Card>
          </Stack>

          {/* Summary Card */}
          <Card 
            elevation={0} 
            sx={{ 
              border: `1px solid ${BORDER_COLOR}`, borderRadius: 1.5,
              position: { lg: 'sticky' }, top: { lg: 90 } 
            }}
          >
            <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 2.25, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongOutlinedIcon sx={{ color: 'text.secondary' }} /> Order Summary
              </Typography>

              <Stack spacing={2.5} sx={{ mb: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                  <Typography sx={{ fontSize: '0.86rem', color: 'text.secondary', fontWeight: 600 }}>Subtotal</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'text.primary', whiteSpace: 'nowrap' }}>{money(saleSubtotal)}</Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                  <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', fontWeight: 500 }}>Discount</Typography>
                  <Box sx={{ width: 120 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      inputProps={{ min: 0, style: { textAlign: 'right', fontSize: '0.85rem' } }}
                      error={discountNum > saleSubtotal}
                      helperText={discountNum > saleSubtotal ? 'Too high' : ''}
                      variant="outlined"
                      sx={INPUT_SX}
                      fullWidth
                    />
                  </Box>
                </Stack>
                
                <Divider sx={{ borderColor: BORDER_COLOR, my: 0.5 }} />
                
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ width: '100%' }}>
                  <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: 'text.primary' }}>Total</Typography>
                  <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: '"Barlow Condensed", sans-serif', color: 'text.primary', whiteSpace: 'nowrap' }}>
                    {money(total)}
                  </Typography>
                </Stack>
                {payMode !== 'full' && (
                  <>
                    <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
                      <Typography sx={{ fontSize: '0.86rem', color: 'text.secondary', fontWeight: 600 }}>Received now</Typography>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{money(paidNow)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ width: '100%' }}>
                      <Typography sx={{ fontSize: '0.86rem', color: 'warning.dark', fontWeight: 700 }}>Payment pending</Typography>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: 'warning.dark' }}>{money(pendingBalance)}</Typography>
                    </Stack>
                  </>
                )}
              </Stack>

              <Divider sx={{ my: 3, borderColor: BORDER_COLOR }} />

              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 2 }}>
                Payment & Source
              </Typography>
              <Stack spacing={1.75} sx={{ mb: 2.5 }}>
                <TextField select label="Payment Method" size="small" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} variant="outlined" sx={INPUT_SX}>
                  {PAYMENT_METHODS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </TextField>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={payMode}
                  onChange={(_, v) => { if (v) setPayMode(v) }}
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
                    variant="outlined"
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
                      variant="outlined"
                      sx={INPUT_SX}
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Button size="small" variant="outlined" onClick={() => setDueDate(inDays(1))}>Tomorrow</Button>
                      <Button size="small" variant="outlined" onClick={() => setDueDate(inDays(2))}>2 days</Button>
                      <Button size="small" variant="outlined" onClick={() => setDueDate(inDays(7))}>1 week</Button>
                    </Stack>
                  </Box>
                )}
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

              <Divider sx={{ my: 2.5, borderColor: BORDER_COLOR }} />

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
                {submitting ? 'Processing...' : payMode === 'full' ? 'Complete Sale' : 'Complete Sale (payment pending)'}
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Dialog open={!!boxPicker} onClose={() => setBoxPicker(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1.5 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Choose devices from {boxPicker?.label}</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', mb: 1.5 }}>
            Select the available devices this customer is taking. Unselected devices remain in inventory.
          </Typography>
          <Stack spacing={0.5} sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {(boxPicker?.items || []).map((item) => <Stack key={item.imei} direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.5, borderBottom: `1px solid ${BORDER_COLOR}` }}>
              <Checkbox size="small" checked={selectedBoxImeis.includes(item.imei)} onChange={() => setSelectedBoxImeis((current) => current.includes(item.imei) ? current.filter((imei) => imei !== item.imei) : [...current, item.imei])} />
              <Box sx={{ minWidth: 0 }}><Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700 }}>{item.imei}</Typography><Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{item.product?.name || 'Device'}{item.box ? ` · ${item.box}` : ''}</Typography></Box>
            </Stack>)}
          </Stack>
          {boxPicker?.blocked?.length > 0 && <Alert severity="warning" sx={{ mt: 2 }}>This box also contains {boxPicker.blocked.length} unavailable device(s); they cannot be selected.</Alert>}
          {(!boxPicker?.items || boxPicker.items.length === 0) && <Alert severity="info" sx={{ mt: 1 }}>No available devices remain in this box.</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBoxPicker(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" color="info" disabled={!selectedBoxImeis.length} onClick={() => { addLines(boxPicker.items.filter((item) => selectedBoxImeis.includes(item.imei)), boxPicker.label); setBoxPicker(null) }} sx={{ borderRadius: 999, fontWeight: 700 }}>
            Add {selectedBoxImeis.length} selected
          </Button>
        </DialogActions>
      </Dialog>

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