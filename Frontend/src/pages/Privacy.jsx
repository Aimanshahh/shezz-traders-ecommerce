import { Box, Container, Typography, Stack, Divider } from '@mui/material'

const SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    body: [
      'Shezz Traders is committed to protecting the privacy of everyone who uses our website, mobile apps, and GPS tracking devices. This Privacy Policy explains what information we collect, how we use it, and the choices you have.',
      'By using our services, you agree to the practices described in this policy. If you do not agree, please do not use our services.',
    ],
  },
  {
    id: 'information',
    title: 'Information we collect',
    body: [
      'We collect information in the following ways:',
    ],
    list: [
      'Account information — your name, phone number, email address, and billing details when you place an order.',
      'Device and vehicle data — GPS coordinates, speed, trip history, and status of your tracking devices while they are active.',
      'Payment information — processed securely by our payment partners. We do not store your full card details.',
      'Usage information — how you interact with our website, app, and dashboard, including IP address, device type, and pages visited.',
      'Communication — messages you send us through our contact form, WhatsApp, phone, or email.',
    ],
  },
  {
    id: 'how-we-use',
    title: 'How we use your information',
    body: ['We use the information we collect to:'],
    list: [
      'Provide and operate the tracking services you have purchased.',
      'Display live locations and trip history in your app and dashboard.',
      'Send geofence alerts, SOS notifications, and speed warnings you have enabled.',
      'Process payments, deliver devices, and arrange installations.',
      'Provide customer support and respond to your inquiries.',
      'Improve our products, detect issues, and prevent fraud or misuse.',
      'Comply with applicable legal requirements in Pakistan.',
    ],
  },
  {
    id: 'sharing',
    title: 'Sharing your information',
    body: [
      'We do not sell your personal information. We may share it only with:',
    ],
    list: [
      'Service providers who help us operate — payment processors, SMS/network providers, delivery partners, and cloud hosting services.',
      'Law enforcement authorities, when legally required or when necessary to protect the safety of our users or the public.',
      'Business partners in the event of a merger, acquisition, or sale of assets, with continued protection of your data.',
    ],
  },
  {
    id: 'location-data',
    title: 'Location data',
    body: [
      'GPS location data is at the core of our service. This data is collected only while your tracker device is active, transmitted over encrypted connections, and stored on our secure servers.',
      'You can view, download, or delete your trip history at any time from your app. Deleting your account removes all historical location data within 30 days.',
    ],
  },
  {
    id: 'security',
    title: 'Data security',
    body: [
      'We use industry-standard measures to protect your data, including encrypted transmission (HTTPS), secure server storage, access controls, and regular security reviews.',
      'No online service can guarantee 100% security. If you suspect unauthorized access to your account, contact us immediately at info@shezztraders.com.',
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: ['You have the right to:'],
    list: [
      'Access the personal information we hold about you.',
      'Correct any inaccurate information.',
      'Request deletion of your account and associated data.',
      'Opt out of marketing messages at any time.',
      'Raise a concern with us about how your data is handled.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: [
      'Our website uses minimal cookies to remember your preferences and analyze basic site traffic. You can disable cookies in your browser settings, though some features may stop working.',
    ],
  },
  {
    id: 'children',
    title: "Children's privacy",
    body: [
      'Our services are not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with data, please contact us so we can remove it.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Continued use of our services after changes means you accept the updated policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: [
      'Questions about this Privacy Policy? Reach out to us:',
      'Email: info@shezztraders.com\nPhone: 021-36930072 / 0335-7069452',
    ],
  },
]

export default function Privacy() {
  return (
    <Box>
      {/* ══════════ HEADER ══════════ */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 5, md: 7 },
        }}
      >
        <Container maxWidth="lg">
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
            Legal
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 800,
              color: 'text.primary',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              mb: 1.5,
            }}
          >
            Privacy Policy
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            Last updated: September 2026
          </Typography>
        </Container>
      </Box>

      {/* ══════════ BODY ══════════ */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '220px 1fr' },
            gap: { xs: 4, md: 7 },
            alignItems: 'flex-start',
          }}
        >
          {/* Table of contents (desktop only) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'sticky',
              top: 100,
              borderLeft: '2px solid',
              borderColor: 'divider',
              pl: 2.5,
            }}
          >
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                mb: 1.5,
              }}
            >
              On this page
            </Typography>
            <Stack spacing={1}>
              {SECTIONS.map((s, i) => (
                <Typography
                  key={s.id}
                  component="a"
                  href={`#${s.id}`}
                  sx={{
                    fontSize: '0.8rem',
                    color: 'text.secondary',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                    '&:hover': { color: 'info.main' },
                  }}
                >
                  {String(i + 1).padStart(2, '0')} · {s.title}
                </Typography>
              ))}
            </Stack>
          </Box>

          {/* Content */}
          <Box sx={{ maxWidth: 720 }}>
            {SECTIONS.map((s, i) => (
              <Box
                key={s.id}
                id={s.id}
                sx={{ mb: { xs: 4, md: 5 }, scrollMarginTop: 100 }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 700,
                    fontSize: { xs: '1.35rem', md: '1.55rem' },
                    lineHeight: 1.2,
                    color: 'text.primary',
                    mb: 1.75,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}. {s.title}
                </Typography>

                {s.body.map((p, j) => (
                  <Typography
                    key={j}
                    sx={{
                      fontSize: { xs: '0.9rem', md: '0.95rem' },
                      lineHeight: 1.8,
                      color: 'text.secondary',
                      mb: s.list && j === s.body.length - 1 ? 1.5 : 1.5,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {p}
                  </Typography>
                ))}

                {s.list && (
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    {s.list.map((item, k) => (
                      <Stack
                        key={k}
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: 'info.main',
                            mt: 1,
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: { xs: '0.9rem', md: '0.95rem' },
                            lineHeight: 1.75,
                            color: 'text.secondary',
                          }}
                        >
                          {item}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}

                {i < SECTIONS.length - 1 && (
                  <Divider sx={{ mt: { xs: 3.5, md: 4.5 }, opacity: 0.6 }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  )
}