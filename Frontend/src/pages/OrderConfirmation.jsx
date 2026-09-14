import { useEffect, useState } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Container, Typography, Stack, Button, Divider, Chip,
  CircularProgress,
} from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

const PAYMENT_LABELS = {
  cod: 'Cash on Delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank: 'Bank Transfer',
}

export default function OrderConfirmation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('shezz_last_order')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed._id === id) {
          setOrder(parsed)
        }
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }, [id])

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
        <CircularProgress size={32} sx={{ color: 'info.main' }} />
      </Container>
    )
  }

  if (!order) {
    return (
      <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: '1.6rem',
            mb: 1,
          }}
        >
          Order details not found
        </Typography>
        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 3 }}>
          If you just placed an order, check your email or WhatsApp for
          confirmation, or contact us with your order number.
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center">
          <Button
            component={RouterLink}
            to="/shop"
            variant="contained"
            color="info"
            startIcon={<StorefrontOutlinedIcon />}
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
          >
            Continue shopping
          </Button>
        </Stack>
      </Container>
    )
  }

  const isOffline =
    order.paymentMethod === 'jazzcash' ||
    order.paymentMethod === 'easypaisa' ||
    order.paymentMethod === 'bank'

  const waMessage = encodeURIComponent(
    `Hi, I've placed order ${order.orderNumber}. Sending payment screenshot.`
  )
  const waLink = `https://wa.me/923357069452?text=${waMessage}`

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 6, md: 9 } }}>
      <Container maxWidth="sm">
        {/* Success icon */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              bgcolor: 'rgba(16,185,129,0.12)',
              color: '#0F8A5F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <CheckCircleOutlinedIcon sx={{ fontSize: 44 }} />
          </Box>

          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '2.4rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              mb: 1.5,
            }}
          >
            Order placed successfully!
          </Typography>

          <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary', lineHeight: 1.7 }}>
            Thank you{order.customer?.name ? `, ${order.customer.name.split(' ')[0]}` : ''}.
            We'll call you at <strong>{order.customer?.phone}</strong> to
            confirm your order.
          </Typography>
        </Box>

        {/* Order card */}
        <Box
          sx={{
            p: { xs: 3, md: 3.5 },
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            mb: 3,
          }}
        >
          {/* Header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2.5 }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  mb: 0.25,
                }}
              >
                Order number
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  color: 'info.main',
                  lineHeight: 1,
                }}
              >
                {order.orderNumber}
              </Typography>
            </Box>

            <Chip
              label={order.status}
              size="small"
              sx={{
                bgcolor: 'rgba(251,55,8,0.1)',
                color: '#fb3708',
                fontWeight: 700,
                fontSize: '0.7rem',
                height: 24,
                borderRadius: 999,
              }}
            />
          </Stack>

          <Divider sx={{ mb: 2.5 }} />

          {/* Items */}
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: 1.5,
            }}
          >
            Items ({order.items?.length || 0})
          </Typography>

          <Stack spacing={1.75} sx={{ mb: 2.5 }}>
            {(order.items || []).map((it, idx) => (
              <Stack
                key={idx}
                direction="row"
                spacing={1.5}
                alignItems="center"
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {it.image && (
                    <Box
                      component="img"
                      src={it.image}
                      alt={it.name}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      lineHeight: 1.2,
                      mb: 0.25,
                    }}
                  >
                    {it.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    Qty {it.quantity}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  PKR {(it.price * it.quantity).toLocaleString()}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Divider sx={{ mb: 2.5 }} />

          {/* Totals */}
          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                Subtotal
              </Typography>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>
                PKR {Number(order.subtotal || 0).toLocaleString()}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                Shipping
              </Typography>
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: 'info.main' }}>
                Free
              </Typography>
            </Stack>
            <Divider sx={{ my: 0.5 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                Total
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  color: 'info.main',
                }}
              >
                PKR {Number(order.total || 0).toLocaleString()}
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          {/* Payment */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              Payment method
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
            </Typography>
          </Stack>
        </Box>

        {/* Payment instructions for offline methods */}
        {isOffline && (
          <Box
            sx={{
              p: { xs: 3, md: 3.5 },
              borderRadius: 2,
              bgcolor: 'rgba(0,131,143,0.06)',
              border: '1px dashed rgba(0,131,143,0.3)',
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'info.main',
                mb: 1,
              }}
            >
              Next step: complete your payment
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.7, mb: 2 }}>
              Send <strong>PKR {Number(order.total || 0).toLocaleString()}</strong>{' '}
              to <strong>0335-7069452</strong> via{' '}
              {PAYMENT_LABELS[order.paymentMethod]} and share the screenshot
              on WhatsApp. Your order will be confirmed once we verify the
              payment.
            </Typography>

            <Button
              component="a"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              color="info"
              startIcon={<WhatsAppIcon />}
              sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
            >
              Send screenshot on WhatsApp
            </Button>
          </Box>
        )}

        {/* Next steps */}
        <Box
          sx={{
            p: { xs: 3, md: 3.5 },
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: 2,
            }}
          >
            What happens next
          </Typography>

          <Stack spacing={2}>
            <Step number="01" title="We call to confirm" desc="Our team will call you within 1–2 hours on business days." />
            <Step number="02" title="Order is packed" desc="We carefully pack and dispatch your tracker." />
            <Step number="03" title="Delivered to you" desc="Nationwide delivery in 2–3 working days." />
          </Stack>
        </Box>

        {/* Back to shop */}
        <Stack direction="row" spacing={1.5} justifyContent="center">
          <Button
            component={RouterLink}
            to="/shop"
            variant="outlined"
            color="info"
            endIcon={<ArrowForwardIcon />}
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600, px: 3 }}
          >
            Continue shopping
          </Button>
        </Stack>
      </Container>
    </Box>
  )
}

function Step({ number, title, desc }) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 800,
          fontSize: '1.1rem',
          color: 'info.main',
          minWidth: 32,
          lineHeight: 1.2,
        }}
      >
        {number}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', mb: 0.25 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.55 }}>
          {desc}
        </Typography>
      </Box>
    </Stack>
  )
}