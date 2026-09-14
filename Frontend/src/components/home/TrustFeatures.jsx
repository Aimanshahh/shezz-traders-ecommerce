import { Box, Container, Grid, Typography } from '@mui/material'
import GpsFixedIcon from '@mui/icons-material/GpsFixed'
import FenceIcon from '@mui/icons-material/Fence'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'

const FEATURES = [
  { icon: GpsFixedIcon, title: 'Real-Time Tracking', desc: 'Know the exact location' },
  { icon: FenceIcon, title: 'Geo-Fencing', desc: 'Get instant alerts' },
  { icon: BatteryChargingFullIcon, title: 'Long Battery Life', desc: 'Reliable performance' },
  { icon: SupportAgentIcon, title: '24/7 Support', desc: "We're always here" },
]

export default function TrustFeatures() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Grid container spacing={3}>
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <Grid size={{ xs: 6, md: 3 }} key={title}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Icon sx={{ color: 'info.main', fontSize: 28 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {desc}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}