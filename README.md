# Ittadi Store

Ittadi is a full-width Next.js storefront with customer accounts, Google sign-in, cash-on-delivery orders, delivery tracking, support chat, product announcements, optional browser push, and a password-protected admin studio.

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
```

In Google Cloud Console, create a Web OAuth client, add your site origin to authorized JavaScript origins, and add `/api/auth/google/callback` to authorized redirect URIs. Use your production HTTPS URL in the production `GOOGLE_REDIRECT_URI`.

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Browser push requires HTTPS in production and is opt-in: a customer must enable notifications in their browser. Product announcements also stay available in the in-app notifications panel.

## Store and order flow

- Customers can register with email/password or Google, save a delivery address, and explicitly request browser location access.
- Checkout uses cash on delivery. Orders use current database prices and atomically reserve stock; order status changes appear in the customer account.
- Customers can chat with support. Admin replies appear in the customer conversation, and customer details, orders, and conversations are available in `/admin`.
- Double-click or double-tap the store logo for admin sign-in, or open `/admin` directly. Product write APIs require the signed admin session. Admin sign-in itself does not depend on MongoDB; product/customer/order data does.
- Product images can be supplied as HTTPS URLs. Social links at the top currently point to the Facebook and Instagram sites; replace them with Ittadi's profile URLs when available.

## Commands

```sh
npm run build
npm run lint
```
