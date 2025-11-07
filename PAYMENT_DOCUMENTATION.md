# AskEdith Payment Implementation Documentation

## Overview

This document provides a detailed analysis of the current payment implementation and what needs to be done to ensure AskEdith receives proper compensation for the platform services.

## Current Implementation Status

### 1. Expert Verification Fee ($100) - PARTIALLY IMPLEMENTED

**What's Working:**
- Payment collection via Stripe Payment Intent or Checkout Session
- $100 fee is successfully charged to experts during application
- Payment status is recorded in the database
- Expert applications are created after successful payment

**What's Missing:**
- The $100 goes entirely to the Stripe account connected to the API keys
- NO mechanism to transfer funds to AskEdith company account
- NO platform fee or split payment configuration

**Code Location:** 
- `/api/experts/create-verification-payment-intent` (server/routes.ts lines 520-544)
- `/api/experts/apply-with-payment` (server/routes.ts lines 473-517)
- `/api/experts/create-checkout-session` (server/routes.ts lines 557-609)

### 2. Expert Consultation Bookings - BASIC IMPLEMENTATION ONLY

**What's Working:**
- Payment intent creation for consultation bookings
- Fixed rate of $100/hour is enforced
- Basic booking flow with payment collection

**What's Missing:**
- NO commission structure implemented
- NO 15% platform fee calculation
- NO automatic fund splitting
- NO payout mechanism to experts
- All funds go to the main Stripe account

**Code Location:**
- `/api/consultations/create-payment` (server/routes.ts)
- `client/src/pages/BookConsultation.tsx`

## Required Implementation for Production

### 1. Stripe Connect Integration (REQUIRED)

To properly handle platform fees and payouts, AskEdith needs to implement Stripe Connect:

```javascript
// Example of what needs to be implemented:

// 1. Expert onboarding with Stripe Connect
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: expert.email,
  capabilities: {
    card_payments: {requested: true},
    transfers: {requested: true},
  },
  business_type: 'individual',
});

// 2. Generate onboarding link for expert
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://askedith.org/expert/stripe-refresh',
  return_url: 'https://askedith.org/expert/stripe-success',
  type: 'account_onboarding',
});

// 3. Store expert's Stripe Connect account ID
await storage.updateExpert(expertId, {
  stripeConnectAccountId: account.id
});
```

### 2. Platform Fee Implementation for Consultations

```javascript
// When creating consultation payment:
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100
  currency: 'usd',
  application_fee_amount: 1500, // 15% = $15 platform fee
  transfer_data: {
    destination: expert.stripeConnectAccountId, // Expert gets $85
  },
  metadata: {
    type: 'consultation',
    expertId: expert.id,
    clientId: client.id,
    platformFee: '15%'
  }
});
```

### 3. Verification Fee Handling

For the $100 verification fee, AskEdith should receive 100% of the payment. Current implementation already achieves this, but it should be documented:

```javascript
// Current implementation - fee goes to platform account
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100 verification fee
  currency: 'usd',
  metadata: {
    type: 'expert_verification_fee',
    userId: userId,
    // No transfer_data means funds stay with platform
  }
});
```

### 4. Database Schema Updates Needed

```sql
-- Add to experts table:
ALTER TABLE experts ADD COLUMN stripe_connect_account_id VARCHAR(255);
ALTER TABLE experts ADD COLUMN stripe_connect_status VARCHAR(50); -- 'pending', 'active', 'restricted'
ALTER TABLE experts ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Add to consultations table:
ALTER TABLE consultations ADD COLUMN platform_fee_amount INTEGER; -- in cents
ALTER TABLE consultations ADD COLUMN expert_payout_amount INTEGER; -- in cents
ALTER TABLE consultations ADD COLUMN stripe_transfer_id VARCHAR(255);
ALTER TABLE consultations ADD COLUMN payout_status VARCHAR(50); -- 'pending', 'transferred', 'failed'
```

### 5. Expert Dashboard Updates

Experts need to see:
- Their earnings and pending payouts
- Platform fee breakdown
- Stripe Connect onboarding status
- Payout history

### 6. Admin Dashboard Requirements

AskEdith administrators need:
- Total platform revenue dashboard
- Verification fees collected
- Commission fees collected
- Payout management interface
- Expert verification queue

## Implementation Priority

1. **Phase 1 - Stripe Connect Setup** (Critical)
   - Implement Stripe Connect account creation
   - Add onboarding flow for experts
   - Update database schema

2. **Phase 2 - Payment Flow Updates** (Critical)
   - Modify consultation booking to include platform fees
   - Implement automatic fund splitting
   - Add transfer tracking

3. **Phase 3 - Dashboard & Reporting** (Important)
   - Expert earnings dashboard
   - Admin revenue dashboard
   - Financial reporting tools

4. **Phase 4 - Automation** (Nice to have)
   - Automatic weekly/monthly payouts
   - Tax document generation (1099s)
   - Detailed transaction history

## Security Considerations

1. **Never store sensitive Stripe data directly**
   - Only store Stripe IDs (customer_id, account_id, etc.)
   - Use Stripe's secure APIs for all operations

2. **Implement proper access controls**
   - Experts can only see their own financial data
   - Admin-only endpoints for platform revenue

3. **Audit trail**
   - Log all financial transactions
   - Track payment intents, transfers, and payouts

## Testing Recommendations

1. Use Stripe test mode with test API keys
2. Create test Connect accounts for development
3. Test various scenarios:
   - Successful payments with commission
   - Failed payments
   - Refunds and disputes
   - Payout delays

## Estimated Development Time

- Stripe Connect Integration: 2-3 days
- Payment Flow Updates: 1-2 days
- Dashboard Development: 3-4 days
- Testing & Deployment: 2-3 days

**Total: 8-12 days for complete implementation**

## Current Risks

⚠️ **IMPORTANT**: The current implementation collects payments but:
1. Does NOT split funds between experts and platform
2. Does NOT track commission fees
3. Does NOT provide payout mechanisms
4. All money goes to whoever owns the Stripe API keys

This MUST be addressed before launching the platform commercially.