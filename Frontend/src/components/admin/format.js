export const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'EasyPaisa' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

export const SALE_SOURCES = [
  { value: 'offline', label: 'Offline' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Phone' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'other', label: 'Other' },
]

export const labelOf = (list, value) => list.find((x) => x.value === value)?.label || value

export const WARRANTY_LABELS = {
  active: 'Active',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  void: 'Void',
}