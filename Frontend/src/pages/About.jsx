import { Box, Container, Grid, Typography, Stack } from '@mui/material'
import GpsFixedIcon from '@mui/icons-material/GpsFixed'
import ShieldIcon from '@mui/icons-material/Shield'
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'

const VALUES = [
  {
    icon: ShieldIcon,
    title: 'Reliability first',
    desc: 'A tracker is only useful when it works every single time. We test every device before it ships and stand behind it with a 6-month warranty.',
  },
  {
    icon: HandshakeOutlinedIcon,
    title: 'Honest pricing',
    desc: 'No hidden charges, no confusing plans. What we quote is what you pay — whether you buy one tracker or a hundred.',
  },
  {
    icon: SupportAgentOutlinedIcon,
    title: 'Real human support',
    desc: 'You get a real person on WhatsApp or phone, not a chatbot. Our team answers within minutes, not days.',
  },
  {
    icon: GpsFixedIcon,
    title: 'Built for Pakistan',
    desc: 'Our devices are tuned for local cellular networks, local weather, and local roads — from Karachi\u2019s heat to Gilgit\u2019s cold.',
  },
]

const STATS = [
  { value: '5,000+', label: 'Vehicles protected' },
  { value: '500+', label: 'Cities covered' },
  { value: '5 yrs', label: 'In business' },
  { value: '24/7', label: 'Support' },
]

export default function About() {
  return (
    <Box>
      {/* ══════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════ */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 6, md: 9 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 720 }}>
            <Typography
              sx={{
                fontSize: { xs: '0.7rem', md: '0.75rem' },
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'info.main',
                mb: 1.5,
              }}
            >
              About Shezz Traders
            </Typography>

            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                color: 'text.primary',
                fontSize: { xs: '2rem', sm: '2.6rem', md: '3.2rem' },
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                mb: 2,
              }}
            >
              We help people keep what they{' '}
              <Box component="span" sx={{ color: 'info.main' }}>
                work hard for.
              </Box>
            </Typography>

            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.75,
                maxWidth: 580,
              }}
            >
              Shezz Traders is a Pakistan-based GPS tracking and vehicle
              security company. Since day one, our goal has been simple: make
              reliable tracking technology affordable and accessible for
              every family, business, and fleet in the country.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════
          CEO STATEMENT — dark band
      ══════════════════════════════════════════════ */}
      <Box
        component="section"
        sx={{
          position: 'relative',
          bgcolor: 'secondary.main',
          color: '#fff',
          py: { xs: 7, md: 11 },
          overflow: 'hidden',
        }}
      >
        {/* Soft teal glow behind quote */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: 380, md: 620 },
            height: { xs: 380, md: 620 },
            borderRadius: '50%',
            bgcolor: 'info.main',
            opacity: 0.14,
            filter: 'blur(120px)',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="md" sx={{ position: 'relative' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: { xs: '0.7rem', md: '0.75rem' },
                fontWeight: 700,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'info.main',
                mb: 3,
              }}
            >
              A message from our CEO
            </Typography>

            {/* Big quote */}
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.8rem' },
                lineHeight: 1.2,
                letterSpacing: '-0.005em',
                color: '#fff',
                mb: 4,
              }}
            >
              "We don't sell gadgets. We sell the{' '}
              <Box component="span" sx={{ color: 'info.main' }}>
                peace of mind
              </Box>{' '}
              that comes from always knowing where your vehicle is."
            </Typography>

          </Box>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════ */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 5, md: 6 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: { xs: 3, md: 4 },
            }}
          >
            {STATS.map((s) => (
              <Box key={s.label}>
                <Typography
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 800,
                    fontSize: { xs: '1.9rem', md: '2.4rem' },
                    color: 'info.main',
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                    mb: 0.75,
                  }}
                >
                  {s.value}
                </Typography>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════════
          VALUES
      ══════════════════════════════════════════════ */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Box sx={{ maxWidth: 620, mb: { xs: 5, md: 7 } }}>
            <Typography
              sx={{
                fontSize: { xs: '0.7rem', md: '0.75rem' },
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'info.main',
                mb: 1.5,
              }}
            >
              What we stand for
            </Typography>

            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                color: 'text.primary',
                fontSize: { xs: '1.9rem', sm: '2.2rem', md: '2.6rem' },
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              Four things we never compromise on.
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 3, md: 4 }}>
            {VALUES.map((v) => (
              <Grid key={v.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  sx={{
                    height: '100%',
                    p: { xs: 3, md: 3.5 },
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    transition: 'border-color 0.25s ease, transform 0.25s ease',
                    '&:hover': {
                      borderColor: 'info.main',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      bgcolor: 'rgba(0, 131, 143, 0.10)',
                      color: 'info.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <v.icon sx={{ fontSize: 22 }} />
                  </Box>

                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '1.15rem',
                      lineHeight: 1.25,
                      color: 'text.primary',
                      mb: 1,
                    }}
                  >
                    {v.title}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      lineHeight: 1.65,
                      color: 'text.secondary',
                    }}
                  >
                    {v.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  )
}