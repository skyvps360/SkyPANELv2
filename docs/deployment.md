# Deployment Checklist

Use this guide when preparing ContainerStacks for staging or production deployment.

## Pre-Deployment

- **Environment Variables**: Set all required keys (`DATABASE_URL`, `PORT`, `JWT_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `LINODE_API_TOKEN`, `SMTP2GO_API_KEY`, `SSH_CRED_SECRET`, `VITE_API_URL`, etc.). Production secrets should live in your platform's secret store.
- **Database Access**: Ensure the target Postgres instance allows connections from the deployment environment (firewalls, SSL mode, roles).
- **Migrations**: Run `node scripts/run-migration.js` (or your CI equivalent) against the production database before starting the new version. Consider backups before schema changes.
- **Dependencies**: Install with `npm ci` for deterministic builds.

## Build & Bundle

```bash
npm run build
```

- Runs `tsc -b` for API type checking and `vite build` for the frontend bundle.
- Output artefacts: Vite emits static files under `dist/` (serve via CDN or static host). The API remains TypeScript executed via `tsx`; you can either transpile to JS or run with `node --loader tsx` in production.

## Running the API

- Start command: `node --loader tsx api/server.ts` (or compile to JS and run the built output).
- Set `PORT` (defaults to `3001`). Make sure reverse proxies forward `X-Forwarded-*` headers if SSL termination happens upstream.
- Helmet CSP currently allows inline styles and same-origin scripts; if you host the frontend separately ensure the API responses include any required CORS origins via `CORS_ALLOWED_ORIGINS`.

## Serving the Frontend

- Deploy the `dist/` directory to your static host (Vercel, Netlify, S3, etc.).
- Configure the frontend environment variable `VITE_API_URL` to point at the deployed API base (`https://api.example.com/api`).
- Enable history fallback (React Router) so deep links resolve to `index.html`.

## Health & Monitoring

- Health endpoint: `GET /api/health` (use for uptime checks).
- Logging: API writes to stdout; aggregate logs with your platform (e.g., CloudWatch, Stackdriver, Datadog).
- Activity logs: Query `/api/activity` endpoints for auditing. Retain database backups that include `activity_logs` and `vps_billing_cycles`.

## Background Processes

- Billing scheduler: runs inside the API process, charging VPS hourly. Ensure the process stays alive (use a process manager like PM2, systemd, or container orchestrator health checks).
- WebSocket SSH bridge: reuses the HTTP server; if deploying behind a reverse proxy, enable WebSocket upgrades.

## External Integrations

- **PayPal**: Verify webhook or manual reconciliation process for payouts/transactions. Sandbox and live credentials differ; set `PAYPAL_MODE=live` in production.
- **Linode**: Token must have rights to manage instances, StackScripts, firewalls, and networking. Restrict scope where possible.
- **SMTP2GO**: Hook up email flows when implemented; currently optional but wiring now avoids runtime crashes when email is added.

## Security Hardening

- Rotate `JWT_SECRET`, `SSH_CRED_SECRET`, and API tokens periodically.
- Make sure `helmet` CSP matches your hosting setup; update `api/app.ts` if additional domains are needed.
- Enforce HTTPS by terminating TLS at your ingress and redirecting HTTP to HTTPS.

## Scaling Considerations

- API is stateless apart from scheduled jobs; scale horizontally behind a load balancer if needed. Ensure each replica has access to the same PostgreSQL database and environment secrets.
- WebSocket SSH sessions require sticky sessions or shared load-balancer state if multiple replicas run simultaneously; alternatively pin WebSocket traffic to a single instance.
- PostgreSQL connection pool defaults to 20; adjust via environment variables if running many API replicas.

## Post-Deployment Verification

1. Hit `/api/health`.
2. Login through the frontend and confirm dashboard data loads.
3. Verify wallet retrieval (`/api/payments/wallet/balance`) and VPS list endpoints (`/api/vps`).
4. Trigger a benign activity (e.g., `GET /api/activity/recent`) to ensure logging works.
5. Confirm billing scheduler logs hourly execution in application logs.

Keeping this checklist up to date ensures predictable deployments and easier on-call rotations.
