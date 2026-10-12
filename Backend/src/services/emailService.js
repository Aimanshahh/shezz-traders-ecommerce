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
const INVOICE_FROM = process.env.INVOICE_EMAIL_FROM || 'info@shezztraders.com'

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

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char])

function crmInvoiceTemplate({ sale, items, settings }) {
  const shopName = escapeHtml(settings.shopName || 'Shezz Traders')
  const rows = [
    ...items.map((item) => ({ quantity: 1, name: item.productName || 'Device', detail: `IMEI ${item.imei}${item.boxCode ? ` · Box ${item.boxCode}` : ''}`, unitPrice: item.unitPrice })),
    ...(sale.extras || []).map((extra) => ({ quantity: extra.quantity, name: extra.name, detail: 'Additional component', unitPrice: extra.total })),
  ].map((item) => `
    <tr>
      <td style="padding:12px 10px;border-bottom:1px solid #d9e4e5;text-align:center">${item.quantity}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #d9e4e5">
        <strong>${escapeHtml(item.name)}</strong><br>
        <span style="font-size:12px;color:#526b70">${escapeHtml(item.detail)}</span>
      </td>
      <td style="padding:12px 10px;border-bottom:1px solid #d9e4e5;text-align:right;white-space:nowrap">${pkr(item.unitPrice)}</td>
    </tr>`).join('')
  const paymentMethod = escapeHtml(PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod)
  const bankDetails = sale.paymentMethod === 'bank_transfer'
    ? [settings.bankName, settings.bankAccountName, settings.bankAccountNumber].filter(Boolean).map(escapeHtml)
    : []
  const paid = Number(sale.amountPaid || 0) + Number(sale.paidLater || 0)
  const returned = Number(sale.returnedAmount || 0)
  const refunded = Number(sale.refundedAmount || 0)
  const balance = Math.max(0, Number(sale.total || 0) - returned - paid + refunded)
  const date = new Date(sale.saleDate).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return `<!doctype html>
<html><body style="margin:0;background:#f2f7f7;color:#17333a;font:14px Arial,sans-serif;padding:24px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;margin:auto;background:#fff;border-collapse:collapse">
    <tr><td colspan="2" style="padding:0;background:#073b43;color:#fff">
      <div style="padding:20px 26px;background:#087f86;border-bottom:6px solid #20bac1">
        <span style="font-size:24px;font-weight:800;letter-spacing:1px">${shopName}</span>
        <span style="float:right;padding-top:5px;font-size:20px;font-weight:700">INVOICE</span>
      </div>
    </td></tr>
    <tr><td style="padding:22px 26px 8px;vertical-align:top">
      <strong style="color:#087f86">Date</strong><br>${escapeHtml(date)}
      <p style="margin:18px 0 0"><strong style="color:#087f86">Issued to</strong><br>
        ${escapeHtml(sale.customerSnapshot?.name)}<br>${escapeHtml(sale.customerSnapshot?.phone)}<br>
        ${escapeHtml([sale.customerSnapshot?.address, sale.customerSnapshot?.city].filter(Boolean).join(', '))}
      </p>
    </td><td style="padding:22px 26px 8px;vertical-align:top;text-align:right">
      <strong style="color:#087f86">Payment method</strong><br>${paymentMethod}
      ${bankDetails.length ? `<p style="margin:12px 0 0">${bankDetails.join('<br>')}</p>` : ''}
      <p style="margin:18px 0 0"><strong style="color:#087f86">Invoice number</strong><br>${escapeHtml(sale.invoiceNumber)}</p>
    </td></tr>
    <tr><td colspan="2" style="padding:18px 26px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #9fb5b7;border-collapse:collapse">
        <thead><tr style="background:#eaf2f2;color:#087f86;text-align:left">
          <th style="padding:10px;text-align:center">QTY</th><th style="padding:10px">DESCRIPTION</th><th style="padding:10px;text-align:right">AMOUNT</th>
        </tr></thead><tbody>${rows}</tbody>
      </table>
    </td></tr>
    <tr><td style="padding:0 26px 22px;vertical-align:top">
      <strong style="color:#087f86">Warranty</strong><br>${Number(sale.warrantyMonths || 0)} months from sale date<br>
      <span style="color:#526b70">${escapeHtml(settings.warrantyNote)}</span>
    </td><td style="padding:0 26px 22px;vertical-align:top">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="5">
        <tr><td>Subtotal</td><td style="text-align:right">${pkr(sale.subtotal)}</td></tr>
        ${sale.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${pkr(sale.discount)}</td></tr>` : ''}
        <tr><td>Tax (not configured)</td><td style="text-align:right">${pkr(0)}</td></tr>
        ${returned > 0 ? `<tr><td>Return credit</td><td style="text-align:right">-${pkr(returned)}</td></tr>` : ''}
        <tr style="border-top:2px solid #087f86;font-size:17px;font-weight:700"><td style="padding-top:10px">Grand total</td><td style="padding-top:10px;text-align:right">${pkr(sale.total - returned)}</td></tr>
        ${paid > 0 || refunded > 0 ? `<tr><td>Paid</td><td style="text-align:right">${pkr(paid - refunded)}</td></tr>` : ''}
        ${balance > 0 ? `<tr><td>Balance due</td><td style="text-align:right">${pkr(balance)}</td></tr>` : ''}
      </table>
    </td></tr>
    <tr><td colspan="2" style="padding:14px 26px;background:#eaf2f2;color:#526b70;font-size:12px">
      ${escapeHtml(settings.invoiceFooter || 'Thank you for your business.')}
      ${settings.phone ? `<br>${escapeHtml(settings.phone)}` : ''}
      ${settings.email ? ` · ${escapeHtml(settings.email)}` : ''}
    </td></tr>
  </table>
</body></html>`
}

export async function sendCrmInvoiceEmail({ sale, items, settings, recipient }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, reason: 'SMTP is not configured' }
  }
  try {
    const info = await getTransporter().sendMail({
      from: INVOICE_FROM,
      to: recipient,
      replyTo: settings.email || undefined,
      subject: `Invoice ${sale.invoiceNumber} from ${settings.shopName || 'Shezz Traders'}`,
      html: crmInvoiceTemplate({ sale, items, settings }),
      text: `Invoice ${sale.invoiceNumber} from ${settings.shopName || 'Shezz Traders'}. Total: ${pkr(sale.total)}.`,
    })
    return { ok: true, messageId: info.messageId }
  } catch (err) {
    console.error('Invoice email failed:', err.message)
    return { ok: false, reason: err.message }
  }
}
