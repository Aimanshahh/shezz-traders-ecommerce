import { useState, useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Container, Grid, Typography, TextField, Button, Stack,
  Divider, Radio, RadioGroup, FormControlLabel, CircularProgress,
  Snackbar, Alert, Chip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined'
import { useCart } from '../context/CartContext.jsx'
import { createOrder } from '../services/api.js'

const PAYMENT_METHODS = [
  {
    value: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay in cash when your order arrives',
    icon: LocalShippingOutlinedIcon,
  },
  {
    value: 'jazzcash',
    label: 'JazzCash',
    description: 'Send payment to our JazzCash account',
    icon: PhoneIphoneOutlinedIcon,
  },
  {
    value: 'easypaisa',
    label: 'EasyPaisa',
    description: 'Send payment to our EasyPaisa account',
    icon: PhoneIphoneOutlinedIcon,
  },
  {
    value: 'bank',
    label: 'Bank Transfer',
    description: 'Transfer to our bank account',
    icon: AccountBalanceOutlinedIcon,
  },
]

export default function Checkout() {
  const navigate = useNavigate()
  const { items, subtotal, clearCart } = useCart()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: '',
  })
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const shipping = 0
  const total = subtotal + shipping

  // Redirect if cart is empty (but not right after order placement)
  useEffect(() => {
    if (items.length === 0 && !submitting) {
      navigate('/shop', { replace: true })
    }
  }, [items.length, submitting, navigate])

  if (items.length === 0) {
    return null
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Your name is required.'
    if (!form.phone.trim()) err.phone = 'Phone number is required.'
    else if (!/^[0-9+\-\s()]{10,15}$/.test(form.phone.trim()))
      err.phone = 'Enter a valid phone number.'
    if (!form.address.trim()) err.address = 'Address is required.'
    if (!form.city.trim()) err.city = 'City is required.'
    return err
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (Object.keys(err).length) {
      setErrors(err)
      setToast({ severity: 'error', text: 'Please fill in all required fields.' })
      return
    }

    setSubmitting(true)
    try {
      // Build items payload from cart
      const orderItems = items.map((it) => ({
        productId: it.productId || it.product?._id || it.product?.id,
        quantity: it.quantity,
      }))

      const order = await createOrder({
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
        },
        items: orderItems,
        paymentMethod,
        notes: form.notes.trim(),
      })

      // Save order in sessionStorage so confirmation page can read it
      sessionStorage.setItem('shezz_last_order', JSON.stringify(order))

      // Clear the cart
      clearCart()

      // Navigate to confirmation
      navigate(`/order-confirmation/${order._id}`, { replace: true })
    } catch (err) {
      console.error('Order failed:', err)
      setToast({
        severity: 'error',
        text: err?.message || 'Could not place order. Please try again.',
      })
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 5, md: 7 } }}>
      <Container maxWidth="lg">
        {/* Back link */}
        <Button
          component={RouterLink}
          to="/cart"
          startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
          disableRipple
          sx={{
            p: 0,
            mb: 2,
            minWidth: 0,
            textTransform: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'text.secondary',
            '&:hover': { color: 'info.main', bgcolor: 'transparent' },
          }}
        >
          Back to cart
        </Button>

        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 800,
            fontSize: { xs: '1.85rem', md: '2.3rem' },
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            color: 'text.primary',
            mb: 4,
          }}
        >
          Checkout
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 400px' },
            gap: { xs: 3, lg: 4 },
            alignItems: 'flex-start',
          }}
        >
          {/* LEFT — form */}
          <Stack spacing={3}>
            {/* Delivery details */}
            <Section title="Delivery details">
              <Stack spacing={2.5}>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Full name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      error={!!errors.name}
                      helperText={errors.name}
                      fullWidth
                      required
                      autoComplete="name"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Phone number"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      error={!!errors.phone}
                      helperText={errors.phone || 'We will call to confirm'}
                      fullWidth
                      required
                      autoComplete="tel"
                      placeholder="0300 1234567"
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Email (optional)"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  fullWidth
                  autoComplete="email"
                />

                <TextField
                  label="Delivery address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  error={!!errors.address}
                  helperText={errors.address}
                  fullWidth
                  required
                  multiline
                  rows={2}
                  autoComplete="street-address"
                  placeholder="House / flat number, street, area"
                />

                <TextField
                  label="City"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  error={!!errors.city}
                  helperText={errors.city}
                  fullWidth
                  required
                  autoComplete="address-level2"
                  placeholder="Karachi, Lahore, Islamabad…"
                />

                <TextField
                  label="Order notes (optional)"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Any special instructions for delivery…"
                />
              </Stack>
            </Section>

            {/* Payment method */}
            <Section title="Payment method">
              <RadioGroup
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <Stack spacing={1.5}>
                  {PAYMENT_METHODS.map((m) => {
                    const active = paymentMethod === m.value
                    return (
                      <Box
                        key={m.value}
                        onClick={() => setPaymentMethod(m.value)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          border: '1.5px solid',
                          borderColor: active ? 'info.main' : 'divider',
                          bgcolor: active
                            ? 'rgba(0,131,143,0.04)'
                            : 'background.paper',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          '&:hover': {
                            borderColor: 'info.main',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: active
                              ? 'info.main'
                              : 'rgba(0,131,143,0.1)',
                            color: active ? '#fff' : 'info.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.18s ease',
                          }}
                        >
                          <m.icon sx={{ fontSize: 20 }} />
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{ fontWeight: 700, fontSize: '0.92rem', mb: 0.25 }}
                          >
                            {m.label}
                          </Typography>
                          <Typography
                            sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                          >
                            {m.description}
                          </Typography>
                        </Box>

                        <FormControlLabel
                          value={m.value}
                          control={
                            <Radio
                              sx={{
                                color: 'divider',
                                '&.Mui-checked': { color: 'info.main' },
                              }}
                            />
                          }
                          label=""
                          sx={{ m: 0 }}
                        />
                      </Box>
                    )
                  })}
                </Stack>
              </RadioGroup>

              {/* Payment instructions for JazzCash/EasyPaisa */}
              {paymentMethod === 'jazzcash' && (
                <Box
                  sx={{
                    mt: 2.5,
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(0,131,143,0.06)',
                    border: '1px dashed rgba(0,131,143,0.3)',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      mb: 1,
                      color: 'info.main',
                    }}
                  >
                    JazzCash payment instructions
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.7 }}
                  >
                    Send <strong>PKR {total.toLocaleString()}</strong> to our
                    JazzCash account and share the screenshot on WhatsApp.
                    We'll confirm your order within minutes.
                    <br />
                    <strong>Account:</strong> 0335-7069452
                  </Typography>
                </Box>
              )}

              {paymentMethod === 'easypaisa' && (
                <Box
                  sx={{
                    mt: 2.5,
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(0,131,143,0.06)',
                    border: '1px dashed rgba(0,131,143,0.3)',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      mb: 1,
                      color: 'info.main',
                    }}
                  >
                    EasyPaisa payment instructions
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.7 }}
                  >
                    Send <strong>PKR {total.toLocaleString()}</strong> to our
                    EasyPaisa account and share the screenshot on WhatsApp.
                    We'll confirm your order within minutes.
                    <br />
                    <strong>Account:</strong> 0335-7069452
                  </Typography>
                </Box>
              )}

              {paymentMethod === 'bank' && (
                <Box
                  sx={{
                    mt: 2.5,
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(0,131,143,0.06)',
                    border: '1px dashed rgba(0,131,143,0.3)',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      mb: 1,
                      color: 'info.main',
                    }}
                  >
                    Bank transfer instructions
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.7 }}
                  >
                    Transfer <strong>PKR {total.toLocaleString()}</strong> to our
                    bank account and share the receipt on WhatsApp.
                    <br />
                    <strong>Account details will be sent on WhatsApp after order.</strong>
                  </Typography>
                </Box>
              )}
            </Section>
          </Stack>

          {/* RIGHT — summary */}
          <Stack
            spacing={2}
            sx={{
              p: { xs: 3, md: 3.5 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              position: { lg: 'sticky' },
              top: { lg: 100 },
            }}
          >
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
              Order summary
            </Typography>

            {/* Item list */}
            <Stack spacing={1.5} sx={{ maxHeight: 280, overflowY: 'auto', py: 1 }}>
              {items.map((it) => {
                const name = it.name || it.product?.name || 'Item'
                const price = Number(it.price ?? it.product?.price ?? 0)
                const image =
                  it.image ||
                  (Array.isArray(it.product?.images) && it.product.images[0]) ||
                  it.product?.image ||
                  ''

                return (
                  <Stack
                    key={it.productId || it.product?._id || it.product?.id}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1,
                        bgcolor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'divider',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {image && (
                        <Box
                          component="img"
                          src={image}
                          alt={name}
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
                        {name}
                      </Typography>
                      <Typography
                        sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
                      >
                        Qty {it.quantity} × PKR {price.toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      PKR {(price * it.quantity).toLocaleString()}
                    </Typography>
                  </Stack>
                )
              })}
            </Stack>

            <Divider />

            <Stack spacing={1.5}>
              <Row label="Subtotal" value={`PKR ${subtotal.toLocaleString()}`} />
              <Row label="Shipping" value="Free" valueColor="info.main" />
            </Stack>

            <Divider />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                }}
              >
                Total
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 800,
                  fontSize: '1.7rem',
                  color: 'info.main',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                PKR {total.toLocaleString()}
              </Typography>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="info"
              size="large"
              fullWidth
              disabled={submitting}
              endIcon={!submitting && <ArrowForwardIcon />}
              sx={{
                borderRadius: 999,
                fontWeight: 700,
                py: 1.4,
                mt: 1,
              }}
            >
              {submitting ? (
                <CircularProgress size={18} sx={{ color: '#fff' }} />
              ) : (
                'Place Order'
              )}
            </Button>

            <Typography
              sx={{
                fontSize: '0.72rem',
                color: 'text.secondary',
                textAlign: 'center',
                mt: 0.5,
              }}
            >
              By placing this order you agree to our{' '}
              <Box
                component={RouterLink}
                to="/terms"
                sx={{ color: 'info.main', textDecoration: 'underline' }}
              >
                Terms
              </Box>
            </Typography>
          </Stack>
        </Box>
      </Container>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity || 'info'}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {toast?.text}
        </Alert>
      </Snackbar>
    </Box>
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

function Row({ label, value, valueColor = 'text.primary' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.88rem',
          fontWeight: 600,
          color: valueColor,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}