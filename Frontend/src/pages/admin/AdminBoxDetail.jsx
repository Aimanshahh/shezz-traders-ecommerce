import { useState, useEffect, useCallback } from 'react'
import { Navigate, Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress,
  Snackbar, Link, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import AdminLayout from './AdminLayout.jsx'
import IMEIScanner from '../admin/IMEIScanner.jsx'
import DeviceStatusChip from '../admin/DeviceStatusChip.jsx'
import BoxStateChip from '../admin/BoxStateChip.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import {
  getBox,
  addDevicesToBox,
  removeDeviceFromBox,
  addBoxesToCarton,
  updateBox,
  deleteBox,
  getProducts,
} from '../../services/api.js'

const TONE_COLOR = { success: '#0F8A5F', info: '#475569', error: '#C81E1E' }

function describeDevice(r, imei) {
  if (r.created.length) return { tone: 'success', text: `New device added: ${imei}` }
  if (r.added.length) return { tone: 'success', text: `Added to box: ${imei}` }
  if (r.alreadyInBox.length) return { tone: 'info', text: `Already in this box: ${imei}` }
  if (r.inOtherBox.length) return { tone: 'error', text: `${imei} is already in box ${r.inOtherBox[0].box}` }
  if (r.notAvailable.length) return { tone: 'error', text: `${imei} is ${r.notAvailable[0].status}, so it can't be boxed` }
  if (r.invalid.length) return { tone: 'error', text: `${r.invalid[0].value || imei}: ${r.invalid[0].reason}` }
  if (r.notFound?.length) return { tone: 'error', text: `${imei} is not in inventory` }
  return { tone: 'info', text: imei }
}

function describeBox(r, code) {
  if (r.created.length) return { tone: 'success', text: `New box created and added: ${code}` }
  if (r.added.length) return { tone: 'success', text: `Added to carton: ${code}` }
  if (r.alreadyInCarton.length) return { tone: 'info', text: `Already in this carton: ${code}` }
  if (r.inOtherCarton.length) return { tone: 'error', text: `${code} is already in carton ${r.inOtherCarton[0].carton}` }
  if (r.notABox.length) return { tone: 'error', text: `${code} is a carton, not a box` }
  if (r.invalid.length) return { tone: 'error', text: `${r.invalid[0].value || code}: ${r.invalid[0].reason}` }
  return { tone: 'info', text: code }
}

export default function AdminBoxDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [box, setBox] = useState(null)
  const [devices, setDevices] = useState([])
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [feed, setFeed] = useState([])
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getBox(id)
      setBox(data.box)
      setDevices(data.devices)
      setChildren(data.children)
      setError('')
    } catch (err) {
      setError(err?.message || 'Could not load this box.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    setFeed([])
    load()
  }, [load])

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => {})
  }, [])

  const pushFeed = (entry) => setFeed((f) => [entry, ...f].slice(0, 8))

  // No "busy" lock on purpose: a fast scanner can send scan after scan.
  const handleScanDevice = async (code) => {
    try {
      const data = await addDevicesToBox(id, { imeis: [code], productId: productId || undefined })
      pushFeed(describeDevice(data.results, code))
      if (data.overCapacity) {
        setToast({ severity: 'warning', text: `This box now has ${data.total} devices, expected ${data.expectedCount}.` })
      }
      load()
    } catch (err) {
      pushFeed({ tone: 'error', text: `${code}: ${err?.message || 'failed'}` })
    }
  }

  const handleScanBox = async (code) => {
    try {
      const data = await addBoxesToCarton(id, [code])
      pushFeed(describeBox(data.results, code))
      load()
    } catch (err) {
      pushFeed({ tone: 'error', text: `${code}: ${err?.message || 'failed'}` })
    }
  }

  const handleRemoveDevice = async (d) => {
    try {
      await removeDeviceFromBox(id, d._id)
      setToast({ severity: 'success', text: `${d.imei} taken out of the box.` })
      load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not remove.' })
    }
  }

  const handleDetachBox = async (child) => {
    try {
      await updateBox(child._id, { parentId: null })
      setToast({ severity: 'success', text: `${child.code} taken out of the carton.` })
      load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not remove.' })
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteBox(id)
      navigate('/admin/boxes', { replace: true })
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not delete.' })
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const isCarton = box?.type === 'carton'
  const s = box?.summary

  return (
    <AdminLayout title={box ? `${isCarton ? 'Carton' : 'Box'} ${box.code}` : 'Box'}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Button
          component={RouterLink}
          to="/admin/boxes"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', color: 'text.secondary', mb: 2 }}
        >
          Back to boxes
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
            {/* Header */}
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700 }}>
                  {box.code}
                </Typography>
                <BoxStateChip state={box.state} />
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Only empty boxes can be deleted">
                  <span>
                    <Button
                      onClick={() => setConfirmDelete(true)}
                      disabled={s.total > 0 || s.childBoxes > 0}
                      startIcon={<DeleteOutlineIcon />}
                      color="error"
                      sx={{ textTransform: 'none' }}
                    >
                      Delete
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
              <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary' }}>
                {isCarton ? 'Carton' : 'Box'}
                {box.product?.name ? ` · ${box.product.name}` : ''}
                {box.parent ? (
                  <>
                    {' · in carton '}
                    <Link component={RouterLink} to={`/admin/boxes/${box.parent._id}`}>
                      {box.parent.code}
                    </Link>
                  </>
                ) : (
                  ''
                )}
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 1.5,
                  mt: 2.5,
                }}
              >
                <Tile label={box.expectedCount != null ? `Devices (expected ${box.expectedCount})` : 'Devices'} value={s.total} warn={box.mismatch} />
                <Tile label="Available" value={s.available} color="#0F8A5F" />
                <Tile label="Sold" value={s.sold} color="#00717A" />
                {isCarton ? <Tile label="Boxes inside" value={s.childBoxes} /> : <Tile label="Other status" value={s.other} />}
              </Box>
              {box.mismatch && (
                <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                  This {isCarton ? 'carton' : 'box'} has {s.total} devices but {box.expectedCount} were expected.
                </Alert>
              )}
            </Box>

            {/* Scan in */}
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                {isCarton ? 'Scan boxes into this carton' : 'Scan devices into this box'}
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
                {isCarton
                  ? 'Scan each box barcode. Boxes that do not exist yet are created.'
                  : 'Scan each IMEI. Devices not in inventory yet are added as Available.'}
              </Typography>

              {!isCarton && !box.product && (
                <TextField
                  select
                  size="small"
                  label="Product for new devices"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {products.map((p) => (
                    <MenuItem key={p._id || p.id} value={p._id || p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <IMEIScanner
                onScan={isCarton ? handleScanBox : handleScanDevice}
                placeholder={isCarton ? 'Scan or type a box code, then press Enter' : 'Scan or type IMEI, then press Enter'}
                buttonLabel="Add"
              />

              {feed.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {feed.map((f, i) => (
                    <Stack key={`${f.text}-${i}`} direction="row" spacing={1} alignItems="center" sx={{ py: 0.25 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TONE_COLOR[f.tone], flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.82rem', fontFamily: 'monospace', opacity: i === 0 ? 1 : 0.7 }}>
                        {f.text}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              )}
            </Box>

            {/* Contents */}
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>
                {isCarton ? `Boxes in this carton (${children.length})` : `Devices in this box (${devices.length})`}
              </Typography>

              {isCarton ? (
                children.length === 0 ? (
                  <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>No boxes yet.</Typography>
                ) : (
                  children.map((c) => (
                    <Stack
                      key={c._id}
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{ py: 1.1, borderBottom: '1px solid', borderColor: 'divider' }}
                    >
                      <Link
                        component={RouterLink}
                        to={`/admin/boxes/${c._id}`}
                        sx={{ fontFamily: 'monospace', fontWeight: 700, minWidth: 110 }}
                      >
                        {c.code}
                      </Link>
                      <Typography sx={{ fontSize: '0.82rem', color: c.mismatch ? 'warning.main' : 'text.secondary', flex: 1 }}>
                        {c.summary.total}
                        {c.expectedCount != null ? ` / ${c.expectedCount}` : ''} devices · {c.summary.available} available
                        {c.summary.sold ? ` · ${c.summary.sold} sold` : ''}
                      </Typography>
                      <BoxStateChip state={c.state} />
                      <Tooltip title="Take out of carton">
                        <IconButton size="small" onClick={() => handleDetachBox(c)}>
                          <LinkOffIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))
                )
              ) : devices.length === 0 ? (
                <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>No devices yet.</Typography>
              ) : (
                devices.map((d) => (
                  <Stack
                    key={d._id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ py: 1.1, borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    <Link
                      component={RouterLink}
                      to={`/admin/devices/${d._id}`}
                      sx={{ fontFamily: 'monospace', fontWeight: 600, flex: 1 }}
                    >
                      {d.imei}
                    </Link>
                    <DeviceStatusChip status={d.status} />
                    <Tooltip title={d.status === 'available' ? 'Take out of box' : 'Only available devices can be taken out'}>
                      <span>
                        <IconButton size="small" disabled={d.status !== 'available'} onClick={() => handleRemoveDevice(d)}>
                          <LinkOffIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                ))
              )}
            </Box>
          </Stack>
        )}
      </Box>

      <Dialog open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete {box?.code}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.9rem' }}>This empty {isCarton ? 'carton' : 'box'} will be removed.</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting} sx={{ textTransform: 'none', color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} disabled={deleting} variant="contained" color="error" sx={{ textTransform: 'none', borderRadius: 999, fontWeight: 700, px: 3 }}>
            {deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity={toast?.severity || 'success'} variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </AdminLayout>
  )
}

function Tile({ label, value, color, warn }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 800,
          fontSize: '1.7rem',
          lineHeight: 1.1,
          color: warn ? 'warning.main' : color || 'text.primary',
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  )
}