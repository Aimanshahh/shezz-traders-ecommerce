import { useState, useEffect, useRef } from 'react'
import {
  Navigate, useNavigate, useParams, Link as RouterLink,
} from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Grid,
  FormControlLabel, Checkbox, Divider, CircularProgress, Snackbar,
  Alert, InputAdornment, IconButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import {
  getProduct, createProduct, updateProduct, getCategories, uploadImages,
} from '../../services/api.js'

const MAX_IMAGES = 6

const EMPTY = {
  name: '',
  category: '',
  price: '',
  stock: '',
  images: [],
  description: '',
  featuresText: '',
  rating: '',
  reviewCount: '',
  isNew: false,
  isFeatured: false,
}

export default function AdminProductForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState(null)
  const [urlInput, setUrlInput] = useState('')

  const fileInputRef = useRef(null)

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  useEffect(() => {
    let alive = true
    ;(async () => {
      const cats = await getCategories()
      if (!alive) return
      setCategories(cats)

      if (isEdit) {
        const p = await getProduct(id)
        if (!alive) return
        if (!p) {
          setToast({ severity: 'error', text: 'Product not found.' })
          setTimeout(() => navigate('/admin/products'), 1500)
          return
        }
        // Merge images array + legacy image field
        const imgs = Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : p.image
          ? [p.image]
          : []

        setForm({
          name: p.name || '',
          category: p.category || '',
          price: p.price?.toString() || '',
          stock: p.stock?.toString() || '',
          images: imgs,
          description: p.description || '',
          featuresText: (p.features || []).join('\n'),
          rating: p.rating?.toString() || '',
          reviewCount: p.reviewCount?.toString() || '',
          isNew: !!p.isNew,
          isFeatured: !!p.isFeatured,
        })
      }
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [id, isEdit, navigate])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  // ── Upload multiple files
  const handleFilesSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remaining = MAX_IMAGES - form.images.length
    if (remaining <= 0) {
      setToast({
        severity: 'warning',
        text: `Maximum ${MAX_IMAGES} images allowed.`,
      })
      return
    }

    const toUpload = files.slice(0, remaining)
    if (toUpload.length < files.length) {
      setToast({
        severity: 'warning',
        text: `Only first ${remaining} images were added (limit ${MAX_IMAGES}).`,
      })
    }

    setUploading(true)
    try {
      const urls = await uploadImages(toUpload)
      setForm((f) => ({
        ...f,
        images: [...f.images, ...urls].slice(0, MAX_IMAGES),
      }))
      setToast({ severity: 'success', text: `${urls.length} image(s) uploaded.` })
    } catch (err) {
      setToast({
        severity: 'error',
        text: err?.message || 'Upload failed.',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index) => {
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== index),
    }))
  }

  const handleAddUrl = () => {
    const url = urlInput.trim()
    if (!url) return
    if (form.images.length >= MAX_IMAGES) {
      setToast({
        severity: 'warning',
        text: `Maximum ${MAX_IMAGES} images allowed.`,
      })
      return
    }
    setForm((f) => ({ ...f, images: [...f.images, url] }))
    setUrlInput('')
  }

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Name is required.'
    if (!form.category.trim()) err.category = 'Category is required.'
    if (!form.price || Number(form.price) <= 0) err.price = 'Enter a valid price.'
    return err
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (Object.keys(err).length) {
      setErrors(err)
      setToast({ severity: 'error', text: 'Please fix the errors below.' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        stock: Number(form.stock) || 0,
        images: form.images,
        image: form.images[0] || '',   // backward compat
        description: form.description.trim(),
        features: form.featuresText
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
        rating: Number(form.rating) || 0,
        reviewCount: Number(form.reviewCount) || 0,
        isNew: form.isNew,
        isFeatured: form.isFeatured,
      }

      if (isEdit) {
        await updateProduct(id, payload)
        setToast({ severity: 'success', text: 'Product updated.' })
      } else {
        await createProduct(payload)
        setToast({ severity: 'success', text: 'Product created.' })
      }
      setTimeout(() => navigate('/admin/products'), 800)
    } catch (err) {
      console.error('Save failed:', err)
      setToast({
        severity: 'error',
        text: err?.message || 'Save failed.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title={isEdit ? 'Edit product' : 'New product'}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress size={32} sx={{ color: 'info.main' }} />
        </Box>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={isEdit ? 'Edit product' : 'New product'}>
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Button
          component={RouterLink}
          to="/admin/products"
          startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
          disableRipple
          sx={{
            p: 0,
            mb: 2.5,
            minWidth: 0,
            textTransform: 'none',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'text.secondary',
            '&:hover': { color: 'info.main', bgcolor: 'transparent' },
          }}
        >
          All products
        </Button>

        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '1.5rem', md: '1.85rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            {isEdit ? 'Edit product' : 'Add a new product'}
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {isEdit
              ? 'Update the details below and save your changes.'
              : 'Fill in the fields below to add a new product.'}
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' },
            gap: { xs: 3, lg: 4 },
            alignItems: 'flex-start',
          }}
        >
          {/* LEFT */}
          <Stack spacing={3}>
            <Section title="Basic information">
              <Stack spacing={2.5}>
                <TextField
                  label="Product name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  error={!!errors.name}
                  helperText={errors.name}
                  fullWidth
                  required
                />

                <TextField
                  label="Description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Short description shown on the product page…"
                />

                <TextField
                  label="Key features"
                  name="featuresText"
                  value={form.featuresText}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={5}
                  placeholder={'One feature per line, e.g.\nPocket-sized design\nSOS alert button\nLong standby battery'}
                  helperText="Each line becomes a bullet point on the product page."
                />
              </Stack>
            </Section>

            <Section title="Pricing & stock">
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Price"
                    name="price"
                    type="number"
                    value={form.price}
                    onChange={handleChange}
                    error={!!errors.price}
                    helperText={errors.price}
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Typography
                            sx={{ fontSize: '0.82rem', color: 'text.secondary' }}
                          >
                            PKR
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Stock quantity"
                    name="stock"
                    type="number"
                    value={form.stock}
                    onChange={handleChange}
                    fullWidth
                    placeholder="0"
                  />
                </Grid>
              </Grid>
            </Section>

            <Section title="Ratings">
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Rating (0–5)"
                    name="rating"
                    type="number"
                    value={form.rating}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ step: 0.1, min: 0, max: 5 }}
                    placeholder="0"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Review count"
                    name="reviewCount"
                    type="number"
                    value={form.reviewCount}
                    onChange={handleChange}
                    fullWidth
                    placeholder="0"
                  />
                </Grid>
              </Grid>
            </Section>
          </Stack>

          {/* RIGHT */}
          <Stack
            spacing={3}
            sx={{ position: { lg: 'sticky' }, top: { lg: 100 } }}
          >
            <Section title="Organization">
              <TextField
                select
                label="Category"
                name="category"
                value={form.category}
                onChange={handleChange}
                error={!!errors.category}
                helperText={errors.category}
                fullWidth
                required
              >
                {categories.length === 0 ? (
                  <MenuItem value="" disabled>
                    No categories yet — create one first
                  </MenuItem>
                ) : (
                  categories.map((c) => (
                    <MenuItem key={c._id || c.id} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))
                )}
              </TextField>
            </Section>

            <Section title={`Images (${form.images.length}/${MAX_IMAGES})`}>
              {/* Hidden file input — accepts multiple */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                multiple
                onChange={handleFilesSelect}
                style={{ display: 'none' }}
              />

              {/* Image grid */}
              {form.images.length > 0 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  {form.images.map((url, i) => (
                    <Box
                      key={`${url}-${i}`}
                      sx={{
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor:
                          i === 0 ? 'info.main' : 'divider',
                        overflow: 'hidden',
                        bgcolor: 'grey.50',
                      }}
                    >
                      <Box
                        component="img"
                        src={url}
                        alt={`Image ${i + 1}`}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />

                      {/* "Primary" badge on first */}
                      {i === 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            px: 0.75,
                            py: 0.2,
                            borderRadius: 0.5,
                            bgcolor: 'info.main',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Primary
                        </Box>
                      )}

                      {/* Remove button */}
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveImage(i)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          bgcolor: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          '&:hover': { bgcolor: 'error.main' },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Empty state */}
              {form.images.length === 0 && (
                <Box
                  sx={{
                    aspectRatio: '4 / 3',
                    borderRadius: 1.5,
                    border: '1px dashed',
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <Stack
                    alignItems="center"
                    spacing={1}
                    sx={{ color: 'text.disabled', px: 2, textAlign: 'center' }}
                  >
                    <ImageOutlinedIcon sx={{ fontSize: 40 }} />
                    <Typography sx={{ fontSize: '0.82rem' }}>
                      No images yet
                    </Typography>
                  </Stack>
                </Box>
              )}

              {/* Upload button */}
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || form.images.length >= MAX_IMAGES}
                variant="outlined"
                color="info"
                fullWidth
                startIcon={
                  uploading ? (
                    <CircularProgress size={16} sx={{ color: 'info.main' }} />
                  ) : (
                    <CloudUploadOutlinedIcon />
                  )
                }
                sx={{
                  borderRadius: 999,
                  fontWeight: 600,
                  py: 1.1,
                  borderColor: 'divider',
                  color: 'text.primary',
                  textTransform: 'none',
                  mb: 1,
                  '&:hover': {
                    borderColor: 'info.main',
                    color: 'info.main',
                    bgcolor: 'transparent',
                  },
                }}
              >
                {uploading
                  ? 'Uploading…'
                  : form.images.length >= MAX_IMAGES
                  ? `Limit reached (${MAX_IMAGES})`
                  : 'Add images'}
              </Button>

              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: 'text.secondary',
                  textAlign: 'center',
                  mb: 2,
                }}
              >
                JPG, PNG, WEBP, GIF up to 5MB each. First image is the primary.
              </Typography>

              <Divider sx={{ my: 1 }}>
                <Typography
                  sx={{ fontSize: '0.68rem', color: 'text.secondary' }}
                >
                  OR
                </Typography>
              </Divider>

              {/* Paste URL */}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <TextField
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste image URL…"
                  size="small"
                  fullWidth
                  disabled={form.images.length >= MAX_IMAGES}
                />
                <Button
                  onClick={handleAddUrl}
                  disabled={
                    !urlInput.trim() || form.images.length >= MAX_IMAGES
                  }
                  variant="outlined"
                  color="info"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 1.5,
                    px: 2,
                    flexShrink: 0,
                  }}
                >
                  Add
                </Button>
              </Stack>
            </Section>

            <Section title="Visibility">
              <Stack spacing={0.5}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="isNew"
                      checked={form.isNew}
                      onChange={handleChange}
                      sx={{
                        color: 'divider',
                        '&.Mui-checked': { color: 'info.main' },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>
                        Mark as new
                      </Typography>
                      <Typography
                        sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
                      >
                        Shows a red "New" ribbon on the card
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="isFeatured"
                      checked={form.isFeatured}
                      onChange={handleChange}
                      sx={{
                        color: 'divider',
                        '&.Mui-checked': { color: 'info.main' },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>
                        Show on home page
                      </Typography>
                      <Typography
                        sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
                      >
                        Appears in Featured Devices section
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </Section>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                gap: 1.5,
                pt: 1,
              }}
            >
              <Button
                component={RouterLink}
                to="/admin/products"
                variant="outlined"
                fullWidth
                sx={{
                  borderRadius: 999,
                  fontWeight: 600,
                  py: 1.2,
                  borderColor: 'divider',
                  color: 'text.primary',
                  '&:hover': {
                    borderColor: 'info.main',
                    color: 'info.main',
                    bgcolor: 'transparent',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="info"
                fullWidth
                disabled={saving || uploading}
                startIcon={!saving && <SaveOutlinedIcon />}
                sx={{ borderRadius: 999, fontWeight: 700, py: 1.2 }}
              >
                {saving ? (
                  <CircularProgress size={16} sx={{ color: '#fff' }} />
                ) : isEdit ? (
                  'Save changes'
                ) : (
                  'Create product'
                )}
              </Button>
            </Box>
          </Stack>
        </Box>
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

function Section({ title, children }) {
  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'info.main',
          mb: 2,
        }}
      >
        {title}
      </Typography>
      <Divider sx={{ mb: 2.5 }} />
      {children}
    </Box>
  )
}