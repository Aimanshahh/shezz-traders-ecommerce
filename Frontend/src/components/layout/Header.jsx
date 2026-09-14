import { useState, useEffect } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  AppBar, Toolbar, Box, Typography, Stack, Link, IconButton, Badge,
  Drawer, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import MailOutlinedIcon from '@mui/icons-material/MailOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useCart } from '../../context/CartContext.jsx'
import { BRAND } from '../../theme/theme.js'

const NAV_LINKS = [
  { label: 'Home', to: '/', icon: HomeOutlinedIcon },
  { label: 'Shop', to: '/shop', icon: StorefrontOutlinedIcon },
  { label: 'About', to: '/about', icon: InfoOutlinedIcon },
  { label: 'Contact', to: '/contact', icon: MailOutlinedIcon },
]

const NAV_HEIGHT = { xs: 64, md: 76 }

export default function Header() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { itemCount } = useCart()
  const location = useLocation()

  const isHome = location.pathname === '/'
  const transparent = isHome && !scrolled

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        color="transparent"
        sx={{
          top: 0,
          left: 0,
          right: 0,
          bgcolor: transparent ? 'transparent' : 'secondary.main',
          backgroundImage: 'none',
          boxShadow: 'none',
          borderBottom: 'none',
          transition: 'background-color 0.3s ease',
          zIndex: theme.zIndex.appBar,
          '&::after': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '2px',
            background: `linear-gradient(90deg, ${BRAND.teal} 0%, ${BRAND.red} 50%, ${BRAND.orange} 100%)`,
            opacity: transparent ? 0 : 0.9,
            transition: 'opacity 0.3s ease',
          },
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            py: { xs: 1.25, md: 1.5 },
            px: { xs: 2, md: 3 },
            minHeight: { xs: 64, md: 76 },
          }}
        >
          {/* Logo */}
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box
              component="img"
              src="/images/logo.png"
              alt="ShezzTraders"
              sx={{
                height: { xs: 36, md: 48 },
                width: { xs: 36, md: 48 },
                display: 'block',
              }}
            />
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.1rem', md: '1.35rem' },
                letterSpacing: 0.5,
                lineHeight: 1,
              }}
            >
              <Box component="span" sx={{ color: '#fff' }}>
                Shezz
              </Box>{' '}
              <Box component="span" sx={{ color: BRAND.teal }}>
                Traders
              </Box>
            </Typography>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <Stack direction="row" spacing={1}>
              {NAV_LINKS.map((link) => {
                const active = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    component={RouterLink}
                    to={link.to}
                    underline="none"
                    sx={{
                      position: 'relative',
                      px: 1.75,
                      py: 1,
                      borderRadius: 1,
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                      transition: 'color 0.2s ease',
                      '&:hover': { color: BRAND.teal },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        left: 14,
                        right: 14,
                        bottom: 4,
                        height: '2px',
                        borderRadius: 1,
                        background: active
                          ? `linear-gradient(90deg, ${BRAND.teal}, ${BRAND.red})`
                          : 'transparent',
                        transition: 'background 0.25s ease',
                      },
                    }}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </Stack>
          )}

          {/* Right actions */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              component={RouterLink}
              to="/cart"
              aria-label="cart"
              sx={{
                color: '#fff',
                width: 40,
                height: 40,
                '&:hover': {
                  color: BRAND.teal,
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              <Badge
                badgeContent={itemCount}
                max={99}
                overlap="circular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.6rem',
                    minWidth: 17,
                    height: 17,
                    px: 0.5,
                    borderRadius: 999,
                    border: '2px solid',
                    borderColor: transparent ? '#0F1115' : 'secondary.main',
                    transition:
                      'border-color 0.3s ease, transform 0.2s ease, opacity 0.2s ease',
                    transform: itemCount === 0 ? 'scale(0)' : 'scale(1)',
                    opacity: itemCount === 0 ? 0 : 1,
                  },
                }}
              >
                <ShoppingCartOutlinedIcon sx={{ fontSize: 22 }} />
              </Badge>
            </IconButton>

            {isMobile && (
              <IconButton
                aria-label="open navigation menu"
                onClick={() => setDrawerOpen(true)}
                sx={{
                  color: '#fff',
                  width: 40,
                  height: 40,
                  '&:hover': {
                    color: BRAND.teal,
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <MenuIcon sx={{ fontSize: 24 }} />
              </IconButton>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* ═══════════════════════════════════════════
          Mobile drawer
      ═══════════════════════════════════════════ */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            sx: {
              width: 300,
              maxWidth: '85vw',
              height: '100vh',
              bgcolor: 'secondary.main',
              backgroundImage: 'none',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
              overflow: 'hidden',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.35)',
            },
          },
        }}
      >
        {/* ── Top bar: brand + close ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 2,
            flexShrink: 0,
            borderBottom: '1px solid',
            borderColor: 'rgba(255,255,255,0.08)',
            minHeight: 64,
          }}
        >
          <Box
            component={RouterLink}
            to="/"
            onClick={() => setDrawerOpen(false)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              textDecoration: 'none',
            }}
          >
            <Box
              component="img"
              src="/images/logo.png"
              alt="ShezzTraders"
              sx={{
                height: 32,
                width: 32,
                display: 'block',
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#fff',
                letterSpacing: 0.5,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              Shezz{' '}
              <Box component="span" sx={{ color: BRAND.teal }}>
                Traders
              </Box>
            </Typography>
          </Box>

          <IconButton
            onClick={() => setDrawerOpen(false)}
            aria-label="close menu"
            sx={{
              color: 'rgba(255,255,255,0.65)',
              width: 36,
              height: 36,
              ml: 1,
              flexShrink: 0,
              border: '1px solid',
              borderColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* ── Nav section ── */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            px: 2,
            py: 2.5,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
              mb: 1.5,
              px: 1.5,
            }}
          >
            Menu
          </Typography>

          <Stack spacing={0.75}>
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to
              const Icon = link.icon
              return (
                <Box
                  key={link.to}
                  component={RouterLink}
                  to={link.to}
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.75,
                    px: 1.75,
                    py: 1.5,
                    borderRadius: 1.5,
                    textDecoration: 'none',
                    color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                    bgcolor: active
                      ? 'rgba(0,184,212,0.14)'
                      : 'transparent',
                    borderLeft: '3px solid',
                    borderColor: active ? BRAND.teal : 'transparent',
                    transition: 'all 0.18s ease',
                    '&:hover': {
                      bgcolor: active
                        ? 'rgba(0,184,212,0.2)'
                        : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                    },
                  }}
                >
                  <Icon
                    sx={{
                      fontSize: 20,
                      color: active ? BRAND.teal : 'rgba(255,255,255,0.5)',
                      transition: 'color 0.18s ease',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.95rem',
                      fontWeight: active ? 700 : 500,
                      flex: 1,
                    }}
                  >
                    {link.label}
                  </Typography>
                  {active && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: BRAND.teal,
                      }}
                    />
                  )}
                </Box>
              )
            })}
          </Stack>

          {/* Contact info */}
          <Typography
            sx={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
              mt: 4,
              mb: 1.5,
              px: 1.5,
            }}
          >
            Get in touch
          </Typography>

          <Stack spacing={1.25}>
            <Box
              component="a"
              href="tel:03357069452"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.75,
                px: 1.75,
                py: 1.25,
                borderRadius: 1.5,
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.7)',
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: BRAND.teal,
                },
              }}
            >
              <PhoneOutlinedIcon
                sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.2,
                    mb: 0.25,
                  }}
                >
                  Call us
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  0335-7069452
                </Typography>
              </Box>
            </Box>

            <Box
              component="a"
              href="mailto:info@shezztraders.com"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.75,
                px: 1.75,
                py: 1.25,
                borderRadius: 1.5,
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.7)',
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: BRAND.teal,
                },
              }}
            >
              <MailOutlinedIcon
                sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.2,
                    mb: 0.25,
                  }}
                >
                  Email us
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  info@shezztraders.com
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>

        {/* ── Bottom: cart CTA ── */}
        <Box sx={{ flexShrink: 0 }}>
          <Box sx={{ px: 2, py: 2 }}>
            <Box
              component={RouterLink}
              to="/cart"
              onClick={() => setDrawerOpen(false)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                px: 2.25,
                py: 1.5,
                borderRadius: 2,
                bgcolor: 'info.main',
                color: '#fff',
                textDecoration: 'none',
                transition: 'background-color 0.2s ease',
                '&:hover': { bgcolor: 'info.dark' },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <ShoppingCartOutlinedIcon sx={{ fontSize: 20 }} />
                <Typography
                  sx={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  View cart
                </Typography>
                {itemCount > 0 && (
                  <Box
                    sx={{
                      minWidth: 22,
                      height: 22,
                      px: 0.75,
                      borderRadius: 999,
                      bgcolor: '#fff',
                      color: 'info.main',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {itemCount}
                  </Box>
                )}
              </Stack>
              <ArrowForwardIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>

          {/* Gradient stripe */}
          <Box
            sx={{
              height: 4,
              background: `linear-gradient(90deg, ${BRAND.teal} 0%, ${BRAND.red} 50%, ${BRAND.orange} 100%)`,
            }}
          />
        </Box>
      </Drawer>

      <Box
        sx={{
          height: NAV_HEIGHT,
          display: isHome ? 'none' : 'block',
        }}
      />
    </>
  )
}