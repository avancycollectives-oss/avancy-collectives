import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

let sql;
let schemaPromise;

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing. Add it to .env.local.");
  if (!sql) sql = neon(process.env.DATABASE_URL);
  return sql;
}


export async function getAdminPasswordHash(){
  await ensureSchema();
  return (await getSql()`
    SELECT password_hash
    FROM admin_credentials
    WHERE id=1
    LIMIT 1
  `)[0]?.password_hash || "";
}

export async function setAdminPasswordHash(passwordHash){
  await ensureSchema();
  await getSql()`
    INSERT INTO admin_credentials(id,password_hash,updated_at)
    VALUES(1,${passwordHash},NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      password_hash=EXCLUDED.password_hash,
      updated_at=NOW()
  `;
}

export async function getAdminTwoFactor(){
  await ensureSchema();

  return (await getSql()`
    SELECT
      two_factor_enabled,
      two_factor_secret,
      two_factor_backup_codes
    FROM admin_credentials
    WHERE id=1
    LIMIT 1
  `)[0] || {
    two_factor_enabled: false,
    two_factor_secret: "",
    two_factor_backup_codes: [],
  };
}

export async function setAdminTwoFactor({
  enabled,
  secret,
  backupCodes,
}){
  await ensureSchema();

  await getSql()`
    UPDATE admin_credentials
    SET
      two_factor_enabled=${Boolean(enabled)},
      two_factor_secret=${secret || ""},
      two_factor_backup_codes=${JSON.stringify(
        backupCodes || []
      )}::jsonb,
      updated_at=NOW()
    WHERE id=1
  `;
}

export async function createAdminLoginChallenge({
  email,
  purpose,
  pendingSecret="",
}){
  await ensureSchema();

  const token = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const expiresAt =
    new Date(Date.now() + 10 * 60 * 1000);

  await getSql()`
    DELETE FROM admin_login_challenges
    WHERE email=${email}
       OR expires_at < NOW()
  `;

  await getSql()`
    INSERT INTO admin_login_challenges(
      token_hash,
      email,
      purpose,
      pending_secret,
      expires_at
    )
    VALUES(
      ${tokenHash},
      ${email},
      ${purpose},
      ${pendingSecret || ""},
      ${expiresAt}
    )
  `;

  return token;
}

export async function getAdminLoginChallenge(token){
  await ensureSchema();

  if (!token) return null;

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return (await getSql()`
    SELECT
      token_hash,
      email,
      purpose,
      pending_secret,
      attempts,
      expires_at
    FROM admin_login_challenges
    WHERE token_hash=${tokenHash}
      AND expires_at > NOW()
    LIMIT 1
  `)[0] || null;
}

export async function incrementAdminLoginChallengeAttempts(token){
  await ensureSchema();

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const result = await getSql()`
    UPDATE admin_login_challenges
    SET attempts=attempts+1
    WHERE token_hash=${tokenHash}
      AND expires_at > NOW()
    RETURNING attempts
  `;

  return Number(result[0]?.attempts || 0);
}

export async function deleteAdminLoginChallenge(token){
  await ensureSchema();

  if (!token) return;

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  await getSql()`
    DELETE FROM admin_login_challenges
    WHERE token_hash=${tokenHash}
  `;
}

export async function consumeAdminBackupCode(codeHash){
  await ensureSchema();

  const current = await getAdminTwoFactor();

  const codes = Array.isArray(
    current.two_factor_backup_codes
  )
    ? current.two_factor_backup_codes
    : [];

  if (!codes.includes(codeHash)) {
    return false;
  }

  const remaining = codes.filter(
    (value) => value !== codeHash
  );

  await getSql()`
    UPDATE admin_credentials
    SET
      two_factor_backup_codes=
        ${JSON.stringify(remaining)}::jsonb,
      updated_at=NOW()
    WHERE id=1
  `;

  return true;
}

export async function deleteAllAdminSessions(){
  await ensureSchema();
  await getSql()`DELETE FROM admin_sessions`;
}

export async function ensureSchema() {
  if (!schemaPromise) {
    const db = getSql();
    schemaPromise = (async () => {
      await db`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY,name TEXT NOT NULL,price INTEGER NOT NULL DEFAULT 0,category TEXT NOT NULL DEFAULT 'SIGNATURE',color TEXT NOT NULL DEFAULT 'Black',sizes JSONB NOT NULL DEFAULT '[]'::jsonb,stock JSONB NOT NULL DEFAULT '{}'::jsonb,gsm TEXT NOT NULL DEFAULT '',fabric TEXT NOT NULL DEFAULT '',fit TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',art TEXT NOT NULL DEFAULT 'AVNC',active BOOLEAN NOT NULL DEFAULT TRUE,image TEXT NOT NULL DEFAULT '',image_public_id TEXT NOT NULL DEFAULT '',images JSONB NOT NULL DEFAULT '[]'::jsonb,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE TABLE IF NOT EXISTS collective_submissions (
        id TEXT PRIMARY KEY,
        product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
        customer_name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        image_public_id TEXT NOT NULL DEFAULT '',
        website_consent BOOLEAN NOT NULL DEFAULT FALSE,
        instagram_consent BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'PENDING',
        rejection_reason TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        instagram_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
        instagram_media_id TEXT NOT NULL DEFAULT '',
        instagram_published_at TIMESTAMPTZ,
        instagram_post_number INTEGER,
        instagram_error TEXT NOT NULL DEFAULT ''
      )`;
      await db`ALTER TABLE collective_submissions ADD COLUMN IF NOT EXISTS instagram_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED'`;
      await db`ALTER TABLE collective_submissions ADD COLUMN IF NOT EXISTS instagram_media_id TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE collective_submissions ADD COLUMN IF NOT EXISTS instagram_published_at TIMESTAMPTZ`;
      await db`ALTER TABLE collective_submissions ADD COLUMN IF NOT EXISTS instagram_post_number INTEGER`;
      await db`ALTER TABLE collective_submissions ADD COLUMN IF NOT EXISTS instagram_error TEXT NOT NULL DEFAULT ''`;
      await db`CREATE UNIQUE INDEX IF NOT EXISTS collective_instagram_post_number_idx ON collective_submissions(instagram_post_number) WHERE instagram_post_number IS NOT NULL`;
      await db`CREATE SEQUENCE IF NOT EXISTS collective_instagram_post_seq START WITH 1`;
      await db`CREATE INDEX IF NOT EXISTS collective_status_idx ON collective_submissions(status,created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS collective_product_idx ON collective_submissions(product_id,status,created_at DESC)`;
      await db`CREATE TABLE IF NOT EXISTS admin_credentials (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
      await db`ALTER TABLE admin_credentials ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
      await db`ALTER TABLE admin_credentials ADD COLUMN IF NOT EXISTS two_factor_secret TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE admin_credentials ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb`;

      await db`CREATE TABLE IF NOT EXISTS admin_login_challenges (
        token_hash TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        purpose TEXT NOT NULL,
        pending_secret TEXT NOT NULL DEFAULT '',
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;

      await db`CREATE INDEX IF NOT EXISTS admin_login_challenges_expires_idx
        ON admin_login_challenges(expires_at)`;
      await db`CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await db`CREATE INDEX IF NOT EXISTS push_subscriptions_updated_idx ON push_subscriptions(updated_at DESC)`;
      await db`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),customer JSONB NOT NULL,items JSONB NOT NULL,total INTEGER NOT NULL DEFAULT 0,payment_status TEXT NOT NULL DEFAULT 'PENDING',order_status TEXT NOT NULL DEFAULT 'NEW',payment_order_id TEXT NOT NULL DEFAULT '',payment_id TEXT NOT NULL DEFAULT '')`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER NOT NULL DEFAULT 0`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_amount INTEGER NOT NULL DEFAULT 0`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_amount INTEGER NOT NULL DEFAULT 0`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS free_shipping_offer BOOLEAN NOT NULL DEFAULT FALSE`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS free_shipping_slot INTEGER`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_courier_name TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_rate INTEGER NOT NULL DEFAULT 0`;
      await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_etd TEXT NOT NULL DEFAULT ''`;
      await db`CREATE TABLE IF NOT EXISTS order_free_shipping_slots (slot_number INTEGER PRIMARY KEY,order_id TEXT UNIQUE REFERENCES orders(id) ON DELETE SET NULL)`;
      await db`INSERT INTO order_free_shipping_slots(slot_number) VALUES(1),(2),(3),(4),(5) ON CONFLICT (slot_number) DO NOTHING`;

      /*
       * Customer-specific first-five free-shipping promotion.
       *
       * Each customer gets slots 1-5 independently.
       * Email is normalized because guest checkout and account
       * checkout both currently identify customers by email.
       */
      await db`CREATE TABLE IF NOT EXISTS customer_free_shipping_slots (
        customer_email TEXT NOT NULL,
        slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 5),
        order_id TEXT UNIQUE REFERENCES orders(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (customer_email, slot_number)
      )`;

      await db`ALTER TABLE customer_free_shipping_slots
        ALTER COLUMN order_id DROP NOT NULL`;

      await db`CREATE INDEX IF NOT EXISTS customer_free_shipping_email_idx
        ON customer_free_shipping_slots(customer_email)`;

      /*
       * Preserve any already-consumed global first-five promotion
       * slots by migrating existing free-shipping orders into the
       * customer-specific ledger.
       */
      await db`
        WITH existing AS (
          SELECT
            id AS order_id,
            LOWER(TRIM(customer->>'email')) AS customer_email,
            ROW_NUMBER() OVER (
              PARTITION BY LOWER(TRIM(customer->>'email'))
              ORDER BY created_at ASC, id ASC
            )::INTEGER AS slot_number
          FROM orders
          WHERE free_shipping_offer=TRUE
            AND COALESCE(TRIM(customer->>'email'),'') <> ''
        )
        INSERT INTO customer_free_shipping_slots(
          customer_email,
          slot_number,
          order_id
        )
        SELECT
          customer_email,
          slot_number,
          order_id
        FROM existing
        WHERE slot_number BETWEEN 1 AND 5
        ON CONFLICT DO NOTHING
      `;
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
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS size_measurements JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code TEXT NOT NULL DEFAULT ''`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS price_includes_gst BOOLEAN NOT NULL DEFAULT FALSE`;
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS product_weight NUMERIC(8,3) NOT NULL DEFAULT 0`;
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
      await db`CREATE TABLE IF NOT EXISTS customer_password_resets (id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,token_hash TEXT UNIQUE NOT NULL,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ,attempts INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`ALTER TABLE customer_password_resets ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0`;
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
      await db`ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb`;
      await db`CREATE INDEX IF NOT EXISTS products_active_idx ON products(active)`;
      await db`CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC)`;
      await db`CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx ON customer_addresses(customer_id,created_at DESC)`;
      // Test product seed disabled.
      // Products will be added manually through the Admin panel.
    })().catch(e => { schemaPromise = undefined; throw e; });
  }
  return schemaPromise;
}

function mapProduct(r) {
  if (!r) return null;

  let images = Array.isArray(r.images) ? r.images : [];

  images = images
    .filter(Boolean)
    .map(item => ({
      url: String(item?.url || item?.image || '').trim(),
      publicId: String(item?.publicId || item?.imagePublicId || '').trim(),
    }))
    .filter(item => item.url);

  if (r.image && !images.some(item => item.url === r.image)) {
    images.unshift({
      url: r.image,
      publicId: r.image_public_id || '',
    });
  }

  return {
    id:r.id,
    name:r.name,
    price:Number(r.price),
    category:r.category,
    color:r.color,
    sizes:r.sizes||[],
    stock:r.stock||{},
    sizeMeasurements:r.size_measurements||{},
    gstRate:Number(r.gst_rate||0),
    hsnCode:r.hsn_code||'',
    priceIncludesGst:Boolean(r.price_includes_gst),
    productWeight:Number(r.product_weight||0),
    gsm:r.gsm,
    fabric:r.fabric,
    fit:r.fit,
    description:r.description,
    art:r.art,
    active:r.active,
    image:r.image||'',
    imagePublicId:r.image_public_id||'',
    images,
    shippingWeight:Number(r.shipping_weight||0),
    shippingLength:Number(r.shipping_length||0),
    shippingBreadth:Number(r.shipping_breadth||0),
    shippingHeight:Number(r.shipping_height||0),
    createdAt:r.created_at,
    updatedAt:r.updated_at
  };
}
function mapOrder(o) { return o ? {id:o.id,createdAt:o.created_at,deliveredAt:o.delivered_at,subtotal:Number(o.subtotal||0),shippingAmount:Number(o.shipping_amount||0),gstAmount:Number(o.gst_amount||0),freeShippingOffer:Boolean(o.free_shipping_offer),freeShippingSlot:o.free_shipping_slot==null?null:Number(o.free_shipping_slot),shippingCourierName:o.shipping_courier_name||'',shippingRate:Number(o.shipping_rate||0),shippingEtd:o.shipping_etd||'',returnStatus:o.return_status||'',returnRequestedAt:o.return_requested_at,returnReason:o.return_reason||'',returnEvidenceUrl:o.return_evidence_url||'',returnRejectionReason:o.return_rejection_reason||'',returnResubmissionCount:Number(o.return_resubmission_count||0),customer:o.customer,items:o.items,total:Number(o.total),paymentStatus:o.payment_status,orderStatus:o.order_status,paymentOrderId:o.payment_order_id,paymentId:o.payment_id,refundStatus:o.refund_status||'',refundId:o.refund_id||'',refundAmount:Number(o.refund_amount||0),refundRequestedAt:o.refund_requested_at,refundMethod:o.refund_method||'',refundReference:o.refund_reference||'',refundProcessedAt:o.refund_processed_at,refundError:o.refund_error||'',shiprocketOrderId:o.shiprocket_order_id||'',shiprocketShipmentId:o.shiprocket_shipment_id||'',shiprocketAwbCode:o.shiprocket_awb_code||'',shiprocketCourierName:o.shiprocket_courier_name||'',shiprocketStatus:o.shiprocket_status||'',shiprocketPickupStatus:o.shiprocket_pickup_status||'',shiprocketCourierStatus:o.shiprocket_courier_status||''} : null; }
function mapAddress(a) { return a ? {id:a.id,label:a.label,name:a.name,phone:a.phone,address:a.address,city:a.city,state:a.state,pincode:a.pincode,country:a.country,createdAt:a.created_at} : null; }


function mapCollectiveSubmission(r) {
  if (!r) return null;

  return {
    id: r.id,
    productId: r.product_id || '',
    productName: r.product_name || '',
    customerName: r.customer_name || '',
    imageUrl: r.image_url || '',
    imagePublicId: r.image_public_id || '',
    websiteConsent: Boolean(r.website_consent),
    instagramConsent: Boolean(r.instagram_consent),
    status: r.status || 'PENDING',
    rejectionReason: r.rejection_reason || '',
    createdAt: r.created_at,
    approvedAt: r.approved_at || null,
    instagramStatus: r.instagram_status || 'NOT_REQUESTED',
    instagramMediaId: r.instagram_media_id || '',
    instagramPublishedAt: r.instagram_published_at || null,
    instagramPostNumber:
      r.instagram_post_number == null
        ? null
        : Number(r.instagram_post_number),
    instagramError: r.instagram_error || '',
  };
}

export async function getProducts(){await ensureSchema();return (await getSql()`SELECT * FROM products ORDER BY created_at ASC`).map(mapProduct)}
export async function getActiveProducts(){await ensureSchema();return (await getSql()`SELECT * FROM products WHERE active=TRUE ORDER BY created_at ASC`).map(mapProduct)}
export async function getProduct(id){await ensureSchema();return mapProduct((await getSql()`SELECT * FROM products WHERE id=${id} LIMIT 1`)[0])}
export async function createProduct(p){
  await ensureSchema();

  const images = Array.isArray(p.images)
    ? p.images.slice(0,5).filter(Boolean)
    : [];

  return mapProduct((await getSql()`INSERT INTO products
    (id,name,price,category,color,sizes,stock,size_measurements,gst_rate,hsn_code,
     price_includes_gst,product_weight,gsm,fabric,fit,description,art,active,
     image,image_public_id,images,shipping_weight,shipping_length,shipping_breadth,shipping_height)
    VALUES
    (${p.id},${p.name},${p.price},${p.category},${p.color},
     ${JSON.stringify(p.sizes)}::jsonb,
     ${JSON.stringify(p.stock)}::jsonb,
     ${JSON.stringify(p.sizeMeasurements||{})}::jsonb,
     ${p.gstRate||0},
     ${p.hsnCode||''},
     ${p.priceIncludesGst===true},
     ${p.productWeight||0},
     ${p.gsm},
     ${p.fabric},
     ${p.fit},
     ${p.description},
     ${p.art},
     ${p.active},
     ${p.image},
     ${p.imagePublicId||''},
     ${JSON.stringify(images)}::jsonb,
     ${p.shippingWeight||0},
     ${p.shippingLength||0},
     ${p.shippingBreadth||0},
     ${p.shippingHeight||0})
    RETURNING *`)[0]);
}
export async function updateProduct(id,p){
  await ensureSchema();

  const images = Array.isArray(p.images)
    ? p.images.slice(0,5).filter(Boolean)
    : [];

  return mapProduct((await getSql()`UPDATE products SET
    name=${p.name},
    price=${p.price},
    category=${p.category},
    color=${p.color},
    sizes=${JSON.stringify(p.sizes)}::jsonb,
    stock=${JSON.stringify(p.stock)}::jsonb,
    size_measurements=${JSON.stringify(p.sizeMeasurements||{})}::jsonb,
    gst_rate=${p.gstRate||0},
    hsn_code=${p.hsnCode||''},
    price_includes_gst=${p.priceIncludesGst===true},
    product_weight=${p.productWeight||0},
    gsm=${p.gsm},
    fabric=${p.fabric},
    fit=${p.fit},
    description=${p.description},
    art=${p.art},
    active=${p.active},
    image=${p.image},
    image_public_id=${p.imagePublicId||''},
    images=${JSON.stringify(images)}::jsonb,
    shipping_weight=${p.shippingWeight||0},
    shipping_length=${p.shippingLength||0},
    shipping_breadth=${p.shippingBreadth||0},
    shipping_height=${p.shippingHeight||0},
    updated_at=NOW()
    WHERE id=${id}
    RETURNING *`)[0]);
}
export async function deleteProduct(id){await ensureSchema();return Boolean((await getSql()`DELETE FROM products WHERE id=${id} RETURNING id`)[0])}
export async function decrementStock(items){await ensureSchema();const db=getSql();for(const i of items||[]){if(i.custom)continue;const p=await getProduct(i.id);if(!p)continue;const stock={...p.stock};stock[i.size]=Math.max(0,Number(stock[i.size]||0)-Number(i.qty||1));await db`UPDATE products SET stock=${JSON.stringify(stock)}::jsonb,updated_at=NOW() WHERE id=${i.id}`}}
export async function createSession(tokenHash,expiresAt){await ensureSchema();await getSql()`DELETE FROM admin_sessions WHERE expires_at<=NOW()`;await getSql()`INSERT INTO admin_sessions(token_hash,expires_at) VALUES(${tokenHash},${expiresAt})`}
export async function validSession(tokenHash){if(!tokenHash)return false;await ensureSchema();return Boolean((await getSql()`SELECT 1 FROM admin_sessions WHERE token_hash=${tokenHash} AND expires_at>NOW() LIMIT 1`)[0])}

export async function savePushSubscription(subscription,userAgent=''){
  await ensureSchema();
  const endpoint=String(subscription?.endpoint||'').trim();
  const p256dh=String(subscription?.keys?.p256dh||'').trim();
  const auth=String(subscription?.keys?.auth||'').trim();

  if(!endpoint||!p256dh||!auth){
    throw new Error('Invalid push subscription.');
  }

  const id=crypto.randomUUID();

  const r=await getSql()`
    INSERT INTO push_subscriptions(
      id,endpoint,p256dh,auth,user_agent,created_at,updated_at
    )
    VALUES(
      ${id},${endpoint},${p256dh},${auth},${String(userAgent||'').slice(0,1000)},NOW(),NOW()
    )
    ON CONFLICT(endpoint)
    DO UPDATE SET
      p256dh=EXCLUDED.p256dh,
      auth=EXCLUDED.auth,
      user_agent=EXCLUDED.user_agent,
      updated_at=NOW()
    RETURNING id,endpoint,p256dh,auth,user_agent,created_at,updated_at
  `;

  return r[0]||null;
}

export async function deletePushSubscription(endpoint){
  await ensureSchema();
  const value=String(endpoint||'').trim();
  if(!value)return false;

  return Boolean(
    (await getSql()`
      DELETE FROM push_subscriptions
      WHERE endpoint=${value}
      RETURNING id
    `)[0]
  );
}

export async function getPushSubscriptions(){
  await ensureSchema();

  return await getSql()`
    SELECT id,endpoint,p256dh,auth,user_agent,created_at,updated_at
    FROM push_subscriptions
    ORDER BY updated_at DESC
  `;
}

export async function deletePushSubscriptionById(id){
  await ensureSchema();
  const value=String(id||'').trim();
  if(!value)return false;

  return Boolean(
    (await getSql()`
      DELETE FROM push_subscriptions
      WHERE id=${value}
      RETURNING id
    `)[0]
  );
}

export async function deleteSession(tokenHash){if(tokenHash){await ensureSchema();await getSql()`DELETE FROM admin_sessions WHERE token_hash=${tokenHash}`}}
export async function getOrders(){await ensureSchema();return (await getSql()`SELECT * FROM orders ORDER BY created_at DESC`).map(mapOrder)}
export async function getOrder(id){await ensureSchema();return mapOrder((await getSql()`SELECT * FROM orders WHERE id=${id} LIMIT 1`)[0])}
export async function deleteOrder(id){
  await ensureSchema();

  const rows = await getSql()`
    DELETE FROM orders
    WHERE id=${id}
    RETURNING id
  `;

  return rows[0]?.id || null;
}
export async function getOrderByPaymentId(paymentId){await ensureSchema();return mapOrder((await getSql()`SELECT * FROM orders WHERE payment_id=${paymentId} LIMIT 1`)[0])}
export async function createOrder(order){
  await ensureSchema();
  const db=getSql();

  const rows=await db`
    INSERT INTO orders(
      id,customer,items,total,payment_status,order_status,
      payment_order_id,payment_id,
      subtotal,shipping_amount,gst_amount,
      free_shipping_offer,free_shipping_slot,
      shipping_courier_name,shipping_rate,shipping_etd
    )
    VALUES(
      ${order.id},
      ${JSON.stringify(order.customer)}::jsonb,
      ${JSON.stringify(order.items)}::jsonb,
      ${order.total},
      ${order.paymentStatus||'PENDING'},
      ${order.orderStatus||'NEW'},
      ${order.paymentOrderId||''},
      ${order.paymentId||''},
      ${order.subtotal||0},
      ${order.shippingAmount||0},
      ${order.gstAmount||0},
      ${Boolean(order.freeShippingOffer)},
      ${order.freeShippingSlot==null?null:order.freeShippingSlot},
      ${order.shippingCourierName||''},
      ${order.shippingRate||0},
      ${order.shippingEtd||''}
    )
    RETURNING id
  `;

  return rows[0].id;
}

function normalizeFreeShippingEmail(email){
  return String(email || '').trim().toLowerCase();
}

export async function claimFreeShippingSlot(orderId,email){
  await ensureSchema();

  const db=getSql();
  const customerEmail=normalizeFreeShippingEmail(email);

  if(!orderId || !customerEmail) return null;

  /*
   * The PRIMARY KEY(customer_email,slot_number) makes the claim
   * atomic per customer. If two simultaneous requests target the
   * same slot, one succeeds and the other retries the next slot.
   */
  for(let attempt=0;attempt<6;attempt++){
    const rows=await db`
      WITH next_slot AS (
        SELECT gs.slot_number
        FROM generate_series(1,5) AS gs(slot_number)
        WHERE NOT EXISTS (
          SELECT 1
          FROM customer_free_shipping_slots cfs
          WHERE cfs.customer_email=${customerEmail}
            AND cfs.slot_number=gs.slot_number
        )
        ORDER BY gs.slot_number
        LIMIT 1
      )
      INSERT INTO customer_free_shipping_slots(
        customer_email,
        slot_number,
        order_id
      )
      SELECT
        ${customerEmail},
        slot_number,
        ${orderId}
      FROM next_slot
      ON CONFLICT DO NOTHING
      RETURNING slot_number
    `;

    if(rows[0]?.slot_number!=null){
      return Number(rows[0].slot_number);
    }
  }

  return null;
}

export async function getFreeShippingSlotsRemaining(email){
  await ensureSchema();

  const customerEmail=normalizeFreeShippingEmail(email);

  if(!customerEmail) return 0;

  const rows=await getSql()`
    SELECT GREATEST(
      0,
      5-COUNT(*)
    )::int AS remaining
    FROM customer_free_shipping_slots
    WHERE customer_email=${customerEmail}
  `;

  return Number(rows[0]?.remaining||0);
}

export async function releaseFreeShippingSlot(orderId){
  await ensureSchema();

  const rows=await getSql()`
    DELETE FROM customer_free_shipping_slots
    WHERE order_id=${orderId}
    RETURNING slot_number
  `;

  return rows[0]?.slot_number ?? null;
}

export async function applyFreeShippingToOrder(orderId,slotNumber){
  await ensureSchema();
  const db=getSql();

  const rows=await db`
    UPDATE orders
    SET
      shipping_amount=0,
      total=subtotal,
      free_shipping_offer=TRUE,
      free_shipping_slot=${slotNumber}
    WHERE id=${orderId}
      AND payment_status='PENDING'
    RETURNING id,total,shipping_amount,free_shipping_offer,free_shipping_slot
  `;

  if(!rows[0]) return false;

  return {
    id:rows[0].id,
    total:Number(rows[0].total||0),
    shippingAmount:Number(rows[0].shipping_amount||0),
    freeShippingOffer:Boolean(rows[0].free_shipping_offer),
    freeShippingSlot:rows[0].free_shipping_slot==null
      ? null
      : Number(rows[0].free_shipping_slot)
  };
}
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

export async function updatePaymentOrderId(id,paymentOrderId){
  await ensureSchema();
  const r=await getSql()`
    UPDATE orders
    SET payment_order_id=${paymentOrderId}
    WHERE id=${id}
    RETURNING id
  `;
  return Boolean(r[0]);
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
  return (await getSql()`SELECT * FROM customer_password_resets WHERE token_hash=${tokenHash} AND used_at IS NULL AND expires_at>NOW() AND attempts<5 LIMIT 1`)[0]||null;
}

export async function incrementPasswordResetAttempts(id){
  await ensureSchema();
  await getSql()`UPDATE customer_password_resets SET attempts=attempts+1 WHERE id=${id} AND used_at IS NULL`;
}

export async function getLatestPasswordReset(customerId){
  await ensureSchema();

  return (
    await getSql()`
      SELECT *
      FROM customer_password_resets
      WHERE customer_id=${customerId}
      ORDER BY created_at DESC
      LIMIT 1
    `
  )[0]||null;
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


export async function createCollectiveSubmission(data) {
  await ensureSchema();

  const id = data.id || `COL-${crypto.randomUUID()}`;

  const r = await getSql()`INSERT INTO collective_submissions
    (id,product_id,customer_name,image_url,image_public_id,website_consent,instagram_consent,status)
    VALUES(
      ${id},
      ${data.productId || null},
      ${String(data.customerName || '').trim()},
      ${data.imageUrl},
      ${data.imagePublicId || ''},
      ${data.websiteConsent === true},
      ${data.instagramConsent === true},
      'PENDING'
    )
    RETURNING *`;

  return mapCollectiveSubmission(r[0]);
}

export async function getCollectiveSubmissions() {
  await ensureSchema();

  const rows = await getSql()`
    SELECT c.*, p.name AS product_name
    FROM collective_submissions c
    LEFT JOIN products p ON p.id = c.product_id
    ORDER BY c.created_at DESC
  `;

  return rows.map(mapCollectiveSubmission);
}

export async function getApprovedCollectiveSubmissions(productId = '') {
  await ensureSchema();

  const rows = productId
    ? await getSql()`
        SELECT c.*, p.name AS product_name
        FROM collective_submissions c
        LEFT JOIN products p ON p.id = c.product_id
        WHERE c.status='APPROVED' AND c.product_id=${productId}
        ORDER BY c.approved_at DESC NULLS LAST, c.created_at DESC
      `
    : await getSql()`
        SELECT c.*, p.name AS product_name
        FROM collective_submissions c
        LEFT JOIN products p ON p.id = c.product_id
        WHERE c.status='APPROVED'
        ORDER BY c.approved_at DESC NULLS LAST, c.created_at DESC
      `;

  return rows.map(mapCollectiveSubmission);
}


export async function deleteCollectiveSubmission(id) {
  await ensureSchema();

  const value = String(id || "").trim();

  if (!value) {
    throw new Error("Collective submission ID is required.");
  }

  const r = await getSql()`
    DELETE FROM collective_submissions
    WHERE id=${value}
    RETURNING *
  `;

  return r[0] ? mapCollectiveSubmission(r[0]) : null;
}

export async function updateCollectiveSubmissionStatus(
  id,
  status,
  rejectionReason = ''
) {
  await ensureSchema();

  const normalized = String(status || '').toUpperCase();

  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(normalized)) {
    throw new Error('Invalid Collective submission status.');
  }

  const r = normalized === 'APPROVED'
    ? await getSql()`
        UPDATE collective_submissions
        SET status='APPROVED',
            approved_at=COALESCE(approved_at,NOW()),
            rejection_reason=''
        WHERE id=${id}
        RETURNING *
      `
    : normalized === 'REJECTED'
      ? await getSql()`
          UPDATE collective_submissions
          SET status='REJECTED',
              rejection_reason=${String(rejectionReason || '').trim()}
          WHERE id=${id}
          RETURNING *
        `
      : await getSql()`
          UPDATE collective_submissions
          SET status='PENDING',
              rejection_reason='',
              approved_at=NULL
          WHERE id=${id}
          RETURNING *
        `;

  return r[0] ? mapCollectiveSubmission(r[0]) : null;
}

export async function prepareCollectiveInstagramPublish(id) {
  await ensureSchema();

  const value = String(id || '').trim();

  if (!value) {
    throw new Error('Collective submission ID is required.');
  }

  const r = await getSql()`
    UPDATE collective_submissions
    SET
      instagram_status='PENDING',
      instagram_error='',
      instagram_post_number=COALESCE(
        instagram_post_number,
        nextval('collective_instagram_post_seq')
      )
    WHERE id=${value}
      AND status='APPROVED'
      AND instagram_consent=TRUE
      AND instagram_status <> 'PUBLISHED'
    RETURNING *
  `;

  if (!r[0]) {
    return null;
  }

  const prepared = await getSql()`
    SELECT c.*, p.name AS product_name
    FROM collective_submissions c
    LEFT JOIN products p ON p.id = c.product_id
    WHERE c.id=${value}
    LIMIT 1
  `;

  return prepared[0]
    ? mapCollectiveSubmission(prepared[0])
    : mapCollectiveSubmission(r[0]);
}

export async function markCollectiveInstagramPublished(id, mediaId) {
  await ensureSchema();

  const r = await getSql()`
    UPDATE collective_submissions
    SET
      instagram_status='PUBLISHED',
      instagram_media_id=${String(mediaId || '').trim()},
      instagram_published_at=NOW(),
      instagram_error=''
    WHERE id=${String(id || '').trim()}
    RETURNING *
  `;

  return r[0] ? mapCollectiveSubmission(r[0]) : null;
}

export async function markCollectiveInstagramSkipped(id) {
  await ensureSchema();

  const r = await getSql()`
    UPDATE collective_submissions
    SET
      instagram_status='SKIPPED',
      instagram_error=''
    WHERE id=${String(id || '').trim()}
    RETURNING *
  `;

  return r[0] ? mapCollectiveSubmission(r[0]) : null;
}

export async function markCollectiveInstagramFailed(id, errorMessage) {
  await ensureSchema();

  const safeMessage = String(errorMessage || 'Instagram publishing failed.')
    .trim()
    .slice(0, 2000);

  const r = await getSql()`
    UPDATE collective_submissions
    SET
      instagram_status='FAILED',
      instagram_error=${safeMessage}
    WHERE id=${String(id || '').trim()}
    RETURNING *
  `;

  return r[0] ? mapCollectiveSubmission(r[0]) : null;
}
