import { useState, useEffect } from 'react'
import { Navigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Grid, Stack, Button, Chip, CircularProgress,
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AddIcon from '@mui/icons-material/Add'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn, getAdminUser } from '../../lib/adminAuth.js'
import { getAdminOverview, getDashboardStats } from '../../services/api.js'
import { BRAND } from '../../theme/theme.js'

const STATUS_COLORS = {
  Pending: { bg: 'rgba(251,55,8,0.1)', color: BRAND.orange },
  'Awaiting Payment': { bg: 'rgba(255,193,7,0.15)', color: '#B45309' },
  Confirmed: { bg: 'rgba(0,131,143,0.1)', color: BRAND.tealDark },
  Shipped: { bg: 'rgba(0,184,212,0.15)', color: BRAND.tealDark },
  Delivered: { bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  Cancelled: { bg: 'rgba(227,30,36,0.1)', color: BRAND.red },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    revenue: 0,
    orderCount: 0,
    productCount: 0,
    recentOrders: [],
  })
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)

  const admin = getAdminUser()

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        const data = await getDashboardStats()
        if (!alive) return
        setStats({
          revenue: data.revenue || 0,
          orderCount: data.orderCount || 0,
          productCount: data.productCount || 0,
          recentOrders: data.recentOrders || [],
        })
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    getAdminOverview()
      .then((data) => { if (alive) setOverview(data) })
      .catch((err) => console.error('Failed to load admin alerts:', err))
    return () => { alive = false }
  }, [])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const deviceCount = Object.values(overview?.deviceCounts || {}).reduce((sum, count) => sum + count, 0)

  const STATS = [
    {
      label: 'Total revenue',
      value: `PKR ${stats.revenue.toLocaleString()}`,
      hint:
        stats.revenue === 0 ? 'No sales yet' : 'Excludes cancelled orders',
      icon: TrendingUpIcon,
      color: BRAND.teal,
    },
    {
      label: 'Total orders',
      value: stats.orderCount.toString(),
      hint:
        stats.orderCount === 0
          ? 'No orders yet'
          : stats.orderCount === 1
          ? '1 order placed'
          : `${stats.orderCount} orders placed`,
      icon: ReceiptLongOutlinedIcon,
      color: BRAND.tealDark,
    },
    {
      label: 'Products',
      value: stats.productCount.toString(),
      hint:
        stats.productCount === 0
          ? 'Add your first product'
          : `${stats.productCount} in catalog`,
      icon: Inventory2OutlinedIcon,
      color: BRAND.orange,
    },
    {
      label: 'Recent activity',
      value:
        stats.recentOrders.length > 0
          ? `${stats.recentOrders.length} new`
          : '—',
      hint:
        stats.recentOrders.length > 0
          ? 'Latest orders below'
          : 'Waiting for first order',
      icon: CategoryOutlinedIcon,
      color: BRAND.red,
    },
    {
      label: 'CRM devices',
      value: deviceCount.toLocaleString(),
      hint: 'Tracked by IMEI',
      icon: Inventory2OutlinedIcon,
      color: '#2563EB',
    },
    {
      label: 'Open return cases',
      value: String(overview?.openCaseCount || 0),
      hint: 'Awaiting a decision',
      icon: ReceiptLongOutlinedIcon,
      color: '#B45309',
    },
    {
      label: 'Warranties ending soon',
      value: String(overview?.expiringWarrantyCount || 0),
      hint: 'Within 30 days',
      icon: CategoryOutlinedIcon,
      color: '#0F766E',
    },
    {
      label: 'Low-stock products',
      value: String(overview?.lowStockCount || 0),
      hint: 'Five or fewer in storefront stock',
      icon: Inventory2OutlinedIcon,
      color: BRAND.orange,
    },
  ]

  return (
    <AdminLayout title="Dashboard">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Greeting */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '1.75rem', md: '2.1rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              mb: 0.75,
            }}
          >
            Welcome back, {admin?.name || 'Admin'}.
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
            Here's what's happening with your store today.
          </Typography>
        </Box>

        {/* Stat cards */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: 'info.main' }} />
          </Box>
        ) : (
          <Grid
            container
            spacing={{ xs: 2, md: 2.5 }}
            sx={{ mb: { xs: 3, md: 4 } }}
          >
            {STATS.map((s) => (
              <Grid key={s.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    '&:hover': {
                      borderColor: 'info.main',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      bgcolor: `${s.color}18`,
                      color: s.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <s.icon sx={{ fontSize: 20 }} />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      mb: 0.75,
                    }}
                  >
                    {s.label}
                  </Typography>

                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 800,
                      fontSize: { xs: '1.6rem', md: '1.8rem' },
                      lineHeight: 1,
                      color: 'text.primary',
                      letterSpacing: '-0.01em',
                      mb: 0.75,
                    }}
                  >
                    {s.value}
                  </Typography>

                  <Typography
                    sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
                  >
                    {s.hint}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        <Box sx={{ mb: { xs: 3, md: 4 }, p: { xs: 2, md: 2.5 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>Needs attention</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.76rem' }}>Open cases, expiring warranties, and product stock alerts</Typography>
            </Box>
            <Button component={RouterLink} to="/admin/reports" size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />} sx={{ textTransform: 'none' }}>Reports</Button>
          </Stack>
          {overview?.alerts?.length ? (
            <Stack spacing={0.75}>
              {overview.alerts.slice(0, 8).map((alert) => (
                <Box key={`${alert.type}-${alert.id}`} component={RouterLink} to={alert.to} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, px: 1.5, py: 1, borderLeft: '3px solid', borderColor: alert.severity === 'error' ? 'error.main' : alert.severity === 'warning' ? 'warning.main' : 'info.main', bgcolor: 'action.hover', textDecoration: 'none', color: 'inherit', '&:hover': { bgcolor: 'action.selected' } }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>{alert.title}</Typography>
                    <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.detail}</Typography>
                  </Box>
                  <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 18, flexShrink: 0 }} />
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontSize: '0.84rem', py: 1 }}>No active operational alerts.</Typography>
          )}
        </Box>

        {/* Main row */}
        <Grid container spacing={{ xs: 3, md: 3.5 }}>
          {/* Recent orders */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Box
              sx={{
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 3, py: 2.5 }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      lineHeight: 1.2,
                      color: 'text.primary',
                    }}
                  >
                    Recent orders
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.78rem',
                      color: 'text.secondary',
                      mt: 0.25,
                    }}
                  >
                    Latest orders across your store
                  </Typography>
                </Box>

                <Button
                  component={RouterLink}
                  to="/admin/orders"
                  size="small"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    color: 'info.main',
                    '&:hover': { bgcolor: 'rgba(0,131,143,0.06)' },
                  }}
                >
                  View all
                </Button>
              </Stack>

              <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                {stats.recentOrders.length === 0 ? (
                  <EmptyState
                    icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 36 }} />}
                    title="No orders yet"
                    desc="Orders will appear here as soon as customers start buying."
                  />
                ) : (
                  stats.recentOrders.map((o, i) => (
                    <OrderRow
                      key={o._id || o.id}
                      order={o}
                      last={i === stats.recentOrders.length - 1}
                    />
                  ))
                )}
              </Box>
            </Box>
          </Grid>

          {/* Quick actions */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Barlow Condensed", sans-serif',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: 'text.primary',
                  mb: 2,
                }}
              >
                Quick actions
              </Typography>

              <Stack spacing={1.25}>
                <QuickAction
                  icon={<AddIcon sx={{ fontSize: 18 }} />}
                  label="Add new product"
                  to="/admin/products/new"
                />
                <QuickAction
                  icon={<CategoryOutlinedIcon sx={{ fontSize: 18 }} />}
                  label="Manage categories"
                  to="/admin/categories"
                />
                <QuickAction
                  icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />}
                  label="View all orders"
                  to="/admin/orders"
                />
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  )
}

/* ── Order row ─────────────────────────────────────── */
function OrderRow({ order, last }) {
  const itemsCount = order.items?.length || 0
  const statusStyle = STATUS_COLORS[order.status] || {
    bg: 'action.hover',
    color: 'text.primary',
  }

  return (
    <Box
      component={RouterLink}
      to="/admin/orders"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr auto', sm: '110px 1.2fr 1fr auto auto' },
        gap: { xs: 1.5, sm: 2 },
        alignItems: 'center',
        px: { xs: 2, md: 3 },
        py: 2,
        borderBottom: last ? 'none' : '1px solid',
        borderColor: 'divider',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background-color 0.15s ease',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Typography
        sx={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'info.main',
          fontFamily: 'monospace',
        }}
      >
        {order.orderNumber}
      </Typography>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.25,
          }}
        >
          {order.customer?.name || '—'}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.72rem',
            color: 'text.secondary',
            display: { xs: 'block', sm: 'none' },
          }}
        >
          {itemsCount} {itemsCount === 1 ? 'item' : 'items'} · PKR{' '}
          {Number(order.total || 0).toLocaleString()}
        </Typography>
      </Box>

      <Typography
        sx={{
          fontSize: '0.82rem',
          color: 'text.secondary',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
      </Typography>

      <Chip
        label={order.status}
        size="small"
        sx={{
          bgcolor: statusStyle.bg,
          color: statusStyle.color,
          fontWeight: 700,
          fontSize: '0.68rem',
          height: 22,
          borderRadius: 999,
          display: { xs: 'none', sm: 'inline-flex' },
        }}
      />

      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: '0.95rem',
          color: 'text.primary',
          minWidth: 90,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        PKR {Number(order.total || 0).toLocaleString()}
      </Typography>
    </Box>
  )
}

/* ── Empty state ─────────────────────────────────────── */
function EmptyState({ icon, title, desc }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        py: 6,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: 'rgba(0,131,143,0.08)',
          color: 'info.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: '1.15rem',
          color: 'text.primary',
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.82rem',
          color: 'text.secondary',
          maxWidth: 340,
          lineHeight: 1.6,
        }}
      >
        {desc}
      </Typography>
    </Box>
  )
}

/* ── Quick action button ─────────────────────────────── */
function QuickAction({ icon, label, to }) {
  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 1.75,
        py: 1.35,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        textDecoration: 'none',
        color: 'text.primary',
        transition: 'all 0.18s ease',
        '&:hover': {
          borderColor: 'info.main',
          bgcolor: 'rgba(0,131,143,0.04)',
          '& .qa-icon': { bgcolor: 'info.main', color: '#fff' },
        },
      }}
    >
      <Box
        className="qa-icon"
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1,
          bgcolor: 'rgba(0,131,143,0.1)',
          color: 'info.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.18s ease',
        }}
      >
        {icon}
      </Box>

      <Typography
        sx={{
          fontSize: '0.85rem',
          fontWeight: 600,
          flex: 1,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}