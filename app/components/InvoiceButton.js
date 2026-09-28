"use client";

function esc(v) {
  return String(v ?? '').replace(
    /[&<>"']/g,
    ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch])
  );
}

function money(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN')}`;
}

export default function InvoiceButton({
  order,
  label = 'PRINT / SAVE INVOICE'
}) {
  function printInvoice() {
    if (!order?.id) return;

    const items = Array.isArray(order.items)
      ? order.items
      : [];

    const customer = order.customer || {};

    /*
     * Avancy product GST is NOT added or displayed.
     *
     * GST/tax will only be shown separately if an actual
     * Shiprocket shipping GST amount has been stored on
     * the order as shippingGstAmount.
     */

    const subtotal = Number(
      order.subtotal ??
      order.total ??
      0
    );

    const shippingAmount = Number(
      order.shippingAmount || 0
    );

    const shippingGstAmount = Number(
      order.shippingGstAmount || 0
    );

    const total = Number(
      order.total || 0
    );

    const rows = items.map((item, i) => {
      const qty = Number(item.qty || 1);
      const unitPrice = Number(item.price || 0);
      const lineTotal = unitPrice * qty;

      return `
        <tr>
          <td>
            <strong>${esc(item.name || `Item ${i + 1}`)}</strong>

            ${
              item.custom
                ? `
                  <small>
                    CUSTOM DESIGN ·
                    ${esc(item.design?.garment || 'APPAREL')}
                    ·
                    ${esc(item.design?.color || '')}
                    ${
                      item.design?.text
                        ? ` · “${esc(item.design.text)}”`
                        : ''
                    }
                  </small>
                `
                : `
                  <small>
                    SIZE ${esc(item.size || '—')}
                    ·
                    ${esc(item.art || '')}
                  </small>
                `
            }
          </td>

          <td>${qty}</td>

          <td>${money(unitPrice)}</td>

          <td>${money(lineTotal)}</td>
        </tr>
      `;
    }).join('');

    const address = [
      customer.address,
      customer.city,
      customer.state,
      customer.pincode
    ]
      .filter(Boolean)
      .map(esc)
      .join(', ');

    const invoiceDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString(
          'en-IN',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }
        )
      : '—';

    const shipmentId =
      order.shiprocketShipmentId || '—';

    const awb =
      order.shiprocketAwbCode || '—';

    const courier =
      order.shiprocketCourierName ||
      order.shippingCourierName ||
      '—';

    const shippingGstLine =
      shippingGstAmount > 0
        ? `
          <div class="line">
            <span>SHIPROCKET GST / TAX</span>
            <strong>${money(shippingGstAmount)}</strong>
          </div>
        `
        : '';

    const html = `
<!doctype html>

<html>
<head>

<title>
  Avancy Invoice ${esc(order.id)}
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #f2f1ec;
  color: #101010;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

.sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: #fff;
  padding: 18mm 17mm;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 4px solid #101010;
  padding-bottom: 20px;
}

.brand {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1.5px;
}

.brand span {
  display: block;
  font-size: 11px;
  letter-spacing: 3px;
  margin-top: 3px;
}

.invoice {
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 2px;
  text-align: right;
}

.acid {
  color: #9bb500;
}

.meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin: 28px 0;
}

.label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #777;
  margin-bottom: 8px;
}

.value {
  font-size: 12px;
  line-height: 1.65;
}

.value strong {
  font-size: 15px;
}

.info-box {
  border: 1px solid #ddd;
  padding: 13px;
  margin-top: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 4px 0;
  font-size: 10px;
}

.info-row span:first-child {
  color: #777;
  font-weight: 700;
}

.info-row span:last-child {
  text-align: right;
  font-weight: 700;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.table th {
  background: #111;
  color: #fff;
  text-align: left;
  padding: 11px 10px;
  font-size: 9px;
  letter-spacing: 1px;
}

.table td {
  border-bottom: 1px solid #ddd;
  padding: 14px 10px;
  font-size: 11px;
  vertical-align: top;
}

.table td:nth-child(n + 2),
.table th:nth-child(n + 2) {
  text-align: right;
}

.table small {
  display: block;
  color: #777;
  font-size: 9px;
  margin-top: 5px;
  line-height: 1.5;
}

.totals {
  margin-left: auto;
  width: 310px;
  margin-top: 22px;
}

.line {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  font-size: 11px;
}

.grand {
  border-top: 3px solid #111;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 20px;
  font-weight: 900;
}

.status {
  display: inline-block;
  background: #e2f952;
  padding: 6px 9px;
  font-weight: 900;
  font-size: 9px;
  margin-top: 4px;
}

.note {
  margin-top: 55px;
  border-top: 1px solid #ddd;
  padding-top: 15px;
  color: #777;
  font-size: 9px;
  line-height: 1.6;
}

.screen-actions {
  position: fixed;
  right: 22px;
  bottom: 22px;
  display: flex;
  gap: 8px;
}

.screen-actions button {
  border: 0;
  padding: 12px 16px;
  font-weight: 800;
  background: #111;
  color: #fff;
  cursor: pointer;
}

.screen-actions button:first-child {
  background: #e2f952;
  color: #111;
}

@media print {

  body {
    background: #fff;
  }

  .sheet {
    margin: 0;
    width: auto;
    min-height: auto;
  }

  .screen-actions {
    display: none;
  }
}

@page {
  size: A4;
  margin: 0;
}

</style>

</head>

<body>

<div class="sheet">

  <div class="top">

    <div class="brand">
      AVANCY
      <span>COLLECTIVES</span>
    </div>

    <div class="invoice">

      INVOICE

      <div class="acid">
        #${esc(order.id)}
      </div>

    </div>

  </div>


  <div class="meta">

    <div>

      <div class="label">
        BILLED TO
      </div>

      <div class="value">

        <strong>
          ${esc(customer.name || 'Customer')}
        </strong>

        <br>

        ${esc(customer.email || '')}

        <br>

        ${esc(customer.phone || '')}

        <br>

        ${address || '—'}

      </div>

    </div>


    <div>

      <div class="label">
        ORDER DETAILS
      </div>

      <div class="value">

        <strong>
          ${invoiceDate}
        </strong>

        <br>

        Order ID:
        ${esc(order.id)}

        <br>

        Payment:
        ${esc(order.paymentStatus || 'PENDING')}

        <br>

        Status:

        <span class="status">
          ${esc(order.orderStatus || 'NEW')}
        </span>

      </div>

    </div>

  </div>


  <div class="info-box">

    <div class="info-row">
      <span>INVOICE ID</span>
      <span>${esc(order.id)}</span>
    </div>

    <div class="info-row">
      <span>INVOICE DATE</span>
      <span>${esc(invoiceDate)}</span>
    </div>

    <div class="info-row">
      <span>SHIPMENT ID</span>
      <span>${esc(shipmentId)}</span>
    </div>

    <div class="info-row">
      <span>AWB</span>
      <span>${esc(awb)}</span>
    </div>

    <div class="info-row">
      <span>COURIER</span>
      <span>${esc(courier)}</span>
    </div>

  </div>


  <table class="table">

    <thead>

      <tr>
        <th>ITEM</th>
        <th>QTY</th>
        <th>UNIT</th>
        <th>TOTAL</th>
      </tr>

    </thead>

    <tbody>

      ${
        rows ||
        `
          <tr>
            <td colspan="4">
              No items
            </td>
          </tr>
        `
      }

    </tbody>

  </table>


  <div class="totals">

    <div class="line">
      <span>PRODUCT SUBTOTAL</span>
      <strong>${money(subtotal)}</strong>
    </div>

    <div class="line">
      <span>SHIPPING / LOGISTICS</span>
      <strong>${money(shippingAmount)}</strong>
    </div>

    ${shippingGstLine}

    <div class="line grand">
      <span>TOTAL</span>
      <strong>${money(total)}</strong>
    </div>

  </div>


  <div class="note">

    <strong>
      AVANCY COLLECTIVES
    </strong>

    <br>

    Thank you for choosing independent streetwear.

    This is a computer-generated invoice.

    Keep this document for your records.

  </div>

</div>


<div class="screen-actions">

  <button onclick="window.print()">
    PRINT / SAVE PDF
  </button>

  <button onclick="window.close()">
    CLOSE
  </button>

</div>


<script>

window.onload = () =>
  setTimeout(
    () => window.print(),
    250
  );

</script>

</body>

</html>
`;

    const w = window.open(
      '',
      '_blank',
      'width=900,height=900'
    );

    if (!w) {
      alert(
        'Please allow pop-ups for Avancy Collectives to print the invoice.'
      );
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <button
      type="button"
      className="invoice-btn"
      onClick={printInvoice}
    >
      ↗ {label}
    </button>
  );
}
