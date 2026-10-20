import { useState, useEffect, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, InputBase, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import BoxStateChip from '../admin/BoxStateChip.jsx'
import { ADMIN_SHELL } from '../../lib/stockShell.js'
import { getBoxes, createBox, getProducts } from '../../services/api.js'

const GRID = { xs: '1fr auto', md: '1.2fr 0.8fr 2fr 2fr 1fr 40px' }

const contents = (b) =>
  b.type === 'carton'
    ? `${b.summary.childBoxes} boxes · ${b.summary.total} devices`
    : `${b.summary.total}${b.expectedCount != null ? ` / ${b.expectedCount}` : ''} devices`

const stock = (b) => {
  const s = b.summary
  if (s.total === 0) return '—'
  return [`${s.available} available`, s.sold ? `${s.sold} sold` : '', s.other ? `${s.other} other` : '']
    .filter(Boolean)
    .join(' · ')
}

export default function AdminBoxes({ shell = ADMIN_SHELL }) {
  const { Layout, base, isLoggedIn, loginTo } = shell
  const navigate = useNavigate()
  const [boxes, setBoxes] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [toast, setToast] = useState(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [products, setProducts] = useState([])
  const [cartons, setCartons] = useState([])
  const [form, setForm] = useState({ type: 'box', code: '', productId: '', parentId: '', expectedCount: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBoxes({ q: debouncedSearch, type: typeFilter, page, limit: 25 })
      setBoxes(data.boxes)
      setTotal(data.total)
      setPages(data.pages || 1)
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Failed to load boxes.' })
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, typeFilter, page])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = async () => {
    setForm({ type: 'box', code: '', productId: '', parentId: '', expectedCount: '' })
    setCreateOpen(true)
    try {
      const [p, c] = await Promise.all([getProducts(), getBoxes({ type: 'carton', limit: 100 })])
      setProducts(p)
      setCartons(c.boxes)
    } catch {
      /* optional lists */
    }
  }

  const handleCreate = async () => {
    if (!form.code.trim()) {
      setToast({ severity: 'error', text: 'Enter or scan the box code.' })
      return
    }
    setCreating(true)
    try {
      const box = await createBox({
        type: form.type,
        code: form.code.trim(),
        productId: form.productId || undefined,
        parentId: form.type === 'box' && form.parentId ? form.parentId : undefined,
        expectedCount: form.expectedCount === '' ? undefined : Number(form.expectedCount),
      })
      navigate(`${base}/boxes/${box._id}`)
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not create.' })
    } finally {
      setCreating(false)
    }
  }

  if (!isLoggedIn()) return <Navigate to={loginTo} replace />

  return (
    <Layout title="Boxes & cartons">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
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
                mb: 0.5,
              }}
            >
              Boxes & cartons
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Which devices came in which box, and which carton holds which boxes
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="info"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}
          >
            New box / carton
          </Button>
        </Stack>

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
              placeholder="Search by box or carton code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: '0.88rem', flex: 1 }}
            />
          </Box>
          <TextField
            select
            size="small"
            value={typeFilter || 'all'}
            onChange={(e) => {
              setTypeFilter(e.target.value === 'all' ? '' : e.target.value)
              setPage(1)
            }}
            sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
          >
            <MenuItem value="all">Boxes and cartons</MenuItem>
            <MenuItem value="box">Boxes only</MenuItem>
            <MenuItem value="carton">Cartons only</MenuItem>
          </TextField>
        </Stack>

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
          ) : boxes.length === 0 ? (
            <Box sx={{ textAlign: 'center', px: 3, py: 8 }}>
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.35rem',
                  mb: 0.75,
                }}
              >
                {debouncedSearch || typeFilter ? 'Nothing matches' : 'No boxes yet'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {debouncedSearch || typeFilter
                  ? 'Try a different code or filter.'
                  : 'Create a box, then scan the devices inside it.'}
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
                {['Code', 'Type', 'Contents', 'Stock', 'State', ''].map((h) => (
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
              {boxes.map((b, i) => (
                <Box
                  key={b._id}
                  onClick={() => navigate(`${base}/boxes/${b._id}`)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: GRID,
                    gap: 2,
                    alignItems: 'center',
                    px: { xs: 2, md: 3 },
                    py: 1.75,
                    cursor: 'pointer',
                    borderBottom: i === boxes.length - 1 ? 'none' : '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.92rem' }}>
                      {b.code}
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.72rem', color: 'text.secondary', display: { xs: 'block', md: 'none' } }}
                    >
                      {b.type === 'carton' ? 'Carton' : 'Box'} · {contents(b)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ fontSize: '0.82rem', color: 'text.secondary', display: { xs: 'none', md: 'block' } }}
                  >
                    {b.type === 'carton' ? 'Carton' : 'Box'}
                    {b.parent?.code ? ` · in ${b.parent.code}` : ''}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.84rem',
                      display: { xs: 'none', md: 'block' },
                      color: b.mismatch ? 'warning.main' : 'text.primary',
                      fontWeight: b.mismatch ? 700 : 400,
                    }}
                  >
                    {contents(b)}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.82rem', color: 'text.secondary', display: { xs: 'none', md: 'block' } }}
                  >
                    {stock(b)}
                  </Typography>
                  <Box>
                    <BoxStateChip state={b.state} />
                  </Box>
                  <ChevronRightIcon sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }} />
                </Box>
              ))}
            </>
          )}
        </Box>

        {!loading && total > 0 && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              {total} {total === 1 ? 'entry' : 'entries'} · page {page} of {pages}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} sx={{ textTransform: 'none' }}>
                Previous
              </Button>
              <Button size="small" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} sx={{ textTransform: 'none' }}>
                Next
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>

      <Dialog
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>New box / carton</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, parentId: '' }))}
              fullWidth
            >
              <MenuItem value="box">Box (about 10 devices)</MenuItem>
              <MenuItem value="carton">Carton (about 100 devices, holds boxes)</MenuItem>
            </TextField>
            <TextField
              label="Code (scan the barcode or type it)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              inputProps={{ style: { fontFamily: 'monospace' } }}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Product (optional)"
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">None yet</MenuItem>
              {products.map((p) => (
                <MenuItem key={p._id || p.id} value={p._id || p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            {/* {form.type === 'box' && (
            //   <TextField
            //     select
            //     label="Inside carton (optional)"
            //     value={form.parentId}
            //     onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
            //     fullWidth
            //   >
            //     <MenuItem value="">Not in a carton</MenuItem>
            //     {cartons.map((c) => (
            //       <MenuItem key={c._id} value={c._id}>
            //         {c.code}
            //       </MenuItem>
            //     ))}
            //   </TextField>
            )} */}
            <TextField
              label="Expected devices (optional)"
              type="number"
              value={form.expectedCount}
              onChange={(e) => setForm((f) => ({ ...f, expectedCount: e.target.value }))}
              helperText={form.type === 'box' ? 'Default 10' : 'Default 100'}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ textTransform: 'none', color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            variant="contained"
            color="info"
            sx={{ textTransform: 'none', borderRadius: 999, fontWeight: 700, px: 3 }}
          >
            {creating ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create'}
          </Button>
        </DialogActions>
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
    </Layout>
  )
}