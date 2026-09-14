import { Box, Container, Grid, Typography, Stack, Link, Divider, IconButton } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import FacebookIcon from '@mui/icons-material/Facebook'
import InstagramIcon from '@mui/icons-material/Instagram'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import { BRAND } from '../../theme/theme.js'

const QUICK_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

const SUPPORT_LINKS = [
  { label: 'FAQs', to: '/contact' },
  { label: 'Warranty', to: '/terms' },
  { label: 'Shipping', to: '/terms' },
]

const CONTACTS = [
  {
    icon: PhoneOutlinedIcon,
    label: 'Landline',
    value: '021-36930072',
    href: 'tel:02136930072',
  },
  {
    icon: SmartphoneOutlinedIcon,
    label: 'Mobile',
    value: '0335-7069452',
    href: 'tel:03357069452',
  },
  {
    icon: EmailOutlinedIcon,
    label: 'Email',
    value: 'info@shezztraders.com',
    href: 'mailto:info@shezztraders.com',
  },
]

const SOCIALS = [
  { icon: WhatsAppIcon, href: 'https://wa.me/923357069452', label: 'WhatsApp' },
]

function FooterLink({ to, children }) {
  return (
    <Link
      component={RouterLink}
      to={to}
      underline="none"
      sx={{
        color: 'rgba(255,255,255,0.65)',
        fontSize: '0.86rem',
        fontWeight: 500,
        width: 'fit-content',
        transition: 'color 0.2s ease, padding-left 0.2s ease',
        '&:hover': {
          color: 'info.main',
          pl: 0.5,
        },
      }}
    >
      {children}
    </Link>
  )
}

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        bgcolor: 'secondary.main',
        color: '#fff',
        mt: { xs: 6, md: 8 },
        pt: { xs: 5, md: 6 },
      }}
    >
      {/* Gradient hairline on top — matches header */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${BRAND.teal} 0%, ${BRAND.red} 50%, ${BRAND.orange} 100%)`,
        }}
      />

      <Container maxWidth="lg">
        {/* ── Main grid ───────────────────────────── */}
        <Grid container spacing={{ xs: 4, md: 5 }} sx={{ mb: { xs: 4, md: 5 } }}>
          {/* ═══ Brand ═══ */}
          <Grid size={{ xs: 12, sm: 12, md: 4 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <Box
                component="img"
                src="/images/logo.png"
                alt="Shezz Traders"
                sx={{
                  height: { xs: 48, md: 52 },
                  width: { xs: 48, md: 52 },
                  display: 'block',
                }}
              />
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: { xs: '1.2rem', md: '1.3rem' },
                  letterSpacing: 0.5,
                  lineHeight: 1,
                }}
              >
                <Box component="span" sx={{ color: '#fb3708' }}>
                  Shezz
                </Box>{' '}
                <Box component="span" sx={{ color: 'info.main' }}>
                  Traders
                </Box>
              </Typography>
            </Stack>

            <Typography
              sx={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.86rem',
                lineHeight: 1.7,
                maxWidth: 320,
                mb: 3,
              }}
            >
              Reliable GPS tracking and vehicle security solutions for families,
              businesses, and fleets across Pakistan.
            </Typography>

            {/* Socials */}
            <Stack direction="row" spacing={1}>
              {SOCIALS.map((s) => (
                <IconButton
                  key={s.label}
                  component="a"
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  sx={{
                    width: 38,
                    height: 38,
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.75)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'info.main',
                      bgcolor: 'info.main',
                      color: '#fff',
                    },
                  }}
                >
                  <s.icon sx={{ fontSize: 18 }} />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {/* ═══ Quick Links ═══ */}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'info.main',
                mb: 2,
              }}
            >
              Explore
            </Typography>
            <Stack spacing={1.25}>
              {QUICK_LINKS.map((l) => (
                <FooterLink key={l.label} to={l.to}>
                  {l.label}
                </FooterLink>
              ))}
            </Stack>
          </Grid>

          {/* ═══ Support ═══ */}
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'info.main',
                mb: 2,
              }}
            >
              Support
            </Typography>
            <Stack spacing={1.25}>
              {SUPPORT_LINKS.map((l) => (
                <FooterLink key={l.label} to={l.to}>
                  {l.label}
                </FooterLink>
              ))}
            </Stack>
          </Grid>

          {/* ═══ Contact ═══ */}
          <Grid size={{ xs: 12, sm: 4, md: 4 }}>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'info.main',
                mb: 2,
              }}
            >
              Get in touch
            </Typography>
            <Stack spacing={1.75}>
              {CONTACTS.map((c) => (
                <Box
                  key={c.label}
                  component="a"
                  href={c.href}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      '& .footer-contact-value': { color: 'info.main' },
                      '& .footer-contact-icon': {
                        bgcolor: 'info.main',
                        color: '#fff',
                        borderColor: 'info.main',
                      },
                    },
                  }}
                >
                  <Box
                    className="footer-contact-icon"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'info.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <c.icon sx={{ fontSize: 17 }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.45)',
                        lineHeight: 1.2,
                        mb: 0.25,
                      }}
                    >
                      {c.label}
                    </Typography>
                    <Typography
                      className="footer-contact-value"
                      sx={{
                        fontSize: '0.86rem',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.85)',
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {c.value}
                    </Typography>
                  </Box>
                </Box>
              ))}

{/* Location line */}
<Stack
  direction="row"
  spacing={1}
  alignItems="center"
  sx={{
    pt: 0.5,
    alignSelf: 'flex-end',                    // 👈 pushes to right
    color: 'rgba(255,255,255,0.55)',
  }}
>
  <LocationOnOutlinedIcon
    sx={{ fontSize: 16, color: 'info.main' }}
  />
  <Typography sx={{ fontSize: '0.82rem' }}>
    Karachi, Pakistan
  </Typography>
</Stack>
            </Stack>
          </Grid>
        </Grid>

        {/* ── Bottom bar ──────────────────────────── */}
        <Divider
          sx={{
            borderColor: 'rgba(255,255,255,0.08)',
            mb: 2.5,
          }}
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1.5}
          sx={{ pb: 4 }}
        >
          <Typography
            sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}
          >
            © {new Date().getFullYear()} Shezz Traders. All rights reserved.
          </Typography>

          <Stack direction="row" spacing={3} alignItems="center">
            <Link
              component={RouterLink}
              to="/privacy" 
              underline="none"
              sx={{
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.5)',
                transition: 'color 0.2s ease',
                '&:hover': { color: 'info.main' },
              }}
            >
              Privacy
            </Link>
            <Link
              component={RouterLink}
              to="/terms"
              underline="none"
              sx={{
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.5)',
                transition: 'color 0.2s ease',
                '&:hover': { color: 'info.main' },
              }}
            >
              Terms
            </Link>
            <Typography
              sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}
            >
              Made in 🇵🇰 Pakistan
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}