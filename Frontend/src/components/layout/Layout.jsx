import { Box, Fade } from '@mui/material'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import PageLoader from '../common/PageLoader.jsx'
import { useRouteLoader } from '../../hooks/useRouteLoader.js'

export default function Layout({ children }) {
  const loading = useRouteLoader()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {loading && <PageLoader />}
      <Header />
      <Fade in={!loading} timeout={300}>
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
      </Fade>
      <Footer />
    </Box>
  )
}