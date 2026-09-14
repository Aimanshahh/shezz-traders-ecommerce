import { useState } from 'react'
import { Box, Typography, IconButton, Stack } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { useCart } from '../../context/CartContext.jsx'

export default function CartItem({ item }) {
  const { removeItem, updateQuantity } = useCart()
  const [imgFailed, setImgFailed] = useState(false)

  const { productId, name, price, image, quantity } = item
  const lineTotal = Number(price) * quantity
  const showImage = image && !imgFailed

  return (
    <Box
      sx={{
        p: { xs: 1.75, sm: 2.25 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        transition: 'border-color 0.2s ease',
        '&:hover': { borderColor: 'info.main' },
      }}
    >
      {/* ═══════════════════════════════════════════════
          TOP: Image + Name + Price + Delete
      ═══════════════════════════════════════════════ */}
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 1.75, sm: 2.25 },
          alignItems: 'flex-start',
        }}
      >
        {/* Image */}
        <Box
          component={RouterLink}
          to={`/product/${productId}`}
          sx={{
            width: { xs: 76, sm: 100 },
            height: { xs: 76, sm: 100 },
            borderRadius: 1.5,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            textDecoration: 'none',
          }}
        >
          {showImage ? (
            <Box
              component="img"
              src={image}
              alt={name}
              onError={() => setImgFailed(true)}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <LocationOnIcon
              sx={{
                fontSize: { xs: 28, sm: 36 },
                color: 'info.main',
                opacity: 0.4,
              }}
            />
          )}
        </Box>

        {/* Right side: name, price, mobile delete */}
        <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={1}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component={RouterLink}
                to={`/product/${productId}`}
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: { xs: '1.05rem', sm: '1.2rem' },
                  lineHeight: 1.2,
                  color: 'text.primary',
                  textDecoration: 'none',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  mb: 0.75,
                  transition: 'color 0.2s ease',
                  '&:hover': { color: 'info.main' },
                }}
              >
                {name}
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: '0.78rem', sm: '0.85rem' },
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                PKR {Number(price).toLocaleString()} each
              </Typography>
            </Box>

            {/* Mobile/tablet delete — top right */}
            <IconButton
              size="small"
              onClick={() => removeItem(productId)}
              aria-label="Remove item"
              sx={{
                color: 'text.disabled',
                display: { xs: 'flex', md: 'none' },
                mt: -0.5,
                mr: -0.5,
                width: 32,
                height: 32,
                flexShrink: 0,
                '&:hover': { color: 'error.main', bgcolor: 'rgba(227,30,36,0.06)' },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {/* ═══════════════════════════════════════════════
          BOTTOM (mobile + tablet): qty + line total
          Filled background to separate visually
      ═══════════════════════════════════════════════ */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mt: 2,
          p: 1.25,
          pl: 1.5,
          borderRadius: 1.5,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <QtyStepper
          quantity={quantity}
          onDecrease={() =>
            updateQuantity(productId, Math.max(1, quantity - 1))
          }
          onIncrease={() => updateQuantity(productId, quantity + 1)}
        />

        <Stack alignItems="flex-end" spacing={0}>
          <Typography
            sx={{
              fontSize: '0.62rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              lineHeight: 1.2,
              mb: 0.25,
            }}
          >
            Subtotal
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'info.main',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            PKR {lineTotal.toLocaleString()}
          </Typography>
        </Stack>
      </Box>

      {/* ═══════════════════════════════════════════════
          BOTTOM (desktop only): qty left, total + delete right
      ═══════════════════════════════════════════════ */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mt: 2.5,
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <QtyStepper
          quantity={quantity}
          onDecrease={() =>
            updateQuantity(productId, Math.max(1, quantity - 1))
          }
          onIncrease={() => updateQuantity(productId, quantity + 1)}
        />

        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 800,
              fontSize: '1.35rem',
              color: 'info.main',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            PKR {lineTotal.toLocaleString()}
          </Typography>

          <IconButton
            size="small"
            onClick={() => removeItem(productId)}
            aria-label="Remove item"
            sx={{
              color: 'text.secondary',
              width: 34,
              height: 34,
              '&:hover': {
                color: 'error.main',
                bgcolor: 'rgba(227,30,36,0.06)',
              },
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  )
}

/* ── Quantity stepper ─────────────────────────────── */
function QtyStepper({ quantity, onDecrease, onIncrease }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        border: '1.5px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        height: 38,
        overflow: 'hidden',
        flexShrink: 0,
        bgcolor: 'background.paper',
        transition: 'border-color 0.2s ease',
        '&:hover': { borderColor: 'info.main' },
      }}
    >
      <IconButton
        size="small"
        onClick={onDecrease}
        aria-label="Decrease quantity"
        sx={{
          width: 34,
          height: '100%',
          borderRadius: 0,
          color: 'text.primary',
          '&:hover': { bgcolor: 'rgba(0,131,143,0.08)', color: 'info.main' },
        }}
      >
        <RemoveIcon sx={{ fontSize: 16 }} />
      </IconButton>

      <Box
        sx={{
          minWidth: 34,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 0.5,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            lineHeight: 1,
          }}
        >
          {quantity}
        </Typography>
      </Box>

      <IconButton
        size="small"
        onClick={onIncrease}
        aria-label="Increase quantity"
        sx={{
          width: 34,
          height: '100%',
          borderRadius: 0,
          color: 'text.primary',
          '&:hover': { bgcolor: 'rgba(0,131,143,0.08)', color: 'info.main' },
        }}
      >
        <AddIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Stack>
  )
}