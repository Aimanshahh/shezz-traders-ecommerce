import { useEffect, useState } from 'react'
import { Navigate, Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { money, fmtDate, labelOf, PAYMENT_METHODS } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { deleteSale, getSale, updateInvoiceEmail } from '../../services/api.js'

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  .invoice-page { background: #fff !important; padding: 10mm !important; min-height: 0 !important; }
  .invoice-sheet { box-sizing: border-box !important; display: block !important; width: 100% !important; min-height: 0 !important; height: auto !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; max-width: none !important; padding: 0 7mm !important; }
  .invoice-banner { margin: 0 -7mm 8mm !important; }
  .invoice-bottom { margin-top: 15mm !important; padding-top: 0 !important; }
  @page { size: A4; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  tr { page-break-inside: avoid; }
}
`

const labelStyle = {
  color: '#087F86',
  fontSize: '0.68rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  mb: 0.6,
}
const detailStyle = { color: '#17333A', fontSize: '0.84rem', lineHeight: 1.65, overflowWrap: 'anywhere' }
const thStyle = {
  px: 1.5,
  py: 1.25,
  color: '#087F86',
  bgcolor: '#EAF2F2',
  borderBottom: '1px solid #9FB5B7',
  fontSize: '0.68rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textAlign: 'left',
  textTransform: 'uppercase',
}
const tdStyle = { px: 1.5, py: 1.5, borderBottom: '1px solid #D9E4E5', fontSize: '0.82rem', verticalAlign: 'top' }

export default function AdminInvoice() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState('')
  const [emailAction, setEmailAction] = useState('')
  const [emailNotice, setEmailNotice] = useState(null)

  useEffect(() => {
    let alive = true
    getSale(id)
      .then((result) => {
        if (!alive) return
        setData(result)
        setEmailRecipient(result.invoiceEmail?.recipient || result.customerEmail || '')
      })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load this invoice.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const sale = data?.sale
  const items = data?.items || []
  const shop = data?.settings || {}
  const returned = Number(sale?.returnedAmount || 0)
  const received = Number(sale?.amountPaid || 0) + Number(sale?.paidLater || 0)
  const refunded = Number(sale?.refundedAmount || 0)
  const netPaid = Math.max(0, received - refunded)
  const netTotal = Math.max(0, Number(sale?.total || 0) - returned)
  const balanceDue = Math.max(0, netTotal - netPaid)
  const accountCredit = Math.max(0, netPaid - netTotal)

  const handleDelete = async () => {
    if (!window.confirm('Delete this invoice? Its devices go back to Available and its warranties and payments are removed. This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteSale(id)
      navigate('/admin/sales')
    } catch (err) {
      setError(err?.message || 'Could not delete this invoice.')
      setDeleting(false)
    }
  }

  const handleSavePdf = () => {
    if (!sale) return
    const previousTitle = document.title
    document.title = `${sale.invoiceNumber} - ${sale.customerSnapshot?.name || 'Invoice'}`
    window.print()
    window.setTimeout(() => { document.title = previousTitle }, 500)
  }

  const handleInvoiceEmail = async (action) => {
    const recipient = emailRecipient.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      setEmailNotice({ severity: 'error', text: 'Enter a valid email address.' })
      return
    }
    setEmailAction(action)
    setEmailNotice(null)
    try {
      const result = await updateInvoiceEmail(id, recipient, action)
      setData((current) => ({
        ...current,
        customerEmail: recipient,
        invoiceEmail: result.invoiceEmail,
      }))
      if (result.delivery?.sent === false) {
        setEmailNotice({ severity: 'warning', text: result.delivery.message })
      } else if (action === 'send') {
        setEmailNotice({ severity: 'success', text: `Invoice sent to ${recipient}.` })
      } else {
        setEmailNotice({ severity: 'success', text: 'Recipient saved as an email draft on this invoice.' })
      }
    } catch (err) {
      setEmailNotice({ severity: 'error', text: err?.message || 'Could not update invoice email.' })
    } finally {
      setEmailAction('')
    }
  }

  return (
    <Box className="invoice-page" sx={{ bgcolor: '#F2F7F7', minHeight: '100vh', py: 3, px: { xs: 1, sm: 2 } }}>
      <style>{PRINT_CSS}</style>

      <Stack
        className="no-print"
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{ maxWidth: 850, mx: 'auto', mb: 2 }}
      >
        <Button component={RouterLink} to="/admin/sales" startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'flex-start', textTransform: 'none', color: '#526B70', fontWeight: 600 }}>
          Back to sales
        </Button>
        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
          <Button onClick={handleDelete} disabled={!sale || deleting} startIcon={<DeleteOutlineIcon />} color="error" sx={{ textTransform: 'none' }}>
            Delete invoice
          </Button>
          <Button onClick={() => window.print()} disabled={!sale} startIcon={<PrintOutlinedIcon />} variant="contained" sx={{ bgcolor: '#073B43', borderRadius: 1, textTransform: 'none', '&:hover': { bgcolor: '#0A5059' } }}>
            Print
          </Button>
          <Button onClick={handleSavePdf} disabled={!sale} startIcon={<PictureAsPdfOutlinedIcon />} variant="outlined" sx={{ borderColor: '#087F86', color: '#087F86', borderRadius: 1, textTransform: 'none', whiteSpace: 'nowrap' }}>
            Save as PDF
          </Button>
        </Stack>
      </Stack>

      {sale && (
        <Box className="no-print" sx={{ maxWidth: 850, mx: 'auto', mb: 2, p: 2, bgcolor: '#fff', border: '1px solid #D7E2E3', borderRadius: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <Box sx={{ minWidth: { md: 165 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Email invoice</Typography>
              <Chip
                size="small"
                label={data.invoiceEmail?.status === 'sent' ? `Sent to ${data.invoiceEmail.recipient}` : data.invoiceEmail?.status === 'draft' && data.invoiceEmail?.sentAt ? 'Draft saved · previously sent' : data.invoiceEmail?.status === 'draft' ? 'Draft saved' : 'Not sent'}
                color={data.invoiceEmail?.status === 'sent' ? 'success' : 'default'}
                variant="outlined"
                sx={{ mt: 0.75, maxWidth: '100%' }}
              />
            </Box>
            <TextField
              type="email"
              size="small"
              label="Recipient email"
              value={emailRecipient}
              onChange={(event) => setEmailRecipient(event.target.value)}
              disabled={!!emailAction}
              sx={{ flex: 1, minWidth: 180 }}
            />
            <Stack direction="row" spacing={1}>
              <Button onClick={() => handleInvoiceEmail('draft')} disabled={!!emailAction} variant="outlined" startIcon={emailAction === 'draft' ? <CircularProgress size={16} /> : <SaveOutlinedIcon />} sx={{ whiteSpace: 'nowrap' }}>
                Save draft
              </Button>
              <Button onClick={() => handleInvoiceEmail('send')} disabled={!!emailAction} variant="contained" color="info" startIcon={emailAction === 'send' ? <CircularProgress size={16} color="inherit" /> : <EmailOutlinedIcon />} sx={{ whiteSpace: 'nowrap' }}>
                Send invoice
              </Button>
            </Stack>
          </Stack>
          {emailNotice && <Alert severity={emailNotice.severity} sx={{ mt: 1.5 }}>{emailNotice.text}</Alert>}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={40} sx={{ color: '#087F86' }} /></Box>
      ) : error ? (
        <Alert severity="error" sx={{ maxWidth: 850, mx: 'auto', borderRadius: 1, fontWeight: 600 }}>{error}</Alert>
      ) : sale && (
        <Box className="invoice-sheet" sx={{ maxWidth: 850, mx: 'auto', bgcolor: '#fff', color: '#17333A', p: { xs: 3, sm: 5 }, border: '1px solid #D7E2E3', borderRadius: 1, boxShadow: '0 4px 20px rgba(15,23,42,0.05)' }}>
          <Box className="invoice-banner" sx={{ mx: { xs: -3, sm: -5 }, mt: { xs: -3, sm: -5 }, mb: 3, px: { xs: 2.5, sm: 4 }, py: 2.5, bgcolor: '#087F86', color: '#fff', borderBottom: '6px solid #20BAC1' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Box component="img" src="/images/logo.png" alt="" sx={{ width: 44, height: 44, objectFit: 'contain', bgcolor: '#fff', borderRadius: 1, p: 0.4 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.25rem' }, lineHeight: 1.15 }}>{shop.shopName || 'Shezz Traders'}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', opacity: 0.9 }}>{shop.phone || shop.email || 'GPS Tracking & Vehicle Security'}</Typography>
                </Box>
              </Stack>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', sm: '1.45rem' }, lineHeight: 1.1 }}>INVOICE</Typography>
                <Typography sx={{ mt: 0.5, fontSize: '0.78rem', fontFamily: 'monospace' }}>{sale.invoiceNumber}</Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2.5, sm: 5 }, py: 1.5 }}>
            <Box>
              <Typography sx={labelStyle}>Issued to</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', mt: 0.5 }}>{sale.customerSnapshot?.name || '—'}</Typography>
              <Typography sx={detailStyle}>{sale.customerSnapshot?.phone}</Typography>
              {data.customerEmail && <Typography sx={detailStyle}>{data.customerEmail}</Typography>}
              {[sale.customerSnapshot?.address, sale.customerSnapshot?.city].filter(Boolean).length > 0 && <Typography sx={detailStyle}>{[sale.customerSnapshot?.address, sale.customerSnapshot?.city].filter(Boolean).join(', ')}</Typography>}
            </Box>
            <Box>
              <Typography sx={labelStyle}>Date & payment</Typography>
              <Stack spacing={0.35} sx={{ mt: 0.5 }}>
                <Typography sx={detailStyle}><strong>Date:</strong> {fmtDate(sale.saleDate)}</Typography>
                <Typography sx={detailStyle}><strong>Method:</strong> {labelOf(PAYMENT_METHODS, sale.paymentMethod)}</Typography>
                {sale.paymentMethod === 'bank_transfer' && shop.bankName && <Typography sx={detailStyle}><strong>Bank:</strong> {shop.bankName}</Typography>}
                {sale.paymentMethod === 'bank_transfer' && shop.bankAccountName && <Typography sx={detailStyle}><strong>Account title:</strong> {shop.bankAccountName}</Typography>}
                {sale.paymentMethod === 'bank_transfer' && shop.bankAccountNumber && <Typography sx={detailStyle}><strong>Account number:</strong> {shop.bankAccountNumber}</Typography>}
                {shop.taxNumber && <Typography sx={detailStyle}><strong>Tax / registration:</strong> {shop.taxNumber}</Typography>}
                <Typography sx={detailStyle}><strong>Issued by:</strong> {sale.soldByName || '—'}</Typography>
              </Stack>
            </Box>
          </Box>
          <Divider sx={{ borderColor: '#B9CBCD', mt: 1.5 }} />

          <Box sx={{ py: 3, overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead><tr>
                <Box component="th" sx={{ ...thStyle, width: 64, textAlign: 'center' }}>Qty</Box>
                <Box component="th" sx={thStyle}>Description</Box>
                <Box component="th" sx={{ ...thStyle, width: 140, textAlign: 'right' }}>Amount</Box>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <Box component="tr" key={item._id}>
                    <Box component="td" sx={{ ...tdStyle, textAlign: 'center' }}>1</Box>
                    <Box component="td" sx={tdStyle}>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>{item.productName || 'Device'}</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#526B70', mt: 0.3 }}>IMEI {item.imei}{item.boxCode ? ` · Box ${item.boxCode}` : ''}</Typography>
                      <Typography sx={{ fontSize: '0.74rem', color: '#526B70', mt: 0.3 }}>Warranty until {item.warranty ? fmtDate(item.warranty.endDate) : '—'}</Typography>
                    </Box>
                    <Box component="td" sx={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>{money(item.unitPrice)}</Box>
                  </Box>
                ))}
              </tbody>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr minmax(240px, 0.8fr)' }, gap: { xs: 3, sm: 5 }, alignItems: 'start', pt: 1, pb: 3 }}>
            <Box>
              <Typography sx={labelStyle}>Terms & conditions</Typography>
              <Typography sx={detailStyle}>{sale.warrantyMonths}-month warranty from the date of sale.</Typography>
              {shop.warrantyNote && <Typography sx={{ ...detailStyle, color: '#526B70', mt: 0.5 }}>{shop.warrantyNote}</Typography>}
              {sale.notes && <><Typography sx={{ ...labelStyle, mt: 2 }}>Notes</Typography><Typography sx={detailStyle}>{sale.notes}</Typography></>}
            </Box>
            <Stack spacing={0.25}>
              <TotalRow label="Subtotal" value={money(sale.subtotal)} />
              {sale.discount > 0 && <TotalRow label="Discount" value={`-${money(sale.discount)}`} />}
              <TotalRow label="Tax (not configured)" value={money(0)} />
              {returned > 0 && <TotalRow label="Return credit" value={`-${money(returned)}`} />}
              <Divider sx={{ my: 1, borderColor: '#087F86' }} />
              <TotalRow label="Grand total" value={money(netTotal)} strong />
              {sale.amountPaid > 0 && <TotalRow label="Paid at sale" value={money(sale.amountPaid)} />}
              {sale.paidLater > 0 && <TotalRow label="Paid later" value={money(sale.paidLater)} />}
              {refunded > 0 && <TotalRow label="Refunded" value={`-${money(refunded)}`} />}
              {balanceDue > 0 && <TotalRow label="Balance due" value={money(balanceDue)} strong />}
              {accountCredit > 0 && <TotalRow label="Customer credit" value={money(accountCredit)} strong />}
            </Stack>
          </Box>

          <Box className="invoice-bottom" sx={{ mt: 8 }}>
            <Divider sx={{ borderColor: '#B9CBCD' }} />
            {/* Centered signature blocks with increased vertical spacing */}
            <Stack 
              direction="row" 
              justifyContent="center" 
              spacing={12} 
              sx={{ pt: 6, mt: 2 }}
            >
              <Box sx={{ width: '35%', borderTop: '1px solid #9FB5B7', pt: 1.5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#526B70' }}>Customer signature</Typography>
              </Box>
              <Box sx={{ width: '35%', borderTop: '1px solid #9FB5B7', pt: 1.5, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#526B70' }}>Authorised signature</Typography>
              </Box>
            </Stack>
            {shop.invoiceFooter && (
              <Typography sx={{ textAlign: 'center', color: '#526B70', fontSize: '0.75rem', mt: 6 }}>
                {shop.invoiceFooter}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}

function TotalRow({ label, value, strong }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.4 }}>
      <Typography sx={{ color: strong ? '#17333A' : '#526B70', fontSize: strong ? '0.92rem' : '0.8rem', fontWeight: strong ? 800 : 500 }}>{label}</Typography>
      <Typography sx={{ color: '#17333A', fontSize: strong ? '0.98rem' : '0.82rem', fontWeight: strong ? 800 : 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{value}</Typography>
    </Stack>
  )
}