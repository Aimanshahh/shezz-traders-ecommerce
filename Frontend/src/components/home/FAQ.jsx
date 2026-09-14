import { useState } from 'react'
import {
  Box, Container, Typography, Accordion, AccordionSummary,
  AccordionDetails, Stack, Button,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'

// 👇 CHANGE THIS to your real WhatsApp number
// Format: country code + number, NO plus sign, NO spaces, NO dashes
// Example: 0300-1234567  →  '923001234567'
const WHATSAPP_NUMBER = '9203357069452'
const WHATSAPP_MESSAGE = "Hi, I have a question about your GPS trackers."

const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`

const FAQS = [
  {
    q: 'Do I need a separate SIM card for the tracker?',
    a: 'No — every tracker we sell comes with a SIM already installed and activated. You just power it on and it connects to the network automatically. The SIM is included in the price with no extra paperwork.',
  },
  {
    q: 'How long does installation take?',
    a: 'Between 15 and 30 minutes for most vehicles. Our technician comes to your location anywhere in major cities — home, office, or workshop. For bikes, installation is usually done in under 15 minutes.',
  },
  {
    q: 'Will the tracker drain my vehicle battery?',
    a: 'No. Our devices draw less power than a car clock. When the vehicle is off, the tracker goes into deep sleep mode and uses almost nothing. Even if you park for weeks, your battery stays healthy.',
  },
  {
    q: 'Does it work without internet at my end?',
    a: 'The tracker needs cellular coverage (which is available nationwide), but you only need internet on your phone or laptop to view the live location. Works on 2G, 3G, and 4G networks.',
  },
  {
    q: 'Can I track from my phone?',
    a: 'Yes — we provide both a mobile app (Android & iOS) and a web dashboard. You can see live location, trip history, speed alerts, geofence notifications, and cut off the engine remotely, all from your phone.',
  },
  {
    q: 'What happens if the device stops working?',
    a: 'Every device comes with a 6-month warranty covering manufacturing defects. If anything goes wrong within that period, we replace it free of charge. Our support team is available 24/7 to help troubleshoot.',
  },
  {
    q: 'Do you deliver and install outside major cities?',
    a: 'Yes — we ship nationwide and arrange installation in over 500 cities and towns. For remote areas, we provide detailed self-installation guidance or connect you with our nearest partner technician.',
  },
]

export default function FAQ() {
  const [expanded, setExpanded] = useState(false)

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false)
  }

  return (
    <Box
      component="section"
      sx={{
        bgcolor: 'background.default',
        py: { xs: 6, md: 9 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' },
            gap: { xs: 5, md: 8 },
            alignItems: 'flex-start',
          }}
        >
          {/* ── Left: header ────────────────────────── */}
          <Box sx={{ position: { md: 'sticky' }, top: { md: 100 } }}>
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
              FAQ
            </Typography>

            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                color: 'text.primary',
                fontSize: { xs: '1.9rem', sm: '2.3rem', md: '2.6rem' },
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                mb: 2,
              }}
            >
              Questions we get a lot.
            </Typography>

            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.92rem', md: '0.95rem' },
                lineHeight: 1.7,
                mb: 3,
                maxWidth: 380,
              }}
            >
              Everything you need to know before buying. Can't find your
              answer? Our team replies within minutes.
            </Typography>

            <Button
              component="a"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="info"
              size="large"
              startIcon={<ChatOutlinedIcon />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 999,
                px: 3,
                borderColor: 'info.main',
                color: 'info.main',
                '&:hover': {
                  borderColor: 'info.dark',
                  bgcolor: 'info.main',
                  color: '#fff',
                },
              }}
            >
              Ask on WhatsApp
            </Button>
          </Box>

          {/* ── Right: accordions ───────────────────── */}
          <Stack spacing={1.25}>
            {FAQS.map((item, i) => (
              <Accordion
                key={i}
                expanded={expanded === i}
                onChange={handleChange(i)}
                disableGutters
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: expanded === i ? 'info.main' : 'divider',
                  borderRadius: '8px !important',
                  bgcolor: 'background.paper',
                  transition: 'border-color 0.2s ease',
                  '&::before': { display: 'none' },
                  '&.Mui-expanded': { margin: 0 },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <ExpandMoreIcon
                      sx={{
                        color: expanded === i ? 'info.main' : 'text.secondary',
                        transition: 'color 0.2s ease',
                      }}
                    />
                  }
                  sx={{
                    px: { xs: 2.5, md: 3 },
                    py: { xs: 1, md: 1.25 },
                    minHeight: 0,
                    '&.Mui-expanded': { minHeight: 0 },
                    '& .MuiAccordionSummary-content': {
                      my: 1.75,
                      '&.Mui-expanded': { my: 1.75 },
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: { xs: '1rem', md: '1.05rem' },
                      color: expanded === i ? 'info.main' : 'text.primary',
                      lineHeight: 1.4,
                      pr: 2,
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {item.q}
                  </Typography>
                </AccordionSummary>

                <AccordionDetails
                  sx={{
                    px: { xs: 2.5, md: 3 },
                    pt: 0,
                    pb: { xs: 2.25, md: 2.75 },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: '0.88rem', md: '0.92rem' },
                      lineHeight: 1.75,
                      color: 'text.secondary',
                    }}
                  >
                    {item.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}