import { useState, useEffect, useCallback } from 'react'
import { Navigate, Link as RouterLink, useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress,
  Snackbar, Link,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeviceStatusChip, { STATUS_META } from '../admin/DeviceStatusChip.jsx'
import { ADMIN_SHELL } from '../../lib/stockShell.js'
import { getDevice, updateDeviceStatus, deleteDevice } from '../../services/api.js'
import { WARRANTY_LABELS } from '../../components/admin/format.js'

const MANUAL_STATUSES = ['available', 'faulty', 'lost', 'deactivated']

const ACTION_LABELS = {
  imported: 'Imported',
  added: 'Added manually',
  status_changed: 'Status changed',
  box_assigned: 'Added to box',
  box_removed: 'Taken out of box',
  sold: 'Sold',
  warranty_created: 'Warranty created',
  return_opened: 'Return case opened',
  return_resolved: 'Return case resolved',
  return_cancelled: 'Return case cancelled',
  replacement_issued: 'Replacement issued',
}

const fmtDateTime = (d) =>
  new Date(d).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function AdminDeviceDetail({ shell = ADMIN_SHELL }) {
  const { Layout, base, isLoggedIn, loginTo, canDelete, adminLinks } = shell
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [history, setHistory] = useState([])
  const [sale, setSale] = useState(null)
  const [chain, setChain] = useState([])
  const [holder, setHolder] = useState(null)
  const [openCase, setOpenCase] = useState(null)
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
      setSale(data.sale)
      setChain(data.chain || [])
      setHolder(data.holder || null)
      setOpenCase(data.openCase || null)
      setError('')
    } catch (err) {
      setError(err?.message || 'Could not load this device.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let alive = true
    getDevice(id)
      .then((data) => {
        if (!alive) return
        setDevice(data.device)
        setHistory(data.history)
        setSale(data.sale)
        setChain(data.chain || [])
        setHolder(data.holder || null)
        setOpenCase(data.openCase || null)
        setError('')
      })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load this device.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  if (!isLoggedIn()) return <Navigate to={loginTo} replace />

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

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${device.imei} permanently? This also removes its history. This cannot be undone.`)) return
    try {
      await deleteDevice(id)
      navigate(`${base}/devices`)
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not delete this device.' })
    }
  }

  const options = MANUAL_STATUSES.filter((s) => s !== device?.status)

  return (
    <Layout title="Device">
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Button
          component={RouterLink}
          to={`${base}/devices`}
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', color: 'text.secondary', mb: 2 }}
        >
          Back to devices
        </Button>
        {canDelete && device && device.status !== 'sold' && (
          <Button
            onClick={handleDelete}
            color="error"
            sx={{ textTransform: 'none', fontWeight: 700, mb: 2, float: 'right' }}
          >
            Delete device
          </Button>
        )}

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
              {device.box && (
                <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mt: 0.5 }}>
                  Box:{' '}
                  <Link
                    component={RouterLink}
                    to={`${base}/boxes/${device.box._id}`}
                    sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                  >
                    {device.box.code}
                  </Link>
                  {device.box.parent?.code ? ` · Carton ${device.box.parent.code}` : ''}
                </Typography>
              )}
              {sale && (
                <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mt: 0.5 }}>
                  Sold on{' '}
                  {adminLinks ? (
                    <Link
                      component={RouterLink}
                      to={`${base}/sales/${sale.saleId}`}
                      sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                    >
                      {sale.invoiceNumber}
                    </Link>
                  ) : (
                    <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {sale.invoiceNumber}
                    </Box>
                  )}
                  {` · ${sale.customerName}${sale.customerPhone ? ` (${sale.customerPhone})` : ''} · ${fmtDateTime(
                    sale.saleDate
                  )}`}
                  {sale.soldByName ? ` · by ${sale.soldByName}` : ''}
                </Typography>
              )}
              {sale?.warranty && (
                <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mt: 0.5 }}>
                  Warranty: {WARRANTY_LABELS[sale.warranty.state] || sale.warranty.state} · until{' '}
                  {new Date(sale.warranty.endDate).toLocaleDateString(undefined, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {sale.warranty.state === 'active' || sale.warranty.state === 'expiring_soon'
                    ? ` (${sale.warranty.daysRemaining} days left)`
                    : ''}
                </Typography>
              )}
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
                <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1.5}>
                  <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', flex: 1 }}>
                    A sold device can&apos;t be changed by hand. Open a case to record a return or warranty claim.
                  </Typography>
                  {openCase ? (
                    <Button component={RouterLink} to={`${base}/returns/${openCase._id}`} variant="outlined" color="info" sx={{ textTransform: 'none' }}>
                      View {openCase.caseNumber}
                    </Button>
                  ) : (
                    <Button component={RouterLink} to={`${base}/returns/new?imei=${encodeURIComponent(device.imei)}`} variant="contained" color="info" sx={{ textTransform: 'none', fontWeight: 700 }}>
                      Open return case
                    </Button>
                  )}
                </Stack>
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

            {chain.length > 0 && (
              <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Ownership chain</Typography>
                {holder && (
                  <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', mb: 2 }}>
                    Currently with{' '}
                    {adminLinks ? (
                      <Link component={RouterLink} to={`${base}/customers/${holder.id}`} sx={{ fontWeight: 700 }}>
                        {holder.name}
                      </Link>
                    ) : (
                      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{holder.name}</Box>
                    )}
                  </Typography>
                )}
                <Stack spacing={1.25}>
                  {chain.map((e, i) => (
                    <Typography key={i} sx={{ fontSize: '0.88rem' }}>
                      <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                        {new Date(e.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Box>
                      {e.type === 'sale' ? (
                        <>
                          Shezz Traders sold to{' '}
                          {adminLinks ? (
                            <Link component={RouterLink} to={`${base}/customers/${e.customerId}`} sx={{ fontWeight: 700 }}>{e.customerName}</Link>
                          ) : (
                            <Box component="span" sx={{ fontWeight: 700 }}>{e.customerName}</Box>
                          )}
                          {' · '}
                          {adminLinks ? (
                            <Link component={RouterLink} to={`${base}/sales/${e.saleId}`} sx={{ fontFamily: 'monospace' }}>{e.invoiceNumber}</Link>
                          ) : (
                            <Box component="span" sx={{ fontFamily: 'monospace' }}>{e.invoiceNumber}</Box>
                          )}
                        </>
                      ) : (
                        <>
                          {adminLinks ? (
                            <Link component={RouterLink} to={`${base}/customers/${e.fromId}`} sx={{ fontWeight: 700 }}>{e.fromName}</Link>
                          ) : (
                            <Box component="span" sx={{ fontWeight: 700 }}>{e.fromName}</Box>
                          )}
                          {' passed to '}
                          {adminLinks ? (
                            <Link component={RouterLink} to={`${base}/customers/${e.toId}`} sx={{ fontWeight: 700 }}>{e.toName}</Link>
                          ) : (
                            <Box component="span" sx={{ fontWeight: 700 }}>{e.toName}</Box>
                          )}
                          {e.note ? ` · ${e.note}` : ''}
                        </>
                      )}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

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
    </Layout>
  )
}