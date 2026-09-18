# Test deployment: frontend and backend on Vercel

This repository deploys both the static website and the Express/Socket.IO backend in one Vercel project. MongoDB remains an external database. No Render or Koyeb service is required.

## Create the Preview deployment

1. Push these files to your repository on a staging branch. Import the repository in Vercel and keep the Root Directory at the repository root. Select the **Other** framework preset. `vercel.json` supplies the install command, build command, output directory, function settings, and routes.
2. Use Node.js 24.x and enable Fluid Compute. This deployment uses Vercel's WebSocket beta and a 300-second function duration. Check the project's WebSocket availability if the beta requires account configuration.
3. Add the environment variables below to the **Preview** environment. Use a separate test database. Do not paste credentials into JavaScript files or commit `.env`.
4. Deploy the staging branch as a Preview deployment. If the import wizard first creates a Production deployment, leave that URL unused and create a Preview deployment from the staging branch; this is not a production release of the application.
5. Open the preview's `/api/v1/health` URL. It should report a connected database. Then open `/` and test sign-in and games.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (enables HTTPS cookies even for a test deployment) |
| `MONGODB_URI` | MongoDB Atlas connection string pointing at your test database |
| `SESSION_SECRET` | A random secret generated for this test deployment |
| `SMTP_HOST` | Your SMTP server, e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `587` for STARTTLS or `465` for TLS |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or provider app password |
| `SMTP_FROM` | Verified sender, e.g. `Gaming Universe <sender@example.com>` |

Generate the session secret locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use an Atlas cluster or another MongoDB replica set that supports transactions. The hosted multiplayer engine requires transactions for matchmaking, concurrent moves, and XP awards. Configure the database's network access for the deployment's outbound connections. The database user needs permission to create indexes and read/write the test database.

Remove any previous `PUBLIC_API_ORIGIN` setting from Vercel. The frontend build now uses its own site origin by default. Standard Vercel deployment and branch URLs are automatically allowed by the backend. `FRONTEND_ORIGIN` is only needed for a custom domain or a separately hosted frontend; set it to the exact HTTPS origin without a trailing slash.

Vercel permits outbound SMTP on 587 and 465. Gmail requires an app password, and your provider must allow the configured sender. Real inbox delivery needs verification after deployment.

## What Vercel serves

| URL | Handler |
| --- | --- |
| `/`, HTML, CSS, JavaScript | `dist/`, generated from `frontend/` |
| `/api/v1/*` | `api/index.js` exporting the Express HTTP server |
| `/socket.io/*` | The same HTTP server handling Socket.IO WebSocket upgrades |

The build includes the Word Bomb dictionary in the backend function. Only the frontend and its public API origin are copied into `dist/`; `.vercelignore` excludes local environment files from uploads.

Hosted rooms, queues, presence, and short event histories are stored in MongoDB. Active clients check for state changes once a second. Turn deadlines are settled in a transaction, so two server instances cannot apply the same timeout or award the same winner twice. Rooms expire after 24 hours. This polling approach is intended for a small test deployment; database traffic and function usage increase with connected players.

Socket.IO uses WebSocket transport and reconnects automatically. A transport reconnect has a 20-second grace period to recover its room, including when it reaches a different function instance. Page reloads/navigation create a new connection identity; they do not resume a multiplayer seat. A player who remains disconnected loses the seat after the grace period when another connected player checks the room. No background worker is required while all players are offline.

Keep the Vercel preview accessible to all test players. Deployment Protection can prevent other players from opening the website or completing a WebSocket handshake unless they have access.

## Verification

```powershell
npm.cmd test
npm.cmd run test:shared
npm.cmd run test:hosted
npm.cmd run build:frontend
```

The database/browser suites use temporary local MongoDB and mocked email delivery, never your real database or SMTP account. They require permission to launch MongoDB and headless Edge. `TEST_BROWSER_CHANNEL=chrome` selects Chrome instead.

After deployment, verify real email delivery, new/returning accounts, logout, Timeline, Mystery Country, and multiplayer with two separate browsers. Test a multiplayer session beyond five minutes to cover a real Vercel function timeout. Local tests cannot verify Vercel's routing, WebSocket beta, deployment protection, or external provider connectivity.

For Timeline, seed only the test database once using `npm run timeline:import` with the test database's `MONGODB_URI` set in your local shell or local `.env`.

## Change credentials afterward

- **MongoDB password:** change the database user's password with your provider, then update Vercel's Preview `MONGODB_URI`. URL-encode special characters. Update local `.env` too if it uses the same credential.
- **Email password:** regenerate the SMTP/app password with the provider, then update Preview `SMTP_PASS` and local `.env` if applicable.
- **Session secret:** replace Preview `SESSION_SECRET` to invalidate existing login sessions and hosted connection identities.

Create a new Preview deployment after changing environment variables. Website accounts use email codes, so there is no website account password to change.

References: [Vercel WebSockets and Socket.IO](https://vercel.com/docs/functions/websockets), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), [SMTP support](https://vercel.com/kb/guide/serverless-functions-and-smtp).
