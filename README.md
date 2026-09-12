# AVANCY COLLECTIVES — V4

V4 is the database-backed Avancy storefront/admin foundation with Cloudinary product-image storage.

## Included
- Next.js App Router + React
- Neon PostgreSQL catalogue, sessions and orders
- Admin login with database-backed sessions
- Add/edit/delete products
- Product sizes and per-size stock
- Active/draft visibility
- Larger, easier-to-read admin product forms
- Cloudinary product image upload from the admin panel
- Cloudinary image replacement/removal and cleanup on product deletion
- Product detail page fixed to await the Neon query
- Customer shop, product page, cart and checkout
- Server-side checkout price/stock validation from the database
- Admin order list
- Health endpoint for database verification

## 1. Open the project
Extract this folder to your Linux development storage and open the `avancy-v4` folder in VS Code.

## 2. Create `.env.local`
Copy `.env.example` to `.env.local` and fill in your Neon and Cloudinary credentials.

Do not commit or share `.env.local`. Next.js loads `.env.local` automatically, and variables without `NEXT_PUBLIC_` stay server-side. See the Next.js environment-variable guide.

Required:
- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Cloudinary uploads are performed by the server using the Node SDK. The API secret never goes to the browser.

## 3. Install

```bash
npm install
```

## 4. Run

```bash
npm run dev
```

Open:
- Store: http://localhost:3000
- Shop: http://localhost:3000/shop
- Admin: http://localhost:3000/admin/login
- Health: http://localhost:3000/api/health

## 5. First test
Open `/api/health`. You want:

```json
{"ok":true,"database":"connected"}
```

Then log in and test:
1. Existing product opens.
2. Edit price and save.
3. Add a test product.
4. Upload a product image to Cloudinary.
5. Confirm the image appears in the product page.
6. Edit the image and replace it.
7. Delete the test product and confirm it disappears.
8. Add the product to cart and place a test order.
9. Confirm the order in Admin → Orders.

## Cloudinary notes
V4 uses a server-side Cloudinary upload route. The SDK supports server-side uploads and secure delivery URLs. Uploaded product assets are stored under `avancy/products`.

The app accepts JPG, PNG, WEBP and GIF up to 8 MB. Cloudinary credentials must remain in `.env.local` and must not be prefixed with `NEXT_PUBLIC_`.

## External USB/pendrive Linux storage
The project can live on your mounted external Linux storage. Keep the project path inside a writable filesystem. Before installing dependencies, verify:

```bash
pwd
touch test.txt
rm test.txt
```

If `touch` says `Read-only file system`, fix the Linux storage/container first; npm cannot repair a read-only filesystem.

Then:

```bash
npm install
npm run dev
```

## Production work still required before real sales
- Razorpay/UPI payment verification
- Atomic stock reservation/decrement for concurrent orders
- Stronger production authentication and rate limiting
- Customer accounts if desired
- Shipping/tracking integration
- Production deployment and domain
- Backups/monitoring
