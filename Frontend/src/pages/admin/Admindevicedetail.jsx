import { useState, useEffect, useCallback } from 'react'
import { Navigate, Link as RouterLink, useParams } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress,
  Snackbar,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AdminLayout from './AdminLayout.jsx'
import DeviceStatusChip, { STATUS_META } from '../admin/DeviceStatusChip.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getDevice, updateDeviceStatus } from '../../services/api.js'

const MANUAL_STATUSES = ['available', 'faulty', 'lost', 'deactivated']

const ACTION_LABELS = {
  imported: 'Imported',
  added: 'Added manually',
  status_changed: 'Status changed',
}

const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function AdminDeviceDetail() {
  const { id } = useParams()
  const [device, setDevice] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDevice(id)
      setDevice(data.device)
      setHistory(data.history)
      setError('')
    } catch (err) {
      setError(err?.message || 'Could not load this device.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const handleStatus = async () => {
    if (!newStatus) return
    setSaving(true)
    try {
      await updateDeviceStatus(id, { status: newStatus, note })
      setToast({ severity: 'success', text: 'Status updated.' })
      setNewStatus('')
      setNote('')
      load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not update status.' })
    } finally {
      setSaving(false)
    }
  }

  const options = MANUAL_STATUSES.filter((s) => s !== device?.status)

  return (
    <AdminLayout title="Device">
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Button
          component={RouterLink}
          to="/admin/devices"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', color: 'text.secondary', mb: 2 }}
        >
          Back to devices
        </Button>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: 'info.main' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Typography
                  sx={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 700 }}
                >
                  {device.imei}
                </Typography>
                <DeviceStatusChip status={device.status} />
              </Stack>
              <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary' }}>
                {device.product?.name || 'No product'} · added {fmtDateTime(device.createdAt)}
              </Typography>
              {device.notes && (
                <Typography sx={{ fontSize: '0.85rem', mt: 1.5 }}>{device.notes}</Typography>
              )}
            </Box>

            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Change status</Typography>
              {device.status === 'sold' ? (
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                  A sold device can't be changed here. Returns and replacements are handled through
                  warranty claims.
                </Typography>
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    size="small"
                    label="New status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    sx={{ minWidth: 180 }}
                  >
                    {options.map((s) => (
                      <MenuItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    size="small"
                    label="Note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    fullWidth
                  />
                  <Button
                    onClick={handleStatus}
                    disabled={!newStatus || saving}
                    variant="contained"
                    color="info"
                    sx={{ borderRadius: 999, fontWeight: 700, px: 3, whiteSpace: 'nowrap' }}
                  >
                    {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Update'}
                  </Button>
                </Stack>
              )}
            </Box>

            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 2 }}>History</Typography>
              {history.length === 0 ? (
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                  No history yet.
                </Typography>
              ) : (
                <Stack spacing={0}>
                  {history.map((h, i) => (
                    <Box
                      key={h._id}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        pb: i === history.length - 1 ? 0 : 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: 'info.main',
                            mt: 0.6,
                          }}
                        />
                        {i !== history.length - 1 && (
                          <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', mt: 0.5 }} />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>
                          {ACTION_LABELS[h.action] || h.action}
                          {h.fromStatus && h.toStatus
                            ? `: ${STATUS_META[h.fromStatus]?.label || h.fromStatus} → ${
                                STATUS_META[h.toStatus]?.label || h.toStatus
                              }`
                            : ''}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {fmtDateTime(h.createdAt)}
                          {h.performedByName ? ` · ${h.performedByName}` : ''}
                        </Typography>
                        {h.note && (
                          <Typography sx={{ fontSize: '0.8rem', mt: 0.25 }}>{h.note}</Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </Box>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity || 'success'}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {toast?.text}
        </Alert>
      </Snackbar>
    </AdminLayout>
  )
}