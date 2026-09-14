import { Box, Container, Typography, Button, Stack } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import GpsFixedIcon from '@mui/icons-material/GpsFixed'
import ShieldIcon from '@mui/icons-material/Shield'
import FenceIcon from '@mui/icons-material/Fence'
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew'
import DevicesIcon from '@mui/icons-material/Devices'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import HeroFeatureItem from './HeroFeatureItem.jsx'

const FEATURES = [
  { icon: GpsFixedIcon, line1: 'Real-Time', line2: 'Tracking' },
  { icon: FenceIcon, line1: 'Geofencing', line2: 'Alerts' },
  { icon: PowerSettingsNewIcon, line1: 'Engine', line2: 'Immobilization' },
  { icon: DevicesIcon, line1: 'App & Web', line2: 'Access' },
]

export default function HeroSection() {
  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: '#0F1115',
        backgroundImage: 'url(/images/Hero.page.png)',
        backgroundSize: 'cover',
        backgroundPosition: { xs: 'center', md: 'right center' },
        minHeight: { xs: 'auto', md: 620 },
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: {
            xs: 'linear-gradient(to bottom, rgba(15,17,21,0.75), rgba(15,17,21,0.92))',
            md: 'linear-gradient(to right, rgba(15,17,21,0.95) 35%, rgba(15,17,21,0.55) 60%, transparent 85%)',
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', py: { xs: 6, md: 8 } }}>
        <Box sx={{ maxWidth: 640 }}>
          <Typography
            variant="overline"
            sx={{ color: 'grey.400', letterSpacing: 1.5, fontWeight: 600 }}
          >
            GPS Vehicle Tracking &amp; Security Solutions
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4rem' },
              lineHeight: 1.05,
              mt: 1,
            }}
          >
            <Box component="span" sx={{ color: 'primary.main' }}>
              Shezz{' '}
            </Box>
            <Box component="span" sx={{ color: 'info.main' }}>
              Traders
            </Box>
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              color: '#fff',
              fontSize: { xs: '1.6rem', sm: '2rem', md: '2.3rem' },
              lineHeight: 1.2,
              mb: 2,
            }}
          >
            Smart Vehicle Tracking &amp; Fleet Management
          </Typography>

          <Typography
            variant="body1"
            sx={{ color: 'grey.300', mb: 4, maxWidth: 480 }}
          >
            Advanced GPS Vehicle Tracking, Security &amp; Fleet Management Solutions in Pakistan.
          </Typography>

          {/* Feature grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(3, minmax(0, 1fr))',
                sm: 'repeat(5, minmax(0, 1fr))',
              },
              columnGap: { xs: 1.5, sm: 2 },
              rowGap: { xs: 3.5, sm: 4 },
              justifyItems: 'center',
              alignItems: 'start',
              mb: 5,
              width: '100%',
              maxWidth: { xs: 380, sm: 600 },
            }}
          >
            {FEATURES.map((f) => (
              <HeroFeatureItem
                key={f.line1}
                icon={f.icon}
                line1={f.line1}
                line2={f.line2}
              />
            ))}
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Button
              component={RouterLink}
              to="/shop"
              variant="contained"
              color="info"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{ borderRadius: 8, px: 3 }}
            >
              Get Started Today
            </Button>

            <Stack direction="row" spacing={1} alignItems="center">
              <LocationOnIcon sx={{ color: 'info.main' }} fontSize="small" />
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'grey.400', display: 'block', lineHeight: 1.2 }}
                >
                  Available All Over
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}
                >
                  Pakistan
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}