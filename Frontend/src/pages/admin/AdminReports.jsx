import { Fragment, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, IconButton, MenuItem,
  Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getAdminReport, getMonthlyReport } from '../../services/api.js'
import { money, fmtDate } from '../../components/admin/format.js'
import { ADMIN } from '../../theme/adminTheme.js'

const today = () => new Date().toISOString().slice(0, 10)
const monthStart = () => `${today().slice(0, 8)}01`

const downloadCsv = (rows, filename) => {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = rows.map((row) => row.map(quote).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function AdminReports() {
  const [tab, setTab] = useState(0)

  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(today())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [months, setMonths] = useState(12)
  const [monthly, setMonthly] = useState(null)
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [monthlyError, setMonthlyError] = useState('')
  const [expanded, setExpanded] = useState('')

  useEffect(() => {
    let alive = true
    getAdminReport({ from, to })
      .then((result) => { if (alive) { setData(result); setError('') } })
      .catch((err) => { if (alive) setError(err?.message || 'Could not load the report.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [from, to])

  useEffect(() => {
    let alive = true
    getMonthlyReport({ months })
      .then((result) => { if (alive) { setMonthly(result); setMonthlyError('') } })
      .catch((err) => { if (alive) setMonthlyError(err?.message || 'Could not load the monthly report.') })
      .finally(() => { if (alive) setMonthlyLoading(false) })
    return () => { alive = false }
  }, [months])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const exportPeriodCsv = () => {
    if (!data) return
    downloadCsv(
      [
        ['Date', 'Invoices', 'Devices sold', 'Gross sales', 'Discounts', 'Return credits', 'Net sales', 'Collected'],
        ...data.dailySales.map((row) => [row.date, row.count, row.devices, row.gross, row.discounts, row.credits, row.net, row.collected]),
      ],
      `shezz-admin-report-${from}-${to}.csv`
    )
  }

  const exportMonthlyCsv = () => {
    if (!monthly) return
    downloadCsv(
      [
        ['Month', 'Invoices', 'Devices sold', 'Gross revenue', 'Discounts', 'Net revenue', 'Collected', 'Outstanding', 'Online orders', 'Online revenue'],
        ...monthly.months.map((row) => [
          row.month, row.invoices, row.devices, row.gross, row.discounts,
          row.net, row.collected, row.outstanding, row.onlineOrders, row.onlineRevenue,
        ]),
      ],
      `shezz-monthly-sales-${monthly.range.from}-to-${monthly.range.to}.csv`
    )
  }

  return (
    <AdminLayout title="Reports">
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', mb: 2.5 }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            alignItems={{ xs: 'stretch', lg: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ px: 2, py: 1.25 }}
          >
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons={false}>
              <Tab label="Period" />
              <Tab label="Monthly sales" />
            </Tabs>

            {tab === 0 ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField size="small" type="date" label="From" value={from} onChange={(e) => { setLoading(true); setFrom(e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: { xs: '100%', sm: 160 } }} />
                <TextField size="small" type="date" label="To" value={to} onChange={(e) => { setLoading(true); setTo(e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: { xs: '100%', sm: 160 } }} />
                <Button onClick={exportPeriodCsv} disabled={!data || loading} variant="outlined" startIcon={<DownloadOutlinedIcon />} sx={{ whiteSpace: 'nowrap' }}>
                  Export
                </Button>
              </Stack>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField select size="small" label="Window" value={months} onChange={(e) => { setMonthlyLoading(true); setMonths(Number(e.target.value)) }} sx={{ width: { xs: '100%', sm: 160 } }}>
                  <MenuItem value={6}>Last 6 months</MenuItem>
                  <MenuItem value={12}>Last 12 months</MenuItem>
                  <MenuItem value={24}>Last 24 months</MenuItem>
                </TextField>
                <Button onClick={exportMonthlyCsv} disabled={!monthly || monthlyLoading} variant="outlined" startIcon={<DownloadOutlinedIcon />} sx={{ whiteSpace: 'nowrap' }}>
                  Export
                </Button>
              </Stack>
            )}
          </Stack>
        </Box>

        {tab === 0
          ? <PeriodReport data={data} loading={loading} error={error} from={from} to={to} />
          : <MonthlyReport data={monthly} loading={monthlyLoading} error={monthlyError} expanded={expanded} onToggle={setExpanded} />}
      </Box>
    </AdminLayout>
  )
}

/* ── Period report (existing daily view) ─────────────── */

function PeriodReport({ data, loading, error, from, to }) {
  const sales = data?.summary.sales
  const returns = data?.summary.returns
  const orders = data?.summary.orders

  const tiles = [
    { label: 'CRM invoices', value: sales ? sales.count : 0, note: `${sales?.devices || 0} devices sold` },
    { label: 'Gross sales', value: money(sales?.gross || 0), note: `${money(sales?.discounts || 0)} discounts` },
    { label: 'Net sales', value: money(sales?.net || 0), note: `${money(sales?.credits || 0)} return credits` },
    { label: 'Collected', value: money(sales?.collected || 0), note: 'Cash received in period' },
    { label: 'Online orders', value: orders?.count || 0, note: `${money(orders?.revenue || 0)} recognized` },
    { label: 'Resolved returns', value: returns?.count || 0, note: `${returns?.replacements || 0} replacements` },
  ]

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={28} /></Box>
      ) : data && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }, gap: 1.5, mb: 2.5, opacity: loading ? 0.6 : 1 }}>
            {tiles.map((tile) => <StatTile key={tile.label} {...tile} />)}
          </Box>

          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Daily sales</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.25 }}>
                Invoices from {fmtDate(from)} to {fmtDate(to)}
              </Typography>
            </Box>
            {data.dailySales.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 7, fontSize: '0.86rem' }}>No CRM invoices in this period.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', minWidth: 780, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Date', 'Invoices', 'Devices', 'Gross', 'Discounts', 'Return credits', 'Net sales', 'Collected'].map((label, index) => (
                        <Box
                          key={label}
                          component="th"
                          sx={{
                            px: 2, py: 1.25,
                            textAlign: index >= 3 ? 'right' : index > 0 ? 'center' : 'left',
                            bgcolor: '#F8FAFC',
                            fontSize: '0.68rem', color: 'text.secondary', fontWeight: 700,
                            letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                          }}
                        >
                          {label}
                        </Box>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailySales.map((row) => (
                      <Box component="tr" key={row.date} sx={{ borderTop: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                        <Cell>{fmtDate(row.date)}</Cell>
                        <Cell align="center">{row.count}</Cell>
                        <Cell align="center">{row.devices}</Cell>
                        <Cell align="right">{money(row.gross)}</Cell>
                        <Cell align="right">{money(row.discounts)}</Cell>
                        <Cell align="right">{money(row.credits)}</Cell>
                        <Cell align="right" strong>{money(row.net)}</Cell>
                        <Cell align="right">{money(row.collected)}</Cell>
                      </Box>
                    ))}
                  </tbody>
                </Box>
              </Box>
            )}
          </Box>
        </>
      )}
    </>
  )
}

/* ── Monthly report ──────────────────────────────────── */

function MonthlyReport({ data, loading, error, expanded, onToggle }) {
  if (error) return <Alert severity="error">{error}</Alert>
  if (loading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={28} /></Box>
  if (!data) return null

  const { totals } = data
  const monthsWithSales = data.months.filter((m) => m.invoices > 0)
  const maxDevices = Math.max(1, ...data.months.map((m) => m.devices))

  const tiles = [
    { label: 'Devices sold', value: totals.devices.toLocaleString(), note: `${totals.invoices} invoices in ${data.range.months} months` },
    { label: 'Gross revenue', value: money(totals.gross), note: `${money(totals.discounts)} total discounts` },
    { label: 'Net revenue', value: money(totals.net), note: 'After discounts and return credits' },
    { label: 'Collected', value: money(totals.collected), note: `${money(totals.outstanding)} still outstanding` },
    { label: 'Avg. per month', value: `${totals.avgDevicesPerMonth.toFixed(1)} devices`, note: `${money(totals.avgGrossPerMonth)} revenue` },
    { label: 'Best month', value: totals.bestMonth.devices ? `${totals.bestMonth.devices} devices` : '—', note: totals.bestMonth.devices ? totals.bestMonth.label : 'No sales yet' },
  ]

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }, gap: 1.5, mb: 2.5, opacity: loading ? 0.6 : 1 }}>
        {tiles.map((tile) => <StatTile key={tile.label} {...tile} />)}
      </Box>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: { xs: 2, md: 2.5 }, mb: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 2.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Devices sold per month</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.25 }}>
              Hover a bar for that month's revenue.
            </Typography>
          </Box>
          <Chip size="small" label={`${monthsWithSales.length} active month${monthsWithSales.length === 1 ? '' : 's'}`} sx={{ bgcolor: ADMIN.accentSoft, color: ADMIN.accent }} />
        </Stack>

        <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
          <Stack direction="row" spacing={0.75} alignItems="flex-end" sx={{ minWidth: Math.max(560, data.months.length * 44), height: 200 }}>
            {data.months.map((m) => {
              const height = Math.round((m.devices / maxDevices) * 132)
              return (
                <Tooltip key={m.month} arrow title={`${m.label} · ${m.devices} devices · ${money(m.gross)} gross · ${m.invoices} invoices`}>
                  <Stack alignItems="center" spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: m.devices ? 'text.primary' : 'text.disabled' }}>
                      {m.devices || ''}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 34,
                        height: Math.max(m.devices ? 6 : 2, height),
                        borderRadius: '6px 6px 2px 2px',
                        bgcolor: m.devices ? ADMIN.accent : ADMIN.line,
                        opacity: m.devices ? 1 : 0.6,
                        transition: 'height 0.25s ease',
                      }}
                    />
                    <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {m.label.split(' ')[0]}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>
                      {m.month.slice(2, 4)}
                    </Typography>
                  </Stack>
                </Tooltip>
              )
            })}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Detailed monthly breakdown</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.25 }}>
            Expand a month to see which devices made up its sales.
          </Typography>
        </Box>

        {data.months.every((m) => m.invoices === 0) ? (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 7, fontSize: '0.86rem' }}>
            No CRM invoices recorded in this window.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Month', 'Invoices', 'Devices', 'Gross', 'Discounts', 'Net', 'Collected', 'Outstanding', ''].map((label, index) => (
                    <Box
                      key={label || 'expander'}
                      component="th"
                      sx={{
                        px: 2, py: 1.25,
                        textAlign: index >= 2 && index <= 7 ? 'right' : index === 1 ? 'center' : 'left',
                        bgcolor: '#F8FAFC',
                        fontSize: '0.68rem', color: 'text.secondary', fontWeight: 700,
                        letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </Box>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.months].reverse().map((row) => {
                  const open = expanded === row.month
                  const isBest = row.month === totals.bestMonth.month && row.devices > 0
                  return (
                    <Fragment key={row.month}>
                      <Box
                        component="tr"
                        onClick={() => onToggle(open ? '' : row.month)}
                        sx={{ borderTop: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <Cell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontSize: '0.86rem', fontWeight: 600 }}>{row.label}</Typography>
                            {isBest && <Chip size="small" label="Best" sx={{ bgcolor: ADMIN.successSoft, color: ADMIN.success, height: 20, fontSize: '0.64rem' }} />}
                          </Stack>
                        </Cell>
                        <Cell align="center">{row.invoices}</Cell>
                        <Cell align="right" strong>{row.devices}</Cell>
                        <Cell align="right">{money(row.gross)}</Cell>
                        <Cell align="right">{row.discounts ? money(row.discounts) : '—'}</Cell>
                        <Cell align="right" strong>{money(row.net)}</Cell>
                        <Cell align="right">{money(row.collected)}</Cell>
                        <Cell align="right">{row.outstanding > 0 ? money(row.outstanding) : '—'}</Cell>
                        <Box component="td" sx={{ px: 1, textAlign: 'right' }}>
                          <IconButton size="small" aria-label={open ? 'Collapse month' : 'Expand month'}>
                            {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                          </IconButton>
                        </Box>
                      </Box>
                      <Box component="tr">
                        <Box component="td" colSpan={9} sx={{ p: 0, border: 0 }}>
                          <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ px: { xs: 2, md: 3 }, py: 2, bgcolor: '#FAFBFC', borderTop: '1px solid', borderColor: 'divider' }}>
                              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
                                    Device mix
                                  </Typography>
                                  {row.products.length === 0 ? (
                                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>No device lines recorded.</Typography>
                                  ) : (
                                    <Stack spacing={0.6}>
                                      {row.products.map((product) => (
                                        <Stack key={product.name} direction="row" justifyContent="space-between" spacing={2} sx={{ maxWidth: 520 }}>
                                          <Typography sx={{ fontSize: '0.82rem' }}>{product.name}</Typography>
                                          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                            {product.devices} × · {money(product.revenue)}
                                          </Typography>
                                        </Stack>
                                      ))}
                                    </Stack>
                                  )}
                                </Box>
                                <Box sx={{ minWidth: 220 }}>
                                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', mb: 1 }}>
                                    Month facts
                                  </Typography>
                                  <Stack spacing={0.6}>
                                    <Fact label="Average invoice" value={money(row.avgInvoice)} />
                                    <Fact label="Devices per invoice" value={row.avgDevices.toFixed(1)} />
                                    <Fact label="Online orders" value={`${row.onlineOrders} · ${money(row.onlineRevenue)}`} />
                                    <Fact label="Return credits" value={money(row.credits)} />
                                  </Stack>
                                </Box>
                              </Stack>
                            </Box>
                          </Collapse>
                        </Box>
                      </Box>
                    </Fragment>
                  )
                })}
              </tbody>
            </Box>
          </Box>
        )}
      </Box>

      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1.5 }}>
        Devices and revenue come from completed CRM invoices, grouped by invoice date. Discounts include those given at the
        time of sale and those recorded with later payments. The newest month is still in progress, so its figures are partial.
      </Typography>
    </>
  )
}

/* ── Small pieces ────────────────────────────────────── */

function StatTile({ label, value, note }) {
  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px', minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.4rem' }, fontWeight: 700, letterSpacing: '-0.02em', mt: 0.75, overflowWrap: 'anywhere', lineHeight: 1.15 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.5, lineHeight: 1.4 }}>{note}</Typography>
    </Box>
  )
}

function Fact({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{value}</Typography>
    </Stack>
  )
}

function Cell({ children, strong, align = 'left' }) {
  return (
    <Box
      component="td"
      sx={{
        px: 2, py: 1.35,
        fontSize: '0.84rem',
        fontWeight: strong ? 700 : 400,
        color: strong ? ADMIN.ink : 'text.primary',
        textAlign: align,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  )
}
