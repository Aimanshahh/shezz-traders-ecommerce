import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, CircularProgress, Divider, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { cancelReturnCase, getReturnCase, resolveReturnCase } from '../../services/api.js'
import { fmtDate, money } from '../../components/admin/format.js'

const card = { p: { xs: 2.5, md: 3 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }

export default function AdminReturnDetail() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resolution, setResolution] = useState('')
  const [deviceOutcome, setDeviceOutcome] = useState('faulty')
  const [replacementImei, setReplacementImei] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundMethod, setRefundMethod] = useState('cash')
  const [resolutionNote, setResolutionNote] = useState('')

  useEffect(() => {
    let alive = true
    getReturnCase(id)
      .then((result) => {
        if (!alive) return
        setItem(result)
        setCreditAmount(String(result.itemValue || ''))
        setRefundAmount(String(Math.min(result.itemValue || 0, result.refundableLimit || 0)))
        setError('')
      })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load this case.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const doResolve = async () => {
    if (!resolution) return setError('Choose how this case was resolved.')
    if (resolution === 'replacement' && !replacementImei.trim()) return setError('Enter the replacement device IMEI.')
    setSaving(true)
    setError('')
    try {
      await resolveReturnCase(id, {
        resolution,
        deviceOutcome,
        replacementImei: replacementImei.trim(),
        creditAmount: resolution === 'refund' ? Number(creditAmount) : undefined,
        refundAmount: resolution === 'refund' ? Number(refundAmount) : undefined,
        refundMethod,
        resolutionNote,
      })
      const updated = await getReturnCase(id)
      setItem(updated)
    } catch (err) {
      setError(err?.message || 'Could not resolve this case.')
    } finally {
      setSaving(false)
    }
  }

  const doCancel = async () => {
    if (!window.confirm(`Cancel ${item.caseNumber} and return the device to the customer?`)) return
    setSaving(true)
    setError('')
    try {
      await cancelReturnCase(id)
      const updated = await getReturnCase(id)
      setItem(updated)
    } catch (err) {
      setError(err?.message || 'Could not cancel this case.')
    } finally {
      setSaving(false)
    }
  }

  const warrantyText = item?.warranty?.status
    ? `${item.warranty.status.replace('_', ' ')} · ${fmtDate(item.warranty.endDate)}`
    : 'No warranty record'

  return (
    <AdminLayout title={item?.caseNumber || 'Return case'}>
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Button component={RouterLink} to="/admin/returns" startIcon={<ArrowBackIcon />} sx={{ mb: 2, textTransform: 'none', color: 'text.secondary' }}>Back to cases</Button>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : error && !item ? (
          <Alert severity="error">{error}</Alert>
        ) : item && (
          <Stack spacing={2.5}>
            <Box sx={card}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.85rem', lineHeight: 1.1 }}>{item.caseNumber}</Typography>
                  <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.86rem' }}>{item.type === 'warranty_claim' ? 'Warranty claim' : 'Return'} · {item.reason.replaceAll('_', ' ')} · opened {fmtDate(item.openedAt)}</Typography>
                </Box>
                <Box sx={{ alignSelf: { sm: 'center' }, px: 1.25, py: 0.6, borderRadius: 1, bgcolor: item.status === 'open' ? 'warning.100' : 'action.hover', color: item.status === 'open' ? 'warning.dark' : 'text.secondary', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' }}>{item.status}</Box>
              </Stack>
              <Divider sx={{ my: 2.5 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                <Info label="Device" value={item.imei} mono />
                <Info label="Product" value={item.productName} />
                <Info label="Invoice" value={item.invoiceNumber} />
                <Info label="Item value" value={money(item.itemValue)} />
                <Info label="Invoice customer" value={item.customer?.name} />
                <Info label="Device holder" value={item.holderName} />
                <Info label="Warranty" value={warrantyText} />
                <Info label="Opened by" value={item.createdByName} />
              </Box>
              {item.notes && <Typography sx={{ mt: 2, fontSize: '0.86rem' }}>Intake notes: {item.notes}</Typography>}
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {item.status === 'open' ? (
              <Box sx={card}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 2 }}>Resolve case</Typography>
                <Stack spacing={2}>
                  <TextField select label="Resolution" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    <MenuItem value="replacement">Replace with another device</MenuItem>
                    <MenuItem value="refund">Refund or issue invoice credit</MenuItem>
                    <MenuItem value="repaired">Repaired and returned to customer</MenuItem>
                    <MenuItem value="rejected">Claim rejected; device returned</MenuItem>
                  </TextField>

                  {resolution === 'replacement' && <TextField label="Replacement device IMEI" value={replacementImei} onChange={(e) => setReplacementImei(e.target.value)} helperText="Must be an available device in inventory. Existing warranty end date carries over." inputProps={{ style: { fontFamily: 'monospace' } }} />}

                  {resolution === 'refund' && (
                    <>
                      <Alert severity="info">Return credit is capped at the remaining invoice and this device’s discounted line value ({money(item.itemValue)}). Cash refund is capped at the amount collected for the invoice ({money(item.refundableLimit)}); any remaining credit stays on the customer account.</Alert>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <TextField type="number" label="Invoice credit" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} inputProps={{ min: 0, max: item.itemValue, step: '0.01' }} />
                        <TextField type="number" label="Cash refund" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} inputProps={{ min: 0, max: item.refundableLimit, step: '0.01' }} />
                        <TextField select label="Refund method" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                          <MenuItem value="cash">Cash</MenuItem><MenuItem value="bank_transfer">Bank transfer</MenuItem><MenuItem value="jazzcash">JazzCash</MenuItem><MenuItem value="easypaisa">EasyPaisa</MenuItem><MenuItem value="cheque">Cheque</MenuItem><MenuItem value="other">Other</MenuItem>
                        </TextField>
                        <TextField select label="Returned device condition" value={deviceOutcome} onChange={(e) => setDeviceOutcome(e.target.value)}>
                          <MenuItem value="available">Back to stock</MenuItem><MenuItem value="faulty">Faulty</MenuItem><MenuItem value="deactivated">Deactivate</MenuItem>
                        </TextField>
                      </Box>
                    </>
                  )}

                  {resolution === 'replacement' && <TextField select label="Returned device condition" value={deviceOutcome} onChange={(e) => setDeviceOutcome(e.target.value)}><MenuItem value="faulty">Faulty</MenuItem><MenuItem value="available">Back to stock</MenuItem><MenuItem value="deactivated">Deactivate</MenuItem></TextField>}
                  <TextField label="Resolution note" value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} multiline minRows={2} />
                  <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Button onClick={doCancel} disabled={saving} color="error" sx={{ textTransform: 'none' }}>Cancel case</Button>
                    <Button onClick={doResolve} disabled={saving || !resolution} variant="contained" color="info" sx={{ borderRadius: 1, fontWeight: 700, px: 3 }}>{saving ? <CircularProgress size={18} color="inherit" /> : 'Save resolution'}</Button>
                  </Stack>
                </Stack>
              </Box>
            ) : (
              <Box sx={card}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Case {item.status}</Typography>
                {item.resolution && <Typography sx={{ fontSize: '0.88rem', textTransform: 'capitalize' }}>Resolution: {item.resolution.replaceAll('_', ' ')} · settled {fmtDate(item.resolvedAt)}</Typography>}
                {item.creditAmount > 0 && <Typography sx={{ fontSize: '0.88rem', mt: 0.5 }}>Invoice credit: {money(item.creditAmount)} · cash refund: {money(item.refundAmount)}</Typography>}
                {item.replacementDevice && <Typography sx={{ fontSize: '0.88rem', mt: 0.5 }}>Replacement IMEI: {item.replacementDevice.imei || item.replacementDevice}</Typography>}
                {item.resolutionNote && <Typography sx={{ fontSize: '0.86rem', mt: 1, color: 'text.secondary' }}>{item.resolutionNote}</Typography>}
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </AdminLayout>
  )
}

function Info({ label, value, mono }) {
  return <Box><Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography><Typography sx={{ fontSize: '0.84rem', mt: 0.4, fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</Typography></Box>
}
