import crypto from 'crypto'

// Machine-to-machine access for other systems (the TrackMaster Hub). It is a
// separate, read-only key and never grants admin access to the CRM itself.
export function requireIntegrationKey(req, res, next) {
  const expected = process.env.INTEGRATION_API_KEY || ''
  if (!expected) {
    return res.status(503).json({ ok: false, message: 'Integration access is not enabled' })
  }

  const supplied = String(req.headers['x-api-key'] || '')
  const a = Buffer.from(supplied)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ ok: false, message: 'Invalid integration key' })
  }
  next()
}
