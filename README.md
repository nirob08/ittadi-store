# Ittadi Store

Ittadi is a full-width Next.js storefront with customer accounts, Google sign-in, COD and online/manual wallet payment options, delivery tracking, support chat, product announcements, optional browser push, and a password-protected admin studio.

## Local setup

### Connect MongoDB Atlas

1. Sign in to MongoDB Atlas and create a project and a free cluster.
2. In **Database Access**, create a database user. This is separate from your Atlas website login. Give the user `readWrite` access to the database you will use (for example, `ittadi`).
3. In **Network Access**, add the public IP address of the computer running this app. Do not leave `0.0.0.0/0` enabled for a production deployment.
4. Open the cluster's **Connect → Drivers** page, select Node.js, and copy the connection string. Replace the username, password, and database name. If the password contains reserved URL characters such as `@`, `:`, `/`, `?`, `#`, or `%`, URL-encode it before putting it in the URI.
5. In the project root, create or edit `.env.local` and put the complete URI on one line:

   ```dotenv
   MONGODB_URI=mongodb+srv://DB_USER:URL_ENCODED_PASSWORD@cluster-address/ittadi?retryWrites=true&w=majority
   ```

   Keep this file private; never paste the URI into chat or commit it. The `.env.local` file is ignored by Git.
6. Stop the running dev server with `Ctrl+C`, then run `npm run dev` again so Next.js reloads the environment variables.
7. Open the exact URL and port printed in the terminal (for example, `http://localhost:3000`). Visit `/api/products`; a working connection returns JSON containing `"success":true`. If it fails, check the terminal for an Atlas authentication or IP access error.
8. Test customer registration and product creation after the products endpoint succeeds. Order checkout uses MongoDB transactions, so use Atlas or another MongoDB replica-set deployment; a standalone local MongoDB server does not support that flow.

### Admin password and other services

In development, the admin password defaults to `ittadi` when `ADMIN_PASSWORD` is not set. To choose another password, add `ADMIN_PASSWORD` and a long random `ADMIN_SESSION_SECRET` in `.env.local`; restart the dev server after editing. Production requires both values and does not use the development password fallback. Customer email/password accounts use the same signing secret unless `CUSTOMER_SESSION_SECRET` is set separately.

Configure Google OAuth and browser push using the variables below.

```dotenv
MONGODB_URI=mongodb+srv://<database-user>:<url-encoded-password>@<cluster>/<database>
ADMIN_PASSWORD=<strong-private-admin-password>
ADMIN_SESSION_SECRET=<long-random-secret>
CUSTOMER_SESSION_SECRET=<different-long-random-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public-key>
VAPID_PRIVATE_KEY=<vapid-private-key>
VAPID_SUBJECT=mailto:ittadi4u@gmail.com
NEXT_PUBLIC_FACEBOOK_URL=<ittadi-facebook-page-url>
NEXT_PUBLIC_INSTAGRAM_URL=<ittadi-instagram-profile-url>
APP_BASE_URL=https://www.ittadi4u.com
SSLCOMMERZ_STORE_ID=<private-merchant-store-id>
SSLCOMMERZ_STORE_PASSWORD=<private-merchant-store-password>
SSLCOMMERZ_SANDBOX=true
BKASH_MERCHANT_NUMBER=01830287623
NAGAD_MERCHANT_NUMBER=01830287623
```

In Google Cloud Console, create a Web OAuth client, add your site origin to authorized JavaScript origins, and add `/api/auth/google/callback` to authorized redirect URIs. Use your production HTTPS URL in the production `GOOGLE_REDIRECT_URI`.

SSLCOMMERZ uses its hosted checkout and validates both browser returns and IPN notifications server-side. Configure the provider's IPN listener as `https://www.ittadi4u.com/api/payments/sslcommerz/ipn`. Keep the store ID and password in private environment configuration; never put them in browser code or chat. `SSLCOMMERZ_SANDBOX` defaults to sandbox; set it to `false` only with live credentials and after testing. `APP_BASE_URL` must be the exact public HTTPS origin in production. The supplied bKash/Nagad numbers are public checkout details and can be overridden with `BKASH_MERCHANT_NUMBER` and `NAGAD_MERCHANT_NUMBER`. Until gateway credentials are present, checkout keeps SSLCOMMERZ disabled and COD/manual wallet methods available. Admins must verify manual transfers against their wallet history before confirming payment.

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Browser push requires HTTPS in production and is opt-in: a customer must enable notifications in their browser. Product announcements also stay available in the in-app notifications panel.

## Store and order flow

- Customers can open **Account** in the storefront header or **My account & orders** in the footer to visit the dedicated `/account` page, register/sign in, update their profile photo and delivery details, and review order updates. Profile photos are resized in the browser and stored with the customer record. Browser location access is always optional.
- The shopping bag is saved in the current browser and restored against live stock. Checkout shows an itemized subtotal, charges ৳70 in Dhaka and ৳120 outside Dhaka, and supports COD, manual bKash/Nagad with admin TxnID verification, or hosted SSLCOMMERZ when configured. Orders use current database prices and atomically reserve stock. Unpaid orders cannot be processed; cancelling an eligible order restores reserved stock.
- The `/policies` page explains delivery charges, the 7-day return/exchange request window for items arriving stained, broken or otherwise damaged, and payment options in Bangla and English. Customers should include the order number and clear photos when reporting damage.
- Customers can chat with support. Admin replies appear in the customer conversation, and customer details, orders, and conversations are available in `/admin`.
- Product cards open dedicated `/product/[id]` pages with touch-friendly image galleries, video, specifications, verified reviews, and same-category suggestions. The storefront, account, product, and admin headers include a light/dark theme switch; the browser saves the selection in `localStorage`.
- Double-click or double-tap the store logo for admin sign-in, or open `/admin` directly. Admins can add, edit and delete products; active-order products cannot be deleted. Product forms accept up to eight images, uploaded through the existing MongoDB GridFS media handler (not local Vercel disk), plus an optional HTTPS video URL and specifications. Individual uploads are limited to 4 MB to fit serverless request limits.
- Admins can update order status and parcel location/tracking notes. The customer account refreshes order details periodically. The customer directory supports profile/order inspection and account deletion; deletion is blocked for active orders and retains completed order records.
- Admin product, order, customer, and support lists are independently scrollable with sticky table headers where applicable; recent products, orders, customers, and conversations appear first.
- Product images can also be supplied as HTTPS URLs or local root-relative image paths. Facebook and Instagram links default to Ittadi's public profiles and can be overridden with the environment variables above.

## Commands

```sh
npm run build
npm run lint
```
