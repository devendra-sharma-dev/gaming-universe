# Email OTP authentication

For a hosted test deployment of both frontend and backend on Vercel, see [DEPLOYMENT.md](DEPLOYMENT.md). Local development instructions below still apply.

## Configure delivery

The backend sends email through Nodemailer SMTP. Fill in the following entries in the root `.env` (blank entries were added without changing existing values):

```dotenv
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=Gaming Universe <verified-sender@example.com>
```

Port 587 requires STARTTLS; port 465 uses TLS from the start. The sender must be allowed by your provider. See [Nodemailer SMTP configuration](https://nodemailer.com/smtp). Credentials and OTPs are never returned to the browser or logged. SMTP failures return an error; there is no fake successful delivery or console-code fallback.

Restart the backend with `npm.cmd run dev`. Keep the frontend on the origin configured by `FRONTEND_ORIGIN` (normally `http://localhost:3000`). Use the same hostname for every tab; localhost and 127.0.0.1 are separate origins.

## Account flow

1. Enter an email. Addresses are trimmed and lowercased.
2. Receive and enter a six-digit code. It expires after five minutes, permits five verification attempts, and can be used once. Resending has a 60-second cooldown; IP rate limits also apply.
3. An existing email signs into its existing account with its database XP.
4. A new email opens the username form. Availability is checked while typing. Names use 3–20 letters, digits, or underscores and are unique without regard to case. Database unique indexes enforce uniqueness even for simultaneous submissions.
5. Save the username to create the account. Email is taken from the server's verified session; client-supplied email, XP, and verification flags cannot create or modify account balances.

Passwords, password reset, and mobile OTP endpoints are no longer part of sign-in. Existing mobile-only records are retained, including their XP and usernames. They need a separately verified email association before they can use email login. The application does not infer ownership from a matching username or merge accounts automatically.

## Open-tab sessions

All five pages load `frontend/js/session.js`. A random token is stored in sessionStorage and shared only with live same-origin tabs through BroadcastChannel. Web Locks serialize simultaneous tab initialization. The server binds the login cookie to a hash of that token, and both HTTP requests and Socket.IO connections must present it.

Reloads and navigation retain the token. Opening another tab while a site tab remains open shares the session. Closing all site tabs and opening a fresh tab creates a new token, so an old cookie cannot restore access. Login and logout notify the other open tabs to reload their identity. Browser features that explicitly restore closed tabs or recover a crashed browser may also restore sessionStorage; this is a browser-controlled exception to normal tab-close behavior. If storage/BroadcastChannel is disabled, cross-tab continuity may be unavailable.

The cookie has no persistent maxAge. Expired/disconnected session documents are eventually removed by the MongoDB session store. Socket packets revalidate saved sessions so an old game connection cannot continue authenticated actions after logout.

## Guest XP

Word Bomb remains available without an account. Guest winners receive a displayed 30 XP reward in memory, marked as not saved. No guest reward is written to a User document or sent in the login/registration payload. After login, the frontend loads the account's actual database XP. Existing login requirements for the other games remain in place. Solo streak scoring rules are unchanged.

## Verification

```powershell
npm.cmd test
npm.cmd run test:auth
```

The authentication suite starts temporary MongoDB and frontend/API servers, uses mocked SMTP delivery, and drives a headless Edge browser. It never uses the database or email credentials in `.env`. The first run may download a MongoDB test binary. Set `TEST_BROWSER_CHANNEL=chrome` to use installed Chrome instead of Edge.

The suite covers email normalization, OTP replay and attempt limits, mail failure, unique usernames, returning accounts, saved XP, protected game access, refresh/navigation, multiple tabs, close/reopen, logout synchronization, and unsaved guest rewards. Real inbox delivery still needs validation with your configured provider.
