import { Box, Container, Stack, Typography } from '@mui/material'
import VerifiedIcon from '@mui/icons-material/Verified'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'

const BADGES = [
  { icon: VerifiedIcon, title: 'PTA Approved', sub: 'Certified devices' },
  { icon: WorkspacePremiumIcon, title: '6-month Warranty', sub: 'Full coverage' },
  { icon: SupportAgentIcon, title: '24/7 Support', sub: 'Always online' },
  { icon: BuildCircleIcon, title: 'Free Installation', sub: 'Nationwide' },
  { icon: LocalShippingIcon, title: 'Fast Delivery', sub: '2–3 days' },
]

const CLIENTS = [
  'FASTRIDE',
  'KARACHI CABS',
  'TRUCKMASTER',
  'CITYLINK LOGISTICS',
  'RIDERS CO.',
  'MOTORWAY PK',
  'SPEEDLINE',
  'TRANS ASIA',
]

export default function TrustBar() {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        {/* ── Badge row ────────────────────────────── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr 1fr',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(5, 1fr)',
            },
            columnGap: { xs: 2, md: 3 },
            rowGap: { xs: 2.5, md: 0 },
            alignItems: 'center',
          }}
        >
          {BADGES.map((b, i) => (
            <Stack
              key={b.title}
              direction="row"
              spacing={1.25}
              alignItems="center"
              sx={{
                justifyContent: { xs: 'flex-start', md: 'center' },
                position: 'relative',
                '&::after':
                  i < BADGES.length - 1
                    ? {
                        content: '""',
                        display: { xs: 'none', md: 'block' },
                        position: 'absolute',
                        right: -12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '1px',
                        height: 28,
                        bgcolor: 'divider',
                      }
                    : {},
              }}
            >
              <b.icon
                sx={{ fontSize: 22, color: 'primary.main', flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: 'text.primary',
                  }}
                >
                  {b.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    color: 'text.secondary',
                    lineHeight: 1.3,
                  }}
                >
                  {b.sub}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>

        {/* ── Divider ──────────────────────────────── */}
        <Box
          sx={{
            my: { xs: 3, md: 3.5 },
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        />

        {/* ── Section label ────────────────────────── */}
        <Typography
          sx={{
            textAlign: 'center',
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            mb: 2,
          }}
        >
          Trusted by 500+ businesses across Pakistan
        </Typography>

       
        <br></br>

        {/* ── Marquee ──────────────────────────────── */}
        <Box sx={{ overflow: 'hidden', position: 'relative' }}>
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              '&::before, &::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: { xs: 40, md: 80 },
                zIndex: 2,
                pointerEvents: 'none',
              },
              '&::before': {
                left: 0,
                background:
                  'linear-gradient(to right, #FAFAFA, rgba(250,250,250,0))',
              },
              '&::after': {
                right: 0,
                background:
                  'linear-gradient(to left, #FAFAFA, rgba(250,250,250,0))',
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 4, md: 6 },
                width: 'max-content',
                animation: 'marquee 32s linear infinite',
                '@keyframes marquee': {
                  from: { transform: 'translateX(0)' },
                  to: { transform: 'translateX(-50%)' },
                },
                '&:hover': { animationPlayState: 'paused' },
              }}
            >
              {[...CLIENTS, ...CLIENTS].map((name, i) => (
                <Box
                  key={`${name}-${i}`}
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: { xs: '0.95rem', md: '1.1rem' },
                    letterSpacing: '0.14em',
                    color: 'text.disabled',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.25s ease',
                    cursor: 'default',
                    userSelect: 'none',
                    '&:hover': { color: 'text.primary' },
                  }}
                >
                  {name}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}