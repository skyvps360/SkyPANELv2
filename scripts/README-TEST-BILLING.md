# VPS Hourly Billing Test Script

## Overview

This test script (`test-hourly-billing.js`) verifies that the VPS hourly billing system works correctly after the recent fixes.

## What It Tests

1. ✅ **Flat hourly rate** - Each hour should charge the same amount (not accumulating)
2. ✅ **Billing for all statuses** - VPS instances are charged regardless of running/stopped status
3. ✅ **Transaction accuracy** - Wallet balance decreases correctly with each billing cycle
4. ✅ **Billing cycle records** - Proper logging in `vps_billing_cycles` table

## Prerequisites

- The user `john@example.com` with password `testing123` must exist in the database
- At least one VPS plan must be configured in the `vps_plans` table
- Database connection must be configured in `.env`

## How to Run

### Option 1: Using Node directly

```bash
node scripts/test-hourly-billing.js
```

### Option 2: Using tsx (TypeScript execution)

```bash
npx tsx scripts/test-hourly-billing.js
```

## What the Script Does

### Step 1: User Authentication
- Retrieves user and organization information for `john@example.com`

### Step 2: Wallet Credit Addition
- Adds **$100.00** to the test user's wallet
- Records the transaction in `payment_transactions` table

### Step 3: VPS Creation
- Creates a test VPS instance
- Charges the **initial hour** from the wallet
- Records the creation in the database

### Step 4: 6-Hour Billing Simulation
- Triggers the `BillingService.runHourlyBilling()` method 6 times
- Each cycle should charge **exactly the same hourly rate**
- Monitors wallet balance changes after each cycle

### Step 5: Results Analysis
- Compares actual charges vs. expected charges
- Displays transaction history
- Shows billing cycle records
- Validates that each hour charged the correct flat rate

## Expected Output

```
================================================================================
🧪 VPS HOURLY BILLING TEST SCRIPT
================================================================================

📋 Step 1: Getting user information...
   User ID: xxx-xxx-xxx
   Organization ID: xxx-xxx-xxx

💰 Step 2: Checking initial wallet balance...
   Initial balance: $X.XX

💵 Step 3: Adding $100 credits to wallet...
   New balance: $100.XX

🖥️  Step 4: Creating VPS instance...
   Using plan: Standard Plan
   Hourly rate: $0.0274
   ✅ VPS created: Test-VPS-1234567890 (xxx-xxx-xxx)
   💰 Initial charge: $0.0274
   📊 Balance: $100.00 → $99.9726

⏰ Step 5: Simulating 6 hours of billing...

⏰ Simulating Hour 1 billing cycle...
   Billed instances: 1
   💳 Charged: $0.0274
   📊 Balance: $99.9726 → $99.9452

⏰ Simulating Hour 2 billing cycle...
   Billed instances: 1
   💳 Charged: $0.0274
   📊 Balance: $99.9452 → $99.9178

... (and so on for 6 hours)

================================================================================
📊 BILLING ANALYSIS
================================================================================

Expected hourly rate: $0.0274

Hour-by-hour charges:
✅ Hour 1: $0.0274 (Expected: $0.0274) - Balance: $99.9726 → $99.9452
✅ Hour 2: $0.0274 (Expected: $0.0274) - Balance: $99.9452 → $99.9178
✅ Hour 3: $0.0274 (Expected: $0.0274) - Balance: $99.9178 → $99.8904
✅ Hour 4: $0.0274 (Expected: $0.0274) - Balance: $99.8904 → $99.8630
✅ Hour 5: $0.0274 (Expected: $0.0274) - Balance: $99.8630 → $99.8356
✅ Hour 6: $0.0274 (Expected: $0.0274) - Balance: $99.8356 → $99.8082

================================================================================
📈 FINAL SUMMARY
================================================================================

Starting balance (after $100 credit): $100.00
Final balance: $99.8082
Total charged: $0.1918
Expected total (7 hours): $0.1918
Difference: $0.0000

✅ TEST PASSED! Hourly billing is working correctly!
   Each hour charged the same flat rate as expected.
```

## Success Criteria

The test **PASSES** if:
1. ✅ Each hour charges **exactly the same amount** (the hourly rate)
2. ✅ No accumulation of charges (hour 2 should NOT charge 2× the rate)
3. ✅ Wallet balance decreases correctly
4. ✅ All billing cycles are recorded in the database
5. ✅ Total charges match expected (initial hour + 6 hourly charges)

The test **FAILS** if:
1. ❌ Different amounts are charged in different hours
2. ❌ Charges accumulate (increasing amounts per hour)
3. ❌ Wallet balance doesn't match expected
4. ❌ Billing service reports errors

## Troubleshooting

### Error: "User john@example.com not found"
Create the user first or use an existing user's credentials.

### Error: "No VPS plans found"
You need to create at least one VPS plan in the admin panel or database.

### Error: "Insufficient wallet balance"
The script adds $100, but if you have many VPS instances, you might need to add more credits.

### Database Connection Errors
Verify your `.env` file has the correct `DATABASE_URL` configured.

## Cleanup

After testing, you may want to:
1. Delete the test VPS instance from the database
2. Remove test transactions if needed
3. Adjust wallet balance back to desired amount

## Related Files

- `api/services/billingService.ts` - Main billing logic
- `api/server.ts` - Hourly billing scheduler
- `migrations/006_billing_tracking.sql` - Billing cycles table schema
