AVANCY COLLECTIVES V5.5 - PREMIUM RELEASE

This release is intended to be extracted over the existing ~/avancy-v4 project.
Keep .env.local, node_modules, package-lock.json, and existing database/payment credentials.

Key fixes:
- Razorpay verification accepts the actual Razorpay snake_case callback fields and uses timing-safe signature comparison.
- Payment success flow: after verified payment, a single confirmation/thank-you experience appears after a 5-second delay and includes order items.
- Customer profile icon opens /account; signed-in first name remains visible in the header.
- Shop product data is server-rendered for faster initial product display; product images load eagerly.
- Track Order adds a dedicated CUSTOM ORDER / PRINTING panel and supports terminal statuses.
- Customer invoices open the browser print dialog automatically and can be saved as PDF.
- Account hub is consolidated; profile/orders/address each have a direct action and address editing is supported.
- Premium motion, rounded cards, buttons, backgrounds, and footer/social treatment added across customer pages.
- Instagram and YouTube links use the supplied Avancy Collectives URLs.
- Footer includes Shop, Create Yours, About, Track Order, Account, Register, Contact, email, Shipping & Returns and trademark.

Important:
- Do not commit or replace .env.local.
- Do not delete the existing Neon/Cloudinary/Razorpay credentials.
- After extraction run: npm run dev
- A full production build could not be run in this isolated build environment because node_modules are intentionally not shipped in the release archive; server/API JavaScript was checked with Node syntax validation.
