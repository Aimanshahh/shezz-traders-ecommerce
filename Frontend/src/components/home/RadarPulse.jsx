import { Box } from '@mui/material'

export default function RadarPulse() {
  return (
    <Box sx={{ position: 'relative', width: 20, height: 20 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          bgcolor: 'primary.main',
        }}
      />
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'primary.main',
            animation: 'radarPing 2.4s ease-out infinite',
            animationDelay: `${i * 0.8}s`,
            '@keyframes radarPing': {
              '0%': { transform: 'scale(1)', opacity: 0.8 },
              '100%': { transform: 'scale(6)', opacity: 0 },
            },
          }}
        />
      ))}
    </Box>
  )
}