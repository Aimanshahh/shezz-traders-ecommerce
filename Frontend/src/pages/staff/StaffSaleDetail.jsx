import { useEffect, useState } from 'react'
import { Navigate, useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Stack, Card, CardContent, Chip, CircularProgress, Alert, Button, Divider,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StaffLayout from './StaffLayout.jsx'
import { fmtDate } from '../../components/admin/format.js'
import { isStaffLoggedIn } from '../../lib/staffAuth.js'
import { getStaffSale } from '../../services/api.js'

const STATUS = {
  pending: { label: 'Pending review', bg: 'rgba(245,158,11,0.14)', color: '#B45309' },
  completed: { label: 'Approved', bg: 'rgba(16,185,129,0.12)', color: '#0F8A5F' },
  rejected: { label: 'Rejected', bg: 'rgba(227,30,36,0.1)', color: '#C81E1E' },
  void: { label: 'Void', bg: 'rgba(100,116,139,0.12)', color: '#475569' },
}

export default function StaffSaleDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getStaffSale(id)
      .then((result) => { if (alive) setData(result) })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load this sale.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  if (!isStaffLoggedIn()) return <Navigate to="/staff" replace />

  const sale = data?.sale
  const items = data?.items || []
  const st = STATUS[sale?.status] || STATUS.pending

  return (
    <StaffLayout title="Sale details" subtitle="New sales wait for admin approval. No invoice is created here.">
      <Button
        component={RouterLink}
        to="/staff/sales"
        startIcon={<ArrowBackIcon />}
        sx={{ textTransform: 'none', color: 'text.secondary', mb: 2 }}
      >
        Back to my submissions
      </Button>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: 'info.main' }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      ) : (
        <Stack spacing={2.5}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem' }}>
                    {sale.saleNumber}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>
                    Submitted {fmtDate(sale.submittedAt)}
                  </Typography>
                </Box>
                <Chip label={st.label} sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, borderRadius: 999 }} />
              </Stack>

              {sale.invoiceNumber && (
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 1.5 }}>
                  Invoice number: <b>{sale.invoiceNumber}</b>
                </Typography>
              )}

              {sale.status === 'rejected' && sale.rejectionReason && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>
                  Rejected: {sale.rejectionReason}
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>Customer</Typography>
                  <Typography sx={{ fontWeight: 700, mt: 0.25 }}>{sale.customer?.name}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                    {[sale.customer?.phone, sale.customer?.city].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>Devices</Typography>
                  <Typography sx={{ fontWeight: 700, mt: 0.25 }}>{sale.itemCount}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: { xs: 2.25, md: 2.75 } }}>
              <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Scanned IMEIs</Typography>
              <Stack spacing={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                {items.map((item, index) => (
                  <Stack
                    key={item._id || item.imei}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                    sx={{ px: 2, py: 1.25, borderBottom: index === items.length - 1 ? 'none' : '1px solid', borderColor: 'divider' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.86rem', fontWeight: 700 }}>{item.imei}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                        {item.productName}{item.boxCode ? ` · Box ${item.boxCode}` : ''}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </StaffLayout>
  )
}
