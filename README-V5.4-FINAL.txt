AVANCY COLLECTIVES — V5.4 FINAL FUNCTIONAL UI + ORDER EXPERIENCE

This package is designed to be extracted OVER the existing ~/avancy-v4 project.
It contains the customer UI, admin UI, order tracking, saved-address persistence,
custom design flow, invoice printing, and visual polish. It intentionally does not
contain .env.local or node_modules.

IMPORTANT
- Keep your existing .env.local. It contains your database, Cloudinary, admin and payment secrets.
- Keep your existing node_modules and package-lock.json.
- Extract the ZIP from inside ~/avancy-v4 so its app/, lib/, and db/ folders merge into the project.
- The runtime database schema automatically creates customer_addresses if needed.
- Existing products and Cloudinary image URLs are read from the database; ProductArt displays the stored image.

FEATURES IN THIS RELEASE
- Customer search overlay and Shop search.
- Header shows the signed-in customer's first name next to the profile icon and keeps the customer on /shop after login.
- Working customer logout returning to /shop.
- Saved addresses persist in Neon per customer, include recipient name, and appear in checkout.
- Legacy browser-only saved addresses are migrated to the account the first time they are found.
- Checkout state is editable; no fixed Tamil Nadu value.
- Customer orders auto-refresh every 15 seconds and have a manual refresh button.
- Order tracking verifies order number + checkout email.
- Tracking supports NEW, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, FAILED and REFUNDED.
- Professional invoice opens a print dialog automatically. Use the browser Print dialog's Save as PDF option.
- Admin Manage Orders retains search/filter/status controls and auto-refresh.
- Admin order detail keeps a MANAGE ORDERS link and live status selector.
- Custom design details (garment, colour, size, print position, text, graphic mark and uploaded artwork) are stored in the order and shown in Admin order detail.
- Instagram and YouTube links point to the supplied Avancy Collectives pages.
- FAQ and TikTok are not in the primary navigation/footer social controls.
- Rounded cards, hover motion, entrance animations and reduced-motion support.
- Product images use the actual stored image URL and cover the product media frame.
- Checkout has larger typography and trust/social footer.

TEST ORDER FLOW
1. npm run dev
2. Open http://localhost:3000
3. Test Shop/search/product/cart/checkout.
4. Sign in as a customer, save an address, return to checkout and confirm it appears.
5. Test COD first. For Razorpay, keep your existing RAZORPAY keys in .env.local.
6. After payment verification, /checkout/success waits 5 seconds then opens /thank-you.
7. In Admin, open Manage Orders, open an order, change status, return via MANAGE ORDERS.
8. Test PRINT / SAVE INVOICE from Admin and customer orders/tracking.
