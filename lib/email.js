import {Resend} from 'resend';

const ORDER_FROM='AVANCY COLLECTIVES <orders@avancycollectives.in>';
const SUPPORT_EMAIL='support@avancycollectives.in';
const SITE_URL='https://avancycollectives.in';

function escapeHtml(value){
  return String(value??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function money(value){
  return `₹${Number(value||0).toLocaleString('en-IN')}`;
}

function getItems(order){
  return Array.isArray(order?.items)?order.items:[];
}

function itemName(item){
  return item?.name||item?.title||'Avancy Collectives product';
}

function itemQuantity(item){
  return Number(
    item?.quantity ??
    item?.qty ??
    item?.count ??
    1
  );
}

function itemPrice(item){
  return Number(
    item?.price ??
    item?.unitPrice ??
    0
  );
}

function itemSize(item){
  return item?.size
    ? `<div style="color:#777;font-size:11px;margin-top:4px">SIZE: ${escapeHtml(item.size)}</div>`
    : '';
}

function buildItems(order){
  return getItems(order).map(item=>`
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #252525">
        <div style="font-size:14px;font-weight:800;color:#f5f5f0">
          ${escapeHtml(itemName(item))}
        </div>
        ${itemSize(item)}
        <div style="color:#777;font-size:11px;margin-top:5px">
          QTY ${itemQuantity(item)}
        </div>
      </td>

      <td style="padding:16px 0;border-bottom:1px solid #252525;text-align:right;vertical-align:top;font-size:14px;font-weight:800;color:#f5f5f0">
        ${money(itemPrice(item)*itemQuantity(item))}
      </td>
    </tr>
  `).join('');
}

function buildAddress(order){
  const c=order?.customer||{};

  return `
    <div style="color:#c7c7c2;font-size:13px;line-height:1.7">
      <strong style="color:#f5f5f0">${escapeHtml(c.name||'')}</strong><br>
      ${escapeHtml(c.address||'')}<br>
      ${escapeHtml(c.city||'')}${c.state?`, ${escapeHtml(c.state)}`:''}
      ${c.pincode?` - ${escapeHtml(c.pincode)}`:''}<br>
      ${c.phone?`Phone: ${escapeHtml(c.phone)}`:''}
    </div>
  `;
}


export async function sendReturnRequestEmail(order){
  const apiKey=process.env.RESEND_API_KEY;

  if(!apiKey){
    console.error(
      'Return support email skipped: RESEND_API_KEY is missing.',
      order?.id
    );
    return {ok:false,skipped:true};
  }

  const orderId=String(order?.id||'').trim();

  if(!orderId){
    console.error(
      'Return support email skipped: order id is missing.'
    );
    return {ok:false,skipped:true};
  }

  const resend=new Resend(apiKey);

  const customer=order?.customer||{};
  const customerName=String(customer?.name||'Customer');
  const customerEmail=String(customer?.email||'').trim().toLowerCase();
  const reason=String(order?.returnReason||'').trim();
  const evidenceUrl=String(order?.returnEvidenceUrl||'').trim();
  const requestedAt=String(order?.returnRequestedAt||'').trim();

  /*
   * 1. Internal support notification
   */
  const supportSubject=`Return request — ${orderId}`;

  const supportHtml=`
    <div style="margin:0;padding:0;background:#090909;color:#f5f5f0;font-family:Arial,Helvetica,sans-serif">
      <div style="padding:36px 18px">

        <div style="max-width:620px;margin:0 auto">

          <div style="font-size:27px;font-weight:900;letter-spacing:-.05em;margin-bottom:26px">
            AVANCY<span style="color:#e2f952">COLLECTIVES™</span>
          </div>

          <div style="background:#111;border:1px solid #292929;border-radius:20px;padding:30px">

            <div style="color:#888;font-size:10px;font-weight:900;letter-spacing:.14em">
              RETURN / REQUESTED
            </div>

            <h1 style="margin:12px 0 12px;font-size:36px;line-height:1.02;letter-spacing:-.04em">
              RETURN REQUEST RECEIVED.
            </h1>

            <p style="margin:0;color:#aaa;line-height:1.7;font-size:14px">
              A customer has submitted a return request that requires review.
            </p>

            <div style="margin:26px 0;padding:18px;background:#0b0b0b;border:1px solid #292929;border-radius:14px">

              <div style="color:#777;font-size:10px;font-weight:900;letter-spacing:.12em;margin-bottom:7px">
                ORDER NUMBER
              </div>

              <div style="font-size:20px;font-weight:900;color:#e2f952">
                ${escapeHtml(orderId)}
              </div>

            </div>

            <div style="padding:18px;background:#0b0b0b;border:1px solid #292929;border-radius:14px">

              <div style="color:#777;font-size:10px;font-weight:900;letter-spacing:.1em;margin-bottom:7px">
                CUSTOMER
              </div>

              <div style="font-size:15px;font-weight:800;color:#f5f5f0">
                ${escapeHtml(customerName)}
              </div>

              <div style="margin-top:5px;color:#aaa;font-size:13px">
                ${customerEmail
                  ? escapeHtml(customerEmail)
                  : 'Customer email unavailable'}
              </div>

              ${customer?.phone
                ? `
                  <div style="margin-top:5px;color:#aaa;font-size:13px">
                    ${escapeHtml(customer.phone)}
                  </div>
                `
                : ''}

            </div>

            <div style="margin-top:20px">

              <div style="color:#777;font-size:10px;font-weight:900;letter-spacing:.1em;margin-bottom:9px">
                RETURN REASON
              </div>

              <div style="padding:16px;background:#0b0b0b;border:1px solid #292929;border-radius:12px;color:#d4d4cf;font-size:14px;line-height:1.7">
                ${escapeHtml(reason||'No reason provided.')}
              </div>

            </div>

            ${
              evidenceUrl
                ? `
                  <div style="margin-top:20px">
                    <div style="color:#777;font-size:10px;font-weight:900;letter-spacing:.1em;margin-bottom:9px">
                      EVIDENCE
                    </div>

                    <a
                      href="${escapeHtml(evidenceUrl)}"
                      style="color:#e2f952;text-decoration:none;font-size:13px;word-break:break-all"
                    >
                      ${escapeHtml(evidenceUrl)}
                    </a>
                  </div>
                `
                : ''
            }

            ${
              requestedAt
                ? `
                  <div style="margin-top:20px;color:#777;font-size:11px">
                    Requested at: ${escapeHtml(requestedAt)}
                  </div>
                `
                : ''
            }

            <div style="margin-top:30px;text-align:center">

              <a
                href="${SITE_URL}/admin/orders/${encodeURIComponent(orderId)}"
                style="display:inline-block;padding:14px 22px;background:#e2f952;color:#090909;text-decoration:none;border-radius:10px;font-size:12px;font-weight:900;letter-spacing:.08em"
              >
                OPEN ORDER →
              </a>

            </div>

            <div style="margin-top:30px;padding-top:20px;border-top:1px solid #292929;color:#777;font-size:12px;line-height:1.7">
              This email was generated automatically when a customer submitted a return request.
            </div>

          </div>

          <div style="padding:22px 4px;color:#555;font-size:11px;line-height:1.6">
            AVANCY COLLECTIVES™<br>
            Premium custom streetwear.
          </div>

        </div>
      </div>
    </div>
  `;

  let supportResult=null;

  try {
    supportResult=await resend.emails.send(
      {
        from:ORDER_FROM,
        to:[SUPPORT_EMAIL],
        subject:supportSubject,
        html:supportHtml
      },
      {
        idempotencyKey:
          `return-request/${orderId}/${requestedAt||'request'}`
      }
    );
  } catch(error) {
    console.error(
      'RETURN_SUPPORT_EMAIL_ERROR',
      error
    );
  }

  /*
   * 2. Customer confirmation
   */
  let customerResult=null;

  if(customerEmail){
    const customerSubject=`Return request submitted — ${orderId}`;

    const customerHtml=`
      <div style="margin:0;padding:0;background:#090909;color:#f5f5f0;font-family:Arial,Helvetica,sans-serif">
        <div style="padding:36px 18px">

          <div style="max-width:620px;margin:0 auto">

            <div style="font-size:27px;font-weight:900;letter-spacing:-.05em;margin-bottom:26px">
              AVANCY<span style="color:#e2f952">COLLECTIVES™</span>
            </div>

            <div style="background:#111;border:1px solid #292929;border-radius:20px;padding:30px">

              <div style="color:#888;font-size:10px;font-weight:900;letter-spacing:.14em">
                RETURN / SUBMITTED
              </div>

              <h1 style="margin:12px 0 12px;font-size:36px;line-height:1.02;letter-spacing:-.04em">
                RETURN REQUEST SUBMITTED.
              </h1>

              <p style="margin:0;color:#aaa;line-height:1.7;font-size:14px">
                Hi ${escapeHtml(customerName)}, your return request has been successfully submitted.
                Our team will review your request and update you once it has been processed.
              </p>

              <div style="margin:26px 0;padding:18px;background:#0b0b0b;border:1px solid #292929;border-radius:14px">

                <div style="color:#777;font-size:10px;font-weight:900;letter-spacing:.12em;margin-bottom:7px">
                  ORDER NUMBER
                </div>

                <div style="font-size:20px;font-weight:900;color:#e2f952">
                  ${escapeHtml(orderId)}
                </div>

              </div>

              <div style="padding:18px;background:#0b0b0b;border:1px solid #292929;border-radius:14px">

                <div style="color:#777;font-size:10px;font-weight:900;letter-spacing:.1em;margin-bottom:7px">
                  RETURN REASON
                </div>

                <div style="color:#d4d4cf;font-size:14px;line-height:1.7">
                  ${escapeHtml(reason||'No reason provided.')}
                </div>

              </div>

              ${
                requestedAt
                  ? `
                    <div style="margin-top:20px;color:#777;font-size:11px">
                      Submitted at: ${escapeHtml(requestedAt)}
                    </div>
                  `
                  : ''
              }

              <div style="margin-top:30px;text-align:center">

                <a
                  href="${SITE_URL}/track-order"
                  style="display:inline-block;padding:14px 22px;background:#e2f952;color:#090909;text-decoration:none;border-radius:10px;font-size:12px;font-weight:900;letter-spacing:.08em"
                >
                  TRACK YOUR ORDER →
                </a>

              </div>

              <div style="margin-top:30px;padding-top:20px;border-top:1px solid #292929;color:#777;font-size:12px;line-height:1.7">
                Please keep this email for your records. You will receive another update when your return request has been reviewed.
              </div>

            </div>

            <div style="padding:22px 4px;color:#555;font-size:11px;line-height:1.6">
              AVANCY COLLECTIVES™<br>
              Premium custom streetwear.
            </div>

          </div>
        </div>
      </div>
    `;

    try {
      customerResult=await resend.emails.send(
        {
          from:ORDER_FROM,
          to:[customerEmail],
          subject:customerSubject,
          html:customerHtml
        },
        {
          idempotencyKey:
            `return-confirmation/${orderId}/${requestedAt||'request'}`
        }
      );
    } catch(error) {
      console.error(
        'RETURN_CUSTOMER_EMAIL_ERROR',
        error
      );
    }
  } else {
    console.error(
      'RETURN_CUSTOMER_EMAIL_SKIPPED: customer email missing.',
      orderId
    );
  }

  return {
    ok:true,
    supportId:supportResult?.data?.id||null,
    customerId:customerResult?.data?.id||null
  };
}

export async function sendOrderConfirmationEmail(
  order,
  paymentMethod
){
  const apiKey=process.env.RESEND_API_KEY;

  if(!apiKey){
    console.error('Order confirmation email skipped: RESEND_API_KEY is missing.');
    return {ok:false,skipped:true};
  }

  const email=String(order?.customer?.email||'').trim().toLowerCase();

  if(!email){
    console.error('Order confirmation email skipped: customer email is missing.',order?.id);
    return {ok:false,skipped:true};
  }

  const resend=new Resend(apiKey);

  const method=String(paymentMethod||'').toUpperCase()==='RAZORPAY'
    ? 'RAZORPAY'
    : 'CASH ON DELIVERY';

  const paymentStatus=String(order?.paymentStatus||'PENDING').toUpperCase();
  const orderStatus=String(order?.orderStatus||'NEW').toUpperCase();

  const orderId=String(order?.id||'');
  const customerName=String(order?.customer?.name||'there');

  const subject=`Order confirmed — ${orderId}`;

  const html=`
    <div style="margin:0;padding:0;background:#090909;color:#f5f5f0;font-family:Arial,Helvetica,sans-serif">
      <div style="padding:36px 18px">

        <div style="max-width:620px;margin:0 auto">

          <div style="font-size:27px;font-weight:900;letter-spacing:-.05em;margin-bottom:26px">
            AVANCY<span style="color:#e2f952">COLLECTIVES™</span>
          </div>

          <div style="background:#111;border:1px solid #292929;border-radius:20px;padding:30px">

            <div style="color:#888;font-size:10px;font-weight:900;letter-spacing:.14em">
              ORDER / CONFIRMED
            </div>

            <h1 style="margin:12px 0 12px;font-size:38px;line-height:1.02;letter-spacing:-.04em">
              THANK YOU, ${escapeHtml(customerName).toUpperCase()}.
            </h1>

            <p style="margin:0;color:#aaa;line-height:1.7;font-size:14px">
              Your Avancy Collectives order has been received and is now being prepared.
            </p>

            <div style="margin:26px 0;padding:18px;background:#0b0b0b;border:1px solid #292929;border-radius:14px">
              <div style="color:#777;font-size:10px;font-weight:900;letter-spacing:.12em;margin-bottom:7px">
                ORDER NUMBER
              </div>

              <div style="font-size:20px;font-weight:900;color:#e2f952">
                ${escapeHtml(orderId)}
              </div>
            </div>

            <table style="width:100%;border-collapse:collapse">
              <tbody>
                ${buildItems(order)}
              </tbody>
            </table>

            <div style="margin-top:20px">

              <div style="display:flex;justify-content:space-between;padding:7px 0;color:#999;font-size:13px">
                <span>SUBTOTAL</span>
                <strong style="color:#f5f5f0">${money(order?.subtotal)}</strong>
              </div>

              <div style="display:flex;justify-content:space-between;padding:7px 0;color:#999;font-size:13px">
                <span>SHIPPING</span>
                <strong style="color:#f5f5f0">
                  ${Number(order?.shippingAmount||0)>0
                    ? money(order.shippingAmount)
                    : 'FREE'}
                </strong>
              </div>

              <div style="border-top:1px solid #333;margin-top:10px;padding-top:14px;display:flex;justify-content:space-between">
                <span style="font-size:14px;font-weight:900">TOTAL</span>
                <strong style="font-size:22px;color:#e2f952">${money(order?.total)}</strong>
              </div>

            </div>

            <div style="margin-top:26px;padding:18px;background:#0b0b0b;border:1px solid #292929;border-radius:14px">

              <div style="display:flex;justify-content:space-between;padding-bottom:10px">
                <span style="color:#777;font-size:10px;font-weight:900;letter-spacing:.1em">
                  PAYMENT
                </span>
                <strong style="font-size:12px;color:#f5f5f0">
                  ${escapeHtml(method)}
                </strong>
              </div>

              <div style="display:flex;justify-content:space-between">
                <span style="color:#777;font-size:10px;font-weight:900;letter-spacing:.1em">
                  PAYMENT STATUS
                </span>
                <strong style="font-size:12px;color:#e2f952">
                  ${escapeHtml(paymentStatus)}
                </strong>
              </div>

            </div>

            <div style="margin-top:26px">
              <div style="color:#777;font-size:10px;font-weight:900;letter-spacing:.1em;margin-bottom:9px">
                DELIVERY ADDRESS
              </div>

              ${buildAddress(order)}
            </div>

            <div style="margin-top:30px;text-align:center">

              <a
                href="${SITE_URL}/track-order?order=${encodeURIComponent(orderId)}"
                style="display:inline-block;padding:14px 22px;background:#e2f952;color:#090909;text-decoration:none;border-radius:10px;font-size:12px;font-weight:900;letter-spacing:.08em"
              >
                TRACK YOUR ORDER →
              </a>

            </div>

            <div style="margin-top:30px;padding-top:20px;border-top:1px solid #292929;color:#777;font-size:12px;line-height:1.7">
              Need help with your order?<br>
              <a href="mailto:${SUPPORT_EMAIL}" style="color:#e2f952;text-decoration:none">
                ${SUPPORT_EMAIL}
              </a>
            </div>

          </div>

          <div style="padding:22px 4px;color:#555;font-size:11px;line-height:1.6">
            AVANCY COLLECTIVES™<br>
            Premium custom streetwear.
          </div>

        </div>
      </div>
    </div>
  `;

  const result=await resend.emails.send(
    {
      from:ORDER_FROM,
      to:[email],
      subject,
      html
    },
    {
      idempotencyKey:`order-confirmation/${orderId}`
    }
  );

  return {
    ok:true,
    id:result?.data?.id||null
  };
}
