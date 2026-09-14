import { Box, Container, Typography, Stack, Divider } from '@mui/material'

const SECTIONS = [
  {
    id: 'acceptance',
    title: 'Acceptance of terms',
    body: [
      'These Terms of Service ("Terms") govern your use of the website, mobile applications, and GPS tracking devices provided by Shezz Traders.',
      'By purchasing or using any of our products or services, you agree to be bound by these Terms. If you do not agree, please do not use our services.',
    ],
  },
  {
    id: 'services',
    title: 'Our services',
    body: [
      'Shezz Traders provides GPS tracking devices, a mobile app, a web dashboard, and related support services. The service operates over nationwide cellular networks and requires an active subscription for continuous tracking, alerts, and data storage.',
      'We reserve the right to modify, suspend, or discontinue any part of our service with reasonable notice.',
    ],
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: [
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.',
      'You agree to provide accurate, current, and complete information when creating an account or placing an order, and to update it promptly if anything changes.',
    ],
  },
  {
    id: 'orders',
    title: 'Orders and payments',
    body: ['When you place an order with us:'],
    list: [
      'All prices are listed in Pakistani Rupees (PKR) and include applicable taxes unless stated otherwise.',
      'Payment must be completed before dispatch unless cash on delivery has been expressly agreed.',
      'We reserve the right to cancel any order if the information provided is incomplete, inaccurate, or suspected of fraud.',
      'Once an order has been dispatched, cancellations are subject to our return policy.',
    ],
  },
  {
    id: 'subscription',
    title: 'Subscriptions and billing',
    body: [
      'Every tracking device requires an active subscription for SIM data, server access, and app services. Subscription fees are billed monthly or annually as chosen at the time of purchase.',
      'If a subscription is not renewed, the device will stop transmitting data. Historical data is retained for 60 days after expiration, after which it may be permanently deleted.',
    ],
  },
  {
    id: 'installation',
    title: 'Installation and use',
    body: [
      'Professional installation is available in most major cities and is included with eligible purchases. Self-installation is permitted only with devices that support it and only following our provided instructions.',
      'You agree to use our devices only on vehicles and assets that you legally own or have express permission to track. Using our products to track a person or vehicle without their consent is strictly prohibited and may be illegal.',
    ],
  },
  {
    id: 'warranty',
    title: 'Warranty',
    body: [
      'All devices come with a 6-month limited warranty covering manufacturing defects. The warranty does not cover:',
    ],
    list: [
      'Physical damage caused by accidents, misuse, or improper installation.',
      'Water damage beyond the device\u2019s rated IP protection.',
      'Damage from unauthorized repairs or modifications.',
      'Normal wear and tear, including battery degradation over time.',
    ],
  },
  {
    id: 'returns',
    title: 'Returns and refunds',
    body: [
      'You may return an unused device in its original packaging within 7 days of delivery for a full refund, minus shipping costs. Devices that have been installed or activated are not eligible for return unless they are defective.',
      'Defective devices under warranty will be repaired or replaced at our discretion at no cost to you.',
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: [
      'Our GPS services depend on cellular networks, satellite signals, and third-party infrastructure. While we work hard to keep our service reliable, we cannot guarantee uninterrupted availability.',
      'To the maximum extent permitted by law, Shezz Traders is not liable for any indirect, incidental, or consequential damages arising from the use of our services, including but not limited to loss of vehicle, theft, or missed alerts.',
    ],
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    body: [
      'All content on our website — including the Shezz Traders name, logo, text, images, and software — is the property of Shezz Traders and is protected by applicable copyright and trademark laws. You may not reproduce, distribute, or use our branding without written permission.',
    ],
  },
  {
    id: 'prohibited',
    title: 'Prohibited uses',
    body: ['You agree not to use our services to:'],
    list: [
      'Track any person or vehicle without their lawful consent.',
      'Violate any applicable law, regulation, or third-party right.',
      'Attempt to reverse engineer, hack, or bypass the security of our devices or platform.',
      'Resell our devices or services without an authorized partnership agreement.',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    body: [
      'We reserve the right to suspend or terminate your account at any time if you violate these Terms, misuse our services, or fail to pay subscription fees. You may cancel your account at any time by contacting us.',
    ],
  },
  {
    id: 'governing',
    title: 'Governing law',
    body: [
      'These Terms are governed by the laws of the Islamic Republic of Pakistan. Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Karachi, Pakistan.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: [
      'We may update these Terms from time to time. Continued use of our services after updates are posted means you accept the revised Terms. We encourage you to review this page periodically.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: [
      'Questions about these Terms? Reach out to us:',
      'Email: info@shezztraders.com\nPhone: 021-36930072 / 0335-7069452',
    ],
  },
]

export default function Terms() {
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
            Terms of Service
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
          {/* TOC */}
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
                      mb: 1.5,
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