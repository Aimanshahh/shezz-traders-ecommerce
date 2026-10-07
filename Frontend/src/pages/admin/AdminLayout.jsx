import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Box, Drawer, Typography, Stack, IconButton, Avatar, Divider,
  useMediaQuery, InputBase, Tooltip,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import SearchIcon from '@mui/icons-material/Search'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { getAdminUser, logoutAdmin } from '../../lib/adminAuth.js'
import { BRAND } from '../../theme/theme.js'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: DashboardOutlinedIcon },
  { label: 'Products', to: '/admin/products', icon: Inventory2OutlinedIcon },
  { label: 'Categories', to: '/admin/categories', icon: CategoryOutlinedIcon },
  { label: 'Orders', to: '/admin/orders', icon: ReceiptLongOutlinedIcon },
]

const CRM_ITEMS = [
  { label: 'Devices / IMEI', to: '/admin/devices', icon: QrCodeScannerIcon, prefix: true },
  { label: 'Boxes & cartons', to: '/admin/boxes', icon: ViewInArOutlinedIcon, prefix: true },
]

const SIDEBAR_WIDTH = 260

export default function AdminLayout({ children, title = 'Dashboard' }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const admin = getAdminUser()

  const handleLogout = () => {
    logoutAdmin()
    navigate('/admin', { replace: true })
  }

  const initials = admin?.name
    ? admin.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'SA'

  const renderNavGroup = (heading, items) => (
    <Box sx={{ mb: 2 }}>
      <Typography
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
          px: 3,
          mb: 1,
        }}
      >
        {heading}
      </Typography>

      <Stack spacing={0.25}>
        {items.map((item) => {
          const active = item.prefix
            ? location.pathname.startsWith(item.to)
            : location.pathname === item.to
          return (
            <Box
              key={item.label}
              component={NavLink}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mx: 1.5,
                px: 1.75,
                py: 1.15,
                borderRadius: 1.5,
                textDecoration: 'none',
                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                bgcolor: active ? alpha(BRAND.teal, 0.15) : 'transparent',
                borderLeft: '3px solid',
                borderColor: active ? BRAND.teal : 'transparent',
                transition: 'all 0.18s ease',
                '&:hover': {
                  bgcolor: active
                    ? alpha(BRAND.teal, 0.2)
                    : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                },
              }}
            >
              <item.icon sx={{ fontSize: 19, flexShrink: 0 }} />
              <Typography
                sx={{
                  fontSize: '0.88rem',
                  fontWeight: active ? 700 : 500,
                  flex: 1,
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )

  const SidebarContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'secondary.main',
        color: '#fff',
      }}
    >
      {/* Brand */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ px: 3, py: 3 }}
      >
        <Box
          component="img"
          src="/images/logo.png"
          alt="Shezz Traders"
          sx={{ height: 36, width: 36 }}
        />
        <Box>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1,
              color: '#fff',
              letterSpacing: 0.5,
            }}
          >
            SHEZZ{' '}
            <Box component="span" sx={{ color: BRAND.teal }}>
              ADMIN
            </Box>
          </Typography>
          <Typography
            sx={{
              fontSize: '0.62rem',
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              mt: 0.25,
            }}
          >
            Control panel
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {renderNavGroup('Management', NAV_ITEMS)}
        {renderNavGroup('CRM', CRM_ITEMS)}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* Bottom: view store + admin info */}
      <Box sx={{ p: 2 }}>
        <Box
          component={NavLink}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.82rem',
            mb: 1.5,
            transition: 'all 0.18s ease',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
          }}
        >
          <StorefrontOutlinedIcon sx={{ fontSize: 17 }} />
          View store
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{
            px: 1,
            py: 1,
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.04)',
          }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: BRAND.teal,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.8rem',
              fontFamily: '"Barlow Condensed", sans-serif',
            }}
          >
            {initials}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {admin?.name || 'Admin'}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.68rem',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.2,
              }}
            >
              {admin?.role || 'Administrator'}
            </Typography>
          </Box>

          <Tooltip title="Sign out" arrow>
            <IconButton
              onClick={handleLogout}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.6)',
                '&:hover': {
                  color: BRAND.red,
                  bgcolor: 'rgba(227,30,36,0.1)',
                },
              }}
            >
              <LogoutOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F6F8' }}>
      {/* Sidebar — desktop */}
      {!isMobile && (
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            zIndex: 1200,
          }}
        >
          {SidebarContent}
        </Box>
      )}

      {/* Sidebar — mobile drawer */}
      {isMobile && (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: SIDEBAR_WIDTH, border: 'none' } }}
        >
          {SidebarContent}
        </Drawer>
      )}

      {/* Main */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          ml: { md: `${SIDEBAR_WIDTH}px` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: { xs: 2, md: 3 },
            py: 1.75,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            {isMobile && (
              <IconButton
                onClick={() => setMobileOpen(true)}
                size="small"
                sx={{ color: 'text.primary' }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: { xs: '1.2rem', md: '1.4rem' },
                lineHeight: 1.15,
                color: 'text.primary',
                flex: 1,
              }}
            >
              {title}
            </Typography>

            {/* Search */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1,
                px: 1.75,
                py: 0.75,
                borderRadius: 999,
                bgcolor: 'action.hover',
                width: 240,
                border: '1px solid transparent',
                transition: 'all 0.2s ease',
                '&:focus-within': {
                  borderColor: 'info.main',
                  bgcolor: 'background.paper',
                },
              }}
            >
              <SearchIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
              <InputBase
                placeholder="Search…"
                sx={{ fontSize: '0.82rem', flex: 1 }}
              />
            </Box>

            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'info.main',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.75rem',
                fontFamily: '"Barlow Condensed", sans-serif',
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              {initials}
            </Avatar>
          </Stack>
        </Box>

        {/* Page content */}
        <Box sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>{children}</Box>
      </Box>
    </Box>
  )
}