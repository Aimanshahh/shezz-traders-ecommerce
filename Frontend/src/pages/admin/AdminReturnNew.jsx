import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import IMEIScanner from './IMEIScanner.jsx'
import DeviceStatusChip from './DeviceStatusChip.jsx'
import { ADMIN_SHELL } from '../../lib/stockShell.js'
import { lookupReturnDevice, openReturnCase } from '../../services/api.js'
import { fmtDate } from '../../components/admin/format.js'

const card = { p: { xs: 2.5, md: 3 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }

export default function AdminReturnNew({ shell = ADMIN_SHELL }) {
  const { Layout, base, isLoggedIn, loginTo } = shell
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialImei = searchParams.get('imei') || ''
  const [result, setResult] = useState(null)
  const [type, setType] = useState('warranty_claim')
  const [reason, setReason] = useState('not_working')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleScan = useCallback(async (imei) => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      setResult(await lookupReturnDevice(imei))
    } catch (err) {
      setError(err?.message || 'Could not find the device.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialImei) return undefined
    let alive = true
    lookupReturnDevice(initialImei)
      .then((data) => { if (alive) { setResult(data); setError('') } })
      .catch((err) => { if (alive) setError(err?.message || 'Could not find the device.') })
    return () => { alive = false }
  }, [initialImei])

  if (!isLoggedIn()) return <Navigate to={loginTo} replace />

  const handleOpen = async () => {
    if (!result?.device?.imei) return
    setSaving(true)
    setError('')
    try {
      const created = await openReturnCase({ imei: result.device.imei, type, reason, notes })
      navigate(`${base}/returns/${created._id}`)
    } catch (err) {
      setError(err?.message || 'Could not open this case.')
    } finally {
      setSaving(false)
    }
  }

  const warrantyActive = ['active', 'expiring_soon'].includes(result?.warranty?.state)

  return (
    <Layout title="Open return case">
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Button component={RouterLink} to={`${base}/returns`} startIcon={<ArrowBackIcon />} sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}>Back to cases</Button>
        <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.8rem', mb: 0.5 }}>Open a return or warranty case</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.86rem', mb: 3 }}>Scan a sold device to load its original invoice, customer and warranty.</Typography>

        <Stack spacing={2.5}>
          <Box sx={card}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Device</Typography>
            <IMEIScanner onScan={handleScan} buttonLabel="Look up" placeholder="Scan or enter the device IMEI" />
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={26} /></Box>}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {result && (
            <Box sx={card}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
                <Box>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' }}>{result.device.imei}</Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{result.sale.item.productName || 'Device'} · Invoice {result.sale.invoiceNumber}</Typography>
                </Box>
                <DeviceStatusChip status={result.device.status} />
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2.5 }}>
                <Info label="Invoice customer" value={result.sale.customerSnapshot?.name} />
                <Info label="Current holder" value={result.device.holder?.name || result.sale.customerSnapshot?.name} />
                <Info label="Invoice" value={result.sale.invoiceNumber} />
                <Info label="Warranty" value={result.warranty ? `${result.warranty.state.replace('_', ' ')} · until ${fmtDate(result.warranty.endDate)}` : 'No warranty record'} />
              </Box>
              {result.openCase ? (
                <Alert severity="warning" action={<Button component={RouterLink} to={`${base}/returns/${result.openCase._id}`} size="small">Open {result.openCase.caseNumber}</Button>}>
                  This device already has an open case.
                </Alert>
              ) : result.device.status !== 'sold' ? (
                <Alert severity="warning">This device is not currently marked sold and cannot start a new return case.</Alert>
              ) : (
                <Stack spacing={2}>
                  {!warrantyActive && <Alert severity="info">The warranty has expired. You can still open this as a regular return.</Alert>}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField select label="Case type" value={type} onChange={(e) => setType(e.target.value)}>
                      <MenuItem value="warranty_claim">Warranty claim</MenuItem>
                      <MenuItem value="return">Return</MenuItem>
                    </TextField>
                    <TextField select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                      <MenuItem value="not_working">Not working</MenuItem>
                      <MenuItem value="defective">Defective from the start</MenuItem>
                      <MenuItem value="damaged">Damaged</MenuItem>
                      <MenuItem value="wrong_item">Wrong item</MenuItem>
                      <MenuItem value="changed_mind">Customer changed mind</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                  </Box>
                  <TextField label="Intake notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={3} />
                  {type === 'warranty_claim' && !warrantyActive && <Alert severity="error">A warranty claim requires an active warranty. Select Return to continue.</Alert>}
                  <Button onClick={handleOpen} disabled={saving || (type === 'warranty_claim' && !warrantyActive)} variant="contained" color="info" sx={{ alignSelf: 'flex-start', borderRadius: 1, fontWeight: 700, px: 3 }}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : 'Open case'}
                  </Button>
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      </Box>
    </Layout>
  )
}

function Info({ label, value }) {
  return <Box><Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography><Typography sx={{ fontSize: '0.84rem', mt: 0.4 }}>{value || '—'}</Typography></Box>
}
