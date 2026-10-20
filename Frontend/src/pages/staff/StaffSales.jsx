import { useEffect, useState } from 'react'
import { Navigate, useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Stack, Card, CardContent, Chip, CircularProgress, Alert, Button,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import StaffLayout from './StaffLayout.jsx'
import { fmtDate } from '../../components/admin/format.js'
import { isStaffLoggedIn } from '../../lib/staffAuth.js'
import { getStaffSales } from '../../services/api.js'

const STATUS = {
  pending: { label: 'Pending review', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  completed: { label: 'Approved', bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  rejected: { label: 'Rejected', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
  void: { label: 'Void', bg: 'rgba(100,116,139,0.12)', color: '#475569' },
}

export default function StaffSales() {
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getStaffSales()
      .then((rows) => { if (alive) setSales(rows) })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load your submissions.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (!isStaffLoggedIn()) return <Navigate to="/staff" replace />

  return (
    <StaffLayout title="My submissions" subtitle="New sales wait for admin approval. No invoice is created here.">
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button
          component={RouterLink}
          to="/staff/new"
          variant="contained"
          color="info"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}
        >
          New sale
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: 'info.main' }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      ) : sales.length === 0 ? (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 7 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: 'action.hover', display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5 }}>
              <ReceiptLongOutlinedIcon sx={{ color: 'text.secondary' }} />
            </Box>
            <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.3rem', mb: 0.5 }}>
              No sales submitted yet
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2.5 }}>
              Create a sale and it will appear here while the admin reviews it.
            </Typography>
            <Button component={RouterLink} to="/staff/new" variant="outlined" color="info" startIcon={<AddIcon />} sx={{ borderRadius: 999, fontWeight: 700 }}>
              Create a sale
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {sales.map((sale) => {
            const st = STATUS[sale.status] || STATUS.pending
            return (
              <Card
                key={sale._id}
                elevation={0}
                onClick={() => navigate(`/staff/sales/${sale._id}`)}
                sx={{
                  border: '1px solid', borderColor: 'divider', borderRadius: 1.5, cursor: 'pointer',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { borderColor: 'info.main', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' },
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Box sx={{ minWidth: 130 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem' }}>
                        {sale.saleNumber}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                        {fmtDate(sale.submittedAt)}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 150 }}>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>{sale.customerName}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{sale.customerPhone}</Typography>
                    </Box>

                    <Box sx={{ minWidth: 70 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Devices</Typography>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>{sale.itemCount}</Typography>
                    </Box>

                    <Chip label={st.label} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: '0.7rem', borderRadius: 999 }} />
                    <ChevronRightIcon sx={{ color: 'text.secondary' }} />
                  </Stack>

                  {sale.status === 'rejected' && sale.rejectionReason && (
                    <Typography sx={{ fontSize: '0.78rem', color: '#C81E1E', mt: 1 }}>
                      {sale.rejectionReason}
                    </Typography>
                  )}
                  {sale.status === 'completed' && sale.invoiceNumber && (
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
                      Invoice {sale.invoiceNumber} was created by the admin.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}
    </StaffLayout>
  )
}
