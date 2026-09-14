import nodemailer from 'nodemailer'

// ─── Create reusable transporter ─────────────────
let transporter = null

function getTransporter() {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return transporter
}

// ─── Format PKR ──────────────────────────────────
const pkr = (n) => `PKR ${Number(n || 0).toLocaleString()}`

const PAYMENT_LABELS = {
  cod: 'Cash on Delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank: 'Bank Transfer',
}

// ─── Customer order confirmation email ───────────
function customerTemplate(order) {
  const itemsHtml = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #0F1115;">
          <strong>${it.name}</strong><br />
          <span style="color: #6B7280; font-size: 12px;">
            ${pkr(it.price)} × ${it.quantity}
          </span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-size: 14px; color: #0F1115; white-space: nowrap;">
          <strong>${pkr(it.price * it.quantity)}</strong>
        </td>
      </tr>`
    )
    .join('')

  const isOffline =
    order.paymentMethod === 'jazzcash' ||
    order.paymentMethod === 'easypaisa' ||
    order.paymentMethod === 'bank'

  const paymentInstructions = isOffline
    ? `
    <div style="background: #F0FDFA; border: 1px dashed #00838F; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #00838F;">
        Next step: complete your payment
      </p>
      <p style="margin: 0; font-size: 13px; color: #4B5563; line-height: 1.6;">
        Send <strong>${pkr(order.total)}</strong> to
        <strong>0335-7069452</strong> via
        <strong>${PAYMENT_LABELS[order.paymentMethod]}</strong> and share
        the screenshot on WhatsApp. We'll confirm your order once we verify the payment.
      </p>
    </div>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background: #F5F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #F5F6F8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background: #1A2433; padding: 28px 32px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 800; font-size: 20px; color: #fff; letter-spacing: 0.5px;">
                    SHEZZ <span style="color: #00B8D4;">TRADERS</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 4px; font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 0.18em; text-transform: uppercase;">
                    GPS Tracking &amp; Vehicle Security
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Green check -->
          <tr>
            <td style="padding: 32px 32px 0; text-align: center;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: #D1FAE5; margin: 0 auto; line-height: 64px; font-size: 32px; color: #059669;">
                ✓
              </div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 20px 32px 8px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0F1115; letter-spacing: -0.01em;">
                Order confirmed
              </h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 0 32px 24px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.6;">
                Hi ${order.customer.name.split(' ')[0]}, thanks for your order.
                We'll call you at <strong style="color: #0F1115;">${order.customer.phone}</strong> to confirm.
              </p>
            </td>
          </tr>

          <!-- Order number -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background: #F9FAFB; border-radius: 8px; padding: 14px 20px; text-align: center;">
                <div style="font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #6B7280; margin-bottom: 4px;">
                  Order number
                </div>
                <div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: 700; color: #00838F;">
                  ${order.orderNumber}
                </div>
              </div>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #6B7280; margin-bottom: 8px;">
                Items
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 16px 32px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 0;">Subtotal</td>
                  <td style="font-size: 13px; color: #0F1115; text-align: right; padding: 4px 0;">${pkr(order.subtotal)}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 0;">Shipping</td>
                  <td style="font-size: 13px; color: #00838F; font-weight: 600; text-align: right; padding: 4px 0;">Free</td>
                </tr>
                <tr>
                  <td style="font-size: 14px; font-weight: 700; color: #0F1115; padding: 12px 0 0; border-top: 1px solid #eee;">Total</td>
                  <td style="font-size: 18px; font-weight: 800; color: #00838F; text-align: right; padding: 12px 0 0; border-top: 1px solid #eee;">${pkr(order.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          ${paymentInstructions ? `<tr><td style="padding: 0 32px;">${paymentInstructions}</td></tr>` : ''}

          <!-- Delivery -->
          <tr>
            <td style="padding: 24px 32px;">
              <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #6B7280; margin-bottom: 8px;">
                Delivery address
              </div>
              <div style="font-size: 13px; color: #0F1115; line-height: 1.7;">
                <strong>${order.customer.name}</strong><br />
                ${order.customer.address}<br />
                ${order.customer.city}<br />
                ${order.customer.phone}
              </div>
            </td>
          </tr>

          <!-- Payment method -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 13px; color: #6B7280;">Payment method</td>
                  <td style="font-size: 13px; color: #0F1115; font-weight: 600; text-align: right;">${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="https://wa.me/923357069452?text=${encodeURIComponent(`Hi, I have a question about order ${order.orderNumber}.`)}"
                 style="display: inline-block; background: #00838F; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 700; font-size: 14px;">
                Contact us on WhatsApp
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #F9FAFB; padding: 20px 32px; border-top: 1px solid #eee; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #6B7280; line-height: 1.6;">
                Need help? Reply to this email or call us at
                <a href="tel:02136930072" style="color: #00838F; text-decoration: none;">021-36930072</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                © ${new Date().getFullYear()} Shezz Traders · Karachi, Pakistan
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Admin notification email ────────────────────
function adminTemplate(order) {
  const itemsList = order.items
    .map(
      (it) =>
        `<li style="margin-bottom: 6px; font-size: 14px; color: #0F1115;">
          <strong>${it.name}</strong> · ${pkr(it.price)} × ${it.quantity}
        </li>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 20px; background: #F5F6F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
    <div style="border-left: 4px solid #00838F; padding-left: 14px; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 18px; color: #0F1115;">New order received</h2>
      <p style="margin: 4px 0 0; font-size: 13px; color: #6B7280;">
        Order <strong>${order.orderNumber}</strong> · ${pkr(order.total)} · ${PAYMENT_LABELS[order.paymentMethod]}
      </p>
    </div>

    <h3 style="font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #6B7280; margin: 0 0 8px;">Customer</h3>
    <p style="font-size: 14px; color: #0F1115; line-height: 1.7; margin: 0 0 20px;">
      <strong>${order.customer.name}</strong><br />
      📞 ${order.customer.phone}<br />
      ${order.customer.email ? `✉️ ${order.customer.email}<br />` : ''}
      📍 ${order.customer.address}, ${order.customer.city}
    </p>

    <h3 style="font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #6B7280; margin: 0 0 8px;">Items</h3>
    <ul style="padding-left: 20px; margin: 0 0 20px; color: #0F1115;">
      ${itemsList}
    </ul>

    ${order.customer.notes ? `
      <h3 style="font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #6B7280; margin: 0 0 8px;">Customer notes</h3>
      <p style="font-size: 13px; background: #F9FAFB; padding: 12px; border-radius: 6px; margin: 0 0 20px; color: #4B5563;">
        ${order.customer.notes}
      </p>
    ` : ''}

    <a href="https://yourdomain.com/admin/orders" style="display: inline-block; background: #1A2433; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 600; font-size: 13px;">
      View in admin panel
    </a>
  </div>
</body>
</html>`
}

// ─── Public: send order confirmation ─────────────
export async function sendOrderConfirmation(order) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured — skipping order confirmation emails')
    return { ok: false, reason: 'no_smtp' }
  }

  const transporter = getTransporter()
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER

  const promises = []

  // Email to customer (if they provided an email)
  if (order.customer?.email) {
    promises.push(
      transporter.sendMail({
        from: fromAddress,
        to: order.customer.email,
        subject: `Order confirmed — ${order.orderNumber}`,
        html: customerTemplate(order),
      })
    )
  }

  // Email to store owner
  if (process.env.EMAIL_TO) {
    promises.push(
      transporter.sendMail({
        from: fromAddress,
        to: process.env.EMAIL_TO,
        replyTo: order.customer?.email || undefined,
        subject: `🛒 New order ${order.orderNumber} — ${pkr(order.total)}`,
        html: adminTemplate(order),
      })
    )
  }

  try {
    await Promise.all(promises)
    return { ok: true }
  } catch (err) {
    console.error('❌ Email send failed:', err.message)
    return { ok: false, reason: err.message }
  }
}
