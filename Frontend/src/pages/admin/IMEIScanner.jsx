import { useEffect, useRef, useState } from 'react'
import { Box, Stack, TextField, Button, Typography, Alert } from '@mui/material'
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined'
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const REGION_ID = 'imei-camera-region'

const FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
]

/**
 * Reusable IMEI input.
 *  - USB scanner: types the code and presses Enter into the focused box.
 *  - Phone camera: toggle the camera, codes are read continuously.
 * It only reports the raw code through onScan(code). It never sells anything.
 */
export default function IMEIScanner({ onScan, busy = false, autoFocus = true }) {
  const [value, setValue] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const lastRef = useRef({ code: '', at: 0 })
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const submitTyped = () => {
    const code = value.trim()
    if (!code || busy) return
    onScanRef.current(code)
    setValue('')
  }

  useEffect(() => {
    if (!cameraOn) return undefined

    let cancelled = false
    let started = false
    const scanner = new Html5Qrcode(REGION_ID, {
      formatsToSupport: FORMATS,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false,
    })

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (decoded) => {
          const code = String(decoded || '').trim()
          const now = Date.now()
          // Ignore the same code being re-read while it stays in view.
          if (code === lastRef.current.code && now - lastRef.current.at < 2500) return
          lastRef.current = { code, at: now }
          if (navigator.vibrate) navigator.vibrate(80)
          onScanRef.current(code)
        },
        () => {}
      )
      .then(() => {
        started = true
        if (cancelled) scanner.stop().then(() => scanner.clear()).catch(() => {})
      })
      .catch(() => {
        if (cancelled) return
        setCameraError(
          'Could not open the camera. Allow camera access in the browser. Phones need the page to be on HTTPS.'
        )
        setCameraOn(false)
      })

    return () => {
      cancelled = true
      if (started) scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }, [cameraOn])

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <TextField
          fullWidth
          size="small"
          autoFocus={autoFocus}
          placeholder="Scan or type IMEI, then press Enter"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitTyped()
            }
          }}
          inputProps={{ inputMode: 'numeric', style: { fontFamily: 'monospace', letterSpacing: 1 } }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 999 } }}
        />
        <Button
          variant="contained"
          color="info"
          onClick={submitTyped}
          disabled={busy || !value.trim()}
          startIcon={<QrCodeScannerIcon />}
          sx={{ borderRadius: 999, fontWeight: 700, px: 2.5, whiteSpace: 'nowrap' }}
        >
          Check
        </Button>
      </Stack>

      <Button
        onClick={() => {
          setCameraError('')
          setCameraOn((v) => !v)
        }}
        variant={cameraOn ? 'outlined' : 'text'}
        color="info"
        startIcon={cameraOn ? <VideocamOffOutlinedIcon /> : <CameraAltOutlinedIcon />}
        sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
      >
        {cameraOn ? 'Stop camera' : 'Scan with camera'}
      </Button>

      {cameraError && (
        <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
          {cameraError}
        </Alert>
      )}

      {cameraOn && (
        <Box sx={{ mt: 1.5 }}>
          <Box
            id={REGION_ID}
            sx={{
              width: '100%',
              maxWidth: 420,
              mx: 'auto',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: '#000',
            }}
          />
          <Typography
            sx={{ fontSize: '0.75rem', color: 'text.secondary', textAlign: 'center', mt: 1 }}
          >
            Point the camera at the barcode on the device
          </Typography>
        </Box>
      )}
    </Box>
  )
}