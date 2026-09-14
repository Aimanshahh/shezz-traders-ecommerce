import { Box, Typography } from '@mui/material'

export default function HeroFeatureItem({ icon: Icon, line1, line2 }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        width: '100%',
      }}
    >
      {/* Icon badge */}
      <Box
        sx={{
          width: { xs: 44, sm: 50 },
          height: { xs: 44, sm: 50 },
          borderRadius: '50%',
          border: '1.5px solid',
          borderColor: 'primary.main',
          bgcolor: 'rgba(211, 47, 47, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1.2,
          transition: 'background-color 0.25s ease, transform 0.25s ease',
          '&:hover': {
            bgcolor: 'primary.main',
            transform: 'translateY(-3px)',
            '& svg': { color: '#fff' },
          },
        }}
      >
        <Icon
          sx={{
            color: 'primary.main',
            fontSize: { xs: 20, sm: 22 },
            transition: 'color 0.25s ease',
          }}
        />
      </Box>

      {/* Label */}
      <Typography
        sx={{
          fontSize: { xs: '0.7rem', sm: '0.75rem' },
          fontWeight: 600,
          color: '#fff',
          lineHeight: 1.3,
          letterSpacing: '0.01em',
          maxWidth: 100,
        }}
      >
        {line1}
        {line2 && (
          <>
            <br />
            {line2}
          </>
        )}
      </Typography>
    </Box>
  )
}