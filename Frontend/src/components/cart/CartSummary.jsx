import { Box, Typography, Stack, Button, Divider } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { useCart } from '../../context/CartContext.jsx'

export default function CartSummary() {
  const { subtotal } = useCart()

  const shipping = 0
  const total = subtotal + shipping

  return (
    <Box
      sx={{
        p: { xs: 3, md: 3.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography
        sx={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'info.main',
          mb: 2.5,
        }}
      >
        Order summary
      </Typography>

      <Stack spacing={1.75} sx={{ mb: 2.5 }}>
        <SummaryRow
          label="Subtotal"
          value={`PKR ${subtotal.toLocaleString()}`}
        />
        <SummaryRow
          label="Shipping"
          value={shipping === 0 ? 'Free' : `PKR ${shipping.toLocaleString()}`}
          valueColor={shipping === 0 ? 'info.main' : 'text.primary'}
        />
      </Stack>

      <Divider sx={{ mb: 2.5 }} />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 2,
          mb: 3,
        }}
      >
        <Typography
          sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1 }}
        >
          Total
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 800,
            fontSize: '1.6rem',
            color: 'info.main',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          PKR {total.toLocaleString()}
        </Typography>
      </Box>

      <Button
        component={RouterLink}
        to="/checkout"
        variant="contained"
        color="info"
        size="large"
        fullWidth
        endIcon={<ArrowForwardIcon />}
        sx={{ borderRadius: 999, fontWeight: 700, py: 1.4, mb: 1.5 }}
      >
        Checkout
      </Button>

      <Button
        component={RouterLink}
        to="/shop"
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
        Continue shopping
      </Button>

      <Stack
        spacing={1.5}
        sx={{
          mt: 3,
          pt: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Perk
          icon={<LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />}
          text="Free delivery across Pakistan"
        />
        <Perk
          icon={<VerifiedOutlinedIcon sx={{ fontSize: 18 }} />}
          text="6-month warranty on every device"
        />
        <Perk
          icon={<LocationOnIcon sx={{ fontSize: 18 }} />}
          text="Free installation in major cities"
        />
      </Stack>
    </Box>
  )
}

function SummaryRow({ label, value, valueColor = 'text.primary' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        gap: 2,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.85rem',
          color: 'text.secondary',
          lineHeight: 1.4,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.88rem',
          fontWeight: 600,
          color: valueColor,
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function Perk({ icon, text }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          color: 'info.main',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontSize: '0.78rem',
          color: 'text.secondary',
          lineHeight: 1.4,
        }}
      >
        {text}
      </Typography>
    </Box>
  )
}