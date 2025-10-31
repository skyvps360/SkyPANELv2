---
inclusion: always
---

# Billing & Payment System Rules

SkyPanelV2 uses a prepaid wallet billing model with PayPal integration and automated hourly VPS billing.

## Billing Architecture

**Prepaid Wallet Model**:
- Users prepay funds via PayPal into their organization wallet
- All VPS charges deducted from wallet balance
- Operations blocked if `wallet_balance < estimated_cost`
- Wallet balance stored in `wallets` table per organization

**Hourly Billing**:
- VPS instances billed hourly based on active time
- Automated billing job runs periodically (cron/scheduler)
- Charges calculated: `(base_price + markup_price) / 730 hours/month`
- Backup costs added if enabled (daily = 1.5x, weekly = 1x)

**Database Tables**:
- `wallets` - Organization wallet balances
- `payment_transactions` - All wallet transactions (credits/debits)
- `vps_billing_cycles` - Billing history per VPS instance
- `invoices` - Generated invoices for transactions

## Wallet Management

**Wallet Structure** (`wallets` table):
- `organization_id` - Owner organization (unique)
- `balance` - Current wallet balance (decimal)
- `currency` - Currency code (default: USD)
- `created_at`, `updated_at` - Timestamps

**Wallet Operations**:
- Add funds: `PayPalService.addFundsToWallet(organizationId, amount, description, metadata)`
- Deduct funds: `PayPalService.deductFundsFromWallet(organizationId, amount, description)`
- Get balance: `PayPalService.getWalletBalance(organizationId)`
- All operations create `payment_transactions` records

**Transaction Types**:
- `credit` - Funds added to wallet (PayPal payments, refunds)
- `debit` - Funds deducted from wallet (VPS billing, services)

## PayPal Integration

**Payment Flow**:
1. User initiates payment via `/api/payments/create-payment`
2. Backend creates PayPal order with return URLs
3. User redirected to PayPal for approval
4. User returns to success/cancel page
5. Backend captures payment via `/api/payments/capture-payment`
6. Funds added to wallet on successful capture

**PayPal Configuration** (`.env`):
- `PAYPAL_CLIENT_ID` - PayPal app client ID
- `PAYPAL_CLIENT_SECRET` - PayPal app secret
- `PAYPAL_MODE` - `sandbox` or `production`/`live`
- `CLIENT_URL` - Frontend URL for return URLs

**PayPal Service** (`api/services/paypalService.ts`):
- `createPayment()` - Create PayPal order
- `capturePayment()` - Capture approved payment
- `addFundsToWallet()` - Credit wallet after successful payment
- `deductFundsFromWallet()` - Debit wallet for services

**Payment Statuses**:
- `pending` - Payment initiated, awaiting capture
- `completed` - Payment captured and wallet credited
- `failed` - Payment capture failed
- `cancelled` - User cancelled payment
- `refunded` - Payment refunded to user

## Hourly VPS Billing

**Billing Service** (`api/services/billingService.ts`):
- `runHourlyBilling()` - Main billing job entry point
- Processes all active VPS instances
- Calculates elapsed hours since `last_billed_at`
- Charges only for complete hours (floor)
- Updates `last_billed_at` after successful billing

**Billing Calculation**:
```typescript
// Base hourly rate
const baseHourlyRate = (base_price + markup_price) / 730;

// Backup hourly rate (if enabled)
let backupHourlyRate = 0;
if (backup_frequency === 'daily') {
  backupHourlyRate = (backup_price_hourly + backup_upcharge_hourly) * 1.5;
} else if (backup_frequency === 'weekly') {
  backupHourlyRate = backup_price_hourly + backup_upcharge_hourly;
}

// Total charge
const totalAmount = (baseHourlyRate + backupHourlyRate) * hoursToCharge;
```

**Billing Process**:
1. Query all VPS instances where `last_billed_at IS NULL` or `last_billed_at <= 1 hour ago`
2. For each instance:
   - Calculate elapsed hours since `last_billed_at` (or `created_at` if never billed)
   - Floor to complete hours: `Math.floor(elapsedMs / MS_PER_HOUR)`
   - Skip if less than 1 hour elapsed
   - Check wallet balance >= total amount
   - Deduct funds from wallet
   - Create `vps_billing_cycles` record
   - Update `last_billed_at` to end of billing period
3. Log results: billed count, failed count, total hours, total amount

**Billing Failure Handling**:
- Insufficient balance: Create failed billing cycle record, skip deduction
- Wallet deduction failed: Create failed billing cycle record
- Log all failures for admin review
- VPS continues running (no automatic suspension)

**Billing Cycles** (`vps_billing_cycles` table):
- `vps_instance_id` - VPS being billed
- `organization_id` - Owner organization
- `billing_period_start` - Start of billing period
- `billing_period_end` - End of billing period
- `hourly_rate` - Rate charged per hour
- `total_amount` - Total amount charged
- `status` - `pending`, `billed`, `failed`, `refunded`
- `payment_transaction_id` - Link to wallet transaction
- `metadata` - JSON with hours_charged, backup details, etc.

## Payment Transactions

**Transaction Structure** (`payment_transactions` table):
- `id` - UUID primary key
- `organization_id` - Owner organization
- `type` - `credit` or `debit`
- `amount` - Transaction amount (always positive)
- `currency` - Currency code (default: USD)
- `description` - Human-readable description
- `status` - `pending`, `completed`, `failed`, `cancelled`, `refunded`
- `provider` - Payment provider (`paypal`, `internal`, `admin`)
- `payment_method` - Method used (`paypal`, `wallet`, `manual`)
- `provider_payment_id` - External payment ID (PayPal order ID)
- `balance_before` - Wallet balance before transaction
- `balance_after` - Wallet balance after transaction
- `metadata` - JSON with additional details
- `created_at`, `updated_at` - Timestamps

**Transaction Creation**:
- All wallet operations create transactions
- Credits: PayPal payments, admin credits, refunds
- Debits: VPS billing, service charges, admin adjustments
- Always log `balance_before` and `balance_after`
- Store metadata for audit trail

## Invoice Generation

**Invoice Service** (`api/services/invoiceService.ts`):
- `createInvoiceFromTransaction()` - Generate invoice from transaction
- `listInvoices()` - List invoices for organization
- `getInvoice()` - Get invoice details
- Invoices stored in `invoices` table

**Invoice Structure** (`invoices` table):
- `id` - UUID primary key
- `organization_id` - Owner organization
- `invoice_number` - Sequential invoice number
- `html_content` - Rendered HTML invoice
- `data` - JSON with invoice line items
- `total_amount` - Total invoice amount
- `currency` - Currency code
- `created_at`, `updated_at` - Timestamps

**Invoice HTML**:
- Includes company branding (logo, name from env vars)
- Theme colors from `themeService`
- Line items with descriptions, quantities, rates
- Subtotal, tax (if applicable), total
- Payment method and transaction details

## Frontend Billing Pages

**Billing Page** (`src/pages/Billing.tsx`):
- Route: `/billing`
- Three tabs: Overview, Wallet Transactions, Payment History
- Wallet balance display
- Add funds via PayPal button
- VPS uptime summary with cost estimates
- Monthly spend calculation
- Transaction history with pagination
- Export to CSV functionality

**Billing Metrics**:
- Wallet Balance - Current available funds
- This Month (Estimate) - Projected monthly cost based on active VPS
- Spent This Month - Actual debits from current calendar month
- VPS Active Hours - Total hours across all VPS instances

**VPS Uptime Summary**:
- Lists all VPS instances with active hours
- Shows hourly rate and estimated cost per VPS
- Calculates total active hours and total estimated cost
- Export to CSV with timestamp

**Transaction Detail Page** (`src/pages/TransactionDetail.tsx`):
- Route: `/billing/transaction/:id`
- Shows full transaction details
- Balance before/after
- Payment source (provider, method, reference)
- Metadata display
- Download invoice button

**Invoice Detail Page** (`src/pages/InvoiceDetail.tsx`):
- Route: `/billing/invoice/:id`
- Renders invoice HTML
- Download as HTML file
- Shows invoice metadata (number, amount, date)

**Payment Success/Cancel Pages**:
- `BillingPaymentSuccess.tsx` - PayPal return URL for successful payments
- `BillingPaymentCancel.tsx` - PayPal return URL for cancelled payments
- Handle payment capture and wallet update
- Redirect to billing page with toast notification

## API Endpoints

**Payment Routes** (`/api/payments`):
- `GET /config` - Get PayPal client configuration
- `POST /create-payment` - Create PayPal payment intent
- `POST /capture-payment` - Capture approved PayPal payment
- `GET /wallet/balance` - Get wallet balance
- `GET /wallet/transactions` - List wallet transactions (paginated)
- `GET /payment-history` - List payment history (paginated)
- `GET /billing-summary` - Get billing summary (monthly estimate, spent)
- `GET /vps-uptime` - Get VPS uptime summary
- `GET /transaction/:id` - Get transaction details

**Invoice Routes** (`/api/invoices`):
- `GET /` - List invoices (paginated)
- `GET /:id` - Get invoice details
- `GET /:id/download` - Download invoice as HTML
- `POST /from-transaction/:transactionId` - Create invoice from transaction

## Billing Job Scheduling

**Cron/Scheduler Setup**:
- Run `BillingService.runHourlyBilling()` every hour
- Recommended: Use PM2 cron, node-cron, or external scheduler
- Log all billing runs for monitoring
- Alert on high failure rates

**Example Cron Job**:
```typescript
import cron from 'node-cron';
import { BillingService } from './services/billingService.js';

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
  console.log('Starting hourly billing job...');
  const result = await BillingService.runHourlyBilling();
  console.log('Billing job completed:', result);
});
```

**Monitoring**:
- Track `billedInstances`, `failedInstances`, `totalAmount`
- Alert if `failedInstances.length > threshold`
- Log to activity_logs for audit trail
- Send notifications for low wallet balances

## Wallet Balance Validation

**Pre-Operation Checks**:
- ALWAYS check wallet balance before billable operations
- VPS creation: Estimate first hour cost, check balance
- VPS resize: Calculate cost difference, check balance
- Backup enable: Calculate backup cost, check balance

**Balance Check Pattern**:
```typescript
const balance = await PayPalService.getWalletBalance(organizationId);
const estimatedCost = calculateHourlyCost(plan);

if (balance < estimatedCost) {
  throw new Error('Insufficient wallet balance');
}
```

**Low Balance Handling**:
- Show warning in UI when balance < 24 hours of usage
- Block new VPS creation if balance < 1 hour cost
- Send email notifications for low balance
- Provide "Add Funds" quick action

## Activity Logging

**All billing operations must log to `activity_logs`**:
- Payment received: `payment.received`
- Wallet credited: `wallet.credit`
- Wallet debited: `wallet.debit`
- VPS billed: `vps.billed`
- Billing failed: `vps.billing_failed`
- Invoice generated: `invoice.created`

**Log Entry Example**:
```typescript
await logActivity({
  userId: userId,
  organizationId: organizationId,
  eventType: 'wallet.credit',
  entityType: 'payment_transaction',
  entityId: transactionId,
  message: `Wallet credited $${amount} via PayPal`,
  status: 'success',
  metadata: { amount, provider: 'paypal', orderId }
}, req);
```

## Security Considerations

**Payment Security**:
- Never store PayPal credentials in database
- Use environment variables for API keys
- Validate PayPal webhook signatures
- Verify payment amounts match expected values
- Log all payment attempts for fraud detection

**Wallet Security**:
- Use database transactions for wallet operations
- Lock wallet row during balance updates
- Validate all amounts are positive
- Prevent negative balances
- Audit all wallet changes

**Access Control**:
- Users can only access their organization's wallet
- Admins can view all wallets (read-only)
- Only system can deduct funds (not user-initiated)
- Payment capture requires valid PayPal order ID

## Common Pitfalls

- Don't forget to check wallet balance before operations
- Always use database transactions for wallet updates
- Never allow negative wallet balances
- Log all billing failures for investigation
- Handle timezone differences in billing calculations
- Round currency amounts to 2 decimal places for display, 4 for calculations
- Validate PayPal payment status before crediting wallet
- Update `last_billed_at` only after successful billing
- Create billing cycle records even for failed attempts
- Export functions should handle large datasets (pagination)
- Monthly spend calculation must use calendar month boundaries
- VPS uptime should account for stopped/paused instances
- Invoice generation should include all transaction metadata
- PayPal return URLs must be absolute (not relative)

## Billing Best Practices

1. **Idempotency**: Billing jobs must be safe to run multiple times
2. **Atomicity**: Use transactions for multi-step wallet operations
3. **Auditability**: Log every billing event with full context
4. **Transparency**: Show users detailed cost breakdowns
5. **Predictability**: Provide cost estimates before operations
6. **Reliability**: Handle failures gracefully, retry transient errors
7. **Monitoring**: Track billing metrics and alert on anomalies
8. **Testing**: Test billing logic with various edge cases
9. **Documentation**: Keep billing calculations well-documented
10. **Communication**: Notify users of billing events and low balances
