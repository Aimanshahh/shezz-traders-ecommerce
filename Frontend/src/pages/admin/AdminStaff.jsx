import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, Chip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import AdminLayout from './AdminLayout.jsx'
import { fmtDate } from '../../components/admin/format.js'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '../../services/api.js'

const GRID = 'minmax(0, 1.4fr) minmax(0, 1.6fr) 110px 100px minmax(0, 1fr) 240px'
const HEADS = ['Name', 'Email', 'Role', 'Status', 'Last sign-in', '']

export default function AdminStaff() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [resetFor, setResetFor] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    try {
      setUsers(await getAdminUsers())
      setError('')
    } catch (err) {
      setError(err?.message || 'Could not load accounts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    getAdminUsers()
      .then((rows) => { if (alive) { setUsers(rows); setError('') } })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load accounts.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const salespeople = users.filter((u) => u.isSalesperson)

  const handleCreate = async () => {
    setFormError('')
    setSaving(true)
    try {
      await createAdminUser(form)
      setCreateOpen(false)
      setForm({ name: '', email: '', password: '' })
      setToast({ severity: 'success', text: 'Salesperson account created.' })
      await load()
    } catch (err) {
      setFormError(err?.message || 'Could not create the account.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    setBusyId(user._id)
    try {
      await updateAdminUser(user._id, { isActive: !user.isActive })
      setToast({ severity: 'success', text: `${user.name} is now ${user.isActive ? 'deactivated' : 'active'}.` })
      await load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not update the account.' })
    } finally {
      setBusyId('')
    }
  }

  const handleReset = async () => {
    if (!resetFor) return
    setResetting(true)
    try {
      await updateAdminUser(resetFor._id, { password: newPassword })
      setResetFor(null)
      setNewPassword('')
      setToast({ severity: 'success', text: 'Password updated.' })
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not reset the password.' })
    } finally {
      setResetting(false)
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.name}'s account? Accounts with submissions cannot be deleted.`)) return
    setBusyId(user._id)
    try {
      await deleteAdminUser(user._id)
      setToast({ severity: 'success', text: 'Account deleted.' })
      await load()
    } catch (err) {
      setToast({ severity: 'error', text: err?.message || 'Could not delete the account.' })
    } finally {
      setBusyId('')
    }
  }

  return (
    <AdminLayout title="Salespeople">
      <Box sx={{ maxWidth: 1300, mx: 'auto' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: 'rgba(8,127,134,0.1)', color: 'info.main' }}>
              <BadgeOutlinedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, lineHeight: 1.1 }}>
                Salesperson accounts
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                Accounts that can submit sales. They never see rates, totals or customers' balances.
              </Typography>
            </Box>
          </Stack>
          <Button onClick={() => { setForm({ name: '', email: '', password: '' }); setFormError(''); setCreateOpen(true) }} variant="contained" color="info" startIcon={<AddIcon />} sx={{ borderRadius: 999, fontWeight: 700, px: 2.5 }}>
            New salesperson
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Box sx={{ borderRadius: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={32} sx={{ color: 'info.main' }} /></Box>
          ) : users.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: '1.3rem' }}>No accounts yet</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>Create a salesperson account to get started.</Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, px: 3, py: 1.5, bgcolor: '#F4F8F8', borderBottom: '1px solid', borderColor: 'divider' }}>
                {HEADS.map((h) => (
                  <Typography key={h || 'x'} sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'text.secondary' }}>{h}</Typography>
                ))}
              </Box>
              {users.map((user, index) => (
                <Box
                  key={user._id}
                  sx={{
                    display: { xs: 'flex', md: 'grid' }, gridTemplateColumns: GRID, gap: 2, alignItems: 'center',
                    px: { xs: 2, md: 3 }, py: 1.75, flexWrap: 'wrap',
                    borderBottom: index === users.length - 1 ? 'none' : '1px solid', borderColor: 'divider',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{user.name || '—'}</Typography>
                    <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', display: { xs: 'block', md: 'none' } }}>{user.email}</Typography>
                    {user.pendingSales > 0 && (
                      <Typography sx={{ fontSize: '0.72rem', color: 'warning.dark', fontWeight: 700 }}>
                        {user.pendingSales} sale{user.pendingSales === 1 ? '' : 's'} awaiting review
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', display: { xs: 'none', md: 'block' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</Typography>
                  <Typography sx={{ fontSize: '0.82rem' }}>{user.isSalesperson ? 'Salesperson' : 'Owner / admin'}</Typography>
                  <Chip
                    label={user.isActive ? 'Active' : 'Disabled'}
                    size="small"
                    sx={{
                      width: 'fit-content',
                      bgcolor: user.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(227,30,36,0.1)',
                      color: user.isActive ? '#0F8A5F' : '#C81E1E',
                      fontWeight: 700, fontSize: '0.7rem', borderRadius: 999,
                    }}
                  />
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', display: { xs: 'none', md: 'block' } }}>
                    {user.lastLoginAt ? fmtDate(user.lastLoginAt) : 'Never'}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {user.isSalesperson ? (
                      <>
                        <Button size="small" disabled={busyId === user._id} onClick={() => toggleActive(user)} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.76rem' }}>
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="small" disabled={busyId === user._id} onClick={() => { setResetFor(user); setNewPassword('') }} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.76rem' }}>
                          Reset password
                        </Button>
                        <Button size="small" color="error" disabled={busyId === user._id} onClick={() => handleDelete(user)} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.76rem' }}>
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>Managed by the server</Typography>
                    )}
                  </Stack>
                </Box>
              ))}
            </>
          )}
        </Box>

        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 2 }}>
          {salespeople.length} salesperson account{salespeople.length === 1 ? '' : 's'}. Sign-in for them is at <b>/staff</b>.
        </Typography>
      </Box>

      <Dialog open={createOpen} onClose={() => !saving && setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>New salesperson</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Full name" size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <TextField label="Email" type="email" size="small" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Temporary password" size="small" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} helperText="At least 6 characters. The salesperson can use it to sign in at /staff." />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !form.name || !form.email || form.password.length < 6} variant="contained" color="info" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
            {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Create account'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!resetFor} onClose={() => !resetting && setResetFor(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>Reset password for {resetFor?.name}</DialogTitle>
        <DialogContent>
          <TextField label="New password" size="small" fullWidth autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="At least 6 characters." sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetFor(null)} disabled={resetting} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleReset} disabled={resetting || newPassword.length < 6} variant="contained" color="info" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
            {resetting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Update password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3500} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setToast(null)} severity={toast?.severity || 'success'} variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </AdminLayout>
  )
}
