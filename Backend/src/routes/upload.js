import express from 'express'
import { upload } from '../middleware/upload.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

function buildUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`
}

// ── POST /api/upload — single image (kept for backward compat)
router.post('/', protect, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ ok: false, message: err.message })
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No file uploaded' })
    }
    res.json({
      ok: true,
      url: buildUrl(req, req.file.filename),
      filename: req.file.filename,
      size: req.file.size,
    })
  })
})

// ── POST /api/upload/multiple — up to 6 images at once
router.post('/multiple', protect, (req, res) => {
  upload.array('images', 6)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ ok: false, message: err.message })
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ ok: false, message: 'No files uploaded' })
    }
    const urls = req.files.map((f) => buildUrl(req, f.filename))
    res.json({
      ok: true,
      urls,
      files: req.files.map((f) => ({
        filename: f.filename,
        size: f.size,
      })),
    })
  })
})

export default router