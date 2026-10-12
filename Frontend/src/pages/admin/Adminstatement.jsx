import { useState, useEffect } from 'react'
import { Navigate, Link as RouterLink, useParams } from 'react-router-dom'
import { Box, Typography, Stack, Button, Alert, CircularProgress, Divider, TextField, FormControlLabel, Switch } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import { money, fmtDate } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getLedger, getCrmSettings } from '../../services/api.js'

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  .invoice-page { background: #fff !important; padding: 10mm !important; min-height: 0 !important; }
  .invoice-sheet { box-sizing: border-box !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; padding: 0 7mm !important; }
  .statement-banner { margin: 0 -7mm 7mm !important; }
  .ledger-table { min-width: 0 !important; table-layout: fixed !important; }
  .ledger-table thead { display: table-header-group; }
  .ledger-table tr { break-inside: avoid; }
  .ledger-table th, .ledger-table td { padding: 5pt 4pt !important; font-size: 8.5pt !important; overflow-wrap: anywhere; }
  @page { size: A4; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  tr { page-break-inside: avoid; }
}
`

const label = { fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#087F86', mb: 0.5 }
const th = { fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#087F86', pb: 1.25, borderBottom: '2px solid #B9CBCD' }

export default function AdminStatement() {
  const { id } = useParams()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showDevices, setShowDevices] = useState(false)
  const [data, setData] = useState(null)
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getLedger(id, { from, to })
      .then((result) => {
        if (!alive) return
        setData(result)
        setError('')
      })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load the statement.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id, from, to])

  useEffect(() => {
    getCrmSettings().then(setShop).catch(() => {})
  }, [])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const itemsOf = (saleId) => data?.invoices.find((i) => String(i.saleId) === String(saleId))?.items || []
  const rangeText = from || to ? `${from ? fmtDate(from) : 'Beginning'} – ${to ? fmtDate(to) : 'Today'}` : 'All activity'
  const due = data ? data.closing : 0

  return (
    <Box className="invoice-page" sx={{ bgcolor: '#F2F7F7', minHeight: '100vh', py: 3, px: { xs: 1, sm: 2 } }}>
      <style>{PRINT_CSS}</style>

      <Box className="no-print" sx={{ maxWidth: 850, mx: 'auto', mb: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Button component={RouterLink} to={`/admin/customers/${id}`} startIcon={<ArrowBackIcon />} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 600 }}>
            Back to customer
          </Button>
          <Button onClick={() => window.print()} variant="contained" startIcon={<PrintOutlinedIcon />} disabled={!data} sx={{ borderRadius: 999, fontWeight: 700, px: 2.5, boxShadow: 'none', bgcolor: '#073B43', '&:hover': { bgcolor: '#0A5059' } }}>
            Print statement
          </Button>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ p: 1, bgcolor: '#fff', border: '1px solid #D7E2E3', borderRadius: 1.5 }}>
          <Typography sx={{ px: 1, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748B' }}>Period</Typography>
          <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ bgcolor: '#fff', minWidth: 145, '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
          <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ bgcolor: '#fff', minWidth: 145, '& .MuiOutlinedInput-root': { borderRadius: 1 } }} />
          <FormControlLabel sx={{ ml: { sm: 'auto' }, mr: 0 }} control={<Switch checked={showDevices} onChange={(e) => setShowDevices(e.target.checked)} />} label={<Typography sx={{ fontSize: '0.78rem' }}>Show IMEIs</Typography>} />
          {(from || to) && <Button onClick={() => { setFrom(''); setTo('') }} sx={{ textTransform: 'none', borderRadius: 999 }}>Clear</Button>}
        </Stack>
      </Box>

      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={40} sx={{ color: '#0F172A' }} /></Box>
      ) : error ? (
        <Alert severity="error" sx={{ maxWidth: 850, mx: 'auto', borderRadius: 2, fontWeight: 600 }}>{error}</Alert>
      ) : (
        <Box className="invoice-sheet" sx={{ maxWidth: 850, mx: 'auto', bgcolor: '#fff', color: '#17333A', p: { xs: 3, sm: 5 }, borderRadius: 1, border: '1px solid #D7E2E3', boxShadow: '0 4px 20px rgba(15,23,42,0.05)', opacity: loading ? 0.6 : 1 }}>
          <Box className="statement-banner" sx={{ mx: { xs: -3, sm: -5 }, mt: { xs: -3, sm: -5 }, mb: 2.5, px: { xs: 2.5, sm: 4 }, py: 2.25, bgcolor: '#087F86', color: '#fff', borderBottom: '6px solid #20BAC1' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Box component="img" src="/images/logo.png" alt="" sx={{ height: 42, width: 42, objectFit: 'contain', bgcolor: '#fff', borderRadius: 1, p: 0.4 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.2rem' }, lineHeight: 1.2 }}>{shop?.shopName || 'Shezz Traders'}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', opacity: 0.9 }}>{[shop?.phone, shop?.email].filter(Boolean).join(' · ')}</Typography>
                </Box>
              </Stack>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.15 }}>STATEMENT</Typography>
                <Typography sx={{ fontSize: '0.72rem', mt: 0.5 }}>{rangeText}</Typography>
              </Box>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: '#E2E8F0' }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2, sm: 4 }, py: 2.5 }}>
            <Box>
              <Typography sx={label}>Account of</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', mt: 0.5 }}>{data.customer.name}</Typography>
              <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{data.customer.phone}</Typography>
              {(data.customer.address || data.customer.city) && (
                <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{[data.customer.address, data.customer.city].filter(Boolean).join(', ')}</Typography>
              )}
            </Box>
            <Box>
              <Typography sx={label}>Summary</Typography>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                <SumRow k="Opening balance" v={money(data.opening)} />
                <SumRow k="Billed" v={money(data.totalDebit)} />
                <SumRow k="Received" v={money(data.totalCredit)} />
                <SumRow k={due < 0 ? 'Closing credit' : 'Closing balance due'} v={money(Math.abs(data.closing))} strong />
              </Stack>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#E2E8F0' }} />

          <Box sx={{ py: 2.5, overflowX: 'auto' }}>
            <Box className="ledger-table" component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr>
                  {['Date', 'Ref', 'Details', 'Billed', 'Received', 'Balance'].map((h, i) => (
                    <Box key={h} component="th" sx={{ ...th, textAlign: i >= 3 ? 'right' : 'left', pr: i >= 3 ? 0 : 1.5 }}>{h}</Box>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#F8FAFC' }}>
                  <Box component="td" colSpan={5} sx={{ py: 1.5, px: 1, fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Opening balance</Box>
                  <Box component="td" sx={{ py: 1.5, fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>{money(data.opening)}</Box>
                </tr>
                {data.rows.length === 0 && (
                  <tr><Box component="td" colSpan={6} sx={{ py: 4, textAlign: 'center', fontSize: '0.85rem', color: '#64748B' }}>No activity in this period.</Box></tr>
                )}
                {data.rows.map((r, i) => {
                  const voided = r.type === 'voided'
                  return (
                    <Box component="tr" key={i} sx={{ borderBottom: '1px solid #F1F5F9' }}>
                      <Box component="td" sx={{ py: 1.75, pr: 1.5, fontSize: '0.82rem', color: '#475569', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</Box>
                      <Box component="td" sx={{ py: 1.75, pr: 1.5, fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600, verticalAlign: 'top' }}>{r.ref}</Box>
                      <Box component="td" sx={{ py: 1.75, pr: 1.5, fontSize: '0.82rem', verticalAlign: 'top', color: voided ? '#94A3B8' : '#0F172A', textDecoration: voided ? 'line-through' : 'none' }}>
                        {r.description}
                        {showDevices && r.type === 'invoice' && itemsOf(r.saleId).length > 0 && (
                          <Box sx={{ mt: 0.75, fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748B', lineHeight: 1.7, textDecoration: 'none' }}>
                            {itemsOf(r.saleId).map((it) => `${it.imei}${it.boxCode ? ` (${it.boxCode})` : ''}`).join('  ·  ')}
                          </Box>
                        )}
                      </Box>
                      <Box component="td" sx={{ py: 1.75, fontSize: '0.85rem', textAlign: 'right', verticalAlign: 'top' }}>{r.debit ? money(r.debit) : ''}</Box>
                      <Box component="td" sx={{ py: 1.75, fontSize: '0.85rem', textAlign: 'right', verticalAlign: 'top', color: '#0F8A5F' }}>{r.credit ? money(r.credit) : ''}</Box>
                      <Box component="td" sx={{ py: 1.75, fontSize: '0.85rem', textAlign: 'right', verticalAlign: 'top', fontWeight: 600 }}>{money(r.balance)}</Box>
                    </Box>
                  )
                })}
                <tr style={{ background: '#F8FAFC' }}>
                  <Box component="td" colSpan={3} sx={{ py: 1.75, px: 1, fontSize: '0.85rem', fontWeight: 700 }}>Closing balance</Box>
                  <Box component="td" sx={{ py: 1.75, fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>{money(data.totalDebit)}</Box>
                  <Box component="td" sx={{ py: 1.75, fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>{money(data.totalCredit)}</Box>
                  <Box component="td" sx={{ py: 1.75, fontSize: '0.95rem', fontWeight: 800, textAlign: 'right' }}>{money(data.closing)}</Box>
                </tr>
              </tbody>
            </Box>
          </Box>

          <Typography sx={{ fontSize: '0.78rem', color: '#64748B' }}>
            Billed = invoices raised. Received = money paid at the time of sale and later payments. A positive balance is the amount still due to {shop?.shopName || 'Shezz Traders'}.
          </Typography>

          {shop?.invoiceFooter && <Typography sx={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748B', mt: 2.5 }}>{shop.invoiceFooter}</Typography>}
        </Box>
      )}
    </Box>
  )
}

function SumRow({ k, v, strong }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={4}>
      <Typography sx={{ fontSize: strong ? '0.95rem' : '0.85rem', fontWeight: strong ? 700 : 500, color: strong ? '#0F172A' : '#64748B' }}>{k}</Typography>
      <Typography sx={{ fontSize: strong ? '1.05rem' : '0.88rem', fontWeight: strong ? 800 : 600 }}>{v}</Typography>
    </Stack>
  )
}