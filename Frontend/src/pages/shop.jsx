import { useState, useMemo, useEffect } from 'react'
import {
  Container, Grid, Box, Typography, Drawer, Button, useMediaQuery,
  Fade, Stack, Divider, IconButton, CircularProgress,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import FilterListIcon from '@mui/icons-material/FilterList'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ProductCard from '../components/product/ProductCard.jsx'
import CategorySidebar from '../components/shop/CategorySidebar.jsx'
import { getProducts, getCategories } from '../services/api.js'

export default function Shop() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([
    { name: 'All Products', count: 0 },
  ])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All Products')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  // ── Fetch products + categories from backend ────────
  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const [prods, cats] = await Promise.all([
          getProducts(),
          getCategories(),
        ])
        if (!alive) return

        setProducts(prods)
        setCategories([
          { name: 'All Products', count: prods.length },
          ...cats.map((c) => ({
            name: c.name,
            count: c.productCount || 0,
          })),
        ])
      } catch (err) {
        console.error('Failed to load shop data:', err)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All Products') return products
    return products.filter((p) => p.category === selectedCategory)
  }, [products, selectedCategory])

  const handleSelect = (cat) => {
    setSelectedCategory(cat)
    setFilterDrawerOpen(false)
  }

  const isFiltered = selectedCategory !== 'All Products'

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* ── Light hero header ────────────────────────────── */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 340,
            height: 340,
            borderRadius: '50%',
            bgcolor: 'error.main',
            opacity: 0.06,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -140,
            left: -80,
            width: 260,
            height: 260,
            borderRadius: '50%',
            bgcolor: 'error.main',
            opacity: 0.04,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, position: 'relative' }}>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontSize: { xs: '0.72rem', sm: '0.82rem' },
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'error.main',
              mb: 1.2,
            }}
          >
            Browse the collection
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.4rem' },
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              mb: 1.5,
            }}
          >
            Shop All Devices
          </Typography>

          <Typography
            sx={{
              color: 'text.secondary',
              maxWidth: 560,
              fontSize: { xs: '0.92rem', md: '1rem' },
              lineHeight: 1.6,
            }}
          >
            GPS trackers, vehicle devices, and personal safety gear | built for
            real-world reliability.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* ── Mobile filter bar ───────────────────────── */}
        {isMobile && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            onClick={() => setFilterDrawerOpen(true)}
            sx={{
              mb: 3,
              px: 2,
              py: 1.4,
              gap: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                borderColor: 'error.main',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ minWidth: 0, flex: 1 }}
            >
              <FilterListIcon
                sx={{ fontSize: 20, color: 'error.main', flexShrink: 0 }}
              />
              <Typography
                fontWeight={600}
                fontSize="0.9rem"
                noWrap
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {selectedCategory}
              </Typography>
            </Stack>

            <Typography
              fontSize="0.78rem"
              color="text.secondary"
              sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'item' : 'items'}
            </Typography>
          </Stack>
        )}

        <Grid container spacing={{ xs: 3, md: 4 }}>
          {/* ── Desktop sidebar ───────────────────────── */}
          {!isMobile && (
            <Grid size={{ md: 3 }}>
              <Box
                sx={{
                  position: 'sticky',
                  top: 96,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  p: 2.5,
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: 'text.secondary',
                    fontSize: '0.68rem',
                    mb: 1,
                  }}
                >
                  Categories
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                <CategorySidebar
                  selected={selectedCategory}
                  onSelect={handleSelect}
                  categories={categories}
                />
              </Box>
            </Grid>
          )}

          {/* ── Products column ───────────────────────── */}
          <Grid size={{ xs: 12, md: 9 }}>
            {!isMobile && (
              <Box sx={{ mb: 3 }}>
                {isFiltered && (
                  <Button
                    onClick={() => handleSelect('All Products')}
                    startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
                    disableRipple
                    sx={{
                      p: 0,
                      mb: 1,
                      minWidth: 0,
                      textTransform: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main', bgcolor: 'transparent' },
                    }}
                  >
                    All products
                  </Button>
                )}

                <Typography
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: { md: '1.5rem', lg: '1.75rem' },
                    lineHeight: 1.1,
                  }}
                >
                  {selectedCategory}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                  {filteredProducts.length}{' '}
                  {filteredProducts.length === 1 ? 'product' : 'products'} available
                </Typography>
              </Box>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress size={32} sx={{ color: 'error.main' }} />
              </Box>
            ) : filteredProducts.length === 0 ? (
              <Box
                sx={{
                  py: { xs: 6, md: 10 },
                  textAlign: 'center',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: '1.4rem',
                    mb: 0.5,
                  }}
                >
                  Nothing here yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {products.length === 0
                    ? 'Products will appear here once they are added to the store.'
                    : 'Try a different category.'}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                {filteredProducts.map((product, index) => (
                  <Grid
                    key={product._id || product.id}
                    size={{ xs: 6, sm: 6, md: 6, lg: 4 }}
                    sx={{ display: 'flex' }}
                  >
                    <Fade in timeout={300 + Math.min(index, 8) * 70}>
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                        }}
                      >
                        <ProductCard product={product} />
                      </Box>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* ── Mobile drawer ──────────────────────────────── */}
      <Drawer
        anchor="left"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        PaperProps={{ sx: { width: 300, bgcolor: 'background.paper' } }}
      >
        <Box sx={{ p: 2.5 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.5 }}
          >
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: '1.3rem',
              }}
            >
              Categories
            </Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <CategorySidebar
            selected={selectedCategory}
            onSelect={handleSelect}
            categories={categories}
          />
        </Box>
      </Drawer>
    </Box>
  )
}