import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, Snackbar, Alert, CircularProgress,
} from '@mui/material'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getCrmSettings, saveCrmSettings } from '../../services/api.js'

export default function AdminCrmSettings() {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    getCrmSettings()
      .then(setForm)
      .catch((err) => setToast({ severity: 'error', text: err?.message || 'Could not load settings.' }))
      .finally(() => setLoading(false))
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await saveCrmSettings(form)
      setForm(saved)
      setToast({ severity: 'success', text: 'Settings saved.' })
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not save.' })
    } finally {
      setSaving(false)
    }
  }

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  return (
    <AdminLayout title="CRM settings">
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.1, mb: 0.5 }}>
          Invoice and warranty settings
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
          These details print on every invoice. Changes apply to new views of invoices straight away.
        </Typography>

        {loading || !form ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: 'info.main' }} />
          </Box>
        ) : (
          <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={2.5}>
              <TextField label="Shop name" value={form.shopName || ''} onChange={set('shopName')} fullWidth size="small" />
              <TextField label="Address" value={form.address || ''} onChange={set('address')} fullWidth size="small" multiline minRows={2} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label="Phone / WhatsApp" value={form.phone || ''} onChange={set('phone')} size="small" />
                <TextField label="Email" value={form.email || ''} onChange={set('email')} size="small" />
                <TextField label="Bank name" value={form.bankName || ''} onChange={set('bankName')} size="small" />
                <TextField label="Bank account title" value={form.bankAccountName || ''} onChange={set('bankAccountName')} size="small" />
                <TextField label="Bank account number" value={form.bankAccountNumber || ''} onChange={set('bankAccountNumber')} size="small" />
                <TextField label="Tax / registration number" value={form.taxNumber || ''} onChange={set('taxNumber')} size="small" />
                <TextField
                  label="Invoice prefix"
                  value={form.invoicePrefix || ''}
                  onChange={set('invoicePrefix')}
                  size="small"
                  helperText="Invoices read like INV-1001"
                />
              </Box>
              <TextField
                label="Warranty (months)"
                type="number"
                value={form.warrantyMonths ?? 6}
                onChange={set('warrantyMonths')}
                size="small"
                sx={{ maxWidth: 220 }}
                helperText="Applies to devices sold from now on"
              />
              <TextField label="Warranty wording on invoices" value={form.warrantyNote || ''} onChange={set('warrantyNote')} fullWidth size="small" multiline minRows={2} />
              <TextField label="Invoice footer" value={form.invoiceFooter || ''} onChange={set('invoiceFooter')} fullWidth size="small" />
              <Box>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  variant="contained"
                  color="info"
                  sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}
                >
                  {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save settings'}
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity={toast?.severity || 'success'} variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </AdminLayout>
  )
}