import { useState, useEffect, useRef } from 'react'
import { Navigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Stack, Button, TextField, MenuItem, Alert, CircularProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import Papa from 'papaparse'
import readXlsxFile from 'read-excel-file'
import AdminLayout from './AdminLayout.jsx'
import { isAdminLoggedIn } from '../../lib/adminAuth.js'
import { getProducts, previewDeviceImport, importDevices } from '../../services/api.js'

// Pull the IMEI column out of spreadsheet rows. Uses the column headed "IMEI"
// if there is one, otherwise the first column.
function extractFromRows(rows) {
  if (!rows.length) return { imeis: [], hasHeader: false }
  const headerIdx = rows[0].findIndex((c) => /imei/i.test(String(c ?? '')))
  const hasHeader = headerIdx >= 0
  const col = hasHeader ? headerIdx : 0
  const body = hasHeader ? rows.slice(1) : rows
  const imeis = body.map((r) => String(r[col] ?? '').trim())
  while (imeis.length && imeis[imeis.length - 1] === '') imeis.pop()
  return { imeis, hasHeader }
}

export default function AdminDeviceImport() {
  const fileRef = useRef(null)
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [pasted, setPasted] = useState('')
  const [fileName, setFileName] = useState('')
  const [imeis, setImeis] = useState([])
  const [rowOffset, setRowOffset] = useState(0)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => {})
  }, [])

  if (!isAdminLoggedIn()) return <Navigate to="/admin" replace />

  const resetResult = () => {
    setPreview(null)
    setDone(null)
    setError('')
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    resetResult()
    setPasted('')
    setFileName(file.name)
    try {
      const lower = file.name.toLowerCase()
      let rows
      if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
        rows = Papa.parse(await file.text(), { skipEmptyLines: true }).data
      } else if (lower.endsWith('.xlsx')) {
        rows = await readXlsxFile(file)
      } else {
        throw new Error('Please use a .xlsx or .csv file (save older .xls files as .xlsx).')
      }
      const { imeis: list, hasHeader } = extractFromRows(rows)
      if (!list.length) throw new Error('No IMEIs found in the file.')
      setImeis(list)
      setRowOffset(hasHeader ? 1 : 0)
    } catch (err) {
      setImeis([])
      setFileName('')
      setError(err?.message || 'Could not read the file.')
    } finally {
      e.target.value = ''
    }
  }

  const handlePaste = (text) => {
    setPasted(text)
    resetResult()
    setFileName('')
    setRowOffset(0)
    setImeis(text.split(/[\s,;]+/).filter(Boolean))
  }

  const handleCheck = async () => {
    if (!productId) return setError('Choose the product these devices belong to.')
    if (!imeis.length) return setError('Upload a file or paste some IMEIs first.')
    setError('')
    setChecking(true)
    try {
      const data = await previewDeviceImport({ imeis, productId })
      setPreview(data)
    } catch (err) {
      setError(err?.message || 'Could not check the list.')
    } finally {
      setChecking(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const data = await importDevices({ imeis, productId })
      setDone(data.summary)
      setPreview(null)
      setImeis([])
      setPasted('')
      setFileName('')
    } catch (err) {
      setError(err?.message || 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const s = preview?.summary

  return (
    <AdminLayout title="Bulk import">
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Button
          component={RouterLink}
          to="/admin/devices"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: 'none', color: 'text.secondary', mb: 2 }}
        >
          Back to devices
        </Button>

        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 800,
            fontSize: { xs: '1.5rem', md: '1.75rem' },
            lineHeight: 1.1,
            mb: 0.5,
          }}
        >
          Import devices
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
          Upload an Excel or CSV file with one IMEI per row. Nothing is saved until you confirm.
        </Typography>

        {done ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CheckCircleOutlinedIcon sx={{ fontSize: 48, color: '#0F8A5F', mb: 1 }} />
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: '1.5rem',
                mb: 0.5,
              }}
            >
              {done.imported} devices imported
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
              {done.processed} processed · {done.invalid} invalid · {done.duplicatesInFile} duplicate
              in file · {done.alreadyInInventory} already in inventory. All new devices are
              Available.
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button
                component={RouterLink}
                to="/admin/devices"
                variant="contained"
                color="info"
                sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}
              >
                View devices
              </Button>
              <Button
                onClick={() => setDone(null)}
                variant="outlined"
                color="info"
                sx={{ borderRadius: 999, textTransform: 'none', px: 3 }}
              >
                Import another file
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={3}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack spacing={2.5}>
                <TextField
                  select
                  label="Product"
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value)
                    resetResult()
                  }}
                  fullWidth
                  size="small"
                >
                  {products.map((p) => (
                    <MenuItem key={p._id || p.id} value={p._id || p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Box>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.csv,.txt"
                    onChange={handleFile}
                    style={{ display: 'none' }}
                  />
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
                    {fileName
                      ? `${fileName} · ${imeis.length} rows read`
                      : 'Use a column headed IMEI, or put the IMEIs in the first column.'}
                  </Typography>
                </Box>

                <TextField
                  label="Or paste IMEIs (one per line)"
                  value={pasted}
                  onChange={(e) => handlePaste(e.target.value)}
                  multiline
                  minRows={4}
                  fullWidth
                  inputProps={{ style: { fontFamily: 'monospace' } }}
                />

                {error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box>
                  <Button
                    onClick={handleCheck}
                    disabled={checking || !imeis.length}
                    variant="contained"
                    color="info"
                    sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}
                  >
                    {checking ? (
                      <CircularProgress size={18} sx={{ color: '#fff' }} />
                    ) : (
                      `Check ${imeis.length || ''} ${imeis.length === 1 ? 'record' : 'records'}`
                    )}
                  </Button>
                </Box>
              </Stack>
            </Box>

            {preview && (
              <Box
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ fontWeight: 700, mb: 2 }}>
                  {s.processed} records processed
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: 1.5,
                    mb: 2.5,
                  }}
                >
                  <Tile label="Ready to import" value={s.importable} color="#0F8A5F" />
                  <Tile label="Invalid" value={s.invalid} color="#C81E1E" />
                  <Tile label="Duplicate in file" value={s.duplicatesInFile} color="#B45309" />
                  <Tile label="Already in inventory" value={s.alreadyInInventory} color="#B45309" />
                </Box>

                {preview.invalid.length > 0 && (
                  <Problem title="Invalid rows">
                    {preview.invalid.slice(0, 50).map((r) => (
                      <Typography
                        key={`${r.row}-${r.value}`}
                        sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}
                      >
                        Row {r.row + rowOffset}: {r.value || '(empty)'} — {r.reason}
                      </Typography>
                    ))}
                    {preview.invalid.length > 50 && (
                      <Typography sx={{ fontSize: '0.78rem' }}>
                        …and {preview.invalid.length - 50} more
                      </Typography>
                    )}
                  </Problem>
                )}

                {preview.duplicatesInFile.length > 0 && (
                  <Problem title="Repeated in the file (kept once)">
                    {preview.duplicatesInFile.slice(0, 50).map((v) => (
                      <Typography key={v} sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {v}
                      </Typography>
                    ))}
                  </Problem>
                )}

                {preview.alreadyInInventory.length > 0 && (
                  <Problem title="Already in inventory (skipped)">
                    {preview.alreadyInInventory.slice(0, 50).map((v) => (
                      <Typography key={v} sx={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {v}
                      </Typography>
                    ))}
                  </Problem>
                )}

                <Button
                  onClick={handleImport}
                  disabled={importing || s.importable === 0}
                  variant="contained"
                  color="info"
                  sx={{ borderRadius: 999, fontWeight: 700, px: 3, mt: 1 }}
                >
                  {importing ? (
                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                  ) : (
                    `Import ${s.importable} devices`
                  )}
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </Box>
    </AdminLayout>
  )
}

function Tile({ label, value, color }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 800,
          fontSize: '1.7rem',
          lineHeight: 1.1,
          color,
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  )
}

function Problem({ title, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, mb: 0.75 }}>{title}</Typography>
      <Box
        sx={{
          maxHeight: 160,
          overflowY: 'auto',
          p: 1.5,
          borderRadius: 1.5,
          bgcolor: 'action.hover',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}