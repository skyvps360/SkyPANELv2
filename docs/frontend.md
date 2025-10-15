# Frontend Guide

The frontend under `src/` is a Vite + React 18 application written in TypeScript. It authenticates against the Express API, manages organization state, and renders dashboards for containers, VPS instances, billing, activity, and support.

## Entry Points & Bootstrapping

- `src/main.tsx` mounts the app with Tailwind styles and wraps everything inside `StrictMode`.
- `src/App.tsx` declares routes using React Router v6 and provides `ProtectedRoute`, `AdminRoute`, and `PublicRoute` helpers for access control.
- Toast notifications are handled by `sonner` (`<Toaster>` configured at the root).

## Routing & Layout

- Public routes: `/`, `/login`, `/register`.
- Authenticated routes: `/dashboard`, `/containers`, `/containers/:id`, `/vps`, `/vps/:id`, `/billing`, `/support`, `/settings`, `/activity`, `/api-docs` (internal API explorer).
- Admin-only: `/admin` guarded by `AdminRoute` (requires `user.role === 'admin'`).
- `AppLayout` composes `Navigation`, `Sidebar`, and the main content area. Navigation items are defined under `src/components/Navigation.tsx`.

## Authentication State

- `AuthContext` (`src/contexts/AuthContext.tsx`) stores the current user and JWT token (persisted in `localStorage`).
- Context methods wrap API calls: `login`, `register`, `logout`, `refreshToken`, `updateProfile`, `updateOrganization`, `changePassword`, `updatePreferences`, `getApiKeys`, `createApiKey`, `revokeApiKey`.
- Protected routes wait until `loading` is false before redirecting unauthenticated users.

## Data Fetching & API Client

- `src/lib/api.ts` exposes a lightweight `ApiClient` that automatically attaches the bearer token and standard headers. It includes helpers for auth, containers, VPS instances, support tickets, wallet details, payment history, admin lists, and plan retrieval.
- Some pages call `fetch` directly (e.g., `Dashboard.tsx`) to coalesce multiple requests; consider migrating those calls to `ApiClient` when refactoring for consistency.

## Styling & UI

- Tailwind CSS powers the design system (`tailwind.config.js`, `src/index.css`). Utility helpers such as `clsx` and `tailwind-merge` manage conditional classes.
- Iconography uses `lucide-react`. Charts leverage `recharts`.
- Shared UI components live in `src/components/` (e.g., layout shell, navigation, empty state, sidebar, VPS terminal widgets).

## Feature Highlights

- **Dashboard (`src/pages/Dashboard.tsx`)**: Aggregates container list, VPS metrics, wallet balance, last payment, and recent activity. Performs optimistic data enhancement by fetching detailed VPS metrics per instance.
- **VPS Management (`src/pages/VPS.tsx`, `src/pages/VPSDetail.tsx`)**: Interacts with `/api/vps` endpoints for provisioning, lifecycle operations, metrics charts, backup scheduling, firewall management, and rDNS updates. `components/VPS/SSHTerminal.tsx` uses `xterm` + WebSocket bridge for in-browser SSH.
- **Billing (`src/pages/Billing.tsx`)**: Displays wallet balance and payment history, integrates with PayPal approval URLs returned by the API.
- **Support (`src/pages/Support.tsx`)**: Allows organizations to open support tickets and reply in threads.
- **Admin (`src/pages/Admin.tsx`)**: Provides plan/provider management, StackScript configuration, schema diagnostics, and Linode catalog concierge (regions, plans, StackScripts).
- **Activity (`src/pages/Activity.tsx`)**: Lists audit events with filters and CSV export trigger.
- **API Docs (`src/pages/ApiDocs.tsx`)**: Embeds the OpenAPI spec (`openapi.json`) for quick reference.

## State Utilities & Hooks

- `src/hooks/useTheme.ts` toggles between light/dark themes via CSS classes.
- `src/lib/utils.ts` houses formatting helpers used across the UI (dates, currency, status labels).
- No global state manager beyond React context is currently in use; `zustand` is listed as a dependency but unused—remove or adopt when centralised client state is required.

## Assets & Static Content

- `public/` hosts icons, favicons, manifest files, and static assets served directly by Vite.
- `stackscripts/` contains shell scripts that can be referenced when provisioning VPS instances via StackScripts.

## Frontend Extension Tips

1. Add new routes in `App.tsx` and guard them with the appropriate wrapper.
2. Reuse `AuthContext` methods for authenticated mutations to keep user state in sync.
3. Extend `ApiClient` for new backend endpoints to maintain a single HTTP abstraction.
4. Follow existing Tailwind utility patterns to keep styling consistent.
5. Update documentation and navigation labels when adding major features so they appear throughout the UI.
