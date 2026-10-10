import { useState, useEffect, useRef } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Box, Typography, Stack, Button, TextField, Alert, CircularProgress, IconButton } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import AdminLayout from './AdminLayout.jsx'
import IMEIScanner from '../admin/IMEIScanner.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { lookupCustomer, getCustomer, resolveTransfer, createTransfer } from '../../services/api.js'

const TONE_COLOR = { success: '#0F8A5F', info: '#475569', error: '#C81E1E' }
const card = { p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }
const today = () => new Date().toISOString().slice(0, 10)

export default function AdminHandover() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [dealerPhone, setDealerPhone] = useState('')
  const [dealer, setDealer] = useState(null)
  const [dealerMsg, setDealerMsg] = useState('')

  const [receiver, setReceiver] = useState({ name: '', phone: '', city: '', address: '' })
  const [receiverId, setReceiverId] = useState('')
  const [receiverMatch, setReceiverMatch] = useState(false)

  const [lines, setLines] = useState([])
  const linesRef = useRef([])
  const [feed, setFeed] = useState([])
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    linesRef.current = lines
  }, [lines])

  useEffect(() => {
    const from = params.get('from')
    if (!from) return
    getCustomer(from)
      .then((d) => setDealer(d.customer))
      .catch(() => setDealerMsg('Could not load that dealer.'))
  }, [params])

  const pushFeed = (entry) => setFeed((f) => [entry, ...f].slice(0, 8))

  const findDealer = async () => {
    setDealerMsg('')
    try {
      const r = await lookupCustomer(dealerPhone.trim())
      if (r.customer) setDealer(r.customer)
      else setDealerMsg('No customer has this phone number. Dealers must have bought from you first.')
    } catch (err) {
      setDealerMsg(err?.message || 'Lookup failed.')
    }
  }

  const changeDealer = () => {
    setDealer(null)
    setLines([])
    setFeed([])
    setDealerPhone('')
  }

  const handleScan = async (code) => {
    if (!dealer) return
    try {
      const r = await resolveTransfer(code, dealer._id)
      if (r.kind === 'invalid' || r.kind === 'not_found') {
        pushFeed({ tone: 'error', text: `${code}: ${r.message}` })
        return
      }
      const have = new Set(linesRef.current.map((l) => l.imei))
      const fresh = r.items.filter((i) => !have.has(i.imei))
      const ok = fresh.filter((i) => i.eligible)
      const bad = fresh.filter((i) => !i.eligible)
      if (r.items.length === 0) return pushFeed({ tone: 'info', text: `${r.label} has no devices` })
      if (fresh.length === 0) return pushFeed({ tone: 'info', text: `${r.label}: already added` })
      if (ok.length) {
        setLines((prev) => [...prev, ...ok.map((i) => ({ imei: i.imei, productName: i.product?.name || '—', box: i.box || '' }))])
        pushFeed({ tone: 'success', text: `Added ${ok.length} device${ok.length === 1 ? '' : 's'}${r.kind === 'device' ? '' : ` from ${r.label}`}` })
      }
      if (bad.length) {
        pushFeed({
          tone: 'error',
          text: r.kind === 'device'
            ? `${bad[0].imei}: ${bad[0].reason}`
            : `${r.label}: skipped ${bad.length} — ${bad[0].imei} ${bad[0].reason}${bad.length > 1 ? ' …' : ''}`,
        })
      }
    } catch (err) {
      pushFeed({ tone: 'error', text: `${code}: ${err?.message || 'failed'}` })
    }
  }

  const handleReceiverPhone = async () => {
    const phone = receiver.phone.trim()
    if (phone.length < 7) return
    try {
      const r = await lookupCustomer(phone)
      if (r.customer) {
        setReceiverId(r.customer._id)
        setReceiverMatch(true)
        setReceiver((c) => ({ ...c, name: r.customer.name, city: r.customer.city || c.city, address: r.customer.address || c.address }))
      } else {
        setReceiverId('')
        setReceiverMatch(false)
      }
    } catch {
      /* convenience only */
    }
  }

  const canSubmit = dealer && lines.length > 0 && receiver.phone.trim().length >= 7 && (receiverId || receiver.name.trim())

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const r = await createTransfer({
        fromCustomerId: dealer._id,
        toCustomerId: receiverId || undefined,
        to: receiverId ? undefined : receiver,
        imeis: lines.map((l) => l.imei),
        date: date || undefined,
        note,
      })
      navigate(`/admin/customers/${r.receiverId}`)
    } catch (err) {
      setError(err?.message || 'Could not record the handover.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  return (
    <AdminLayout title="Dealer handover">
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.1, mb: 0.5 }}>
          Dealer handover
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
          Record devices a dealer you sold to has passed on to someone else. No prices, just who now holds them.
          The original sale and the dealer's ledger are not changed.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 3, alignItems: 'start' }}>
          <Stack spacing={3}>
            <Box sx={card}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>1. Who is handing them over?</Typography>
              {dealer ? (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{dealer.name}</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{dealer.phone}</Typography>
                  </Box>
                  <Button onClick={changeDealer} sx={{ textTransform: 'none' }}>Change</Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1.5}>
                  <TextField size="small" label="Dealer's phone number" value={dealerPhone} onChange={(e) => setDealerPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && findDealer()} fullWidth />
                  <Button onClick={findDealer} variant="contained" color="info" disabled={dealerPhone.trim().length < 7} sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>Find</Button>
                </Stack>
              )}
              {dealerMsg && <Alert severity="warning" sx={{ mt: 2 }}>{dealerMsg}</Alert>}
            </Box>

            <Box sx={{ ...card, opacity: dealer ? 1 : 0.5, pointerEvents: dealer ? 'auto' : 'none' }}>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>2. Scan the devices</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
                Scan an IMEI, a box or a carton. Only devices this dealer holds are accepted.
              </Typography>
              <IMEIScanner onScan={handleScan} buttonLabel="Add" placeholder="Scan IMEI, box or carton, then press Enter" autoFocus={!!dealer} />
              {feed.length > 0 && (
                <Stack spacing={0.5} sx={{ mt: 2 }}>
                  {feed.map((f, i) => (
                    <Typography key={i} sx={{ fontSize: '0.8rem', color: TONE_COLOR[f.tone], opacity: i === 0 ? 1 : 0.7 }}>{f.text}</Typography>
                  ))}
                </Stack>
              )}
              {lines.length > 0 && (
                <Box sx={{ mt: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, maxHeight: 360, overflowY: 'auto' }}>
                  {lines.map((l, i) => (
                    <Stack key={l.imei} direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1, borderBottom: i === lines.length - 1 ? 'none' : '1px solid', borderColor: 'divider' }}>
                      <Box>
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.86rem' }}>{l.imei}</Typography>
                        <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>{l.productName}{l.box ? ` · Box ${l.box}` : ''}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setLines((p) => p.filter((x) => x.imei !== l.imei))}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Stack>
                  ))}
                </Box>
              )}
            </Box>
          </Stack>

          <Stack spacing={3}>
            <Box sx={card}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>3. Who receives them?</Typography>
              <Stack spacing={2}>
                <TextField size="small" label="Phone" value={receiver.phone} onChange={(e) => { setReceiver({ ...receiver, phone: e.target.value }); setReceiverId(''); setReceiverMatch(false) }} onBlur={handleReceiverPhone} />
                <TextField size="small" label="Name" value={receiver.name} onChange={(e) => setReceiver({ ...receiver, name: e.target.value })} disabled={receiverMatch} helperText={receiverMatch ? 'Existing customer found' : undefined} />
                <TextField size="small" label="City" value={receiver.city} onChange={(e) => setReceiver({ ...receiver, city: e.target.value })} />
                <TextField size="small" label="Address" value={receiver.address} onChange={(e) => setReceiver({ ...receiver, address: e.target.value })} />
                <TextField size="small" type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField size="small" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              </Stack>
            </Box>

            <Box sx={card}>
              <Typography sx={{ fontSize: '0.9rem', mb: 1.5 }}>
                {lines.length} device{lines.length === 1 ? '' : 's'}{dealer ? ` from ${dealer.name}` : ''}
              </Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Button onClick={submit} disabled={!canSubmit || submitting} variant="contained" color="info" fullWidth sx={{ borderRadius: 999, fontWeight: 700, py: 1.25 }}>
                {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Record handover'}
              </Button>
              <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 1.5 }}>
                All devices move together or none do. Warranty dates stay as they were from the original sale.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </AdminLayout>
  )
}