import { useState } from 'react'
import {
  Box, Container, Grid, Typography, Stack, TextField, Button,
  Divider, Snackbar, Alert, CircularProgress, Chip,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

// 👇 Your business WhatsApp number — no +, no spaces, no dashes
const WHATSAPP_NUMBER = '923357069452'

const CONTACTS = [
  {
    icon: PhoneOutlinedIcon,
    label: 'Landline',
    value: '021-36930072',
    href: 'tel:02136930072',
  },
  {
    icon: SmartphoneOutlinedIcon,
    label: 'Mobile / WhatsApp',
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

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [toast, setToast] = useState(null)
  const [sending, setSending] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (sending) return

    // Basic validation
    if (!form.name.trim() || !form.message.trim()) {
      setToast({
        severity: 'error',
        text: 'Please fill in your name and message.',
      })
      return
    }

    setSending(true)

    // Build a formatted WhatsApp message
    const lines = [
      'Hi Shezz Traders,',
      '',
      `Name: ${form.name.trim()}`,
    ]
    if (form.email.trim()) {
      lines.push(`Contact: ${form.email.trim()}`)
    }
    lines.push('', 'Message:', form.message.trim())

    const text = encodeURIComponent(lines.join('\n'))
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`

    // Open WhatsApp (Web on desktop, app on mobile)
    window.open(url, '_blank', 'noopener,noreferrer')

    // Reset the form
    setForm({ name: '', email: '', message: '' })

    setTimeout(() => setSending(false), 600)
  }

  return (
    <Box>
      {/* ══════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════ */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 5, md: 9 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Teal glow */}
        <Box
          sx={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 320,
            height: 320,
            borderRadius: '50%',
            bgcolor: 'info.main',
            opacity: 0.08,
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative' }}>
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
              Get in touch
            </Typography>

            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                color: 'text.primary',
                fontSize: { xs: '1.9rem', sm: '2.4rem', md: '3.2rem' },
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                mb: 2,
              }}
            >
              Talk to a real person, not a{' '}
              <Box component="span" sx={{ color: 'info.main' }}>
                chatbot.
              </Box>
            </Typography>

            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: { xs: '0.92rem', md: '1.05rem' },
                lineHeight: 1.75,
                maxWidth: 580,
              }}
            >
              Whether you want pricing, a demo, or help picking the right
              tracker — our team replies within minutes during business hours.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════
          CONTACT + FORM
      ══════════════════════════════════════════ */}
      <Box sx={{ py: { xs: 5, md: 9 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 7 }}>
            {/* ═══ Left: contact details ═══ */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'info.main',
                  mb: 2.5,
                }}
              >
                Contact details
              </Typography>

              <Stack spacing={1.5} sx={{ mb: 3.5 }}>
                {CONTACTS.map((c) => (
                  <Box
                    key={c.label}
                    component="a"
                    href={c.href}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: { xs: 1.75, sm: 2 },
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'info.main',
                        transform: 'translateY(-2px)',
                        '& .contact-icon': {
                          bgcolor: 'info.main',
                          color: '#fff',
                        },
                        '& .contact-value': { color: 'info.main' },
                      },
                    }}
                  >
                    <Box
                      className="contact-icon"
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        bgcolor: 'rgba(0,131,143,0.10)',
                        color: 'info.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <c.icon sx={{ fontSize: 20 }} />
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: '0.66rem',
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'text.secondary',
                          mb: 0.25,
                        }}
                      >
                        {c.label}
                      </Typography>
                      <Typography
                        className="contact-value"
                        sx={{
                          fontFamily: '"Barlow Condensed", sans-serif',
                          fontWeight: 700,
                          fontSize: { xs: '1rem', md: '1.15rem' },
                          color: 'text.primary',
                          wordBreak: 'break-word',
                          transition: 'color 0.2s ease',
                          lineHeight: 1.2,
                        }}
                      >
                        {c.value}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>

              {/* Business hours */}
              <Box
                sx={{
                  p: { xs: 2.25, md: 2.5 },
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  mb: 3,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <AccessTimeOutlinedIcon
                    sx={{ color: 'info.main', fontSize: 20 }}
                  />
                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                    }}
                  >
                    Business hours
                  </Typography>
                </Stack>

                <Stack spacing={1.25}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: '0.85rem', color: 'text.secondary' }}
                    >
                      Monday – Sunday
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      9:00 AM – 9:00 PM
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* WhatsApp CTA */}
              <Button
                component="a"
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  'Hi, I need help with GPS trackers.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                color="info"
                size="large"
                fullWidth
                startIcon={<ChatOutlinedIcon />}
                sx={{
                  borderRadius: 999,
                  fontWeight: 700,
                  py: 1.4,
                }}
              >
                Chat on WhatsApp
              </Button>
            </Grid>

            {/* ═══ Right: form ═══ */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box
                sx={{
                  p: { xs: 2.5, sm: 3, md: 4 },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'info.main',
                    mb: 2,
                  }}
                >
                  Send us a message
                </Typography>

                <Typography
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: { xs: '1.35rem', md: '1.7rem' },
                    lineHeight: 1.2,
                    color: 'text.primary',
                    mb: 1,
                  }}
                >
                  Have a question? Write to us.
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: '0.85rem', md: '0.88rem' },
                    color: 'text.secondary',
                    lineHeight: 1.65,
                    mb: 3,
                  }}
                >
                  Fill in the form below and we'll get back to you within a
                  few hours.
                </Typography>

                <Divider sx={{ mb: 3 }} />

                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={2.25}>
                    <TextField
                      label="Your name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      fullWidth
                      variant="outlined"
                    />

                    <TextField
                      label="Email or phone"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      fullWidth
                      variant="outlined"
                    />

                    <TextField
                      label="Your message"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      fullWidth
                      multiline
                      rows={5}
                      variant="outlined"
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      color="info"
                      size="large"
                      disabled={sending}
                      endIcon={!sending && <SendOutlinedIcon />}
                      startIcon={
                        sending ? (
                          <CircularProgress size={16} sx={{ color: '#fff' }} />
                        ) : null
                      }
                      sx={{
                        alignSelf: { xs: 'stretch', sm: 'flex-start' },
                        borderRadius: 999,
                        px: { xs: 3, sm: 4 },
                        py: 1.3,
                        fontWeight: 700,
                      }}
                    >
                      {sending ? 'Opening WhatsApp…' : 'Send message'}
                    </Button>
                  </Stack>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ══════════════════════════════════════════
          OFFICE / MAP BAND
      ══════════════════════════════════════════ */}
      <Box
        sx={{
          bgcolor: 'secondary.main',
          color: '#fff',
          py: { xs: 6, md: 9 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Teal glow */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            right: { xs: '-40%', md: '0%' },
            transform: 'translateY(-50%)',
            width: { xs: 300, md: 480 },
            height: { xs: 300, md: 480 },
            borderRadius: '50%',
            bgcolor: 'info.main',
            opacity: 0.15,
            filter: 'blur(120px)',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1.5 }}
              >
                <LocationOnOutlinedIcon
                  sx={{ color: 'info.main', fontSize: 20 }}
                />
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'info.main',
                  }}
                >
                  Visit our office
                </Typography>
              </Stack>

              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 800,
                  fontSize: { xs: '1.6rem', sm: '2rem', md: '2.3rem' },
                  lineHeight: 1.15,
                  letterSpacing: '-0.005em',
                  mb: 2,
                  color: '#fff',
                }}
              >
                Come see the devices in person.
              </Typography>

              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: { xs: '0.88rem', md: '0.95rem' },
                  lineHeight: 1.75,
                  mb: 2.5,
                  maxWidth: 460,
                }}
              >
                Our team is happy to walk you through every tracker, answer
                your questions, and help you pick the right one for your
                vehicle.
              </Typography>

              <Stack spacing={0.75}>
                <Typography
                  sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  Shezz Traders
                </Typography>
                <Typography
                  sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}
                >
                  Karachi, Pakistan
                </Typography>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Box
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.1)',
                  aspectRatio: { xs: '16 / 10', md: '16 / 9' },
                  bgcolor: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Stack alignItems="center" spacing={1.5} sx={{ px: 2 }}>
                  <LocationOnOutlinedIcon
                    sx={{ fontSize: 56, color: 'info.main' }}
                  />
                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      color: '#fff',
                      textAlign: 'center',
                    }}
                  >
                    Map coming soon
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.5)',
                      textAlign: 'center',
                    }}
                  >
                    Google Maps embed goes here
                  </Typography>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Toast — only shows validation errors now */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity || 'success'}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {toast?.text}
        </Alert>
      </Snackbar>
    </Box>
  )
}