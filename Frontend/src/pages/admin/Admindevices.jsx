import { useState, useEffect, useCallback } from 'react'
import { Navigate, Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, InputBase, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress,
  IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import AdminLayout from './AdminLayout.jsx'
import IMEIScanner from '../admin/IMEIScanner.jsx'
import DeviceStatusChip, {
  DEVICE_STATUS_LIST,
  STATUS_META,
} from '../admin/DeviceStatusChip.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { WARRANTY_LABELS } from '../../components/admin/format.js'
import {
  getDevices,
  getDeviceStats,
  addDevice,
  scanDevice,
  getProducts,
} from '../../services/api.js'

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })

const GRID = { xs: '1fr auto', md: '2fr 2fr 1fr 1fr 2fr 1fr 40px' }

export default function AdminDevices() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stats, setStats] = useState(null)
  const [products, setProducts] = useState([])
  const [toast, setToast] = useState(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ imei: '', productId: '', notes: '' })
  const [adding, setAdding] = useState(false)

  const [scanOpen, setScanOpen] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const loadStats = useCallback(async () => {
    try {
      const data = await getDeviceStats()
      setStats(data.stats)
    } catch {
      /* stats are optional */
    }
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDevices({
        q: debouncedSearch,
        status: statusFilter,
        page,
        limit: 25,
      })
      setDevices(data.devices)
      setTotal(data.total)
      setPages(data.pages || 1)
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Failed to load devices.' })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadStats()
    getProducts()
      .then(setProducts)
      .catch(() => {})
  }, [loadStats])

  const openAdd = (imei = '') => {
    setAddForm({ imei, productId: '', notes: '' })
    setAddOpen(true)
  }

  const handleAdd = async () => {
    if (!addForm.imei.trim() || !addForm.productId) {
      setToast({ severity: 'error', text: 'IMEI and product are required.' })
      return
    }
    setAdding(true)
    try {
      await addDevice({
        imei: addForm.imei.trim(),
        productId: addForm.productId,
        notes: addForm.notes,
      })
      setToast({ severity: 'success', text: 'Device added.' })
      setAddOpen(false)
      loadList()
      loadStats()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Failed to add device.' })
    } finally {
      setAdding(false)
    }
  }

  const handleScan = async (code) => {
    setScanBusy(true)
    try {
      const res = await scanDevice(code)
      setScanResult({ ...res, scanned: code })
    } catch (err) {
      setScanResult({ status: 'error', message: err?.message || 'Scan failed', scanned: code })
    } finally {
      setScanBusy(false)
    }
  }

  const closeScan = () => {
    setScanOpen(false)
    setScanResult(null)
  }

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const statCards = [
    { key: '', label: 'Total', value: stats?.total },
    { key: 'available', label: 'Available', value: stats?.available },
    { key: 'sold', label: 'Sold', value: stats?.sold },
    { key: 'returned', label: 'Returned', value: stats?.returned },
    { key: 'faulty', label: 'Faulty', value: stats?.faulty },
  ]

  return (
    <AdminLayout title="Devices / IMEI">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.75rem' },
                lineHeight: 1.1,
                color: 'text.primary',
                mb: 0.5,
              }}
            >
              Device inventory
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Every physical GPS device, tracked by IMEI
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              color="info"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => setScanOpen(true)}
              sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}
            >
              Scan
            </Button>
            <Button
              component={RouterLink}
              to="/admin/devices/import"
              variant="outlined"
              color="info"
              startIcon={<UploadFileOutlinedIcon />}
              sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}
            >
              Bulk import
            </Button>
            <Button
              variant="contained"
              color="info"
              startIcon={<AddIcon />}
              onClick={() => openAdd()}
              sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}
            >
              Add device
            </Button>
          </Stack>
        </Stack>

        {/* Stat cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          {statCards.map((c) => {
            const active = statusFilter === c.key
            return (
              <Box
                key={c.label}
                onClick={() => {
                  setStatusFilter(c.key)
                  setPage(1)
                }}
                sx={{
                  cursor: 'pointer',
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: active ? 'info.main' : 'divider',
                  transition: 'border-color 0.15s ease',
                  '&:hover': { borderColor: 'info.main' },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                  }}
                >
                  {c.label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 800,
                    fontSize: '1.8rem',
                    lineHeight: 1.2,
                    color: 'text.primary',
                  }}
                >
                  {c.value ?? '—'}
                </Typography>
              </Box>
            )
          })}
        </Box>

        {/* Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 999,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:focus-within': { borderColor: 'info.main' },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <InputBase
              placeholder="Search by IMEI…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: '0.88rem', flex: 1 }}
            />
          </Box>
          <TextField
            select
            size="small"
            value={statusFilter || 'all'}
            onChange={(e) => {
              setStatusFilter(e.target.value === 'all' ? '' : e.target.value)
              setPage(1)
            }}
            sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
          >
            <MenuItem value="all">All statuses</MenuItem>
            {DEVICE_STATUS_LIST.map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_META[s].label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* Table */}
        <Box
          sx={{
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} sx={{ color: 'info.main' }} />
            </Box>
          ) : devices.length === 0 ? (
            <Box sx={{ textAlign: 'center', px: 3, py: 8 }}>
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.35rem',
                  color: 'text.primary',
                  mb: 0.75,
                }}
              >
                {debouncedSearch || statusFilter ? 'No matching devices' : 'No devices yet'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {debouncedSearch || statusFilter
                  ? 'Try a different search or status.'
                  : 'Use Bulk import to add a batch of IMEIs, or Add device for a single one.'}
              </Typography>
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: GRID,
                  gap: 2,
                  px: 3,
                  py: 1.75,
                  bgcolor: 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {['IMEI', 'Product', 'Box', 'Status', 'Sold to', 'Added', ''].map((h) => (
                  <Typography
                    key={h || 'x'}
                    sx={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                    }}
                  >
                    {h}
                  </Typography>
                ))}
              </Box>

              {devices.map((d, i) => (
                <Box
                  key={d._id}
                  onClick={() => navigate(`/admin/devices/${d._id}`)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: GRID,
                    gap: 2,
                    alignItems: 'center',
                    px: { xs: 2, md: 3 },
                    py: 1.75,
                    cursor: 'pointer',
                    borderBottom: i === devices.length - 1 ? 'none' : '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600 }}
                    >
                      {d.imei}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        color: 'text.secondary',
                        display: { xs: 'block', md: 'none' },
                      }}
                    >
                      {d.product?.name || '—'}
                      {d.box?.code ? ` · Box ${d.box.code}` : ''} · {fmtDate(d.createdAt)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.84rem',
                      color: 'text.secondary',
                      display: { xs: 'none', md: 'block' },
                    }}
                  >
                    {d.product?.name || '—'}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.84rem',
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      display: { xs: 'none', md: 'block' },
                    }}
                  >
                    {d.box?.code || '—'}
                  </Typography>
                  <Box>
                    <DeviceStatusChip status={d.status} />
                  </Box>
                  <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
                    {d.sale ? (
                      <>
                        <Typography
                          sx={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.sale.customerName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                          {d.sale.invoiceNumber} · {fmtDate(d.sale.saleDate)}
                        </Typography>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>—</Typography>
                    )}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      color: 'text.secondary',
                      display: { xs: 'none', md: 'block' },
                    }}
                  >
                    {fmtDate(d.createdAt)}
                  </Typography>
                  <ChevronRightIcon
                    sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }}
                  />
                </Box>
              ))}
            </>
          )}
        </Box>

        {/* Pagination */}
        {!loading && total > 0 && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mt: 2 }}
          >
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              {total} {total === 1 ? 'device' : 'devices'} · page {page} of {pages}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                sx={{ textTransform: 'none' }}
              >
                Previous
              </Button>
              <Button
                size="small"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                sx={{ textTransform: 'none' }}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>

      {/* Add device */}
      <Dialog
        open={addOpen}
        onClose={() => !adding && setAddOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add device</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="IMEI"
              value={addForm.imei}
              onChange={(e) => setAddForm((f) => ({ ...f, imei: e.target.value }))}
              inputProps={{ inputMode: 'numeric', style: { fontFamily: 'monospace' } }}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Product"
              value={addForm.productId}
              onChange={(e) => setAddForm((f) => ({ ...f, productId: e.target.value }))}
              fullWidth
            >
              {products.map((p) => (
                <MenuItem key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes (optional)"
              value={addForm.notes}
              onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setAddOpen(false)}
            disabled={adding}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={adding}
            variant="contained"
            color="info"
            sx={{ textTransform: 'none', borderRadius: 999, fontWeight: 700, px: 3 }}
          >
            {adding ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Add device'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scan / look up */}
      <Dialog
        open={scanOpen}
        onClose={closeScan}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
          Scan a device
          <IconButton
            onClick={closeScan}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
            aria-label="Close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
            Looking up a device never changes its status.
          </Typography>

          <IMEIScanner onScan={handleScan} busy={scanBusy} />

          {scanBusy && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={22} sx={{ color: 'info.main' }} />
            </Box>
          )}

          {scanResult && !scanBusy && (
            <Box
              sx={{
                mt: 2.5,
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1 }}>
                <DeviceStatusChip status={scanResult.status} />
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>
                  {scanResult.message}
                </Typography>
              </Stack>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem', mb: 1.5 }}>
                {scanResult.device?.imei || scanResult.imei || scanResult.scanned}
              </Typography>
              {scanResult.device?.product?.name && (
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1.5 }}>
                  {scanResult.device.product.name}
                </Typography>
              )}
              {scanResult.sale && (
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1.5 }}>
                  {scanResult.sale.invoiceNumber} · {scanResult.sale.customerName} ·{' '}
                  {fmtDate(scanResult.sale.saleDate)}
                  {scanResult.sale.warranty
                    ? ` · Warranty ${WARRANTY_LABELS[scanResult.sale.warranty.state] || scanResult.sale.warranty.state}`
                    : ''}
                </Typography>
              )}
              {scanResult.device?.box?.code && (
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1.5 }}>
                  In box {scanResult.device.box.code}
                </Typography>
              )}
              {scanResult.summary && (
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1.5 }}>
                  {scanResult.box?.type === 'carton'
                    ? `${scanResult.summary.childBoxes} boxes · `
                    : ''}
                  {scanResult.summary.total} devices · {scanResult.summary.available} available
                  {scanResult.summary.sold ? ` · ${scanResult.summary.sold} sold` : ''}
                </Typography>
              )}
              <Stack direction="row" spacing={1}>
                {scanResult.box && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    onClick={() => navigate(`/admin/boxes/${scanResult.box._id}`)}
                    sx={{ textTransform: 'none', borderRadius: 999 }}
                  >
                    Open {scanResult.box.type === 'carton' ? 'carton' : 'box'}
                  </Button>
                )}
                {scanResult.device && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    onClick={() => navigate(`/admin/devices/${scanResult.device._id}`)}
                    sx={{ textTransform: 'none', borderRadius: 999 }}
                  >
                    View device
                  </Button>
                )}
                {scanResult.status === 'not_found' && (
                  <Button
                    size="small"
                    variant="contained"
                    color="info"
                    onClick={() => {
                      const imei = scanResult.imei
                      closeScan()
                      openAdd(imei)
                    }}
                    sx={{ textTransform: 'none', borderRadius: 999 }}
                  >
                    Add to inventory
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
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