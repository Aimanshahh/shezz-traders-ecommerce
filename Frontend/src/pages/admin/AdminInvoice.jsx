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
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import { money, fmtDate, labelOf, PAYMENT_METHODS } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { deleteSale, getSale, updateInvoiceEmail } from '../../services/api.js'

const FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  html, body { background: #fff !important; }
  .invoice-page { background: #fff !important; padding: 6mm 8mm !important; min-height: 0 !important; }
  .invoice-sheet { box-sizing: border-box !important; display: block !important; width: 100% !important; min-height: 0 !important; height: auto !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; max-width: none !important; padding: 0 !important; position: relative !important; }
  .invoice-banner { margin: 0 0 2mm !important; padding-top: 3.5mm !important; padding-bottom: 3.5mm !important; position: relative !important; z-index: 1 !important; }
  .invoice-body { padding-top: 1mm !important; padding-bottom: 0 !important; min-height: 0 !important; position: relative !important; z-index: 1 !important; }
  .invoice-table td { padding-top: 1.8mm !important; padding-bottom: 1.8mm !important; }
  .invoice-spacer { display: none !important; }
  .invoice-total-row { padding-top: 1px !important; padding-bottom: 1px !important; }
  .invoice-table thead { display: table-header-group; }
  .invoice-closing { break-inside: avoid; page-break-inside: avoid; }
  .invoice-totals { break-inside: avoid; page-break-inside: avoid; }
  .invoice-schedule-head { break-after: avoid; page-break-after: avoid; }
  .invoice-schedule-row { break-inside: avoid; page-break-inside: avoid; }
  .invoice-watermark { position: absolute !important; inset: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 0 !important; }
  .invoice-watermark img { width: 55% !important; max-width: 120mm !important; opacity: 0.14 !important; }
  @page { size: A4; margin: 0; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  tr { page-break-inside: avoid; }
}
`

const BRAND = '#087F86'
const INK = '#17333A'
const MUTED = '#526B70'
const LINE = '#D9E4E5'

const FONT = "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"

// IMEIs stay inline in the item row up to this many; beyond it they move to the Device schedule.
const INLINE_IMEI_LIMIT = 4
// Up to this many devices: 4 columns with row numbers. Beyond it: 5 denser columns so long lists still fit one page.
const SCHEDULE_COMFORT_LIMIT = 32

const labelStyle = {
  color: BRAND,
  fontSize: '0.66rem',
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  mb: 0.75,
}
const detailStyle = { color: INK, fontSize: '0.82rem', lineHeight: 1.6, overflowWrap: 'anywhere' }
const thStyle = {
  px: 1.5,
  py: 1.1,
  color: '#fff',
  bgcolor: BRAND,
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textAlign: 'left',
  textTransform: 'uppercase',
}
const tdStyle = { px: 1.5, py: 1.5, borderBottom: `1px solid ${LINE}`, fontSize: '0.82rem', verticalAlign: 'top' }

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
  const groupedItems = groupInvoiceItems(items)
  const scheduleGroups = groupedItems.filter((g) => g.imeis.length > INLINE_IMEI_LIMIT)
  const shop = data?.settings || {}
  const returned = Number(sale?.returnedAmount || 0)
  const received = Number(sale?.amountPaid || 0) + Number(sale?.paidLater || 0)
  const refunded = Number(sale?.refundedAmount || 0)
  const netPaid = Math.max(0, received - refunded)
  const netTotal = Math.max(0, Number(sale?.total || 0) - returned)
  const balanceDue = Math.max(0, netTotal - netPaid)
  const accountCredit = Math.max(0, netPaid - netTotal)
  const status = balanceDue <= 0
    ? { label: 'PAID', bg: '#E3F6EC', color: '#0F7A4D' }
    : received > 0
      ? { label: 'PART PAID', bg: '#FFF1D6', color: '#9A5B00' }
      : { label: 'PAYMENT PENDING', bg: '#FDE7E5', color: '#B42318' }
  const overdue = balanceDue > 0 && sale?.dueDate && new Date(sale.dueDate) < new Date()
  const contactLine = [shop.phone, shop.email, shop.taxNumber ? `NTN: ${shop.taxNumber}` : ''].filter(Boolean).join('   ·   ')
  const totalDevices = items.length
  const hasBankDetails = !!(shop.bankName || shop.bankAccountName || shop.bankAccountNumber)
  const showBank = hasBankDetails && (sale?.paymentMethod === 'bank_transfer' || balanceDue > 0)

  const methodLabel = sale ? String(labelOf(PAYMENT_METHODS, sale.paymentMethod) || '') : ''
  const paymentText = received <= 0
    ? 'Pending'
    : (!methodLabel || methodLabel.toLowerCase() === 'other')
      ? (balanceDue > 0 ? 'Part payment' : 'Received')
      : methodLabel

  const warrantyLines = (() => {
    const seen = new Map()
    groupedItems.forEach((g) => {
      if (!g.warrantyEnd) return
      const k = String(g.warrantyEnd)
      if (!seen.has(k)) seen.set(k, [])
      seen.get(k).push(g.productName)
    })
    return [...seen.entries()].map(([end, names]) => ({ end, names }))
  })()

  const terms = []
  if (sale) {
    terms.push(
      `${sale.warrantyMonths}-month warranty from the date of sale.${warrantyLines.length === 1 ? ` Valid until ${fmtDate(warrantyLines[0].end)}.` : ''}`,
    )
    if (shop.warrantyNote) terms.push(shop.warrantyNote)
    terms.push('This is a computer-generated invoice and does not require a signature.')
  }

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
      <style>{FONT_CSS + PRINT_CSS}</style>

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
          {balanceDue > 0 && sale?.customer && (
            <Button
              component={RouterLink}
              to={`/admin/customers/${sale.customer?._id || sale.customer}`}
              startIcon={<PaymentsOutlinedIcon />}
              variant="contained"
              color="warning"
              sx={{ borderRadius: 1, textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              Record payment
            </Button>
          )}
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
        <Box
          className="invoice-sheet"
          sx={{
            position: 'relative',
            maxWidth: 850,
            mx: 'auto',
            bgcolor: '#fff',
            color: INK,
            border: '1px solid #D7E2E3',
            borderRadius: 1,
            boxShadow: '0 4px 20px rgba(15,23,42,0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: FONT,
            '& .MuiTypography-root': { fontFamily: FONT },
            '& .MuiTypography-root.mono': { fontFamily: MONO, fontVariantNumeric: 'tabular-nums' },
            '& table, & th, & td': { fontFamily: FONT },
          }}
        >
          {/* Watermark — centered logo behind all content */}
          <Box className="invoice-watermark" aria-hidden sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 0,
          }}>
            <Box
              component="img"
              src="/images/logo.png"
              alt=""
              sx={{
                width: { xs: '60%', sm: '55%' },
                maxWidth: 420,
                opacity: 0.14,
                userSelect: 'none',
              }}
            />
          </Box>

          {/* Header */}
          <Box className="invoice-banner" sx={{ position: 'relative', zIndex: 1, px: { xs: 2.5, sm: 4.5 }, py: 3, bgcolor: BRAND, color: '#fff', borderBottom: '6px solid #20BAC1' }}>
            <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ width: '100%' }}>
              <Stack direction="row" spacing={1.75} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                <Box component="img" src="/images/logo.png" alt="" sx={{ width: 56, height: 56, objectFit: 'contain', bgcolor: '#fff', borderRadius: 1, p: 0.6, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', sm: '1.35rem' }, lineHeight: 1.15 }}>{shop.shopName || 'Shezz Traders'}</Typography>
                  {shop.address && <Typography sx={{ fontSize: '0.72rem', opacity: 0.92, lineHeight: 1.5 }}>{shop.address}</Typography>}
                  {contactLine && <Typography sx={{ fontSize: '0.72rem', opacity: 0.92, lineHeight: 1.5 }}>{contactLine}</Typography>}
                </Box>
              </Stack>
              <Box sx={{ ml: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', sm: '1.75rem' }, lineHeight: 1, letterSpacing: '0.06em' }}>INVOICE</Typography>
                <Typography className="mono" sx={{ mt: 0.75, fontSize: '0.82rem', fontWeight: 600 }}>{sale.invoiceNumber}</Typography>
                <Box sx={{ mt: 1, px: 1.25, py: 0.35, borderRadius: 999, bgcolor: status.bg, color: status.color, fontSize: '0.64rem', fontWeight: 800, letterSpacing: '0.08em' }}>
                  {status.label}
                </Box>
              </Box>
            </Stack>
          </Box>

          <Box className="invoice-body" sx={{ position: 'relative', zIndex: 1, px: { xs: 2.5, sm: 4.5 }, pt: 3.5, pb: 4, display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Parties */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.1fr 1fr' }, gap: { xs: 2.5, sm: 4 } }}>
              <Box sx={{ p: 1.5, border: `1px solid ${LINE}`, borderRadius: 1, bgcolor: '#F8FBFB' }}>
                <Typography sx={labelStyle}>Billed to</Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{sale.customerSnapshot?.name || '—'}</Typography>
                {sale.customerSnapshot?.phone && <Typography sx={detailStyle}>{sale.customerSnapshot.phone}</Typography>}
                {data.customerEmail && <Typography sx={detailStyle}>{data.customerEmail}</Typography>}
                {[sale.customerSnapshot?.address, sale.customerSnapshot?.city].filter(Boolean).length > 0 && (
                  <Typography sx={detailStyle}>{[sale.customerSnapshot?.address, sale.customerSnapshot?.city].filter(Boolean).join(', ')}</Typography>
                )}
              </Box>
              <Box sx={{ p: 1.5, border: `1px solid ${LINE}`, borderRadius: 1, bgcolor: '#fff' }}>
                <Typography sx={labelStyle}>Invoice details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 2, rowGap: 0.2 }}>
                  <DetailRow label="Date" value={fmtDate(sale.saleDate)} />
                  <DetailRow label="Payment" value={paymentText} />
                  {balanceDue > 0 && sale.dueDate && (
                    <DetailRow label="Due by" value={`${fmtDate(sale.dueDate)}${overdue ? ' (overdue)' : ''}`} color={overdue ? '#B42318' : undefined} />
                  )}
                  <DetailRow label="Issued by" value={sale.soldByName || '—'} />
                </Box>
              </Box>
            </Box>

            {/* Summary strip */}
            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                border: `1px solid ${LINE}`,
                borderRadius: 1,
                bgcolor: '#F8FBFB',
                '& > div + div': { borderLeft: { sm: `1px solid ${LINE}` } },
              }}
            >
              <SummaryCell label="Devices" value={totalDevices > 0 ? String(totalDevices) : '—'} />
              <SummaryCell label="Warranty" value={`${sale.warrantyMonths} months`} />
              <SummaryCell label="Grand total" value={money(netTotal)} />
              <SummaryCell
                label={balanceDue > 0 ? 'Balance due' : 'Amount paid'}
                value={balanceDue > 0 ? money(balanceDue) : money(netPaid)}
                color={balanceDue > 0 ? (overdue ? '#B42318' : '#9A5B00') : '#0F7A4D'}
              />
            </Box>

            {/* Items */}
            <Box sx={{ mt: 2.5, overflowX: 'auto' }}>
              <Box component="table" className="invoice-table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead><tr>
                  <Box component="th" sx={{ ...thStyle, width: 40, textAlign: 'center' }}>#</Box>
                  <Box component="th" sx={thStyle}>Description</Box>
                  <Box component="th" sx={{ ...thStyle, width: 56, textAlign: 'center' }}>Qty</Box>
                  <Box component="th" sx={{ ...thStyle, width: 110, textAlign: 'right' }}>Unit price</Box>
                  <Box component="th" sx={{ ...thStyle, width: 120, textAlign: 'right' }}>Amount</Box>
                </tr></thead>
                <tbody>
                  {groupedItems.map((group, index) => {
                    const inlineImeis = group.imeis.length > 0 && group.imeis.length <= INLINE_IMEI_LIMIT
                    const inSchedule = group.imeis.length > INLINE_IMEI_LIMIT
                    return (
                      <Box component="tr" key={group.key}>
                        <Box component="td" sx={{ ...tdStyle, textAlign: 'center', color: MUTED }}>{index + 1}</Box>
                        <Box component="td" sx={tdStyle}>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{group.productName}</Typography>
                          {inlineImeis && (
                            <Box sx={{ mt: 0.6 }}>
                              <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em', color: MUTED, textTransform: 'uppercase', mb: 0.3 }}>
                                {group.imeis.length === 1 ? 'IMEI' : 'IMEI numbers'}
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: '2px 28px' }}>
                                {group.imeis.map((imei) => (
                                  <Typography key={imei} className="mono" sx={{ fontSize: '0.76rem', color: INK }}>{imei}</Typography>
                                ))}
                              </Box>
                            </Box>
                          )}
                          {inSchedule && (
                            <Typography sx={{ fontSize: '0.72rem', color: MUTED, mt: 0.4 }}>
                              {group.imeis.length} devices · IMEI list in the device schedule below
                            </Typography>
                          )}
                          {!inSchedule && group.boxes.length > 0 && (
                            <Typography className="mono" sx={{ fontSize: '0.68rem', color: '#7A9398', mt: 0.5 }}>
                              {group.boxes.length === 1 ? `Box ${group.boxes[0]}` : `Boxes ${group.boxes.join(', ')}`}
                            </Typography>
                          )}
                        </Box>
                        <Box component="td" sx={{ ...tdStyle, textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>x{group.qty}</Box>
                        <Box component="td" sx={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{money(group.unitPrice)}</Box>
                        <Box component="td" sx={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(group.lineTotal)}</Box>
                      </Box>
                    )
                  })}
                  {(sale.extras || []).map((extra, index) => (
                    <Box component="tr" key={`extra-${extra.product}-${index}`}>
                      <Box component="td" sx={{ ...tdStyle, textAlign: 'center', color: MUTED }}>{groupedItems.length + index + 1}</Box>
                      <Box component="td" sx={tdStyle}>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{extra.name}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: MUTED, mt: 0.3 }}>Additional component</Typography>
                      </Box>
                      <Box component="td" sx={{ ...tdStyle, textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }}>x{extra.quantity}</Box>
                      <Box component="td" sx={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
                        {money(extra.unitPrice ?? (Number(extra.total || 0) / (Number(extra.quantity) || 1)))}
                      </Box>
                      <Box component="td" sx={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{money(extra.total)}</Box>
                    </Box>
                  ))}
                </tbody>
              </Box>
            </Box>

            {/* Notes + totals */}
            <Box className="invoice-totals" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr minmax(270px, 0.85fr)' }, gap: { xs: 3, sm: 5 }, alignItems: 'start', pt: 3 }}>
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Typography sx={labelStyle}>Amount in words</Typography>
                  <Typography sx={{ ...detailStyle, fontStyle: 'italic' }}>{amountInWords(netTotal)}</Typography>
                </Box>
                {showBank && (
                  <Box sx={{ mb: 2 }}>
                    <Typography sx={labelStyle}>Bank details</Typography>
                    {shop.bankName && <Typography sx={detailStyle}>{shop.bankName}</Typography>}
                    {shop.bankAccountName && <Typography sx={detailStyle}>{shop.bankAccountName}</Typography>}
                    {shop.bankAccountNumber && <Typography className="mono" sx={detailStyle}>{shop.bankAccountNumber}</Typography>}
                  </Box>
                )}
                {sale.notes && (
                  <Box>
                    <Typography sx={labelStyle}>Notes</Typography>
                    <Typography sx={detailStyle}>{sale.notes}</Typography>
                  </Box>
                )}
              </Box>
              <Box>
                <Box>
                  <TotalRow label="Subtotal" value={money(sale.subtotal)} />
                  {sale.discount > 0 && <TotalRow label="Discount" value={`-${money(sale.discount)}`} />}
                  <TotalRow label="Tax" value={money(0)} />
                  {returned > 0 && <TotalRow label="Return credit" value={`-${money(returned)}`} />}
                </Box>
                <Box sx={{ mt: 0.75, px: 1.5, py: 0.7, bgcolor: '#EAF2F2', borderTop: `2px solid ${BRAND}`, borderRadius: '0 0 4px 4px' }}>
                  <TotalRow label="Grand total" value={money(netTotal)} strong />
                </Box>
                <Box sx={{ mt: 1 }}>
                  {sale.amountPaid > 0 && <TotalRow label={balanceDue > 0 ? 'Received' : 'Paid at sale'} value={money(sale.amountPaid)} />}
                  {sale.paidLater > 0 && <TotalRow label="Paid later" value={money(sale.paidLater)} />}
                  {refunded > 0 && <TotalRow label="Refunded" value={`-${money(refunded)}`} />}
                  {accountCredit > 0 && <TotalRow label="Customer credit" value={money(accountCredit)} strong />}
                </Box>
                {balanceDue > 0 && (
                  <Box sx={{ mt: 1, px: 1.5, py: 0.8, borderRadius: 1, bgcolor: overdue ? '#FDE7E5' : '#FFF4DC', border: `1px solid ${overdue ? '#F3B8B2' : '#F2D595'}` }}>
                    <TotalRow label="Balance due" value={money(balanceDue)} strong />
                    {sale.dueDate && (
                      <Typography sx={{ fontSize: '0.72rem', color: overdue ? '#B42318' : '#9A5B00', textAlign: 'right', fontWeight: 600 }}>
                        {overdue ? 'Overdue since' : 'Please pay by'} {fmtDate(sale.dueDate)}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Device schedule — long IMEI lists live here, not in the item row */}
            {scheduleGroups.length > 0 && (
              <Box className="invoice-schedule" sx={{ mt: 2.5 }}>
                {scheduleGroups.map((group) => (
                  <DeviceSchedule key={group.key} group={group} />
                ))}
              </Box>
            )}

            <Box className="invoice-spacer" sx={{ flex: 1, minHeight: 12 }} />

            {/* Closing: thank you, then warranty & terms as the very last section */}
            <Box className="invoice-closing" sx={{ mt: 2 }}>
              {shop.invoiceFooter && (
                <Typography sx={{ textAlign: 'center', color: INK, fontSize: '0.86rem', fontWeight: 700, mb: 1.25 }}>
                  {shop.invoiceFooter}
                </Typography>
              )}
              <Divider sx={{ borderColor: '#B9CBCD' }} />
              <Box sx={{ pt: 1.25 }}>
                <Typography sx={labelStyle}>Warranty &amp; terms</Typography>
                <Box component="ol" sx={{ m: 0, pl: 2.25 }}>
                  {terms.map((term) => (
                    <Box component="li" key={term} sx={{ ...detailStyle, fontSize: '0.78rem', pl: 0.5, '&::marker': { color: MUTED, fontWeight: 700 } }}>
                      {term}
                    </Box>
                  ))}
                </Box>
                {warrantyLines.length > 1 && (
                  <Box sx={{ mt: 0.75, pl: 2.75 }}>
                    {warrantyLines.map((w) => (
                      <Typography key={w.end} sx={{ ...detailStyle, fontSize: '0.76rem', color: MUTED }}>
                        {w.names.join(', ')}: valid until {fmtDate(w.end)}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

function groupInvoiceItems(items) {
  const groups = new Map()
  items.forEach((item) => {
    const productName = item.productName || 'Device'
    const unitPrice = Number(item.unitPrice || 0)
    const warrantyEnd = item.warranty?.endDate || null
    const key = `${productName}|${unitPrice}|${warrantyEnd || ''}`
    let group = groups.get(key)
    if (!group) {
      group = { key, productName, unitPrice, warrantyEnd, qty: 0, lineTotal: 0, imeis: [], boxes: [] }
      groups.set(key, group)
    }
    group.qty += 1
    group.lineTotal += unitPrice
    if (item.imei) group.imeis.push(item.imei)
    if (item.boxCode && !group.boxes.includes(item.boxCode)) group.boxes.push(item.boxCode)
  })
  return [...groups.values()]
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function wordsBelowThousand(n) {
  const parts = []
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`)
  if (rest) parts.push(rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? ` ${ONES[rest % 10]}` : ''}`)
  return parts.join(' ')
}

// Pakistani numbering: Crore / Lakh / Thousand
function amountInWords(amount) {
  const value = Math.max(0, Number(amount) || 0)
  let rupees = Math.floor(value)
  const paisa = Math.round((value - rupees) * 100)
  if (paisa === 100) { rupees += 1 }
  const paisaPart = paisa === 100 ? 0 : paisa
  if (rupees === 0 && paisaPart === 0) return 'Zero Rupees Only'

  const parts = []
  const crore = Math.floor(rupees / 10000000)
  const lakh = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const rest = rupees % 1000
  if (crore) parts.push(`${wordsBelowThousand(crore)} Crore`)
  if (lakh) parts.push(`${wordsBelowThousand(lakh)} Lakh`)
  if (thousand) parts.push(`${wordsBelowThousand(thousand)} Thousand`)
  if (rest) parts.push(wordsBelowThousand(rest))

  let text = rupees > 0 ? `${parts.join(' ')} Rupees` : ''
  if (paisaPart) text += `${text ? ' and ' : ''}${wordsBelowThousand(paisaPart)} Paisa`
  return `${text} Only`
}

function DeviceSchedule({ group }) {
  const dense = group.imeis.length > SCHEDULE_COMFORT_LIMIT
  const columns = dense ? 5 : 4
  const rows = []
  for (let i = 0; i < group.imeis.length; i += columns) {
    rows.push(group.imeis.slice(i, i + columns))
  }
  const pad = String(group.imeis.length).length
  const boxText = group.boxes.length === 0 ? '' : group.boxes.length === 1 ? `Box ${group.boxes[0]}` : `Boxes ${group.boxes.join(', ')}`
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box className="invoice-schedule-head" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, flexWrap: 'wrap', pb: 0.7, mb: 0.75, borderBottom: `2px solid ${BRAND}` }}>
        <Typography sx={{ ...labelStyle, mb: 0 }}>
          Device Model · <Box component="span" sx={{ color: INK }}>{group.productName}</Box>
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED }}>
          {group.imeis.length} devices{boxText ? <Box component="span" className="mono" sx={{ fontWeight: 500, color: '#7A9398', ml: 1.25 }}>{boxText}</Box> : null}
        </Typography>
      </Box>
      <Box sx={{ border: `1px solid ${LINE}`, borderRadius: 1, overflow: 'hidden' }}>
        {rows.map((row, rowIndex) => (
          <Box
            key={rowIndex}
            className="invoice-schedule-row"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: `repeat(${columns}, 1fr)` },
              bgcolor: rowIndex % 2 === 0 ? '#F4F9F9' : '#fff',
              borderTop: rowIndex === 0 ? 'none' : `1px solid ${LINE}`,
            }}
          >
            {row.map((imei, cellIndex) => {
              const number = rowIndex * columns + cellIndex + 1
              return (
                <Box key={imei} sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, px: dense ? 1 : 1.25, py: 0.45 }}>
                  {!dense && (
                    <Typography className="mono" sx={{ fontSize: '0.6rem', color: '#8AA1A5', minWidth: `${pad + 0.4}ch` }}>
                      {String(number).padStart(pad, '0')}
                    </Typography>
                  )}
                  <Typography className="mono" sx={{ fontSize: dense ? '0.7rem' : '0.74rem', color: INK, letterSpacing: '0.01em' }}>
                    {imei}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function SummaryCell({ label, value, color }) {
  return (
    <Box sx={{ px: 1.75, py: 0.75 }}>
      <Typography sx={{ color: MUTED, fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ color: color || INK, fontSize: '0.92rem', fontWeight: 800, mt: 0.2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</Typography>
    </Box>
  )
}

function DetailRow({ label, value, color }) {
  return (
    <>
      <Typography sx={{ ...detailStyle, color: MUTED, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ ...detailStyle, fontWeight: 600, color: color || INK }}>{value}</Typography>
    </>
  )
}

function TotalRow({ label, value, strong }) {
  return (
    <Box className="invoice-total-row" sx={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 2, alignItems: 'baseline', width: '100%', py: 0.4 }}>
      <Typography sx={{ color: strong ? INK : MUTED, fontSize: strong ? '0.95rem' : '0.8rem', fontWeight: strong ? 800 : 500 }}>{label}</Typography>
      <Typography sx={{ color: INK, fontSize: strong ? '1.05rem' : '0.82rem', fontWeight: strong ? 800 : 600, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  )
}