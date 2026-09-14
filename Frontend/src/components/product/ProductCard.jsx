import { useState } from 'react'
import { Card, CardContent, Typography, Box, Rating } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import LocationOnIcon from '@mui/icons-material/LocationOn'

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const id = product._id || product.id

  const primaryImage =
    (Array.isArray(product.images) && product.images[0]) ||
    product.image ||
    ''

  const showImage = primaryImage && !imgFailed
  const hasRating = Number(product.rating) > 0
  const imageCount = Array.isArray(product.images)
    ? product.images.length
    : 0

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: hovered ? 'info.main' : 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        transition:
          'border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 12px 28px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      <Box
        component={RouterLink}
        to={`/product/${id}`}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          aspectRatio: '4 / 3',
          bgcolor: 'grey.50',
          overflow: 'hidden',
        }}
      >
        {showImage ? (
          <Box
            component="img"
            src={primaryImage}
            alt={product.name}
            onError={() => setImgFailed(true)}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.35s ease',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        ) : (
          <LocationOnIcon
            sx={{
              fontSize: { xs: 56, sm: 64, md: 72 },
              color: 'rgba(15,17,21,0.10)',
              transition: 'transform 0.35s ease, color 0.35s ease',
              transform: hovered ? 'scale(1.08)' : 'scale(1)',
              ...(hovered && { color: 'rgba(0,131,143,0.22)' }),
            }}
          />
        )}

        {product.isNew && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              bgcolor: 'error.main',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              px: 1.2,
              py: 0.4,
              borderRadius: 1,
              zIndex: 1,
            }}
          >
            New
          </Box>
        )}

        {imageCount > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              bgcolor: 'rgba(15,17,21,0.65)',
              color: '#fff',
              fontSize: '0.68rem',
              fontWeight: 700,
              px: 1,
              py: 0.3,
              borderRadius: 1,
              backdropFilter: 'blur(6px)',
            }}
          >
            {imageCount} photos
          </Box>
        )}
      </Box>

      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 1.75, sm: 2, md: 2.25 },
          '&:last-child': { pb: { xs: 1.75, sm: 2, md: 2.25 } },
        }}
      >
        <Typography
          component={RouterLink}
          to={`/product/${id}`}
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: { xs: '1.1rem', sm: '1.15rem', md: '1.2rem' },
            lineHeight: 1.25,
            color: 'text.primary',
            textDecoration: 'none',
            mb: 0.5,
            transition: 'color 0.2s ease',
            '&:hover': { color: 'info.main' },
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.name}
        </Typography>

        {hasRating && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 1,
              flexWrap: 'wrap',
            }}
          >
            <Rating
              value={product.rating}
              precision={0.1}
              readOnly
              size="small"
              sx={{ color: 'warning.main' }}
            />
            <Typography variant="caption" color="text.secondary">
              ({product.rating})
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: { xs: '1.15rem', sm: '1.25rem' },
              color: 'info.main',
              letterSpacing: '0.01em',
            }}
          >
            PKR {Number(product.price).toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}