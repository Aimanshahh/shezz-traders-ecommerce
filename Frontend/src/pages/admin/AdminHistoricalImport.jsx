import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress,
  Checkbox, FormControlLabel, Divider, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import Papa from 'papaparse'
import readXlsxFile from 'read-excel-file/browser'
import { ADMIN_SHELL } from '../../lib/stockShell.js'
import {
  previewHistoricalImport, commitHistoricalImport, getHistoricalImports,
  rollbackHistoricalImport,
} from '../../services/api.js'

const FIELDS = [
  { key: 'imei', label: 'IMEI', required: true },
  { key: 'month', label: 'Arrival month', required: true },
  { key: 'model', label: 'Tracker model', required: true },
  { key: 'status', label: 'Status (Sold / In Stock)', required: true },
  { key: 'saleDate', label: 'Sale date' },
  { key: 'customer', label: 'Customer name' },
  { key: 'price', label: 'Price (optional)' },
  { key: 'box', label: 'Box code (optional)' },
]

const HEADER_HINTS = {
  imei: /imei|serial/i,
  month: /month|arriv|received|purchase/i,
  saleDate: /sale.*date|sold.*date|date.*sold|date.*sale|date of sale|sale/i,
  model: /model|tracker|device|product/i,
  customer: /customer|client|buyer|party/i,
  status: /^\s*status|^\s*sold|^\s*stock/i,
  price: /price|amount|rate|cost/i,
  box: /box|carton/i,
}

const columnLetter = (index) => {
  let n = index
  let out = ''
  while (n >= 0) {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  }
  return out
}

const cellText = (value) => (value === null || value === undefined ? '' : String(value).trim())

// Reads the header row (if any) and pre-fills the column mapping. Everything stays
// editable, because no two old sheets lay their columns out the same way.
function guessLayout(grid) {
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0)
  const columns = Array.from({ length: width }, (_, i) => i)
  const headerIndex = grid
    .slice(0, 8)
    .findIndex((row) => row.some((c) => /imei/i.test(cellText(c))))

  const mapping = {}
  if (headerIndex >= 0) {
    const header = grid[headerIndex]
    FIELDS.forEach((field) => {
      const hint = HEADER_HINTS[field.key]
      if (!hint) return
      const index = header.findIndex((c) => hint.test(cellText(c)))
      if (index >= 0 && !Object.values(mapping).includes(index)) mapping[field.key] = index
    })
  }
  return { columns, mapping, startRow: headerIndex >= 0 ? headerIndex + 2 : 1 }
}

function Tile({ label, value, color = 'inherit' }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', minWidth: 0 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.45rem', lineHeight: 1.15, color }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  )
}

function ListBox({ title, rows, render, empty }) {
  if (!rows.length) return null
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, mb: 0.75 }}>
        {title} ({rows.length})
      </Typography>
      <Box sx={{ maxHeight: 190, overflowY: 'auto', p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
        {rows.length ? rows.map(render) : (
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{empty}</Typography>
        )}
      </Box>
    </Box>
  )
}

export default function AdminHistoricalImport({ shell = ADMIN_SHELL }) {
  const { Layout, isLoggedIn, loginTo } = shell
  const fileRef = useRef(null)

  const [fileName, setFileName] = useState('')
  const [sheetName, setSheetName] = useState('')
  const [grid, setGrid] = useState([])
  const [layout, setLayout] = useState({ columns: [], mapping: {}, startRow: 1 })
  const [mapping, setMapping] = useState({})
  const [startRow, setStartRow] = useState(1)
  const [soldWords, setSoldWords] = useState('Sold')
  const [stockWords, setStockWords] = useState('In Stock, Available')
  const [allowFailedChecksum, setAllowFailedChecksum] = useState(true)
  const [dateOrder, setDateOrder] = useState('dmy')

  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [preview, setPreview] = useState(null)
  const [decisions, setDecisions] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)
  const [batches, setBatches] = useState([])

  const loadBatches = () => {
    getHistoricalImports().then(setBatches).catch(() => {})
  }

  useEffect(() => {
    loadBatches()
  }, [])

  const resetResult = () => {
    setPreview(null)
    setDecisions({})
    setError('')
    setDone(null)
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    resetResult()
    setFileName(file.name)
    try {
      const lower = file.name.toLowerCase()
      let rows
      if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
        rows = Papa.parse(await file.text(), { skipEmptyLines: false }).data
      } else if (lower.endsWith('.xlsx')) {
        rows = await readXlsxFile(file)
      } else {
        throw new Error('Please use a .xlsx or .csv file (save older .xls files as .xlsx).')
      }
      if (!rows.length) throw new Error('The file is empty.')
      const guessed = guessLayout(rows)
      setGrid(rows)
      setLayout(guessed)
      setMapping(guessed.mapping)
      setStartRow(guessed.startRow)
      setSheetName(lower.endsWith('.csv') ? 'CSV' : 'Sheet 1')
    } catch (err) {
      setGrid([])
      setFileName('')
      setError(err?.message || 'Could not read the file.')
    } finally {
      event.target.value = ''
    }
  }

  const sampleFor = (index) => {
    const values = []
    for (let i = 0; i < Math.min(grid.length, 12); i++) {
      const value = cellText(grid[i]?.[index])
      if (value && !values.includes(value)) values.push(value)
      if (values.length >= 2) break
    }
    return values.join(' · ').slice(0, 34)
  }

  const missingRequired = FIELDS.filter((f) => f.required && !Number.isInteger(mapping[f.key]))

  const payload = useMemo(
    () => ({
      rows: grid,
      mapping,
      startRow,
      fileName,
      sheetName,
      statusValues: {
        sold: soldWords.split(',').map((w) => w.trim()).filter(Boolean),
        inStock: stockWords.split(',').map((w) => w.trim()).filter(Boolean),
      },
      options: { allowFailedChecksum, dateOrder },
      decisions,
    }),
    [grid, mapping, startRow, fileName, sheetName, soldWords, stockWords, allowFailedChecksum, dateOrder, decisions]
  )

  // The sign-in check sits after every hook so the hook order never changes.
  if (!isLoggedIn()) return <Navigate to={loginTo} replace />

  const handleCheck = async () => {
    if (!grid.length) return setError('Choose the Excel or CSV file first.')
    if (missingRequired.length) {
      return setError(`Map these columns first: ${missingRequired.map((f) => f.label).join(', ')}`)
    }
    setError('')
    setChecking(true)
    try {
      const data = await previewHistoricalImport(payload)
      setPreview(data)
      // Customer choices made on a previous preview are kept: they are keyed by IMEI,
      // and the server ignores any decision for a row that is no longer importable.
    } catch (err) {
      setError(err?.message || 'Could not check the file.')
      setPreview(null)
    } finally {
      setChecking(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setError('')
    try {
      const data = await commitHistoricalImport(payload)
      setDone(data)
      setPreview(null)
      setGrid([])
      setFileName('')
      loadBatches()
    } catch (err) {
      setError(err?.message || 'Import failed.')
    } finally {
      setImporting(false)
      setConfirmOpen(false)
    }
  }

  const handleRollback = async (batch) => {
    const typed = window.prompt(
      `This removes only the records created by ${batch}.\nNothing that existed before is touched.\n\nType the batch id to confirm:`
    )
    if (typed !== batch) return
    try {
      await rollbackHistoricalImport(batch)
      loadBatches()
    } catch (err) {
      setError(err?.message || 'Rollback failed.')
    }
  }

  const s = preview?.summary
  const reviewGroups = preview?.review || []

  return (
    <Layout title="Historical import">
      <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.45rem' }, mb: 0.5 }}>
          Historical stock import
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
          Imports old stock from an Excel sheet. Nothing is saved until you review the preview and
          confirm. Existing devices, customers, invoices and stock are never changed.
        </Typography>

        {done ? (
          <Box sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 48, color: '#047857', mb: 1 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', mb: 0.5 }}>
              {done.summary.devicesImported} devices imported
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
              {done.summary.invoicesCreated} historical invoices created ·{' '}
              {done.summary.pendingCustomers} customer(s) waiting for details ·{' '}
              {done.summary.alreadyInSystem} already in the system
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 3 }}>
              Batch {done.batch}. Keep this id — it is the reference for the import log and a rollback.
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button variant="contained" color="info" onClick={() => setDone(null)} sx={{ borderRadius: 999, px: 3, fontWeight: 700 }}>
                Import another file
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={3}>
            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>1 · Choose the sheet</Typography>

              <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={handleFile} style={{ display: 'none' }} />
              <Button
                variant="outlined"
                color="info"
                startIcon={<UploadFileOutlinedIcon />}
                onClick={() => fileRef.current?.click()}
                sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
              >
                Choose Excel / CSV file
              </Button>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 1 }}>
                {fileName ? `${fileName} · ${grid.length} rows read` : 'Nothing is uploaded to the server until you press Check.'}
              </Typography>

              {grid.length > 0 && (
                <>
                  <Divider sx={{ my: 2.5 }} />
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>2 · Match the columns</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
                    Tell the importer which column holds each value. Rows without a valid IMEI, or that
                    match nothing here, are ignored or rejected — never guessed.
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                    {FIELDS.map((field) => (
                      <TextField
                        key={field.key}
                        select
                        size="small"
                        label={`${field.label}${field.required ? ' *' : ''}`}
                        value={Number.isInteger(mapping[field.key]) ? mapping[field.key] : ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setMapping((prev) => ({ ...prev, [field.key]: value === '' ? null : Number(value) }))
                          setPreview(null)
                        }}
                      >
                        <MenuItem value="">Not used</MenuItem>
                        {layout.columns.map((index) => (
                          <MenuItem key={index} value={index}>
                            {columnLetter(index)}
                            {sampleFor(index) ? ` — ${sampleFor(index)}` : ''}
                          </MenuItem>
                        ))}
                      </TextField>
                    ))}
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="First data row in the file"
                      value={startRow}
                      onChange={(e) => setStartRow(Math.max(1, Number(e.target.value) || 1))}
                      sx={{ width: 220 }}
                    />
                    <TextField
                      size="small"
                      label="Sold words (comma separated)"
                      value={soldWords}
                      onChange={(e) => setSoldWords(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="In-stock words (comma separated)"
                      value={stockWords}
                      onChange={(e) => setStockWords(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
                    <TextField
                      select
                      size="small"
                      label="Date order in this sheet"
                      value={dateOrder}
                      onChange={(e) => setDateOrder(e.target.value)}
                      sx={{ width: 230 }}
                    >
                      <MenuItem value="dmy">Day / Month / Year</MenuItem>
                      <MenuItem value="mdy">Month / Day / Year</MenuItem>
                    </TextField>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={allowFailedChecksum}
                          onChange={(e) => setAllowFailedChecksum(e.target.checked)}
                        />
                      }
                      label="Allow old IMEIs that fail the check digit"
                    />
                  </Stack>
                </>
              )}

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

              <Box sx={{ mt: 2.5 }}>
                <Button
                  onClick={handleCheck}
                  disabled={checking || !grid.length}
                  variant="contained"
                  color="info"
                  sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}
                >
                  {checking ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Check the file (no changes)'}
                </Button>
              </Box>
            </Box>

            {preview && (
              <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>3 · Preview</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
                  {s.processed} rows read · {s.valid} device records found · {s.ignored} rows ignored.
                  Nothing has been saved.
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
                  <Tile label="Ready to import" value={s.importable} color="#047857" />
                  <Tile label="Sold" value={s.sold} />
                  <Tile label="In stock" value={s.inStock} />
                  <Tile label="Existing matched" value={s.matchedCustomers} color="#047857" />
                  <Tile label="New customers" value={s.pendingDevices} color="#B45309" />
                  <Tile label="Duplicate IMEIs" value={s.duplicatesInFile} color="#B45309" />
                  <Tile label="Already in system" value={s.alreadyInSystem} color="#B45309" />
                  <Tile label="Invalid rows" value={s.invalid} color="#B91C1C" />
                </Box>

                {s.failedChecksum > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {s.failedChecksum} IMEI(s) fail the check digit and are being allowed because of the
                    setting above. Check a few against the physical devices.
                  </Alert>
                )}

                {s.pendingDevices > 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {s.pendingDevices} sold device(s) will be imported and flagged{' '}
                    <strong>New Customer – Details Required</strong>. They never appear in available
                    stock, and no customer record is created.
                  </Alert>
                )}

                {reviewGroups.length > 0 && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, mb: 0.75 }}>
                      Close name matches — confirm or leave pending ({reviewGroups.length})
                    </Typography>
                    <Stack spacing={1.5}>
                      {reviewGroups.map((group) => (
                        <Box key={group.name} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>
                            “{group.name}” · {group.devices} device(s)
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
                            {group.reason}. Nothing is linked automatically.
                          </Typography>
                          <TextField
                            select
                            size="small"
                            value={decisions[group.imeis?.[0]] || ''}
                            onChange={(e) => {
                              const chosen = e.target.value
                              // Stored against every IMEI in the group, which is exactly how
                              // the server applies a decision at import time.
                              setDecisions((prev) => {
                                const next = { ...prev }
                                group.imeis.forEach((imei) => {
                                  if (chosen) next[imei] = chosen
                                  else delete next[imei]
                                })
                                return next
                              })
                            }}
                            sx={{ minWidth: 320 }}
                            label="Customer for this name"
                          >
                            <MenuItem value="">Leave pending — details required</MenuItem>
                            {group.candidates.map((c) => (
                              <MenuItem key={c.customerId} value={c.customerId}>
                                {c.name} ({Math.round(c.score * 100)}% match)
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      ))}
                      <Alert severity="info">
                        A choice here is applied to every device with that name when you import. Leaving
                        it empty sends those devices to “Pending customers”.
                      </Alert>
                    </Stack>
                  </Box>
                )}

                <ListBox
                  title="Sold devices matched to existing customers"
                  rows={preview.matched}
                  render={(row) => (
                    <Typography key={`${row.row}-${row.imei}`} sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      Row {row.row} · {row.imei} · “{row.sheetName}” → {row.customerName}
                      {row.how === 'fuzzy' ? ` (${Math.round(row.score * 100)}% name match)` : ''}
                    </Typography>
                  )}
                />

                <ListBox
                  title="New customers — details required"
                  rows={preview.newCustomers}
                  render={(row) => (
                    <Typography key={row.name} sx={{ fontSize: '0.78rem' }}>
                      “{row.name}” · {row.devices} device(s) · rows {row.rows?.slice(0, 8).join(', ')}
                      {row.rows?.length > 8 ? '…' : ''}
                    </Typography>
                  )}
                />

                <ListBox
                  title="Repeated in the file (first row kept, later rows skipped)"
                  rows={preview.duplicatesInFile}
                  render={(row) => (
                    <Typography key={`${row.row}-${row.imei}`} sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      Row {row.row} · {row.imei} (first at row {row.firstRow})
                    </Typography>
                  )}
                />

                <ListBox
                  title="Already in Shezz Traders (never overwritten)"
                  rows={preview.alreadyInSystem}
                  render={(row) => (
                    <Typography key={`${row.row}-${row.imei}`} sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      Row {row.row} · {row.imei} · currently {row.status}
                    </Typography>
                  )}
                />

                <ListBox
                  title="Invalid rows (not imported)"
                  rows={preview.invalid}
                  render={(row) => (
                    <Typography key={`${row.row}-${row.imei}-${row.reason}`} sx={{ fontSize: '0.78rem' }}>
                      Row {row.row}: {row.imei || '(no IMEI)'} — {row.reason}
                    </Typography>
                  )}
                />

                <ListBox
                  title="Ignored rows (not device records)"
                  rows={preview.ignored}
                  render={(row) => (
                    <Typography key={`${row.row}-${row.reason}`} sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      Row {row.row}: {row.reason}
                    </Typography>
                  )}
                />

                {preview.truncated && (
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 2 }}>
                    Only the first 300 rows of each list are shown. The totals above are complete.
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>4 · Confirm</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
                  Importing creates {s.sold} sold device record(s), {s.inStock} available device(s) and{' '}
                  {s.pendingDevices} pending customer record(s). A historical invoice is created per matched
                  customer per sale date. Nothing that already exists is modified.
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    color="info"
                    disabled={s.importable === 0 || importing}
                    onClick={() => setConfirmOpen(true)}
                    sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}
                  >
                    Import {s.importable} device(s)
                  </Button>
                  <Button
                    variant="outlined"
                    color="info"
                    onClick={handleCheck}
                    disabled={checking}
                    sx={{ borderRadius: 999, textTransform: 'none' }}
                  >
                    Check again
                  </Button>
                </Stack>
              </Box>
            )}

            <Box sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>Import history</Typography>
              {batches.length === 0 ? (
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                  No historical import has been run yet.
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {batches.map((batch) => (
                    <Box
                      key={batch.batch}
                      sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <Typography sx={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700 }}>
                        {batch.batch}
                      </Typography>
                      <Chip
                        size="small"
                        label={batch.status}
                        color={batch.status === 'committed' ? 'success' : batch.status === 'failed' ? 'error' : 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                      <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>
                        {new Date(batch.startedAt).toLocaleString()} · {batch.fileName || 'file'} ·{' '}
                        {batch.summary?.devicesImported || 0} device(s)
                      </Typography>
                      {batch.status === 'committed' && (
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleRollback(batch.batch)}
                          sx={{ ml: 'auto', textTransform: 'none' }}
                        >
                          Roll back
                        </Button>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm historical import</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.88rem', mb: 1.5 }}>
            This writes {s?.importable ?? 0} device record(s) to Shezz Traders and creates one historical
            invoice per customer per sale date. It never edits an existing record.
          </Typography>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
            Take a database backup first. Keep the batch id afterwards — it is the only handle a rollback needs.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            color="info"
            onClick={handleImport}
            disabled={importing}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            {importing ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Import now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
