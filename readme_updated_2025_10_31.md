# SkyPANEL v2 Platform Guide (Updated 2025-10-31)

This document provides an end-to-end tour of the SkyPANEL v2 frontend application and the services it integrates with. It is intended for engineers, support specialists, and DevOps operators who need a deep understanding of how the system is wired together.

---

## 1. Platform Overview

SkyPANEL v2 is a Vite-powered React application that unifies billing, infrastructure management, and support tooling for cloud hosting customers. The frontend integrates with a JSON API that exposes authentication, billing, compute provisioning, and administrative capabilities. Key characteristics include:

- **Client-side stack**: React 18, TypeScript, Vite 6, shadcn/ui component primitives, Tailwind CSS, TanStack Table, lucide-react icons.
- **State providers**: React context providers manage authentication, impersonation, theming, and query caching (via React Query).
- **Domains covered**: Customer dashboard, VPS lifecycle management, container inventory, billing/wallet controls, SSH keys, activity auditing, support tickets, administrative controls, and notification streaming.
- **API documentation**: `/api-docs` now renders a live catalogue of every endpoint consumed by the application, replacing the previously outdated static copy.

---

## 2. Repository Layout

```
src/
  App.tsx                 # Router and layout composition
  components/             # UI building blocks and domain-specific widgets
  contexts/               # Authentication, impersonation, and theme providers
  hooks/                  # Custom hooks (lazy loading, pagination, mobile behaviours)
  pages/                  # Top-level route components (Dashboard, VPS, Billing, Admin, etc.)
  services/paymentService.ts # Wallet and PayPal integration wrapper
  lib/                    # Utility modules (formatting, brand, breadcrumbs, API helpers)
public/                   # Static assets
scripts/                  # Utility scripts for schema maintenance
readme_updated_2025_10_31.md # This guide
```

Major shared utilities that were added or updated in this pass:

- `src/lib/formatters.ts` centralises currency and storage formatting to remove duplication across pages.
- `readme_updated_2025_10_31.md` (this file) replaces legacy documentation with a contemporary top-to-bottom view.
- `/api-docs` page now consumes live endpoint metadata derived from the actual fetch calls used in the app.

---

## 3. Application Shell & Routing

`src/App.tsx` wires up React Router and wraps the tree with the core providers:

- `AuthProvider` manages authentication state, JWT refresh, and API key operations.
- `ImpersonationProvider` handles admin impersonation flows and ensures tokens are restored when exiting.
- `ThemeProvider` supplies the light/dark theme switcher and design tokens consumed by shadcn components.
- `QueryClientProvider` (React Query) orchestrates cache management for network requests.

Routes are declared for every major screen. Each protected route is wrapped in `ProtectedRoute`, which checks authentication, while `/admin` uses `AdminRoute` to gate access to administrative tooling.

---

## 4. Layout & Navigation

- `AppLayout.tsx` establishes the sidebar, top navigation, command palette, notification dropdown, and breadcrumb integration.
- `AppSidebar.tsx` now includes an **API Docs** entry so that authenticated users can launch the live endpoint reference from anywhere in the dashboard.
- Sidebar state persists which groups are expanded via `nav-main.tsx` using `localStorage` keys.
- `NotificationDropdown.tsx` listens to `/api/notifications/stream` via Server-Sent Events and exposes actions to mark single or all notifications as read.

---

## 5. Core Contexts & Hooks

### 5.1 Authentication (`src/contexts/AuthContext.tsx`)
- Handles login, registration, refresh, profile updates, password changes, organization metadata, and API key lifecycle.
- Persists tokens and user objects to `localStorage` and expires sessions proactively when tokens age out.

### 5.2 Impersonation (`src/contexts/ImpersonationContext.tsx`)
- Enables admins to impersonate a customer account through `/api/admin/users/:id/impersonate`.
- Restores the original session when `/api/admin/impersonation/exit` succeeds.

### 5.3 Utility Hooks
- `useMobileLoading`, `useMobileToast`, `useLazyLoading`, and `useMobilePerformance` provide mobile-friendly feedback when heavy operations (e.g., provisioning) run.
- `useFormPersistence` stores multi-step form inputs (VPS creation flow) in local storage for resilience across refreshes.

---

## 6. Feature Modules

### 6.1 Dashboard (`src/pages/Dashboard.tsx`)
- Aggregates wallet balance, monthly spend, recent invoices, live activity, and shortcuts.
- Uses the shared `formatCurrency` helper from `src/lib/formatters.ts` to guarantee consistent monetary formatting.

### 6.2 VPS Management (`src/pages/VPS.tsx` & `src/components/VPS`)
- Supports provider selection, plan filtering, marketplace app selection (StackScripts), and multi-step provisioning.
- `VpsTable.tsx` consumes `formatGigabytes` and `formatCurrency` to render instance specs and pricing cleanly.
- Instance actions (boot, shutdown, reboot, backups, firewalls) invoke `/api/vps/...` endpoints, and the updated `/api-docs` now documents each permutation.

### 6.3 VPS Detail (`src/pages/VPSDetail.tsx`)
- Displays networking (IPv4/IPv6, rDNS), metrics, backup schedules, firewall attachments, and console access.
- Provides hostname validation and updates through `/api/vps/:id/hostname`.

### 6.4 Containers (`src/pages/Containers.tsx`)
- Read-only listing of container workloads fetched from `/api/containers`.

### 6.5 Billing (`src/pages/Billing.tsx`)
- Wallet management, PayPal checkout integration, transaction history, invoice list, and VPS uptime cost summary.
- Relies on `paymentService.ts` which wraps calls to `/api/payments/...` and `/api/invoices/...`.
- All local currency formatting now uses `formatCurrencyDisplay` to eliminate duplicate implementations.

### 6.6 Support (`src/components/support/UserSupportView.tsx` & `src/components/admin/AdminSupportView.tsx`)
- Customers create and reply to tickets via `/api/support/tickets`.
- Admins triage tickets via `/api/admin/tickets`, can reply, update status, and delete spam.
- Real-time updates delivered via SSE streams (`/api/support/tickets/:id/stream`).

### 6.7 SSH Keys (`src/pages/SSHKeys.tsx`)
- CRUD operations for personal SSH keys using `/api/ssh-keys` endpoints.

### 6.8 Activity (`src/pages/Activity.tsx`)
- Comprehensive audit log with filtering, and CSV export hitting `/api/activity/export`.
- Dashboard uses `/api/activity/recent?limit=10` for the latest events.

### 6.9 Admin Suite (`src/pages/Admin.tsx` & `src/components/admin`)
- Provides tooling for plan management, provider marketplaces, FAQ/contact content, rate-limiting overrides, theme configuration, and impersonation.
- Fetches are distributed across specialised components (e.g., `RegionAccessManager`, `UpdatesManager`, `ContactCategoryManager`).

---

## 7. API Integration Summary

All active endpoints are catalogued in `src/pages/ApiDocs.tsx`. The component now builds its content from the real fetch calls used across the application so it remains authoritative. Endpoint groups include:

- **Authentication & Profile**: registration, login, refresh, profile/organization updates, API key management, password resets, password verification.
- **Billing & Payments**: PayPal create/capture/cancel, wallet balance and ledger, transaction detail, refunds, billing summary.
- **Invoices & Financial Records**: Invoice list/detail/download, invoice generation from transactions, VPS uptime summary.
- **VPS Provisioning & Lifecycle**: Instance CRUD, power actions, hostname, backups, firewalls.
- **VPS Catalog & Integrations**: Provider lists, regions, plans, images, StackScripts/marketplace data, provider-specific SSH keys and VPCs.
- **VPS Networking**: rDNS base configuration and per-instance reverse DNS updates.
- **Containers**: Container inventory.
- **SSH Keys**: Personal key management.
- **Activity & Audit**: Feed, recent subset, CSV export.
- **Support Tickets**: Customer-facing and admin-facing support workflows, SSE streams.
- **Notifications**: Unread fetch, counts, mark-as-read, SSE stream.
- **Admin Platform Management**: Users, impersonation, tickets, FAQ/contact CMS, provider catalog, rate limits, status/availability, theming.
- **Platform Health**: Public status page data, admin metrics, rate-limiting telemetry.

Each endpoint entry in `/api-docs` presents request/response samples alongside cURL commands with optional auth headers and query parameter previews.

---

## 8. Formatting Utilities (`src/lib/formatters.ts`)

Two shared helpers remove previously duplicated logic:

- `formatCurrency(amount, options)` – wraps `Intl.NumberFormat` with sensible defaults, optional absolute formatting, and configurable currency/locale.
- `formatGigabytes(bytes, options)` – normalises storage values into gigabytes with optional precision, guarding against `null` or invalid numbers.

These functions are now used in `VPS.tsx`, `VpsTable.tsx`, `Dashboard.tsx`, `Billing.tsx`, `TransactionDetail.tsx`, `AppLayout.tsx`, and `Admin.tsx` to guarantee uniform presentation.

---

## 9. Styling & Component System

- Tailwind CSS supplies utility classes, while shadcn/ui provides accessible primitives (Buttons, Tabs, Accordion, Sidebar, etc.).
- `lucide-react` icons are used across navigation and feature cards.
- `src/theme/` contains design tokens and theme switching logic; `ThemeProvider` persists the mode in local storage.

---

## 10. Running & Testing

### 10.1 Installation
```
npm install
```

### 10.2 Development Server
```
npm run dev
```

### 10.3 Linting
```
npm run lint
```

### 10.4 Unit & Integration Tests
```
npm run test
```

### 10.5 Building for Production
```
npm run build
```

The `package-lock.json` has been refreshed via `npm update`, bringing dependencies to the latest non-breaking releases (eslint 9.38.0, vite 6.4.1, etc.).

---

## 11. Operational Notes

- **Notifications**: SSE endpoints require appending `?token=<jwt>` because custom headers are not available on native EventSource.
- **Impersonation**: When impersonating, the admin token is swapped; always call `/api/admin/impersonation/exit` when done to restore privileges.
- **Backups**: Enabling/disabling backups and scheduling uses separate POST routes; restore requires confirmation due to destructive nature.
- **API Docs**: `/api-docs` is protected like other customer pages so it inherits authentication context and fetch headers.
- **Environment Variables**: `VITE_API_URL` configures the API base; if absent, the app falls back to `/api` relative to the host.

---

## 12. Changelog (2025-10-31)

- Added `src/lib/formatters.ts` and replaced duplicated formatting logic across pages.
- Refreshed `/api-docs` with authoritative data covering every active endpoint and improved copy/share tooling.
- Added **API Docs** entry to the application sidebar for quick access.
- Ran `npm update` to pull in the latest dependency versions and resolved linting errors introduced by the updates.
- Authored this comprehensive platform guide to replace the outdated documentation.

---

For additional questions or contributions, consult the new `/api-docs` page, inspect the relevant feature module within `src/pages/`, or contact the platform team via the admin support tools.
