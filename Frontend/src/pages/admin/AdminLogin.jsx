import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Container, Typography, TextField, Button, Stack,
  InputAdornment, IconButton, Alert, Checkbox, FormControlLabel,
  CircularProgress,
} from '@mui/material'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { loginAdmin, isAdminLoggedIn } from '../../lib/adminAuth.js'
import { BRAND } from '../../theme/theme.js'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already logged in → jump straight to dashboard
  if (isAdminLoggedIn()) {
    navigate('/admin/dashboard', { replace: true })
  }

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await loginAdmin(form.email, form.password, remember)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        bgcolor: 'secondary.main',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glows */}
      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          bgcolor: BRAND.teal,
          opacity: 0.15,
          filter: 'blur(140px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: 520,
          height: 520,
          borderRadius: '50%',
          bgcolor: BRAND.red,
          opacity: 0.12,
          filter: 'blur(140px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top bar: logo */}
      <Box sx={{ position: 'relative', p: { xs: 2.5, md: 3.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            component="img"
            src="/images/logo.png"
            alt="Shezz Traders"
            sx={{ height: 40, width: 40 }}
          />
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: '#fff',
              letterSpacing: 0.5,
            }}
          >
            SHEZZ{' '}
            <Box component="span" sx={{ color: BRAND.teal }}>
              ADMIN
            </Box>
          </Typography>
        </Stack>
      </Box>

      {/* Center: card */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 4,
          position: 'relative',
        }}
      >
        <Container maxWidth="xs" disableGutters>
          <Box
            sx={{
              p: { xs: 3.5, md: 4.5 },
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            }}
          >
            {/* Lock badge */}
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'rgba(0,131,143,0.12)',
                color: 'info.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2.5,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>

            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 800,
                fontSize: { xs: '1.6rem', md: '1.85rem' },
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: 'text.primary',
                mb: 1,
              }}
            >
              Admin sign in
            </Typography>

            <Typography
              sx={{
                fontSize: '0.85rem',
                color: 'text.secondary',
                lineHeight: 1.6,
                mb: 3.5,
              }}
            >
              Authorized personnel only. Enter your credentials to access the
              dashboard.
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2.5, borderRadius: 1.5, fontSize: '0.82rem' }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.25}>
                <TextField
                  label="Email address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  fullWidth
                  autoComplete="email"
                  size="medium"
                />

                <TextField
                  label="Password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  required
                  fullWidth
                  autoComplete="current-password"
                  size="medium"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPw((s) => !s)}
                          edge="end"
                          size="small"
                        >
                          {showPw ? (
                            <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        sx={{
                          color: 'divider',
                          '&.Mui-checked': { color: 'info.main' },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                        Remember me
                      </Typography>
                    }
                  />
                </Stack>

                <Button
                  type="submit"
                  variant="contained"
                  color="info"
                  size="large"
                  fullWidth
                  disabled={loading}
                  endIcon={!loading && <ArrowForwardIcon />}
                  sx={{
                    borderRadius: 999,
                    fontWeight: 700,
                    py: 1.35,
                    mt: 0.5,
                  }}
                >
                  {loading ? (
                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </Stack>
            </Box>

            {/* Demo hint */}
            <Box
              sx={{
                mt: 3,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: 'rgba(0,131,143,0.06)',
                border: '1px dashed rgba(0,131,143,0.25)',
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'info.main',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  mb: 0.5,
                }}
              >
                Demo credentials
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                admin@shezztraders.com · admin123
              </Typography>
            </Box>
          </Box>

          {/* Back to store */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              component={RouterLink}
              to="/"
              startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.55)',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8rem',
                '&:hover': { color: BRAND.teal, bgcolor: 'transparent' },
              }}
            >
              Back to store
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}