# ContainerStacks – Trae Project Rules

These rules guide IDE automations and commands to keep development fast, consistent, and safe in this repo.

## Core Commands
- Use `npm run dev` to start both client (Vite) and server (Nodemon).
- If ports are busy or you see `EADDRINUSE`, run `npm run kill-ports` and then `npm run dev`.
- Do not run `npm run client:dev` while `npm run dev` is active. Avoid duplicate dev servers.

## Environment
- Read and use `.env` based on `.env.example`. Key vars: `PORT=3001`, `CLIENT_URL=http://localhost:5173`, `VITE_API_URL=http://localhost:3001/api`, `DATABASE_URL`, `JWT_SECRET`, `LINODE_API_TOKEN`, PayPal and SMTP2GO credentials.
- Never commit or echo secrets from `.env` to logs or messages.

## Ports & Preview
- Frontend preview: `http://localhost:5173/`.
- API base: `http://localhost:3001/api`.
- When applying UI changes, open the frontend preview URL to validate visually before marking tasks complete.

## Terminal & OS
- Use PowerShell commands compatible with Windows.
- Prefer reusing the existing terminal; avoid launching redundant terminals.
- For long-running dev servers, start non-blocking and capture the preview URL.

## Patching & Code Changes
- Make minimal, targeted patches consistent with existing TypeScript/React style.
- Do not introduce unrelated refactors or rename files unless required by the task.
- Update documentation when behavior or environment changes.

## Verification
- After changes that affect UI: open `http://localhost:5173/` and verify.
- After backend changes: ensure server starts without errors on `3001`; exercise the changed endpoint.

## Migrations & Seeding
- Apply migrations using scripts in `scripts/` as needed.
- Use `npm run seed:admin` to create an initial admin user for the Admin Panel.

## Troubleshooting
- Port conflicts: `npm run kill-ports` then `npm run dev`.
- Empty region dropdowns: confirm `LINODE_API_TOKEN` and provider configuration.
- API/client mismatch: verify `VITE_API_URL` and `PORT`.

## Safety
- Respect rate limits configured via `RATE_LIMIT_*` env vars.
- Do not expose sensitive config in responses or logs.