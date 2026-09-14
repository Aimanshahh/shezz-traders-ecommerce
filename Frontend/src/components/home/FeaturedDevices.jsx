import { useState, useEffect } from 'react'
import { Box, Grid, Typography, Button, CircularProgress } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ProductCard from '../product/ProductCard.jsx'
import { getProducts } from '../../services/api.js'

export default function FeaturedDevices() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const all = await getProducts()
        if (!alive) return

        // Featured products first; if none are marked featured, show latest 4
        const featured = all.filter((p) => p.isFeatured)
        setProducts((featured.length ? featured : all).slice(0, 4))
      } catch (err) {
        console.error('Failed to load featured products:', err)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  // Hide the whole section if there are no products yet
  if (!loading && products.length === 0) return null

  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        maxWidth: 1600,
        mx: 'auto',
        px: { xs: 2, sm: 3, md: 5, lg: 6 },
        py: { xs: 5, sm: 6, md: 8 },
        boxSizing: 'border-box',
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'flex-end' },
          justifyContent: 'space-between',
          gap: { xs: 2, sm: 3 },
          mb: { xs: 3, sm: 4, md: 6 },
        }}
      >
        <Box sx={{ maxWidth: { xs: '100%', sm: 620 } }}>
          {/* Orange eyebrow */}
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: { xs: '1.75rem', sm: '2.85rem' },
              fontWeight: 750,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'warning.main',
              mb: 0.75,
            }}
          >
            Handpicked for you
          </Typography>

          {/* Heading — teal */}
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 600,
              lineHeight: 1.1,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
              color: 'ffffff',
              mb: 1,
            }}
          >
            Featured Devices
          </Typography>

          {/* Subtitle — orange */}
          <Typography
            sx={{
              fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
              fontWeight: 400,
              color: 'ffffff',
              lineHeight: 1.5,
            }}
          >
            Real-Time GPS Tracking, Vehicle Monitoring &amp; Advanced Fleet
            Security — All in One Platform.
          </Typography>
        </Box>

        <Button
          component={RouterLink}
          to="/shop"
          endIcon={<ArrowForwardIcon />}
          variant="outlined"
          color="info"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 999,
            px: { xs: 2.5, sm: 3 },
            py: { xs: 0.75, sm: 1 },
            alignSelf: { xs: 'stretch', sm: 'auto' },
            whiteSpace: 'nowrap',
            borderColor: 'info.main',
            color: 'info.main',
            '&:hover': {
              borderColor: 'info.dark',
              bgcolor: 'info.main',
              color: '#fff',
            },
          }}
        >
          View all
        </Button>
      </Box>

      {/* Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: 'info.main' }} />
        </Box>
      ) : (
        <Grid
          container
          spacing={{ xs: 2, sm: 2.5, md: 3, lg: 4 }}
          justifyContent="center"
          alignItems="stretch"
          sx={{ width: '100%' }}
        >
          {products.map((product) => (
            <Grid
              key={product._id || product.id}
              size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
              sx={{ display: 'flex' }}
            >
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Mobile CTA */}
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          justifyContent: 'center',
          mt: 3,
        }}
      >
        <Button
          component={RouterLink}
          to="/shop"
          endIcon={<ArrowForwardIcon />}
          variant="contained"
          color="info"
          fullWidth
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 999,
            py: 1.2,
          }}
        >
          View all devices
        </Button>
      </Box>
    </Box>
  )
}