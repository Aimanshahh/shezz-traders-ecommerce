import { Box } from '@mui/material'

export default function PageLoader() {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: 3,
        zIndex: 2000,
        overflow: 'hidden',
        bgcolor: 'transparent',
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: '30%',
          bgcolor: 'primary.main',
          borderRadius: 4,
          animation: 'loaderSlide 0.9s ease-in-out infinite',
          '@keyframes loaderSlide': {
            '0%': { transform: 'translateX(-100%)' },
            '50%': { transform: 'translateX(150%)' },
            '100%': { transform: 'translateX(300%)' },
          },
        }}
      />
    </Box>
  )
}