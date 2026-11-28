import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Box, Drawer, Typography, Stack, IconButton, Avatar, Divider,
  useMediaQuery, Tooltip,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined'
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined'
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { getAdminUser, logoutAdmin } from '../../lib/adminAuth.js'
import { ADMIN } from '../../theme/adminTheme.js'

const NAV_GROUPS = [
  {
    heading: 'Store',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: DashboardOutlinedIcon },
      { label: 'Products', to: '/admin/products', icon: Inventory2OutlinedIcon, prefix: true },
      { label: 'Categories', to: '/admin/categories', icon: CategoryOutlinedIcon },
      { label: 'Orders', to: '/admin/orders', icon: ReceiptLongOutlinedIcon },
      { label: 'Reports', to: '/admin/reports', icon: BarChartOutlinedIcon },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Devices / IMEI', to: '/admin/devices', icon: QrCodeScannerOutlinedIcon, prefix: true },
      { label: 'Historical import', to: '/admin/historical-import', icon: UploadFileOutlinedIcon },
      { label: 'Pending customers', to: '/admin/pending-customers', icon: PersonAddAltOutlinedIcon },
      { label: 'Boxes & cartons', to: '/admin/boxes', icon: ViewInArOutlinedIcon, prefix: true },
      { label: 'Sales & invoices', to: '/admin/sales', icon: PointOfSaleOutlinedIcon, prefix: true },
      { label: 'Customers & ledger', to: '/admin/customers', icon: PeopleAltOutlinedIcon, prefix: true },
      { label: 'Returns & warranty', to: '/admin/returns', icon: AssignmentReturnOutlinedIcon, prefix: true },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { label: 'Salespeople', to: '/admin/staff', icon: BadgeOutlinedIcon, prefix: true },
      { label: 'CRM settings', to: '/admin/crm-settings', icon: TuneOutlinedIcon },
    ],
  },
]

const SIDEBAR_WIDTH = 248
const TOPBAR_HEIGHT = 64

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

  const renderNavGroup = (group) => (
    <Box key={group.heading} sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontSize: '0.64rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.34)',
          px: 2.5,
          mb: 0.75,
        }}
      >
        {group.heading}
      </Typography>

      <Stack spacing={0.25}>
        {group.items.map((item) => {
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
                gap: 1.25,
                mx: 1.25,
                px: 1.5,
                height: 38,
                borderRadius: '10px',
                textDecoration: 'none',
                color: active ? '#FFFFFF' : 'rgba(255,255,255,0.66)',
                bgcolor: active ? 'rgba(20,184,166,0.14)' : 'transparent',
                boxShadow: active ? 'inset 2px 0 0 #14B8A6' : 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                '&:hover': {
                  bgcolor: active ? 'rgba(20,184,166,0.2)' : 'rgba(255,255,255,0.05)',
                  color: '#FFFFFF',
                },
              }}
            >
              <item.icon sx={{ fontSize: 18, flexShrink: 0, opacity: active ? 1 : 0.8 }} />
              <Typography
                sx={{
                  fontSize: '0.84rem',
                  fontWeight: active ? 600 : 450,
                  flex: 1,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
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
        bgcolor: ADMIN.sidebar,
        color: '#FFFFFF',
        borderRight: `1px solid ${ADMIN.sidebarLine}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 2.5, height: TOPBAR_HEIGHT, flexShrink: 0 }}>
        <Box component="img" src="/images/logo.png" alt="Shezz Traders" sx={{ height: 30, width: 30, objectFit: 'contain' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.1, letterSpacing: '-0.01em', color: '#fff' }}>
            Shezz Traders
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', mt: 0.25 }}>
            Admin console
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
        {NAV_GROUPS.map(renderNavGroup)}
      </Box>

      <Divider sx={{ borderColor: ADMIN.sidebarLine }} />

      <Box sx={{ p: 1.5 }}>
        <Box
          component={NavLink}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            height: 34,
            borderRadius: 1,
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.8rem',
            mb: 1,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
          }}
        >
          <StorefrontOutlinedIcon sx={{ fontSize: 16 }} />
          View storefront
        </Box>

        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 1.25, py: 1, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.04)' }}>
          <Avatar
            sx={{
              width: 30,
              height: 30,
              bgcolor: 'rgba(20,184,166,0.2)',
              color: '#5EEAD4',
              fontWeight: 700,
              fontSize: '0.72rem',
            }}
          >
            {initials}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '0.79rem', fontWeight: 600, color: '#fff', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {admin?.name || 'Admin'}
            </Typography>
            <Typography sx={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.25 }}>
              {admin?.role || 'Administrator'}
            </Typography>
          </Box>

          <Tooltip title="Sign out" arrow>
            <IconButton
              onClick={handleLogout}
              size="small"
              aria-label="Sign out"
              sx={{
                color: 'rgba(255,255,255,0.55)',
                '&:hover': { color: '#FCA5A5', bgcolor: 'rgba(252,165,165,0.1)' },
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: ADMIN.canvas }}>
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

      {isMobile && (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: SIDEBAR_WIDTH, border: 'none' } }}
        >
          {SidebarContent}
        </Drawer>
      )}

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          ml: { md: `${SIDEBAR_WIDTH}px` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            bgcolor: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${ADMIN.line}`,
            px: { xs: 2, md: 3.5 },
            height: TOPBAR_HEIGHT,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            {isMobile && (
              <IconButton onClick={() => setMobileOpen(true)} size="small" aria-label="Open menu" sx={{ color: ADMIN.ink }}>
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', lineHeight: 1 }}>
                Shezz Traders
              </Typography>
              <Typography
                component="h1"
                sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25, mt: 0.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {title}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1.75}>
            <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.78rem', color: 'text.secondary' }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: ADMIN.accentSoft,
                color: ADMIN.accent,
                fontWeight: 700,
                fontSize: '0.72rem',
                border: `1px solid ${ADMIN.line}`,
              }}
            >
              {initials}
            </Avatar>
          </Stack>
        </Box>

        <Box component="main" sx={{ px: { xs: 2, md: 3.5 }, py: { xs: 2.5, md: 3 }, flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
