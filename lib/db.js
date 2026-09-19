import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

let sql;
let schemaPromise;

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing. Add it to .env.local.");
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}

export async function ensureSchema() {
  if (!schemaPromise) {
    const db = getSql();
    schemaPromise = (async () => {
      await db`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY,name TEXT NOT NULL,price INTEGER NOT NULL DEFAULT 0,category TEXT NOT NULL DEFAULT 'SIGNATURE',color TEXT NOT NULL DEFAULT 'Black',sizes JSONB NOT NULL DEFAULT '[]'::jsonb,stock JSONB NOT NULL DEFAULT '{}'::jsonb,gsm TEXT NOT NULL DEFAULT '',fabric TEXT NOT NULL DEFAULT '',fit TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',art TEXT NOT NULL DEFAULT 'AVNC',active BOOLEAN NOT NULL DEFAULT TRUE,image TEXT NOT NULL DEFAULT '',image_public_id TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),customer JSONB NOT NULL,items JSONB NOT NULL,total INTEGER NOT NULL DEFAULT 0,payment_status TEXT NOT NULL DEFAULT 'PENDING',order_status TEXT NOT NULL DEFAULT 'NEW',payment_order_id TEXT NOT NULL DEFAULT '',payment_id TEXT NOT NULL DEFAULT '')`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_shipment_id TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_awb_code TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_courier_name TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_status TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_pickup_status TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shiprocket_courier_status TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_weight NUMERIC(8,3) NOT NULL DEFAULT 0.500`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_length NUMERIC(8,2) NOT NULL DEFAULT 30`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_breadth NUMERIC(8,2) NOT NULL DEFAULT 25`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_height NUMERIC(8,2) NOT NULL DEFAULT 5`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_status TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_evidence_url TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_rejection_reason TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_resubmission_count INTEGER NOT NULL DEFAULT 0`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_method TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reference TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_id TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount INTEGER NOT NULL DEFAULT 0`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ`;
await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_error TEXT NOT NULL DEFAULT ''`;
      await db`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`ALTER TABLE customers ALTER COLUMN password_hash DROP NOT NULL`;
      await db`ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_sub TEXT`;
      await db`CREATE UNIQUE INDEX IF NOT EXISTS customers_google_sub_idx ON customers(google_sub) WHERE google_sub IS NOT NULL`;
      await db`CREATE TABLE IF NOT EXISTS customer_password_resets (id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,token_hash TEXT UNIQUE NOT NULL,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE INDEX IF NOT EXISTS customer_password_resets_customer_idx ON customer_password_resets(customer_id,created_at DESC)`;
      await db`CREATE TABLE IF NOT EXISTS customer_sessions (token_hash TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE TABLE IF NOT EXISTS customer_addresses (id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,label TEXT NOT NULL DEFAULT 'HOME',name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',address TEXT NOT NULL,city TEXT NOT NULL,state TEXT NOT NULL DEFAULT '',pincode TEXT NOT NULL,country TEXT NOT NULL DEFAULT 'India',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT 'HOME'`;
await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE customer_addresses ALTER COLUMN address_line1 DROP NOT NULL`;
await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS pincode TEXT NOT NULL DEFAULT ''`;
await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'India'`;
await db`ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_order_id TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_public_id TEXT NOT NULL DEFAULT ''`;
      await db`CREATE INDEX IF NOT EXISTS products_active_idx ON products(active)`;
      await db`CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx ON customer_addresses(customer_id,created_at DESC)`;
      // Test product seed disabled.
      // Products will be added manually through the Admin panel.
    })().catch(e => { schemaPromise = undefined; throw e; });
  }
  return schemaPromise;
}

function mapProduct(r) { return r ? {id:r.id,name:r.name,price:Number(r.price),category:r.category,color:r.color,sizes:r.sizes||[],stock:r.stock||{},gsm:r.gsm,fabric:r.fabric,fit:r.fit,description:r.description,art:r.art,active:r.active,image:r.image||'',imagePublicId:r.image_public_id||'',shippingWeight:Number(r.shipping_weight||0),shippingLength:Number(r.shipping_length||0),shippingBreadth:Number(r.shipping_breadth||0),shippingHeight:Number(r.shipping_height||0),createdAt:r.created_at,updatedAt:r.updated_at} : null; }
function mapOrder(o) { return o ? {id:o.id,createdAt:o.created_at,deliveredAt:o.delivered_at,returnStatus:o.return_status||'',returnRequestedAt:o.return_requested_at,returnReason:o.return_reason||'',returnEvidenceUrl:o.return_evidence_url||'',returnRejectionReason:o.return_rejection_reason||'',returnResubmissionCount:Number(o.return_resubmission_count||0),customer:o.customer,items:o.items,total:Number(o.total),paymentStatus:o.payment_status,orderStatus:o.order_status,paymentOrderId:o.payment_order_id,paymentId:o.payment_id,refundStatus:o.refund_status||'',refundId:o.refund_id||'',refundAmount:Number(o.refund_amount||0),refundRequestedAt:o.refund_requested_at,refundMethod:o.refund_method||'',refundReference:o.refund_reference||'',refundProcessedAt:o.refund_processed_at,refundError:o.refund_error||'',shiprocketOrderId:o.shiprocket_order_id||'',shiprocketShipmentId:o.shiprocket_shipment_id||'',shiprocketAwbCode:o.shiprocket_awb_code||'',shiprocketCourierName:o.shiprocket_courier_name||'',shiprocketStatus:o.shiprocket_status||'',shiprocketPickupStatus:o.shiprocket_pickup_status||'',shiprocketCourierStatus:o.shiprocket_courier_status||''} : null; }
function mapAddress(a) { return a ? {id:a.id,label:a.label,name:a.name,phone:a.phone,address:a.address,city:a.city,state:a.state,pincode:a.pincode,country:a.country,createdAt:a.created_at} : null; }

export async function getProducts(){await ensureSchema();return (await getSql()`SELECT * FROM products ORDER BY created_at ASC`).map(mapProduct)}
export async function getActiveProducts(){await ensureSchema();return (await getSql()`SELECT * FROM products WHERE active=TRUE ORDER BY created_at ASC`).map(mapProduct)}
export async function getProduct(id){await ensureSchema();return mapProduct((await getSql()`SELECT * FROM products WHERE id=${id} LIMIT 1`)[0])}
export async function createProduct(p){await ensureSchema();return mapProduct((await getSql()`INSERT INTO products (id,name,price,category,color,sizes,stock,gsm,fabric,fit,description,art,active,image,image_public_id,shipping_weight,shipping_length,shipping_breadth,shipping_height) VALUES (${p.id},${p.name},${p.price},${p.category},${p.color},${JSON.stringify(p.sizes)}::jsonb,${JSON.stringify(p.stock)}::jsonb,${p.gsm},${p.fabric},${p.fit},${p.description},${p.art},${p.active},${p.image},${p.imagePublicId||''},${p.shippingWeight||0},${p.shippingLength||0},${p.shippingBreadth||0},${p.shippingHeight||0}) RETURNING *`)[0])}
export async function updateProduct(id,p){await ensureSchema();return mapProduct((await getSql()`UPDATE products SET name=${p.name},price=${p.price},category=${p.category},color=${p.color},sizes=${JSON.stringify(p.sizes)}::jsonb,stock=${JSON.stringify(p.stock)}::jsonb,gsm=${p.gsm},fabric=${p.fabric},fit=${p.fit},description=${p.description},art=${p.art},active=${p.active},image=${p.image},image_public_id=${p.imagePublicId||''},shipping_weight=${p.shippingWeight||0},shipping_length=${p.shippingLength||0},shipping_breadth=${p.shippingBreadth||0},shipping_height=${p.shippingHeight||0},updated_at=NOW() WHERE id=${id} RETURNING *`)[0])}
export async function deleteProduct(id){await ensureSchema();return Boolean((await getSql()`DELETE FROM products WHERE id=${id} RETURNING id`)[0])}
export async function decrementStock(items){await ensureSchema();const db=getSql();for(const i of items||[]){if(i.custom)continue;const p=await getProduct(i.id);if(!p)continue;const stock={...p.stock};stock[i.size]=Math.max(0,Number(stock[i.size]||0)-Number(i.qty||1));await db`UPDATE products SET stock=${JSON.stringify(stock)}::jsonb,updated_at=NOW() WHERE id=${i.id}`}}
export async function createSession(tokenHash,expiresAt){await ensureSchema();await getSql()`DELETE FROM admin_sessions WHERE expires_at<=NOW()`;await getSql()`INSERT INTO admin_sessions(token_hash,expires_at) VALUES(${tokenHash},${expiresAt})`}
export async function validSession(tokenHash){if(!tokenHash)return false;await ensureSchema();return Boolean((await getSql()`SELECT 1 FROM admin_sessions WHERE token_hash=${tokenHash} AND expires_at>NOW() LIMIT 1`)[0])}
export async function deleteSession(tokenHash){if(tokenHash){await ensureSchema();await getSql()`DELETE FROM admin_sessions WHERE token_hash=${tokenHash}`}}
export async function getOrders(){await ensureSchema();return (await getSql()`SELECT * FROM orders ORDER BY created_at DESC`).map(mapOrder)}
export async function getOrder(id){await ensureSchema();return mapOrder((await getSql()`SELECT * FROM orders WHERE id=${id} LIMIT 1`)[0])}
export async function getOrderByPaymentId(paymentId){await ensureSchema();return mapOrder((await getSql()`SELECT * FROM orders WHERE payment_id=${paymentId} LIMIT 1`)[0])}
export async function createOrder(order){await ensureSchema();const rows=await getSql()`INSERT INTO orders(id,customer,items,total,payment_status,order_status,payment_order_id,payment_id) VALUES(${order.id},${JSON.stringify(order.customer)}::jsonb,${JSON.stringify(order.items)}::jsonb,${order.total},${order.paymentStatus||'PENDING'},${order.orderStatus||'NEW'},${order.paymentOrderId||''},${order.paymentId||''}) RETURNING id`;return rows[0].id}
export async function updateShiprocketData(id, data = {}) {
  await ensureSchema();

  const r = await getSql()`
    UPDATE orders
    SET shiprocket_order_id=${data.shiprocketOrderId || ''},
        shiprocket_shipment_id=${data.shiprocketShipmentId || ''},
        shiprocket_awb_code=${data.shiprocketAwbCode || ''},
        shiprocket_courier_name=${data.shiprocketCourierName || ''},
        shiprocket_status=${data.shiprocketStatus || ''},
        shiprocket_pickup_status=${data.shiprocketPickupStatus || ''},
        shiprocket_courier_status=${data.shiprocketCourierStatus || ''}
    WHERE id=${id}
    RETURNING *
  `;

  return mapOrder(r[0]);
}

export async function updateOrderStatus(id,status){await ensureSchema();const r=status==='DELIVERED'?await getSql()`UPDATE orders SET order_status=${status},delivered_at=COALESCE(delivered_at,NOW()) WHERE id=${id} RETURNING *`:await getSql()`UPDATE orders SET order_status=${status} WHERE id=${id} RETURNING *`;return mapOrder(r[0])}
export async function requestOrderReturn(id,email,reason='',evidenceUrl=''){
  await ensureSchema();

  const r = await getSql()`
    UPDATE orders
    SET return_status='REQUESTED',
        return_requested_at=NOW(),
        return_reason=${reason},
        return_evidence_url=${evidenceUrl},
        return_rejection_reason='',
        return_resubmission_count=
          CASE
            WHEN COALESCE(return_status,'')='REJECTED'
              THEN COALESCE(return_resubmission_count,0)+1
            ELSE COALESCE(return_resubmission_count,0)
          END
    WHERE id=${id}
      AND LOWER(customer->>'email')=LOWER(${email})
      AND order_status='DELIVERED'
      AND delivered_at IS NOT NULL
      AND (
        (
          COALESCE(return_status,'')=''
          AND delivered_at>=NOW()-INTERVAL '10 days'
        )
        OR
        (
          COALESCE(return_status,'')='REJECTED'
          AND COALESCE(return_resubmission_count,0)=0
        )
      )
    RETURNING *
  `;

  return mapOrder(r[0]);
}

export async function updateOrderReturnStatus(
  id,
  returnStatus,
  rejectionReason=''
) {
  await ensureSchema();

  const allowed = [
    "REQUESTED",
    "APPROVED",
    "PICKUP",
    "RECEIVED",
    "REFUNDED",
    "REJECTED",
  ];

  const status = String(returnStatus || "").toUpperCase();
  const reason = String(rejectionReason || "").trim();

  if (!allowed.includes(status)) {
    return null;
  }

  if (status === "REJECTED" && reason.length > 500) {
    return null;
  }

  const r = status === "REJECTED"
    ? await getSql()`
        UPDATE orders
        SET return_status='REJECTED',
            return_rejection_reason=${reason}
        WHERE id=${id}
          AND COALESCE(return_status,'') <> ''
        RETURNING *
      `
    : await getSql()`
        UPDATE orders
        SET return_status=${status}
        WHERE id=${id}
          AND COALESCE(return_status,'') <> ''
        RETURNING *
      `;

  return mapOrder(r[0]);
}

export async function markRefundRequested(id, amount) {
  await ensureSchema();

  const r = await getSql()`
    UPDATE orders
    SET refund_status='PENDING',
        refund_amount=${amount},
        refund_requested_at=NOW(),
        refund_error=''
    WHERE id=${id}
      AND payment_status='PAID'
      AND payment_id<>''
      AND order_status='DELIVERED'
      AND return_status='RECEIVED'
      AND COALESCE(refund_status,'')=''
    RETURNING *
  `;

  return mapOrder(r[0]);
}

export async function updateRefundResult(id, refundStatus, refundId='', refundError='') {
  await ensureSchema();

  const status = String(refundStatus || '').toUpperCase();

  if (!['PENDING','PROCESSED','FAILED'].includes(status)) {
    return null;
  }

  const r = await getSql()`
    UPDATE orders
    SET refund_status=${status},
        refund_id=${refundId},
        refund_error=${refundError},
        refund_processed_at=${status==='PROCESSED' ? new Date() : null}
    WHERE id=${id}
    RETURNING *
  `;

  return mapOrder(r[0]);
}

export async function markManualRefundCompleted(
  id,
  amount,
  reference=''
) {
  await ensureSchema();

  const refundAmount = Number(amount);
  const refundReference = String(reference || '').trim();

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return null;
  }

  if (refundReference.length > 200) {
    return null;
  }

  const r = await getSql()`
    UPDATE orders
    SET return_status='REFUNDED',
        refund_status='PROCESSED',
        refund_amount=${refundAmount},
        refund_method='COD_MANUAL',
        refund_reference=${refundReference},
        refund_requested_at=COALESCE(refund_requested_at,NOW()),
        refund_processed_at=NOW(),
        refund_error=''
    WHERE id=${id}
      AND payment_status<>'PAID'
      AND COALESCE(payment_id,'')=''
      AND order_status='DELIVERED'
      AND return_status='RECEIVED'
      AND COALESCE(refund_status,'')=''
    RETURNING *
  `;

  return mapOrder(r[0]);
}

export async function markPayment(id,paymentStatus,paymentId=''){await ensureSchema();const r=await getSql()`UPDATE orders SET payment_status=${paymentStatus},payment_id=${paymentId} WHERE id=${id} RETURNING id`;return Boolean(r[0])}
export async function createPaymentOrderRecord(order){return createOrder(order)}
export async function createCustomer(c){await ensureSchema();const r=await getSql()`INSERT INTO customers(id,name,email,password_hash,phone) VALUES(${c.id},${c.name},${c.email.toLowerCase()},${c.passwordHash},${c.phone||''}) RETURNING id,name,email,phone`;return r[0]}

export async function findCustomerByGoogleSub(googleSub){
  await ensureSchema();
  return (await getSql()`SELECT * FROM customers WHERE google_sub=${googleSub} LIMIT 1`)[0]||null;
}

export async function createGoogleCustomer(c){
  await ensureSchema();
  const r=await getSql()`INSERT INTO customers(id,name,email,password_hash,phone,google_sub) VALUES(${c.id},${c.name},${c.email.toLowerCase()},NULL,${c.phone||''},${c.googleSub}) RETURNING id,name,email,phone`;
  return r[0];
}

export async function linkCustomerGoogle(id,googleSub){
  await ensureSchema();
  const r=await getSql()`UPDATE customers SET google_sub=${googleSub} WHERE id=${id} RETURNING id,name,email,phone`;
  return r[0]||null;
}

export async function createPasswordReset(customerId,tokenHash,expiresAt){
  await ensureSchema();
  await getSql()`DELETE FROM customer_password_resets WHERE customer_id=${customerId} AND used_at IS NULL`;
  const id=crypto.randomUUID();
  const r=await getSql()`INSERT INTO customer_password_resets(id,customer_id,token_hash,expires_at) VALUES(${id},${customerId},${tokenHash},${expiresAt}) RETURNING id,customer_id,expires_at`;
  return r[0];
}

export async function findPasswordReset(tokenHash){
  await ensureSchema();
  return (await getSql()`SELECT * FROM customer_password_resets WHERE token_hash=${tokenHash} AND used_at IS NULL AND expires_at>NOW() LIMIT 1`)[0]||null;
}

export async function consumePasswordReset(id){
  await ensureSchema();
  await getSql()`UPDATE customer_password_resets SET used_at=NOW() WHERE id=${id} AND used_at IS NULL`;
}

export async function updateCustomerPassword(id,passwordHash){
  await ensureSchema();
  await getSql()`UPDATE customers SET password_hash=${passwordHash} WHERE id=${id}`;
}

export async function findCustomerByEmail(email){await ensureSchema();return (await getSql()`SELECT * FROM customers WHERE email=${String(email).toLowerCase()} LIMIT 1`)[0]||null}
export async function getCustomer(id){await ensureSchema();return (await getSql()`SELECT id,name,email,phone,created_at FROM customers WHERE id=${id} LIMIT 1`)[0]||null}
export async function updateCustomer(id,p){await ensureSchema();return (await getSql()`UPDATE customers SET name=${p.name},phone=${p.phone||''} WHERE id=${id} RETURNING id,name,email,phone,created_at`)[0]||null}
export async function createCustomerSession(tokenHash,customerId,expiresAt){await ensureSchema();await getSql()`INSERT INTO customer_sessions(token_hash,customer_id,expires_at) VALUES(${tokenHash},${customerId},${expiresAt})`}
export async function validCustomerSession(tokenHash){if(!tokenHash)return null;await ensureSchema();return (await getSql()`SELECT customer_id FROM customer_sessions WHERE token_hash=${tokenHash} AND expires_at>NOW() LIMIT 1`)[0]?.customer_id||null}
export async function deleteCustomerSession(tokenHash){if(tokenHash){await ensureSchema();await getSql()`DELETE FROM customer_sessions WHERE token_hash=${tokenHash}`}}

export async function getCustomerAddresses(customerId){await ensureSchema();return (await getSql()`SELECT * FROM customer_addresses WHERE customer_id=${customerId} ORDER BY created_at DESC`).map(mapAddress)}
export async function createCustomerAddress(customerId,a){await ensureSchema();const id=a.id||crypto.randomUUID();const r=await getSql()`INSERT INTO customer_addresses(id,customer_id,label,name,phone,address,city,state,pincode,country) VALUES(${id},${customerId},${a.label||'HOME'},${a.name},${a.phone||''},${a.address},${a.city},${a.state||''},${a.pincode},${a.country||'India'}) RETURNING *`;return mapAddress(r[0])}
export async function updateCustomerAddress(customerId,id,a){await ensureSchema();const r=await getSql()`UPDATE customer_addresses SET label=${a.label||'HOME'},name=${a.name},phone=${a.phone||''},address=${a.address},city=${a.city},state=${a.state||''},pincode=${a.pincode},country=${a.country||'India'} WHERE id=${id} AND customer_id=${customerId} RETURNING *`;return mapAddress(r[0])}
export async function deleteCustomerAddress(customerId,id){await ensureSchema();return Boolean((await getSql()`DELETE FROM customer_addresses WHERE id=${id} AND customer_id=${customerId} RETURNING id`)[0])}
