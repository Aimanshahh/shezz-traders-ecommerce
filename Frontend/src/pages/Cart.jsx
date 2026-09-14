import { Box, Container, Grid, Typography, Button, Stack, Chip } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import CartItem from '../components/cart/CartItem.jsx'
import CartSummary from '../components/cart/CartSummary.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function Cart() {
  const { items, itemCount } = useCart()

  // ── Empty state ─────────────────────────────────────
  if (!items || items.length === 0) {
    return (
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                bgcolor: 'rgba(0,131,143,0.08)',
                color: 'info.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <LocalShippingOutlinedIcon sx={{ fontSize: 44 }} />
            </Box>

            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1.75rem', md: '2.2rem' },
                lineHeight: 1.1,
                color: 'text.primary',
                mb: 1.5,
              }}
            >
              Your cart is empty.
            </Typography>

            <Typography
              sx={{
                fontSize: '0.95rem',
                color: 'text.secondary',
                lineHeight: 1.7,
                maxWidth: 400,
                mx: 'auto',
                mb: 4,
              }}
            >
              Looks like you haven't added anything yet. Browse our trackers
              and find the right one for your vehicle.
            </Typography>

            <Button
              component={RouterLink}
              to="/shop"
              variant="contained"
              color="info"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ borderRadius: 999, px: 4, py: 1.3, fontWeight: 700 }}
            >
              Browse devices
            </Button>
          </Box>
        </Container>
      </Box>
    )
  }

  // ── Filled cart ─────────────────────────────────────
  return (
    <Box sx={{ py: { xs: 4, md: 7 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: { xs: 3, md: 5 } }}>
          <Button
            component={RouterLink}
            to="/shop"
            startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
            disableRipple
            sx={{
              p: 0,
              mb: { xs: 2, md: 2.5 },
              minWidth: 0,
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'text.secondary',
              '&:hover': { color: 'info.main', bgcolor: 'transparent' },
            }}
          >
            Continue shopping
          </Button>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ width: '100%' }}
          >
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1.6rem', sm: '1.85rem', md: '2.3rem' },
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                color: 'text.primary',
              }}
            >
              Your Cart
            </Typography>

            <Chip
              label={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
              size="small"
              sx={{
                bgcolor: 'rgba(0,131,143,0.10)',
                color: 'info.main',
                fontWeight: 700,
                fontSize: '0.72rem',
                height: 24,
                borderRadius: 999,
                px: 0.75,
                flexShrink: 0,
              }}
            />
          </Stack>
        </Box>

        <Grid container spacing={{ xs: 3, md: 4 }}>
          {/* Items */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={{ xs: 1.75, md: 2 }}>
              {items.map((it) => (
                <CartItem key={it.productId} item={it} />
              ))}
            </Stack>
          </Grid>

          {/* Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 100 } }}>
              <CartSummary />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}