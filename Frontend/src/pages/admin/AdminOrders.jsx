import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Chip, IconButton, Drawer, Divider, Button,
  Snackbar, Alert, CircularProgress, MenuItem, TextField, InputBase,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import CloseIcon from '@mui/icons-material/Close'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import SearchIcon from '@mui/icons-material/Search'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import {
  getOrders, updateOrderStatus, deleteOrder,
} from '../../services/api.js'
import { BRAND } from '../../theme/theme.js'

const STATUSES = [
  'Pending',
  'Awaiting Payment',
  'Confirmed',
  'Shipped',
  'Delivered',
  'Cancelled',
]

const STATUS_COLORS = {
  Pending: { bg: 'rgba(251,55,8,0.1)', color: BRAND.orange },
  'Awaiting Payment': { bg: 'rgba(255,193,7,0.15)', color: '#B45309' },
  Confirmed: { bg: 'rgba(0,131,143,0.1)', color: BRAND.tealDark },
  Shipped: { bg: 'rgba(0,184,212,0.15)', color: BRAND.tealDark },
  Delivered: { bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  Cancelled: { bg: 'rgba(227,30,36,0.1)', color: BRAND.red },
}

const PAYMENT_LABELS = {
  cod: 'Cash on Delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank: 'Bank Transfer',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const load = async () => {
    setLoading(true)
    try {
      const list = await getOrders()
      setOrders(list)
    } catch (err) {
      setToast({
        severity: 'error',
        text: err?.message || 'Failed to load orders.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus =
        statusFilter === 'All' || o.status === statusFilter
      const matchesSearch =
        !search ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.customer?.phone || '').includes(search)
      return matchesStatus && matchesSearch
    })
  }, [orders, statusFilter, search])

  const handleStatusChange = async (newStatus) => {
    if (!selected || newStatus === selected.status) return
    setUpdating(true)
    try {
      const updated = await updateOrderStatus(selected._id, {
        status: newStatus,
      })
      setSelected(updated)
      setToast({ severity: 'success', text: 'Order status updated.' })
      load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Update failed.' })
    } finally {
      setUpdating(false)
    }
  }

  const handlePaymentChange = async (newPayment) => {
    if (!selected || newPayment === selected.paymentStatus) return
    setUpdating(true)
    try {
      const updated = await updateOrderStatus(selected._id, {
        paymentStatus: newPayment,
      })
      setSelected(updated)
      setToast({ severity: 'success', text: 'Payment status updated.' })
      load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Update failed.' })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteOrder(toDelete._id)
      setToast({
        severity: 'success',
        text: `Order ${toDelete.orderNumber} deleted.`,
      })
      setToDelete(null)
      if (selected?._id === toDelete._id) setSelected(null)
      load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Delete failed.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout title="Orders">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            Orders
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {orders.length} total {orders.length === 1 ? 'order' : 'orders'}
          </Typography>
        </Box>

        {/* Search */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderRadius: 999,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            mb: 2,
            maxWidth: 400,
            '&:focus-within': { borderColor: 'info.main' },
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <InputBase
            placeholder="Search by order #, name, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ fontSize: '0.88rem', flex: 1 }}
          />
        </Box>

        {/* Status chips */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mb: 3,
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <FilterChip
            label="All"
            count={orders.length}
            active={statusFilter === 'All'}
            onClick={() => setStatusFilter('All')}
          />
          {STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={s}
              count={orders.filter((o) => o.status === s).length}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </Stack>

        {/* Table */}
        <Box
          sx={{
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={32} sx={{ color: 'info.main' }} />
            </Box>
          ) : filtered.length === 0 ? (
            <EmptyState hasOrders={orders.length > 0} />
          ) : (
            <>
              <Box
                sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: '120px 1.5fr 1fr 110px 140px 60px',
                  gap: 2,
                  alignItems: 'center',
                  px: 3,
                  py: 1.75,
                  bgcolor: 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <HeaderCell>Order</HeaderCell>
                <HeaderCell>Customer</HeaderCell>
                <HeaderCell>Items</HeaderCell>
                <HeaderCell>Total</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell align="right">View</HeaderCell>
              </Box>

              {filtered.map((o, i) => (
                <Box
                  key={o._id}
                  onClick={() => setSelected(o)}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr auto',
                      md: '120px 1.5fr 1fr 110px 140px 60px',
                    },
                    gap: { xs: 1.5, md: 2 },
                    alignItems: 'center',
                    px: { xs: 2, md: 3 },
                    py: 2,
                    borderBottom:
                      i < filtered.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    cursor: 'pointer',
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
                    {o.orderNumber}
                  </Typography>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        lineHeight: 1.3,
                        mb: 0.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {o.customer?.name || '—'}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        color: 'text.secondary',
                        display: { xs: 'block', md: 'none' },
                      }}
                    >
                      {o.items?.length || 0} items · PKR{' '}
                      {Number(o.total || 0).toLocaleString()}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      color: 'text.secondary',
                      display: { xs: 'none', md: 'block' },
                    }}
                  >
                    {o.items?.length || 0}{' '}
                    {o.items?.length === 1 ? 'item' : 'items'}
                  </Typography>

                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'text.primary',
                      display: { xs: 'none', md: 'block' },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    PKR {Number(o.total || 0).toLocaleString()}
                  </Typography>

                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Chip
                      label={o.status}
                      size="small"
                      sx={{
                        bgcolor: STATUS_COLORS[o.status]?.bg,
                        color: STATUS_COLORS[o.status]?.color,
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        height: 22,
                        borderRadius: 999,
                      }}
                    />
                  </Box>

                  <Stack
                    direction="row"
                    justifyContent="flex-end"
                    sx={{ gridColumn: { xs: '2 / 3', md: 'auto' } }}
                  >
                    <IconButton
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        '&:hover': { color: 'info.main' },
                      }}
                    >
                      <VisibilityOutlinedIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </>
          )}
        </Box>
      </Box>

      {/* Order detail drawer */}
      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 500 } } }}
      >
        {selected && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                px: 3,
                py: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    mb: 0.25,
                  }}
                >
                  Order
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: 'info.main',
                    lineHeight: 1,
                  }}
                >
                  {selected.orderNumber}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5}>
                <IconButton
                  onClick={() => setToDelete(selected)}
                  size="small"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main' },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
                <IconButton onClick={() => setSelected(null)} size="small">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              {/* Status */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    mb: 1,
                  }}
                >
                  Order status
                </Typography>
                <TextField
                  select
                  size="small"
                  value={selected.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  fullWidth
                >
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Payment */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    mb: 1,
                  }}
                >
                  Payment
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1.5 }}
                >
                  <Chip
                    label={
                      PAYMENT_LABELS[selected.paymentMethod] ||
                      selected.paymentMethod
                    }
                    size="small"
                    sx={{
                      bgcolor: 'action.hover',
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      height: 24,
                    }}
                  />
                  <Chip
                    label={selected.paymentStatus}
                    size="small"
                    sx={{
                      bgcolor:
                        selected.paymentStatus === 'paid'
                          ? 'rgba(16,185,129,0.12)'
                          : selected.paymentStatus === 'refunded'
                          ? 'rgba(227,30,36,0.1)'
                          : 'rgba(255,193,7,0.15)',
                      color:
                        selected.paymentStatus === 'paid'
                          ? '#0F8A5F'
                          : selected.paymentStatus === 'refunded'
                          ? BRAND.red
                          : '#B45309',
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      height: 22,
                      textTransform: 'uppercase',
                    }}
                  />
                </Stack>
                <TextField
                  select
                  size="small"
                  value={selected.paymentStatus}
                  onChange={(e) => handlePaymentChange(e.target.value)}
                  disabled={updating}
                  fullWidth
                >
                  <MenuItem value="unpaid">Unpaid</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="refunded">Refunded</MenuItem>
                </TextField>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Customer */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    mb: 1,
                  }}
                >
                  Customer
                </Typography>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {selected.customer?.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                    {selected.customer?.phone}
                  </Typography>
                  {selected.customer?.email && (
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                      {selected.customer.email}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 1 }}>
                    {selected.customer?.address}
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                    {selected.customer?.city}
                  </Typography>
                  {selected.customer?.notes && (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        fontSize: '0.82rem',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          color: 'text.secondary',
                          mb: 0.5,
                        }}
                      >
                        Notes
                      </Typography>
                      {selected.customer.notes}
                    </Box>
                  )}
                </Stack>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Items */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    mb: 1.5,
                  }}
                >
                  Items ({selected.items?.length || 0})
                </Typography>
                <Stack spacing={2}>
                  {(selected.items || []).map((it, idx) => (
                    <Stack
                      key={idx}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 1,
                          bgcolor: 'grey.50',
                          border: '1px solid',
                          borderColor: 'divider',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {it.image && (
                          <Box
                            component="img"
                            src={it.image}
                            alt={it.name}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {it.name}
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.72rem', color: 'text.secondary' }}
                        >
                          PKR {Number(it.price).toLocaleString()} × {it.quantity}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: '"Barlow Condensed", sans-serif',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        PKR {(it.price * it.quantity).toLocaleString()}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Totals */}
              <Stack spacing={1}>
                <TotalRow label="Subtotal" value={selected.subtotal || 0} />
                <TotalRow label="Shipping" value={selected.shipping || 0} free />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    pt: 1.5,
                    mt: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}
                  >
                    Total
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Barlow Condensed", sans-serif',
                      fontWeight: 800,
                      fontSize: '1.3rem',
                      color: 'info.main',
                    }}
                  >
                    PKR {Number(selected.total || 0).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Delete confirmation */}
      <Dialog
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete order?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
            Delete order <strong>{toDelete?.orderNumber}</strong>? Product stock
            will be restored. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setToDelete(null)}
            disabled={deleting}
            sx={{ textTransform: 'none', color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="contained"
            color="error"
            sx={{
              textTransform: 'none',
              borderRadius: 999,
              fontWeight: 700,
              px: 3,
            }}
          >
            {deleting ? (
              <CircularProgress size={16} sx={{ color: '#fff' }} />
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity || 'success'}
          variant="filled"
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {toast?.text}
        </Alert>
      </Snackbar>
    </AdminLayout>
  )
}

/* ── Sub-components ─────────────────────────────────── */

function HeaderCell({ children, align = 'left' }) {
  return (
    <Typography
      sx={{
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'text.secondary',
        textAlign: align,
      }}
    >
      {children}
    </Typography>
  )
}

function FilterChip({ label, count, active, onClick }) {
  return (
    <Button
      onClick={onClick}
      size="small"
      sx={{
        flexShrink: 0,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.78rem',
        borderRadius: 999,
        px: 1.75,
        py: 0.6,
        minWidth: 'auto',
        color: active ? '#fff' : 'text.secondary',
        bgcolor: active ? 'info.main' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'info.main' : 'divider',
        '&:hover': {
          bgcolor: active ? 'info.dark' : 'action.hover',
          borderColor: active ? 'info.dark' : 'text.secondary',
        },
      }}
    >
      {label}
      <Box
        component="span"
        sx={{
          ml: 0.75,
          px: 0.6,
          py: 0.1,
          borderRadius: 999,
          fontSize: '0.68rem',
          fontWeight: 700,
          bgcolor: active ? 'rgba(255,255,255,0.25)' : 'action.hover',
          color: active ? '#fff' : 'text.secondary',
        }}
      >
        {count}
      </Box>
    </Button>
  )
}

function TotalRow({ label, value, free }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.88rem',
          fontWeight: 600,
          color: free && value === 0 ? 'info.main' : 'text.primary',
        }}
      >
        {free && value === 0 ? 'Free' : `PKR ${Number(value).toLocaleString()}`}
      </Typography>
    </Stack>
  )
}

function EmptyState({ hasOrders }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        px: 3,
        py: 8,
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
          mb: 2.5,
        }}
      >
        <ReceiptLongOutlinedIcon sx={{ fontSize: 34 }} />
      </Box>
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: '1.35rem',
          color: 'text.primary',
          mb: 0.75,
        }}
      >
        {hasOrders ? 'No orders in this status' : 'No orders yet'}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.85rem',
          color: 'text.secondary',
          maxWidth: 340,
          lineHeight: 1.6,
        }}
      >
        {hasOrders
          ? 'Try a different status filter or clear the search.'
          : 'Orders will appear here automatically when customers place them.'}
      </Typography>
    </Box>
  )
}