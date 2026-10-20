# Super Admin Setup

The admin panel is part of the RoomSplit app at `/admin`. Cloudflare Workers serves the SPA and its same-origin admin API, so the same panel works in local development and on Cloudflare. Never put admin credentials or service-account keys in frontend code or commit them.

## Cloudflare secrets

Set these secrets for the Worker:

- `ADMIN_USERNAME`: a dedicated super-admin username.
- `ADMIN_PASSWORD`: a long, unique password not used for regular RoomSplit accounts.
- `ADMIN_SESSION_SECRET`: a random secret of at least 32 characters.
- `FIREBASE_SERVICE_ACCOUNT`: the complete JSON contents of the service-account key file. The Worker reads `project_id`, `client_email`, and `private_key` from this value.

Alternatively, configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` as separate secrets. Use `npx wrangler secret put SECRET_NAME` to set each value, then deploy with `npm run deploy:cloudflare`. The Firebase service account is used only by the Worker. Do not expose its key through a `VITE_` variable.

## Firebase service account

Create a service account for the RoomSplit Firebase project with Firestore document read/write permissions for `users`, `groups`, `expenses`, `messages`, `notifications`, `calls`, and `settings`. Keep the downloaded key private and remove the local copy when setup is complete.

## Use

Visit `https://YOUR_DOMAIN/admin` and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The panel supports listing, searching, creating, editing, and deleting records in the supported collections. Lists show up to 500 documents per collection. App settings are stored as documents in `settings`; define a document such as `global` to hold configuration used by the app.

For local development, create an ignored `.dev.vars` file with `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `FIREBASE_SERVICE_ACCOUNT`, then run `npm run dev`. Store the JSON value on one line, properly quoted/escaped for dotenv. This starts the Cloudflare Worker locally alongside Vite; the app is available at `http://localhost:5173/admin` unless that port is already in use. `npm run dev:cloudflare` serves the built app and Worker directly through Wrangler.

## Security notes

Admin sessions are signed, stored in an HttpOnly, SameSite=Strict cookie, and expire after 8 hours. The Worker checks the session on each data operation and only permits the supported collection names. Firestore service-account credentials remain server-side.

This protects admin endpoints; it does not replace Firestore Security Rules for regular app clients. The app currently signs clients in anonymously and performs regular app writes directly from the browser, so review and deploy Firestore Rules separately to control those operations.
