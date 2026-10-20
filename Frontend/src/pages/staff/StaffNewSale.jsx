import { useEffect, useMemo, useState } from 'react'
import { Navigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Stack, Card, CardContent, TextField, MenuItem, Button, Autocomplete,
  Alert, CircularProgress, IconButton, Divider, Chip,
} from '@mui/material'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined'
import StaffLayout from './StaffLayout.jsx'
import IMEIScanner from '../admin/IMEIScanner.jsx'
import { isStaffLoggedIn } from '../../lib/staffAuth.js'
import {
  getStaffCustomers, getStaffProducts, staffScan, staffRegisterDevice, createStaffSale,
} from '../../services/api.js'

const BORDER = '#CBD5E1'
const INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: BORDER },
    '&:hover fieldset': { borderColor: '#94A3B8' },
    '&.Mui-focused fieldset': { borderColor: '#0ea5e9' },
  },
}

const TONE = {
  success: { severity: 'success' },
  info: { severity: 'info' },
  warning: { severity: 'warning' },
  error: { severity: 'error' },
}

// Sleek, modern scrollbar styling
const SCROLLBAR_SX = {
  '&::-webkit-scrollbar': { width: '8px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': { 
    backgroundColor: '#CBD5E1', 
    borderRadius: '8px',
    border: '2px solid transparent',
    backgroundClip: 'padding-box'
  },
  '&::-webkit-scrollbar-thumb:hover': { backgroundColor: '#94A3B8' },
  scrollbarWidth: 'thin',
  scrollbarColor: '#CBD5E1 transparent'
}

export default function StaffNewSale() {
  const [customers, setCustomers] = useState([])
  const [customerQuery, setCustomerQuery] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [customer, setCustomer] = useState(null)

  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)

  const [lines, setLines] = useState([])
  const [extras, setExtras] = useState([]) 
  const [extraSelector, setExtraSelector] = useState('') // FIX: Proper state for dropdown
  const [scanMsg, setScanMsg] = useState(null)
  const [unknown, setUnknown] = useState(null)
  const [busy, setBusy] = useState(false)
  const [registering, setRegistering] = useState(false)

  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(null)

  useEffect(() => {
    getStaffProducts().then(setProducts).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    const t = setTimeout(async () => {
      setLoadingCustomers(true)
      try {
        const data = await getStaffCustomers({ q: customerQuery, limit: 50 })
        if (alive) setCustomers(data.customers || [])
      } catch {
        /* the dropdown is only a convenience */
      } finally {
        if (alive) setLoadingCustomers(false)
      }
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [customerQuery])

  const product = useMemo(
    () => products.find((p) => String(p._id) === String(productId)) || null,
    [products, productId]
  )

  const handleAddExtra = (id) => {
    const p = products.find((item) => String(item._id) === String(id))
    if (!p) return
    setExtras((current) =>
      current.some((extra) => extra.productId === String(id))
        ? current
        : [...current, { productId: String(id), name: p.name, quantity: 1, price: Number(p.price) || 0 }]
    )
    setExtraSelector('') // Reset the dropdown after adding
  }

  const updateExtraQuantity = (id, qty) =>
    setExtras((current) =>
      current.map((extra) => (extra.productId === id ? { ...extra, quantity: Math.max(1, Number(qty) || 1) } : extra))
    )

  const removeExtra = (id) =>
    setExtras((current) => current.filter((extra) => extra.productId !== id))

  const addLines = (incoming) =>
    setLines((prev) => {
      const have = new Set(prev.map((l) => l.imei))
      return [...prev, ...incoming.filter((l) => !have.has(l.imei))]
    })

  const handleScan = async (code) => {
    if (!productId) {
      setScanMsg({ tone: 'warning', text: 'Choose a device type before scanning.' })
      return
    }
    setBusy(true)
    setUnknown(null)
    try {
      const r = await staffScan(code)

      if (r.kind === 'invalid' || r.kind === 'not_found') {
        setScanMsg({ tone: r.kind === 'invalid' ? 'warning' : 'error', text: `${r.label || code}: ${r.message}` })
        if (r.kind === 'not_found' && /^\d{15}$/.test(String(r.imei || code))) {
          setUnknown({ imei: String(r.imei || code) })
        }
        return
      }

      const have = new Set(lines.map((l) => l.imei))
      const added = []
      const duplicate = []
      const blocked = []
      const wrongType = []

      for (const item of r.items) {
        if (have.has(item.imei)) {
          duplicate.push(item.imei)
        } else if (!item.available) {
          blocked.push(`${item.imei} (${item.status})`)
        } else if (!item.product || String(item.product._id) !== String(productId)) {
          wrongType.push(`${item.imei} · ${item.product?.name || 'no device type'}`)
        } else {
          added.push({ imei: item.imei, productName: item.product.name, box: item.box || '' })
        }
      }

      if (added.length) addLines(added)

      const parts = []
      if (added.length) parts.push(`Added ${added.length} device${added.length === 1 ? '' : 's'}${r.kind !== 'device' ? ` from ${r.label}` : ''}.`)
      if (duplicate.length) parts.push(`${duplicate.length} already on this sale.`)
      if (blocked.length) parts.push(`Not available: ${blocked.slice(0, 3).join(', ')}${blocked.length > 3 ? '…' : ''}`)
      if (wrongType.length) parts.push(`Wrong device type: ${wrongType.slice(0, 3).join(', ')}${wrongType.length > 3 ? '…' : ''}`)

      setScanMsg({
        tone: added.length ? (blocked.length || wrongType.length ? 'warning' : 'success') : 'error',
        text: parts.join(' ') || `${r.label}: nothing to add.`,
      })
    } catch (err) {
      setScanMsg({ tone: 'error', text: err?.message || 'Scan failed. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  const registerUnknown = async () => {
    if (!unknown || !productId) return
    setRegistering(true)
    try {
      const device = await staffRegisterDevice({ imei: unknown.imei, productId })
      addLines([{ imei: device.imei, productName: device.product?.name || product?.name || '', box: '' }])
      setUnknown(null)
      setScanMsg({ tone: 'success', text: `${device.imei} was registered in inventory and added to this sale.` })
    } catch (err) {
      setScanMsg({ tone: 'error', text: err?.message || 'Could not register this IMEI.' })
    } finally {
      setRegistering(false)
    }
  }

  const removeLine = (imei) => setLines((prev) => prev.filter((l) => l.imei !== imei))

  const target = Math.max(Number(quantity) || 1, 1)
  const canSubmit =
    !!customer &&
    !!productId &&
    lines.length === target &&
    !submitting &&
    (lines.length > 0 || extras.length > 0)

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const sale = await createStaffSale({
        customerId: customer._id,
        productId,
        items: lines.map((l) => ({ imei: l.imei })),
        extras: extras.map((e) => ({ productId: e.productId, quantity: Number(e.quantity) || 1 })),
        notes,
      })
      setSubmitted(sale)
    } catch (err) {
      setError(err?.message || 'Could not submit this sale.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetSale = () => {
    setSubmitted(null)
    setLines([])
    setExtras([])
    setCustomer(null)
    setCustomerQuery('')
    setProductId('')
    setQuantity(1)
    setNotes('')
    setScanMsg(null)
    setUnknown(null)
    setError('')
  }

  if (!isStaffLoggedIn()) return <Navigate to="/staff" replace />

  if (submitted) {
    return (
      <StaffLayout title="Sale submitted" subtitle="New sales wait for admin approval. No invoice is created here.">
        <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, maxWidth: 640, mx: 'auto' }}>
          <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'rgba(16,185,129,0.12)', color: '#0F8A5F', display: 'grid', placeItems: 'center', mx: 'auto', mb: 2 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.6rem', mb: 0.5 }}>
              Sent to the admin for review
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 2.5 }}>
              No invoice has been created yet. The admin will approve or reject this sale.
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
              <Box>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>Reference</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.05rem' }}>{submitted.saleNumber}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>Devices</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{submitted.itemCount}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>Status</Typography>
                <Chip label="Pending review" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.14)', color: '#B45309', fontWeight: 700, borderRadius: 999 }} />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
              <Button onClick={resetSale} variant="contained" color="info" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
                Create another sale
              </Button>
              <Button component={RouterLink} to="/staff/sales" variant="outlined" color="info" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
                My submissions
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </StaffLayout>
    )
  }

  return (
    <StaffLayout title="Create sale" subtitle="New sales wait for admin approval. No invoice is created here.">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.55fr 1fr' }, gap: { xs: 2.5, lg: 3 }, alignItems: 'start' }}>
        <Stack spacing={2.5}>
          <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonOutlinedIcon sx={{ color: 'text.secondary' }} /> Customer
              </Typography>
              <Autocomplete
                options={customers}
                value={customer}
                loading={loadingCustomers}
                onChange={(_, value) => { setCustomer(value); setError('') }}
                onInputChange={(_, value, reason) => { if (reason !== 'reset') setCustomerQuery(value) }}
                getOptionLabel={(option) => [option.name, option.phone].filter(Boolean).join(' · ')}
                isOptionEqualToValue={(option, value) => String(option._id) === String(value._id)}
                noOptionsText="No customer matches. Ask the admin to create the customer."
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search customer by name or phone"
                    size="small"
                    sx={INPUT_SX}
                  />
                )}
              />
              {customer && (
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 1.25 }}>
                  {[customer.phone, customer.city].filter(Boolean).join(' · ')}
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory2OutlinedIcon sx={{ color: 'text.secondary' }} /> Devices
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 140px' }, gap: 2, mb: 2.5 }}>
                <TextField
                  select
                  label="Device type"
                  size="small"
                  value={productId}
                  onChange={(e) => { setProductId(e.target.value); setLines([]); setScanMsg(null); setUnknown(null); setError('') }}
                  sx={INPUT_SX}
                >
                  <MenuItem value="" disabled>Select a device type</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.name} · {p.available} available
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Quantity"
                  type="number"
                  size="small"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  inputProps={{ min: 1, max: 500 }}
                  sx={INPUT_SX}
                />
              </Box>

              {productId ? (
                <IMEIScanner
                  onScan={handleScan}
                  busy={busy}
                  placeholder="Scan IMEI or box code, then press Enter"
                  buttonLabel="Add device"
                />
              ) : (
                <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                  Choose a device type first, then scan the IMEIs.
                </Alert>
              )}

              {scanMsg && (
                <Alert severity={TONE[scanMsg.tone]?.severity || 'info'} sx={{ mt: 2, borderRadius: 1.5 }}>
                  {scanMsg.text}
                </Alert>
              )}

              {unknown && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 1.5, border: '1px dashed #94A3B8', bgcolor: '#F8FAFC' }}>
                  <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, mb: 0.5 }}>
                    {unknown.imei} is not in inventory
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1.5 }}>
                    Register it as {product?.name || 'the selected device type'} and add it to this sale.
                  </Typography>
                  <Button
                    size="small"
                    variant="contained"
                    color="info"
                    onClick={registerUnknown}
                    disabled={registering}
                    sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
                  >
                    {registering ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : `Register as ${product?.name || 'device'}`}
                  </Button>
                </Box>
              )}

              <Box sx={{ mt: 2.5 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    {lines.length} of {target} scanned
                  </Typography>
                  {lines.length !== target && lines.length > 0 && (
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'warning.dark' }}>
                      {lines.length > target ? `Remove ${lines.length - target}` : `Scan ${target - lines.length} more`}
                    </Typography>
                  )}
                </Stack>

                {lines.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3.5, bgcolor: '#F8FAFC', borderRadius: 2, border: `2px dashed ${BORDER}` }}>
                    <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>
                      No devices scanned yet.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 1.5, overflow: 'hidden' }}>
                    {lines.map((line, index) => (
                      <Stack
                        key={line.imei}
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{ px: 2, py: 1.25, borderBottom: index === lines.length - 1 ? 'none' : `1px solid ${BORDER}` }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.86rem', fontWeight: 700 }}>{line.imei}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                            {line.productName}{line.box ? ` · Box ${line.box}` : ''}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => removeLine(line.imei)} aria-label="Remove device" sx={{ color: 'error.main' }}>
                          <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', mb: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddCircleOutlinedIcon sx={{ color: 'text.secondary' }} /> Other components
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
                Add cables, accessories or other stocked products to this sale.
              </Typography>
              
              {/* FIXED DROPDOWN */}
              <TextField 
                select 
                size="small" 
                label="Add a product" 
                value={extraSelector} 
                onChange={(event) => handleAddExtra(event.target.value)} 
                fullWidth 
                sx={INPUT_SX}
              >
                <MenuItem value="" disabled>Select a product</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p._id} value={p._id}>{p.name} · Rs. {p.price}</MenuItem>
                ))}
              </TextField>
              
              {extras.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    maxHeight: 200,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    pr: 0.5,
                    ...SCROLLBAR_SX
                  }}
                >
                  {extras.map((extra) => (
                    <Box key={extra.productId} sx={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 36px', gap: 1, alignItems: 'center', p: 1.5, bgcolor: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 1.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{extra.name}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Rate: Rs. {extra.price}</Typography>
                      </Box>
                      <TextField 
                        size="small" 
                        type="number" 
                        value={extra.quantity} 
                        onChange={(event) => updateExtraQuantity(extra.productId, event.target.value)} 
                        inputProps={{ min: 1, style: { textAlign: 'center' } }} 
                        sx={INPUT_SX} 
                      />
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>
                        Rs. {(Number(extra.quantity) * extra.price).toLocaleString()}
                      </Typography>
                      <IconButton size="small" onClick={() => removeExtra(extra.productId)} sx={{ color: 'error.main' }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Stack>

        <Card elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 2, position: { lg: 'sticky' }, top: { lg: 88 } }}>
          <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.02rem', mb: 2 }}>Submission summary</Typography>

            <Stack spacing={1.5} sx={{ mb: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>Customer</Typography>
                <Typography sx={{ fontSize: '0.86rem', fontWeight: 700, textAlign: 'right' }}>{customer?.name || '—'}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>Device type</Typography>
                <Typography sx={{ fontSize: '0.86rem', fontWeight: 700, textAlign: 'right' }}>{product?.name || '—'}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>Quantity</Typography>
                <Typography sx={{ fontSize: '0.86rem', fontWeight: 700 }}>{target}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>Scanned</Typography>
                <Typography sx={{ fontSize: '0.86rem', fontWeight: 700, color: lines.length === target ? '#0F8A5F' : 'text.primary' }}>
                  {lines.length}
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ borderColor: BORDER, mb: 2 }} />

            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
              Notes for the admin (optional)
            </Typography>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the admin should know about this sale"
              sx={INPUT_SX}
            />

            <Alert severity="info" sx={{ mt: 2, borderRadius: 1.5, fontSize: '0.78rem' }}>
              Prices and totals are applied by the admin. They are not shown on this page.
            </Alert>

            {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>{error}</Alert>}

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              variant="contained"
              color="info"
              fullWidth
              size="large"
              startIcon={submitting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <SendOutlinedIcon />}
              sx={{ mt: 3, borderRadius: 999, fontWeight: 700, py: 1.35 }}
            >
              {submitting ? 'Submitting…' : 'Submit sale for approval'}
            </Button>

            {!canSubmit && !submitting && (
              <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', textAlign: 'center', mt: 1.25 }}>
                {!customer
                  ? 'Select a customer to continue.'
                  : !productId
                    ? 'Select a device type.'
                    : lines.length !== target
                      ? `Scan exactly ${target} device${target === 1 ? '' : 's'}.`
                      : ''}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </StaffLayout>
  )
}