import { useState, useEffect, useMemo } from 'react'
import { Navigate, Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, InputBase, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Snackbar, Alert, CircularProgress, MenuItem, TextField,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getProducts, deleteProduct } from '../../services/api.js'
import { BRAND } from '../../theme/theme.js'

export default function AdminProducts() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  // Route guard
  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const load = async () => {
    setLoading(true)
    try {
      const list = await getProducts()
      setProducts(list)
    } catch (err) {
      setToast({
        severity: 'error',
        text: err?.message || 'Failed to load products.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Unique categories for the filter
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean))
    return ['All', ...Array.from(set)]
  }, [products])

  // Filter by search + category
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        categoryFilter === 'All' || p.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [products, search, categoryFilter])

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const productId = toDelete._id || toDelete.id
      await deleteProduct(productId)
      setToast({ severity: 'success', text: `"${toDelete.name}" deleted.` })
      setToDelete(null)
      load()
    } catch (err) {
      setToast({
        severity: 'error',
        text: err?.message || 'Failed to delete product.',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout title="Products">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* ── Header row ─────────────────────────── */}
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
                letterSpacing: '-0.01em',
                color: 'text.primary',
                mb: 0.5,
              }}
            >
              All Products
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {products.length}{' '}
              {products.length === 1 ? 'product' : 'products'} in your catalog
            </Typography>
          </Box>

          <Button
            component={RouterLink}
            to="/admin/products/new"
            variant="contained"
            color="info"
            size="large"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 999, fontWeight: 700, px: 3, py: 1.2 }}
          >
            Add product
          </Button>
        </Stack>

        {/* ── Filters ────────────────────────────── */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
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
              transition: 'border-color 0.2s ease',
              '&:focus-within': { borderColor: 'info.main' },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <InputBase
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: '0.88rem', flex: 1 }}
            />
          </Box>

          <TextField
            select
            size="small"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{
              minWidth: 200,
              '& .MuiOutlinedInput-root': { borderRadius: 999 },
            }}
          >
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {/* ── Table / Empty state ────────────────── */}
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
          ) : filtered.length === 0 ? (
            <EmptyState
              hasProducts={products.length > 0}
              onClear={() => {
                setSearch('')
                setCategoryFilter('All')
              }}
            />
          ) : (
            <>
              {/* Table header — desktop only */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: '64px 2fr 1fr 1fr 80px 80px 100px',
                  gap: 2,
                  alignItems: 'center',
                  px: 3,
                  py: 1.75,
                  bgcolor: 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <HeaderCell />
                <HeaderCell>Name</HeaderCell>
                <HeaderCell>Category</HeaderCell>
                <HeaderCell>Price</HeaderCell>
                <HeaderCell>Stock</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell align="right">Actions</HeaderCell>
              </Box>

              {filtered.map((p, i) => (
                <ProductRow
                  key={p._id || p.id}
                  product={p}
                  last={i === filtered.length - 1}
                  onEdit={() =>
                    navigate(`/admin/products/${p._id || p.id}/edit`)
                  }
                  onDelete={() => setToDelete(p)}
                />
              ))}
            </>
          )}
        </Box>
      </Box>

      {/* ── Delete confirmation ──────────────────── */}
      <Dialog
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete product?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.9rem' }}>
            Are you sure you want to delete{' '}
            <strong>{toDelete?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setToDelete(null)}
            disabled={deleting}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="contained"
            color="error"
            sx={{
              textTransform: 'none',
              borderRadius: 999,
              fontWeight: 700,
              px: 3,
            }}
          >
            {deleting ? (
              <CircularProgress size={16} sx={{ color: '#fff' }} />
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ────────────────────────────────── */}
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

/* ── Sub-components ──────────────────────────────────── */

function HeaderCell({ children, align = 'left' }) {
  return (
    <Typography
      sx={{
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'text.secondary',
        textAlign: align,
      }}
    >
      {children}
    </Typography>
  )
}

function ProductRow({ product, last, onEdit, onDelete }) {
  const lowStock = product.stock > 0 && product.stock < 5
  const outOfStock = product.stock === 0

  // Prefer images[0], fall back to image
  const primaryImage =
    (Array.isArray(product.images) && product.images[0]) ||
    product.image ||
    ''

  const imageCount = Array.isArray(product.images)
    ? product.images.length
    : 0

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '60px 1fr auto',
          md: '64px 2fr 1fr 1fr 80px 80px 100px',
        },
        gap: { xs: 1.5, md: 2 },
        alignItems: 'center',
        px: { xs: 2, md: 3 },
        py: 2,
        borderBottom: last ? 'none' : '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.15s ease',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* Thumbnail */}
      <Box
        sx={{
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: 1,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {primaryImage ? (
          <Box
            component="img"
            src={primaryImage}
            alt={product.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <LocationOnIcon
            sx={{ fontSize: 20, color: 'info.main', opacity: 0.5 }}
          />
        )}

        {/* Image count badge */}
        {imageCount > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              bgcolor: 'rgba(15,17,21,0.7)',
              color: '#fff',
              fontSize: '0.55rem',
              fontWeight: 700,
              px: 0.4,
              py: 0.1,
              borderRadius: 0.5,
              lineHeight: 1.2,
            }}
          >
            {imageCount}
          </Box>
        )}
      </Box>

      {/* Name + category (mobile) */}
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.88rem',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.25,
          }}
        >
          {product.name}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.72rem',
            color: 'text.secondary',
            display: { xs: 'block', md: 'none' },
          }}
        >
          {product.category || '—'} · PKR{' '}
          {Number(product.price).toLocaleString()}
        </Typography>
      </Box>

      {/* Category (desktop) */}
      <Typography
        sx={{
          fontSize: '0.82rem',
          color: 'text.secondary',
          display: { xs: 'none', md: 'block' },
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {product.category || '—'}
      </Typography>

      {/* Price (desktop) */}
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: '0.95rem',
          color: 'text.primary',
          display: { xs: 'none', md: 'block' },
          whiteSpace: 'nowrap',
        }}
      >
        PKR {Number(product.price).toLocaleString()}
      </Typography>

      {/* Stock (desktop) */}
      <Typography
        sx={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: outOfStock
            ? 'error.main'
            : lowStock
            ? 'warning.main'
            : 'text.primary',
          display: { xs: 'none', md: 'block' },
        }}
      >
        {outOfStock ? 'Out' : product.stock}
      </Typography>

      {/* Status chip (desktop) */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Chip
          label={
            product.isNew ? 'New' : outOfStock ? 'Out of stock' : 'Active'
          }
          size="small"
          sx={{
            bgcolor: outOfStock
              ? 'rgba(227,30,36,0.1)'
              : product.isNew
              ? 'rgba(251,55,8,0.1)'
              : 'rgba(16,185,129,0.12)',
            color: outOfStock
              ? BRAND.red
              : product.isNew
              ? BRAND.orange
              : '#0F8A5F',
            fontWeight: 700,
            fontSize: '0.68rem',
            height: 22,
            borderRadius: 999,
          }}
        />
      </Box>

      {/* Actions */}
      <Stack
        direction="row"
        spacing={0.5}
        justifyContent={{ xs: 'flex-end', md: 'flex-end' }}
        sx={{ gridColumn: { xs: '3 / 4', md: 'auto' } }}
      >
        <IconButton
          size="small"
          onClick={onEdit}
          aria-label="Edit product"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'info.main',
              bgcolor: 'rgba(0,131,143,0.08)',
            },
          }}
        >
          <EditOutlinedIcon sx={{ fontSize: 17 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={onDelete}
          aria-label="Delete product"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'error.main',
              bgcolor: 'rgba(227,30,36,0.08)',
            },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Stack>
    </Box>
  )
}

function EmptyState({ hasProducts, onClear }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        px: 3,
        py: 8,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: 'rgba(0,131,143,0.08)',
          color: 'info.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
        }}
      >
        <Inventory2OutlinedIcon sx={{ fontSize: 34 }} />
      </Box>

      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: '1.35rem',
          color: 'text.primary',
          mb: 0.75,
        }}
      >
        {hasProducts ? 'No matching products' : 'No products yet'}
      </Typography>

      <Typography
        sx={{
          fontSize: '0.85rem',
          color: 'text.secondary',
          maxWidth: 340,
          lineHeight: 1.6,
          mb: 3,
        }}
      >
        {hasProducts
          ? 'Try a different search or clear the filters.'
          : 'Add your first product to start building your catalog.'}
      </Typography>

      {hasProducts ? (
        <Button
          onClick={onClear}
          variant="outlined"
          color="info"
          sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
        >
          Clear filters
        </Button>
      ) : (
        <Button
          component={RouterLink}
          to="/admin/products/new"
          variant="contained"
          color="info"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}
        >
          Add your first product
        </Button>
      )}
    </Box>
  )
}