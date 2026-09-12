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
      await db`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE TABLE IF NOT EXISTS customer_sessions (token_hash TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE TABLE IF NOT EXISTS customer_addresses (id TEXT PRIMARY KEY,customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,label TEXT NOT NULL DEFAULT 'HOME',name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',address TEXT NOT NULL,city TEXT NOT NULL,state TEXT NOT NULL DEFAULT '',pincode TEXT NOT NULL,country TEXT NOT NULL DEFAULT 'India',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
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

function mapProduct(r) { return r ? {id:r.id,name:r.name,price:Number(r.price),category:r.category,color:r.color,sizes:r.sizes||[],stock:r.stock||{},gsm:r.gsm,fabric:r.fabric,fit:r.fit,description:r.description,art:r.art,active:r.active,image:r.image||'',imagePublicId:r.image_public_id||'',createdAt:r.created_at,updatedAt:r.updated_at} : null; }
function mapOrder(o) { return o ? {id:o.id,createdAt:o.created_at,customer:o.customer,items:o.items,total:Number(o.total),paymentStatus:o.payment_status,orderStatus:o.order_status,paymentOrderId:o.payment_order_id,paymentId:o.payment_id} : null; }
function mapAddress(a) { return a ? {id:a.id,label:a.label,name:a.name,phone:a.phone,address:a.address,city:a.city,state:a.state,pincode:a.pincode,country:a.country,createdAt:a.created_at} : null; }

export async function getProducts(){await ensureSchema();return (await getSql()`SELECT * FROM products ORDER BY created_at ASC`).map(mapProduct)}
export async function getActiveProducts(){await ensureSchema();return (await getSql()`SELECT * FROM products WHERE active=TRUE ORDER BY created_at ASC`).map(mapProduct)}
export async function getProduct(id){await ensureSchema();return mapProduct((await getSql()`SELECT * FROM products WHERE id=${id} LIMIT 1`)[0])}
export async function createProduct(p){await ensureSchema();return mapProduct((await getSql()`INSERT INTO products (id,name,price,category,color,sizes,stock,gsm,fabric,fit,description,art,active,image,image_public_id) VALUES (${p.id},${p.name},${p.price},${p.category},${p.color},${JSON.stringify(p.sizes)}::jsonb,${JSON.stringify(p.stock)}::jsonb,${p.gsm},${p.fabric},${p.fit},${p.description},${p.art},${p.active},${p.image},${p.imagePublicId||''}) RETURNING *`)[0])}
export async function updateProduct(id,p){await ensureSchema();return mapProduct((await getSql()`UPDATE products SET name=${p.name},price=${p.price},category=${p.category},color=${p.color},sizes=${JSON.stringify(p.sizes)}::jsonb,stock=${JSON.stringify(p.stock)}::jsonb,gsm=${p.gsm},fabric=${p.fabric},fit=${p.fit},description=${p.description},art=${p.art},active=${p.active},image=${p.image},image_public_id=${p.imagePublicId||''},updated_at=NOW() WHERE id=${id} RETURNING *`)[0])}
export async function deleteProduct(id){await ensureSchema();return Boolean((await getSql()`DELETE FROM products WHERE id=${id} RETURNING id`)[0])}
export async function decrementStock(items){await ensureSchema();const db=getSql();for(const i of items||[]){if(i.custom)continue;const p=await getProduct(i.id);if(!p)continue;const stock={...p.stock};stock[i.size]=Math.max(0,Number(stock[i.size]||0)-Number(i.qty||1));await db`UPDATE products SET stock=${JSON.stringify(stock)}::jsonb,updated_at=NOW() WHERE id=${i.id}`}}
export async function createSession(tokenHash,expiresAt){await ensureSchema();await getSql()`DELETE FROM admin_sessions WHERE expires_at<=NOW()`;await getSql()`INSERT INTO admin_sessions(token_hash,expires_at) VALUES(${tokenHash},${expiresAt})`}
export async function validSession(tokenHash){if(!tokenHash)return false;await ensureSchema();return Boolean((await getSql()`SELECT 1 FROM admin_sessions WHERE token_hash=${tokenHash} AND expires_at>NOW() LIMIT 1`)[0])}
export async function deleteSession(tokenHash){if(tokenHash){await ensureSchema();await getSql()`DELETE FROM admin_sessions WHERE token_hash=${tokenHash}`}}
export async function getOrders(){await ensureSchema();return (await getSql()`SELECT * FROM orders ORDER BY created_at DESC`).map(mapOrder)}
export async function getOrder(id){await ensureSchema();return mapOrder((await getSql()`SELECT * FROM orders WHERE id=${id} LIMIT 1`)[0])}
export async function createOrder(order){await ensureSchema();const rows=await getSql()`INSERT INTO orders(id,customer,items,total,payment_status,order_status,payment_order_id,payment_id) VALUES(${order.id},${JSON.stringify(order.customer)}::jsonb,${JSON.stringify(order.items)}::jsonb,${order.total},${order.paymentStatus||'PENDING'},${order.orderStatus||'NEW'},${order.paymentOrderId||''},${order.paymentId||''}) RETURNING id`;return rows[0].id}
export async function updateOrderStatus(id,status){await ensureSchema();const r=await getSql()`UPDATE orders SET order_status=${status} WHERE id=${id} RETURNING *`;return mapOrder(r[0])}
export async function markPayment(id,paymentStatus,paymentId=''){await ensureSchema();const r=await getSql()`UPDATE orders SET payment_status=${paymentStatus},payment_id=${paymentId} WHERE id=${id} RETURNING id`;return Boolean(r[0])}
export async function createPaymentOrderRecord(order){return createOrder(order)}
export async function createCustomer(c){await ensureSchema();const r=await getSql()`INSERT INTO customers(id,name,email,password_hash,phone) VALUES(${c.id},${c.name},${c.email.toLowerCase()},${c.passwordHash},${c.phone||''}) RETURNING id,name,email,phone`;return r[0]}
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
