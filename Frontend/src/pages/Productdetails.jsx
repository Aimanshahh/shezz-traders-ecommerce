import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Container, Grid, Box, Typography, Button, IconButton, Rating,
  Breadcrumbs, Link, Divider, Stack, Chip, CircularProgress,
} from '@mui/material'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import { getProduct } from '../services/api.js'
import { useCart } from '../context/CartContext.jsx'

const PERKS = [
  { icon: LocalShippingOutlinedIcon, label: 'Free delivery', sub: '2–3 days' },
  { icon: VerifiedOutlinedIcon, label: '1-year warranty', sub: 'Full coverage' },
  { icon: SupportAgentOutlinedIcon, label: '24/7 support', sub: 'Always online' },
]

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [imgFailed, setImgFailed] = useState({})

  useEffect(() => {
    let alive = true
    setLoading(true)

    ;(async () => {
      try {
        const p = await getProduct(id)
        if (!alive) return
        setProduct(p)
        setActiveImage(0)
      } catch (err) {
        console.error('Failed to load product:', err)
        if (alive) setProduct(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [id])

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 12, textAlign: 'center' }}>
        <CircularProgress size={32} sx={{ color: 'info.main' }} />
      </Container>
    )
  }

  if (!product) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: '1.75rem',
            mb: 1,
          }}
        >
          Product not found
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          The item you're looking for doesn't exist or was removed.
        </Typography>
        <Button
          component={RouterLink}
          to="/shop"
          variant="contained"
          color="info"
          sx={{ borderRadius: 999, px: 3 }}
        >
          Back to Shop
        </Button>
      </Container>
    )
  }

  // Build the gallery — images array or fallback
  const gallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : []

  const inStock = (product.stock ?? 0) > 0
  const hasRating = Number(product.rating) > 0
  const features = Array.isArray(product.features) ? product.features : []

  const activeUrl = gallery[activeImage] || ''
  const showMainImage = activeUrl && !imgFailed[activeImage]

  const addToCartPayload = {
    id: product._id || product.id,
    name: product.name,
    price: product.price,
    image: gallery[0] || '',
    category: product.category,
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        pb: { xs: 6, md: 9 },
      }}
    >
      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 4 } }}>
        {/* Breadcrumb */}
        <Breadcrumbs
          separator={
            <NavigateNextIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          }
          sx={{
            mb: { xs: 3, md: 4 },
            fontSize: '0.82rem',
            '& .MuiBreadcrumbs-separator': { mx: 0.75 },
          }}
        >
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              '&:hover': { color: 'info.main' },
            }}
          >
            Home
          </Link>
          <Link
            component={RouterLink}
            to="/shop"
            underline="none"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              '&:hover': { color: 'info.main' },
            }}
          >
            Shop
          </Link>
          <Typography
            sx={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'text.primary',
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {product.name}
          </Typography>
        </Breadcrumbs>

        <Grid container spacing={{ xs: 4, md: 6 }}>
          {/* GALLERY */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={2}>
              {/* Thumbnails */}
              {gallery.length > 1 && (
                <Stack
                  direction={{ xs: 'row', sm: 'column' }}
                  spacing={1.25}
                  sx={{
                    overflowX: { xs: 'auto', sm: 'visible' },
                    pb: { xs: 0.5, sm: 0 },
                  }}
                >
                  {gallery.map((img, i) => (
                    <Box
                      key={i}
                      onClick={() => setActiveImage(i)}
                      sx={{
                        width: { xs: 56, sm: 68 },
                        height: { xs: 56, sm: 68 },
                        bgcolor: 'background.paper',
                        border: '2px solid',
                        borderColor:
                          activeImage === i ? 'info.main' : 'divider',
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        opacity: activeImage === i ? 1 : 0.6,
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: 'info.main', opacity: 1 },
                      }}
                    >
                      <Box
                        component="img"
                        src={img}
                        alt={`View ${i + 1}`}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}

              {/* Main image */}
              <Box
                sx={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  aspectRatio: { xs: '4 / 3', sm: '1 / 1' },
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {showMainImage ? (
                  <Box
                    component="img"
                    src={activeUrl}
                    alt={product.name}
                    onError={() =>
                      setImgFailed((m) => ({ ...m, [activeImage]: true }))
                    }
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <LocationOnIcon
                    sx={{
                      fontSize: { xs: 120, sm: 160 },
                      color: 'rgba(15,17,21,0.08)',
                    }}
                  />
                )}

                {/* Stock badge */}
                <Chip
                  label={inStock ? 'In Stock' : 'Out of Stock'}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    bgcolor: inStock ? 'info.main' : 'error.main',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    height: 24,
                    borderRadius: 1,
                  }}
                />

                {/* Image counter */}
                {gallery.length > 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      bgcolor: 'rgba(15,17,21,0.7)',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      px: 1.25,
                      py: 0.4,
                      borderRadius: 1,
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    {activeImage + 1} / {gallery.length}
                  </Box>
                )}
              </Box>
            </Stack>
          </Grid>

          {/* DETAILS */}
          <Grid size={{ xs: 12, md: 6 }}>
            {product.category && (
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'info.main',
                  mb: 1,
                }}
              >
                {product.category}
              </Typography>
            )}

            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.75rem', sm: '2.1rem', md: '2.4rem' },
                lineHeight: 1.1,
                color: 'text.primary',
                mb: 1.5,
              }}
            >
              {product.name}
            </Typography>

            {hasRating && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 2.5 }}
              >
                <Rating
                  value={product.rating}
                  precision={0.1}
                  readOnly
                  size="small"
                  sx={{ color: 'warning.main' }}
                />
                <Typography variant="body2" color="text.secondary">
                  <Box
                    component="span"
                    sx={{ fontWeight: 700, color: 'text.primary' }}
                  >
                    {product.rating}
                  </Box>{' '}
                  · {product.reviewCount || 0} reviews
                </Typography>
              </Stack>
            )}

            <Stack
              direction="row"
              alignItems="baseline"
              spacing={1}
              sx={{ mb: 3 }}
            >
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                }}
              >
                PKR
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontSize: { xs: '1.8rem', md: '2.1rem' },
                  fontWeight: 800,
                  color: 'info.main',
                  lineHeight: 1,
                }}
              >
                {Number(product.price).toLocaleString()}
              </Typography>
            </Stack>

            {product.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3, lineHeight: 1.7, fontSize: '0.92rem' }}
              >
                {product.description}
              </Typography>
            )}

            {features.length > 0 && (
              <Box sx={{ mb: 3.5 }}>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    mb: 1.5,
                  }}
                >
                  Key features
                </Typography>
                <Stack spacing={1.1}>
                  {features.map((feature) => (
                    <Stack
                      direction="row"
                      spacing={1.25}
                      alignItems="flex-start"
                      key={feature}
                    >
                      <CheckCircleIcon
                        sx={{
                          color: 'info.main',
                          fontSize: 18,
                          mt: 0.25,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{ fontSize: '0.88rem', lineHeight: 1.5 }}
                      >
                        {feature}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              sx={{ mb: 2 }}
            >
              <Stack
                direction="row"
                alignItems="center"
                sx={{
                  border: '1.5px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  width: { xs: '100%', sm: 140 },
                  height: 48,
                  overflow: 'hidden',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  sx={{
                    width: 44,
                    height: '100%',
                    borderRadius: 0,
                    color: 'text.primary',
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <RemoveIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <Box
                  sx={{
                    flex: 1,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      lineHeight: 1,
                    }}
                  >
                    {quantity}
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  onClick={() =>
                    setQuantity((q) => Math.min(product.stock || 99, q + 1))
                  }
                  sx={{
                    width: 44,
                    height: '100%',
                    borderRadius: 0,
                    color: 'text.primary',
                    flexShrink: 0,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>

              <Button
                variant="contained"
                color="info"
                size="large"
                onClick={() => addItem(addToCartPayload, quantity)}
                disabled={!inStock}
                sx={{
                  flexGrow: 1,
                  height: 48,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                }}
              >
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </Stack>

            <Button
              component={RouterLink}
              to="/checkout"
              variant="outlined"
              color="info"
              size="large"
              fullWidth
              disabled={!inStock}
              onClick={() => addItem(addToCartPayload, quantity)}
              sx={{
                height: 48,
                fontWeight: 700,
                fontSize: '0.95rem',
                mb: 3,
              }}
            >
              Buy Now
            </Button>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: { xs: 1.5, md: 2 },
                pt: 3,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              {PERKS.map((p) => (
                <Stack key={p.label} spacing={0.75} alignItems="flex-start">
                  <p.icon sx={{ fontSize: 22, color: 'info.main' }} />
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        lineHeight: 1.2,
                        mb: 0.25,
                      }}
                    >
                      {p.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.68rem',
                        color: 'text.secondary',
                        lineHeight: 1.3,
                      }}
                    >
                      {p.sub}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}