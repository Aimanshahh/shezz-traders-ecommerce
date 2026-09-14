import { Box, Container, Grid, Typography, Rating, Stack, Divider } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

const TESTIMONIALS = [
  {
    name: 'Nadeem Sheikh',
    role: 'Fleet Manager',
    city: 'Karachi',
    rating: 5,
    quote:
      "We run 12 trucks between Karachi and Sukkur. Since we installed these trackers, route planning has become so much easier — I can see every vehicle live on one screen. The team that handled our setup was very professional.",
  },
  {
    name: 'Ayesha Tariq',
    role: 'Doctor',
    city: 'Lahore',
    rating: 5,
    quote:
      "Bought this for my younger brother's bike. He parks it at university and I can check on it from my phone anytime. My father liked it so much he got one for his car too. Setup was quick and the app is really simple.",
  },
  {
    name: 'Hamza Bhatti',
    role: 'Shop Owner',
    city: 'Islamabad',
    rating: 5,
    quote:
      "Bhai sach bataun to pehle yaqeen nahi tha ke itne kam paison mein itna kaam ho jayega. 6 mahine ho gaye, ek din bhi issue nahi aaya. Installation free thi, 10 minute mein ho gayi. Paisa poora vasool.",
  },
]

function getInitials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function Testimonials() {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: 'background.paper',
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: { xs: 6, md: 9 },
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
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
            Customer stories
          </Typography>

          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 800,
              color: 'text.primary',
              fontSize: { xs: '1.9rem', sm: '2.3rem', md: '2.8rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              mb: 1.5,
            }}
          >
            What people actually say.
          </Typography>

          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.92rem', md: '0.98rem' },
              lineHeight: 1.7,
              maxWidth: 520,
            }}
          >
            Unedited feedback from customers across Pakistan.
          </Typography>
        </Box>

        {/* Cards */}
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {TESTIMONIALS.map((t) => (
            <Grid key={t.name} size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: { xs: 3, md: 3.5 },
                  transition: 'border-color 0.25s ease, transform 0.25s ease',
                  '&:hover': {
                    borderColor: 'info.main',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                {/* Stars */}
                <Rating
                  value={t.rating}
                  readOnly
                  size="small"
                  sx={{ color: 'warning.main', mb: 2 }}
                />

                {/* Quote */}
                <Typography
                  sx={{
                    fontSize: { xs: '0.92rem', md: '0.95rem' },
                    lineHeight: 1.75,
                    color: 'text.primary',
                    flexGrow: 1,
                    mb: 3,
                  }}
                >
                  "{t.quote}"
                </Typography>

                <Divider sx={{ mb: 2.5 }} />

                {/* Author */}
                <Stack direction="row" spacing={1.75} alignItems="center">
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      bgcolor: 'info.main',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      letterSpacing: '0.02em',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(t.name)}
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.5}
                      sx={{ mb: 0.25 }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"Barlow Condensed", sans-serif',
                          fontWeight: 700,
                          fontSize: '1rem',
                          lineHeight: 1.2,
                          color: 'text.primary',
                        }}
                      >
                        {t.name}
                      </Typography>
                      <CheckCircleIcon
                        sx={{ fontSize: 14, color: 'info.main' }}
                      />
                    </Stack>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        lineHeight: 1.3,
                      }}
                    >
                      {t.role} · {t.city}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}