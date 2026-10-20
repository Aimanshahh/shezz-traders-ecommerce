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
import { ADMIN_SHELL } from '../../lib/stockShell.js'
import { getProducts, previewDeviceImport, importDevices } from '../../services/api.js'

const DEVICES_PER_BOX = 10

// Pull the IMEI column out of spreadsheet rows. Uses the column headed "IMEI"
// if there is one, otherwise the first column.
function extractFromRows(rows) {
  if (!rows.length) return { imeis: [], boxes: [], hasHeader: false }
  const header = rows[0].map((c) => String(c ?? ''))
  const imeiIdx = header.findIndex((c) => /imei/i.test(c))
  const boxIdx = header.findIndex((c) => /box/i.test(c))
  const hasHeader = imeiIdx >= 0
  const col = hasHeader ? imeiIdx : 0
  const boxCol = hasHeader ? boxIdx : -1
  const body = hasHeader ? rows.slice(1) : rows
  const imeis = body.map((r) => String(r[col] ?? '').trim())
  const boxes = body.map((r) => (boxCol >= 0 ? String(r[boxCol] ?? '').trim() : ''))
  while (imeis.length && imeis[imeis.length - 1] === '' && boxes[boxes.length - 1] === '') {
    imeis.pop()
    boxes.pop()
  }
  return { imeis, boxes, hasHeader }
}

export default function AdminDeviceImport({ shell = ADMIN_SHELL }) {
  const { Layout, base, isLoggedIn, loginTo } = shell
  const fileRef = useRef(null)
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [pasted, setPasted] = useState('')
  const [fileName, setFileName] = useState('')
  const [imeis, setImeis] = useState([])
  const [boxes, setBoxes] = useState([])
  const [boxCodesText, setBoxCodesText] = useState('')
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

  if (!isLoggedIn()) return <Navigate to={loginTo} replace />

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
    setBoxCodesText('')
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
      const { imeis: list, boxes: boxList, hasHeader } = extractFromRows(rows)
      if (!list.length) throw new Error('No IMEIs found in the file.')
      setImeis(list)
      setBoxes(boxList)
      setRowOffset(hasHeader ? 1 : 0)
    } catch (err) {
      setImeis([])
      setBoxes([])
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
    setBoxCodesText('')
    setRowOffset(0)
    const list = []
    const boxList = []
    text.split(/\r?\n/).forEach((line) => {
      const tokens = line.split(/[\s,;]+/).filter(Boolean)
      if (!tokens.length) return
      if (tokens.length > 1 && /^\d+$/.test(tokens[1])) {
        // several IMEIs on one line
        tokens.forEach((t) => {
          list.push(t)
          boxList.push('')
        })
      } else {
        // IMEI, optionally followed by a box code
        list.push(tokens[0])
        boxList.push(tokens[1] || '')
      }
    })
    setImeis(list)
    setBoxes(boxList)
  }

  const enteredBoxCodes = boxCodesText
    .split(/[\r\n,;]+/)
    .map((code) => code.trim())
    .filter(Boolean)
  const groupSize = DEVICES_PER_BOX
  const requiredBoxCount = groupSize > 0 ? Math.ceil(imeis.length / groupSize) : 0
  const hasSheetBoxes = boxes.some(Boolean)
  const duplicateBoxCodes = new Set(enteredBoxCodes.map((code) => code.toUpperCase())).size !== enteredBoxCodes.length
  const boxMappingError = boxCodesText.trim() && (
    !Number.isInteger(groupSize) || groupSize < 1
      ? 'Devices per box must be a positive whole number.'
      : duplicateBoxCodes
        ? 'Each physical box needs a unique box code.'
        : enteredBoxCodes.length !== requiredBoxCount
          ? `This list needs exactly ${requiredBoxCount} box codes for ${imeis.length} devices.`
          : ''
  )
  const mappedBoxes = boxCodesText.trim() && !boxMappingError
    ? imeis.map((_, index) => enteredBoxCodes[Math.floor(index / groupSize)])
    : boxes
  const mappedGroups = boxCodesText.trim() && !boxMappingError
    ? enteredBoxCodes.map((code, index) => ({
        code,
        count: Math.min(groupSize, imeis.length - index * groupSize),
      }))
    : []

  const handleCheck = async () => {
    if (!productId) return setError('Choose the product these devices belong to.')
    if (!imeis.length) return setError('Upload a file or paste some IMEIs first.')
    if (boxMappingError) return setError(boxMappingError)
    setError('')
    setChecking(true)
    try {
      const data = await previewDeviceImport({
        imeis,
        boxes: mappedBoxes.some(Boolean) ? mappedBoxes : undefined,
        productId,
      })
      setPreview(data)
    } catch (err) {
      setError(err?.message || 'Could not check the list.')
    } finally {
      setChecking(false)
    }
  }

  const handleImport = async () => {
    if (boxMappingError) return setError(boxMappingError)
    setImporting(true)
    try {
      const data = await importDevices({
        imeis,
        boxes: mappedBoxes.some(Boolean) ? mappedBoxes : undefined,
        productId,
      })
      setDone(data.summary)
      setPreview(null)
      setImeis([])
      setBoxes([])
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
    <Layout title="Bulk import">
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Button
          component={RouterLink}
          to={`${base}/devices`}
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
              Available.{done.boxesCreated ? ` ${done.boxesCreated} new boxes were created.` : ''}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button
                component={RouterLink}
                to={`${base}/devices`}
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
                      : 'Use a column headed IMEI (and optionally one headed Box), or put the IMEIs in the first column.'}
                  </Typography>
                </Box>

                <TextField
                  label="Or paste IMEIs (one per line, optionally followed by a box code)"
                  value={pasted}
                  onChange={(e) => handlePaste(e.target.value)}
                  multiline
                  minRows={4}
                  fullWidth
                  inputProps={{ style: { fontFamily: 'monospace' } }}
                />

                {imeis.length > 0 && (
                  <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>Assign ordered IMEIs to boxes</Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1.5 }}>
                      Only use this when the IMEI rows are already grouped in the same order as the physical boxes. Enter each real box barcode, in order. The first code is assigned to the first group of devices.
                    </Typography>
                    {hasSheetBoxes ? (
                      <Alert severity="success">
                        Using box codes from the spreadsheet for {boxes.filter(Boolean).length} IMEIs. These existing mappings take priority.
                      </Alert>
                    ) : (
                      <>
                        <TextField
                          label={`Box codes in IMEI order (${requiredBoxCount} needed)`}
                          value={boxCodesText}
                          onChange={(event) => { setBoxCodesText(event.target.value); resetResult() }}
                          multiline
                          minRows={3}
                          fullWidth
                          placeholder={'BOX-001\nBOX-002\nBOX-003'}
                          helperText="One actual box code per line. Each code is assigned to the next 10 IMEI rows. Commas also work."
                          inputProps={{ style: { fontFamily: 'monospace' } }}
                          sx={{ bgcolor: 'background.paper' }}
                        />
                        {boxMappingError && boxCodesText.trim() && <Alert severity="error" sx={{ mt: 1.5 }}>{boxMappingError}</Alert>}
                        {mappedGroups.length > 0 && !boxMappingError && (
                          <Alert severity="warning" sx={{ mt: 1.5 }}>
                            Preview: {mappedGroups.map((group) => `${group.code} · ${group.count} IMEIs`).join('  |  ')}. Verify the original list order matches the physical carton before continuing.
                          </Alert>
                        )}
                      </>
                    )}
                  </Box>
                )}

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

                {(s.boxesToCreate > 0 || s.boxesExisting > 0) && (
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
                    Boxes: {s.boxesToCreate} new will be created, {s.boxesExisting} already exist.
                  </Typography>
                )}

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
    </Layout>
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