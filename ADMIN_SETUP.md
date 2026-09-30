# Super Admin Setup

The admin panel is served at `/admin`. Its credentials and session signing key must be configured as Vercel environment variables; never put them in frontend code or commit them.

## Vercel environment variables

Configure these for the Vercel project and redeploy:

- `ADMIN_USERNAME`: a dedicated super-admin username.
- `ADMIN_PASSWORD`: a long, unique password not used for regular RoomSplit accounts.
- `ADMIN_SESSION_SECRET`: a random secret of at least 32 characters.
- `FIREBASE_PROJECT_ID`: the Firebase project ID.
- `FIREBASE_CLIENT_EMAIL`: the service account email.
- `FIREBASE_PRIVATE_KEY`: the service account private key. Store the complete PEM key and preserve or replace escaped `\\n` sequences as required by Vercel.

The Firebase service account is used only by server-side Vercel functions. Do not expose its key through a `VITE_` variable.

## Firebase service account

Create a service account for the RoomSplit Firebase project with the minimum Firestore permissions needed to manage documents in `users`, `groups`, `expenses`, `messages`, `notifications`, and `calls`. Add its JSON-key values to the Vercel variables above. Keep the downloaded key private and remove the local copy when setup is complete.

## Use

Visit `https://YOUR_DOMAIN/admin` and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The panel supports listing, searching, creating, editing, and deleting records from the supported collections. Lists show up to 500 documents per collection. User passwords, FCM tokens, and profile-photo data are omitted from the editor; when updating a user, omitted fields are preserved. To set or reset an app user's password, include a `password` field in the JSON record.

For local use, run through Vercel's development server with the same variables in an ignored `.env.local` file. Plain `vite dev` does not execute Vercel API routes.

## Security notes

Admin sessions are signed, stored in an HttpOnly, SameSite=Strict cookie, and expire after 8 hours. The admin API checks the session on every data operation and only permits the supported collection names.

This protects the new admin endpoints; it does not replace Firestore Security Rules for the existing app. The app currently signs clients in anonymously and performs regular app writes directly from the browser. Review and deploy Firestore Rules separately to control those client operations. User passwords are currently part of the app's existing Firestore user model; the admin panel intentionally never returns them in list/read responses.
