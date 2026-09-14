import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Snackbar, Alert,
  CircularProgress, InputBase, Chip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from '../../services/api.js'

const EMPTY = { name: '', slug: '', description: '' }

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const load = async () => {
    setLoading(true)
    const list = await getCategories()
    setCategories(list)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = categories.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (cat) => {
    setEditing(cat)
    setForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))

    // Auto-generate slug from name
    if (name === 'name' && !editing) {
      setForm((f) => ({
        ...f,
        name: value,
        slug: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      }))
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErrors({ name: 'Name is required.' })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing.id, form)
        setToast({ severity: 'success', text: 'Category updated.' })
      } else {
        await createCategory(form)
        setToast({ severity: 'success', text: 'Category created.' })
      }
      setDialogOpen(false)
      load()
    } catch {
      setToast({ severity: 'error', text: 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteCategory(toDelete.id)
      setToast({ severity: 'success', text: `"${toDelete.name}" deleted.` })
      setToDelete(null)
      load()
    } catch {
      setToast({ severity: 'error', text: 'Delete failed.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout title="Categories">
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
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
              Categories
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {categories.length} {categories.length === 1 ? 'category' : 'categories'}
            </Typography>
          </Box>

          <Button
            onClick={openCreate}
            variant="contained"
            color="info"
            size="large"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 999, fontWeight: 700, px: 3, py: 1.2 }}
          >
            Add category
          </Button>
        </Stack>

        {/* Search */}
        {categories.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 999,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              mb: 3,
              maxWidth: 400,
              '&:focus-within': { borderColor: 'info.main' },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <InputBase
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: '0.88rem', flex: 1 }}
            />
          </Box>
        )}

        {/* List */}
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
              hasItems={categories.length > 0}
              onAdd={openCreate}
              onClear={() => setSearch('')}
            />
          ) : (
            filtered.map((c, i) => (
              <Box
                key={c.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr auto', md: '2fr 1fr 100px auto' },
                  gap: 2,
                  alignItems: 'center',
                  px: { xs: 2.5, md: 3 },
                  py: 2,
                  borderBottom: i < filtered.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  transition: 'background-color 0.15s ease',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      color: 'text.primary',
                      lineHeight: 1.3,
                      mb: 0.25,
                    }}
                  >
                    {c.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      color: 'text.secondary',
                      fontFamily: 'monospace',
                      display: { xs: 'none', md: 'block' },
                    }}
                  >
                    /{c.slug}
                  </Typography>
                  {c.description && (
                    <Typography
                      sx={{
                        fontSize: '0.78rem',
                        color: 'text.secondary',
                        mt: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.description}
                    </Typography>
                  )}
                </Box>

                <Typography
                  sx={{
                    fontSize: '0.82rem',
                    color: 'text.secondary',
                    display: { xs: 'none', md: 'block' },
                  }}
                >
                  {c.description ? '' : '—'}
                </Typography>

                <Chip
                  label={`${c.productCount} ${c.productCount === 1 ? 'product' : 'products'}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(0,131,143,0.08)',
                    color: 'info.main',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    height: 22,
                    borderRadius: 999,
                    display: { xs: 'none', md: 'inline-flex' },
                  }}
                />

                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => openEdit(c)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'info.main', bgcolor: 'rgba(0,131,143,0.08)' },
                    }}
                  >
                    <EditOutlinedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setToDelete(c)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main', bgcolor: 'rgba(227,30,36,0.08)' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Stack>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* ── Add / Edit dialog ────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {editing ? 'Edit category' : 'New category'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Slug"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              fullWidth
              helperText="Used in URLs — auto-generated from name."
            />
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Optional short description…"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            color="info"
            sx={{ textTransform: 'none', borderRadius: 999, fontWeight: 700, px: 3 }}
          >
            {saving ? (
              <CircularProgress size={16} sx={{ color: '#fff' }} />
            ) : editing ? (
              'Save changes'
            ) : (
              'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirmation ──────────────────── */}
      <Dialog
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete category?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
            Delete <strong>{toDelete?.name}</strong>? Products in this category
            will keep their category label but the category itself will be removed.
          </Typography>
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
            sx={{ textTransform: 'none', borderRadius: 999, fontWeight: 700, px: 3 }}
          >
            {deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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

function EmptyState({ hasItems, onAdd, onClear }) {
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
        <CategoryOutlinedIcon sx={{ fontSize: 34 }} />
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
        {hasItems ? 'No matching categories' : 'No categories yet'}
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
        {hasItems
          ? 'Try a different search term.'
          : 'Create your first category to organize your products.'}
      </Typography>
      <Button
        onClick={hasItems ? onClear : onAdd}
        variant="contained"
        color="info"
        startIcon={hasItems ? null : <AddIcon />}
        sx={{ borderRadius: 999, fontWeight: 700, px: 3, textTransform: 'none' }}
      >
        {hasItems ? 'Clear search' : 'Add your first category'}
      </Button>
    </Box>
  )
}