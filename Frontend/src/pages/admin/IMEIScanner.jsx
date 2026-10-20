import { useEffect, useRef, useState } from 'react'
import { Box, Stack, TextField, Button, Typography, Alert } from '@mui/material'
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined'
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import FlashOnOutlinedIcon from '@mui/icons-material/FlashOnOutlined'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const REGION_ID = 'imei-camera-region'
const FILE_REGION_ID = 'imei-photo-region'

// Every symbology an IMEI or box label may use. Code 128 is the usual one; Code 39
// and ITF show up on older stock, Data Matrix and PDF417 on some phone boxes.
const FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.PDF_417,
]

const NO_CODE_MESSAGE =
  'No barcode found in that photo. Fill the frame with the barcode and try again.'

/**
 * Reusable IMEI input.
 *  - USB scanner: types the code and presses Enter into the focused box.
 *  - Phone camera: toggle the camera, codes are read continuously.
 *  - Photo: shoot the label and decode it in one shot, for when the live preview
 *    is too blurry or too far away.
 * It only reports the raw code through onScan(code). It never sells anything.
 */
export default function IMEIScanner({
  onScan,
  busy = false,
  autoFocus = true,
  placeholder = 'Scan or type IMEI, then press Enter',
  buttonLabel = 'Check',
}) {
  const [value, setValue] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const lastRef = useRef({ code: '', at: 0 })
  const onScanRef = useRef(onScan)
  const scannerRef = useRef(null)

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
      // ZXing reads narrow 1D barcodes more reliably than the browser's native
      // detector, which can silently skip a phone label.
      useBarCodeDetectorIfSupported: false,
      verbose: false,
    })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          // IMEI barcodes are long and thin, so the scan area is a wide band
          // instead of a square that crops the ends off.
          qrbox: (viewWidth, viewHeight) => ({
            width: Math.floor(viewWidth * 0.9),
            height: Math.floor(viewHeight * 0.4),
          }),
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
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
        try {
          setTorchAvailable(!!scanner.getRunningTrackCapabilities()?.torch)
        } catch {
          setTorchAvailable(false)
        }
        // Close-up focus; phones without continuous autofocus simply ignore it.
        scanner
          .applyVideoConstraints({ advanced: [{ focusMode: 'continuous' }] })
          .catch(() => {})
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
      scannerRef.current = null
      setTorchOn(false)
      setTorchAvailable(false)
      if (started) scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }, [cameraOn])

  const toggleCamera = () => {
    setCameraError('')
    setCameraOn((v) => !v)
  }

  const toggleTorch = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn((v) => !v)
    } catch {
      setTorchAvailable(false)
      setCameraError('This camera cannot switch on its light.')
    }
  }

  // Decode a still photo in one pass. Works when the live preview struggles:
  // a photo is sharper than a video frame in low light.
  const scanPhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setReadingPhoto(true)
    setCameraError('')
    let fileScanner
    try {
      fileScanner = new Html5Qrcode(FILE_REGION_ID, {
        formatsToSupport: FORMATS,
        useBarCodeDetectorIfSupported: false,
        verbose: false,
      })
      const decoded = await fileScanner.scanFile(file, false)
      const code = String(decoded || '').trim()
      if (!code) throw new Error(NO_CODE_MESSAGE)
      lastRef.current = { code, at: Date.now() }
      if (navigator.vibrate) navigator.vibrate(80)
      onScanRef.current(code)
    } catch (err) {
      setCameraError(typeof err === 'string' ? NO_CODE_MESSAGE : err?.message || NO_CODE_MESSAGE)
    } finally {
      if (fileScanner) {
        try {
          fileScanner.clear()
        } catch {
          // the hidden container is reused next time
        }
      }
      setReadingPhoto(false)
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <TextField
          fullWidth
          size="small"
          autoFocus={autoFocus}
          placeholder={placeholder}
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
          {buttonLabel}
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
        <Button
          onClick={toggleCamera}
          variant={cameraOn ? 'outlined' : 'text'}
          color="info"
          startIcon={cameraOn ? <VideocamOffOutlinedIcon /> : <CameraAltOutlinedIcon />}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
        >
          {cameraOn ? 'Stop camera' : 'Scan with camera'}
        </Button>

        {cameraOn && torchAvailable && (
          <Button
            onClick={toggleTorch}
            variant={torchOn ? 'contained' : 'text'}
            color="info"
            startIcon={<FlashOnOutlinedIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
          >
            {torchOn ? 'Light on' : 'Light'}
          </Button>
        )}

        <Button
          component="label"
          variant="text"
          color="info"
          disabled={readingPhoto}
          startIcon={<PhotoLibraryOutlinedIcon />}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 999 }}
        >
          {readingPhoto ? 'Reading photo…' : 'Use a photo'}
          <input hidden type="file" accept="image/*" onChange={scanPhoto} />
        </Button>
      </Stack>

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
            Hold the phone 15–20 cm away and fill the band with the barcode. A printed IMEI can be
            typed above; only barcodes are read by the camera.
          </Typography>
        </Box>
      )}

      {/* Hidden element the file scanner draws into; it never shows on screen. */}
      <Box id={FILE_REGION_ID} sx={{ display: 'none' }} />
    </Box>
  )
}
