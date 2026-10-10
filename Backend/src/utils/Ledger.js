const round2 = (n) => Math.round(n * 100) / 100

export const outstandingOf = (sale) =>
  round2(
    sale.total -
      (sale.returnedAmount || 0) -
      sale.amountPaid -
      (sale.paidLater || 0) +
      (sale.refundedAmount || 0)
  )

export const METHOD_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  cheque: 'Cheque',
  other: 'Other',
}

// Spreads a payment over unpaid invoices, oldest first. `sales` must already be sorted.
export function allocateFifo(amount, sales) {
  let remaining = round2(amount)
  const allocations = []
  for (const s of sales) {
    if (remaining <= 0) break
    const out = outstandingOf(s)
    if (out <= 0) continue
    const take = Math.min(out, remaining)
    allocations.push({ sale: s._id, amount: round2(take) })
    remaining = round2(remaining - take)
  }
  return { allocations, unallocated: remaining }
}

// Turns a customer's sales and payments into ledger lines (debit = they owe, credit = they paid).
export function buildEntries(sales, payments, returnCases = []) {
  const invoiceOf = new Map(sales.map((s) => [String(s._id), s.invoiceNumber]))
  const entries = []

  sales.forEach((s) => {
    entries.push({
      date: s.saleDate,
      createdAt: s.createdAt,
      order: 1,
      type: 'invoice',
      ref: s.invoiceNumber,
      saleId: s._id,
      description: `${s.itemCount} device${s.itemCount === 1 ? '' : 's'}${
        s.discount > 0 ? ` (discount ${s.discount})` : ''
      }`,
      debit: s.total,
      credit: 0,
    })
    if (s.amountPaid > 0) {
      entries.push({
        date: s.saleDate,
        createdAt: s.createdAt,
        order: 2,
        type: 'payment',
        ref: s.invoiceNumber,
        saleId: s._id,
        description: `Paid at sale (${METHOD_LABELS[s.paymentMethod] || s.paymentMethod})`,
        debit: 0,
        credit: s.amountPaid,
      })
    }
  })

  payments.forEach((p) => {
    const applied = p.allocations?.length
      ? ` applied to ${p.allocations
          .map((a) => invoiceOf.get(String(a.sale)) || 'invoice')
          .join(', ')}`
      : ' on account'
    const method = METHOD_LABELS[p.method] || p.method
    entries.push({
      date: p.date,
      createdAt: p.createdAt,
      order: 2,
      type: p.voided ? 'voided' : 'payment',
      ref: p.reference,
      paymentId: p._id,
      description: p.voided
        ? `VOIDED ${method} payment of ${p.amount}${p.voidReason ? ` (${p.voidReason})` : ''}`
        : `${method} payment${applied}${p.note ? ` · ${p.note}` : ''}`,
      debit: 0,
      credit: p.voided ? 0 : p.amount,
    })
  })

  returnCases.forEach((c) => {
    if (c.creditAmount > 0) {
      entries.push({
        date: c.resolvedAt,
        createdAt: c.updatedAt,
        order: 2,
        type: 'credit_note',
        ref: c.caseNumber,
        saleId: c.sale,
        description: `Return credit for ${c.invoiceNumber} · ${c.imei}`,
        debit: 0,
        credit: c.creditAmount,
      })
    }
    if (c.refundAmount > 0) {
      entries.push({
        date: c.resolvedAt,
        createdAt: c.updatedAt,
        order: 3,
        type: 'refund',
        ref: c.caseNumber,
        saleId: c.sale,
        description: `Refund issued for ${c.invoiceNumber} · ${c.imei}`,
        debit: c.refundAmount,
        credit: 0,
      })
    }
  })

  entries.sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date) ||
      a.order - b.order ||
      new Date(a.createdAt) - new Date(b.createdAt)
  )
  return entries
}

// Adds a running balance and splits the list into opening balance + rows inside [from, to].
export function applyRange(entries, from, to) {
  let running = 0
  let opening = 0
  const rows = []
  for (const e of entries) {
    running = round2(running + e.debit - e.credit)
    const d = new Date(e.date)
    if (from && d < from) {
      opening = running
      continue
    }
    if (to && d > to) continue
    rows.push({ ...e, balance: running })
  }
  const closing = rows.length ? rows[rows.length - 1].balance : opening
  return {
    opening,
    rows,
    closing,
    overall: running,
    totalDebit: round2(rows.reduce((s, r) => s + r.debit, 0)),
    totalCredit: round2(rows.reduce((s, r) => s + r.credit, 0)),
  }
}