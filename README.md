## API Reference

### TypeScript Types & Interfaces

The plugin exports comprehensive TypeScript types:

```typescript
import {
  MoyasarOptions,              // Configuration interface
  MoyasarProviderService,      // Main service class
  PaymentSessionStatus,         // Payment status enum
  MoyasarSourceType,           // Source type enum (creditcard, applepay, etc)
  MoyasarCardCompany,          // Card brand enum
  MoyasarWebhookEvent,         // Webhook event enum
} from '@zan-shop/medusa-payment-moyasar'
```

### Configuration Type

```typescript
interface MoyasarOptions {
  apiKey: string              // Required: Secret API key
  webhookSecret?: string      // Optional: Webhook secret token
  autoCapture?: boolean       // Optional: Default false
  enable3DS?: boolean         // Optional: Default true
  callbackUrl?: string        // Optional: For 3DS redirects
  paymentDescription?: string // Optional: Default "Order payment"
  retryAttempts?: number      // Optional: Default 3
}
```

### Payment Session Data

**Credit Card Source:**
```typescript
{
  type: 'creditcard',
  name: string,               // Cardholder name
  number: string,             // Card number (16 digits)
  month: number,              // Expiry month (1-12)
  year: number,               // Expiry year (2-digit or 4-digit)
  cvc: string,                // Security code
  manual?: boolean,           // Authorize without capturing
  "3ds"?: boolean,            // Force 3DS verification
  save_card?: boolean,        // Save card for future
  statement_descriptor?: string
}
```

**Token Source (Saved Card):**
```typescript
{
  type: 'token',
  token: string,              // Token ID from previous tokenization
  cvc?: string,               // Optional: CVC for verification
  manual?: boolean,           // Authorize without capturing
  "3ds"?: boolean,
  statement_descriptor?: string
}
```

**Apple Pay Source:**
```typescript
{
  type: 'applepay',
  token: string,              // Base64-encoded Apple Pay token
  manual?: boolean,
  save_card?: boolean,
  statement_descriptor?: string
}
```

**STC Pay Source:**
```typescript
{
  type: 'stcpay',
  mobile: string,             // Saudi mobile number
  branch?: string,            // Optional merchant branch
  cashier?: string,           // Optional cashier identifier
}
```

**Samsung Pay Source:**
```typescript
{
  type: 'samsungpay',
  token: string,              // Samsung Pay token
  manual?: boolean,
  save_card?: boolean,
  statement_descriptor?: string
}
```

### Payment Response Object

```typescript
{
  id: string,                 // Medusa payment ID
  status: PaymentSessionStatus, // PENDING, AUTHORIZED, CAPTURED, ERROR, CANCELED
  amount: number,             // Amount in display units
  currency: string,           // Currency code (uppercase)
  data: {
    payment_id: string,       // Moyasar payment ID
    transaction_url?: string, // 3DS redirect URL (if needed)
    status: string,           // Moyasar status (initiated, authorized, paid, etc)
    method_type: string,      // Payment method (creditcard, applepay, etc)
    created_at: string,       // ISO timestamp
    source: {
      type: string,
      // ... method-specific fields
    },
  },
}
```

### Webhook Payload

```typescript
{
  id: string,                 // Webhook ID
  type: string,              // Event type (payment.paid, etc)
  created_at: string,        // ISO timestamp
  data: {
    id: string,              // Payment ID
    amount: number,          // In smallest unit
    currency: string,
    status: string,          // Moyasar status
    description: string,
    source: {
      type: string,
      // ... source details
    },
    metadata: {
      session_id: string,    // Medusa session ID
    },
  },
  secret_token: string,      // Verify against MOYASAR_WEBHOOK_SECRET
}
```

### Payment Status Enum

```typescript
enum PaymentSessionStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  ERROR = 'ERROR',
  CANCELED = 'CANCELED',
}
```

### Payment Method Types

```typescript
enum MoyasarSourceType {
  CREDITCARD = 'creditcard',
  APPLEPAY = 'applepay',
  STCPAY = 'stcpay',
  SAMSUNGPAY = 'samsungpay',
  TOKEN = 'token',
}
```

### Card Brands

```typescript
enum MoyasarCardCompany {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  MADA = 'mada',
}
```

### Webhook Events

```typescript
enum MoyasarWebhookEvent {
  PAYMENT_PAID = 'payment.paid',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_AUTHORIZED = 'payment.authorized',
  PAYMENT_CAPTURED = 'payment.captured',
  PAYMENT_VOIDED = 'payment.voided',
  PAYMENT_VERIFIED = 'payment.verified',
  PAYMENT_REFUNDED = 'payment.refunded',
}
```

## Compatibility

- **Medusa Version**: v2.4.0 and above (tested with v2.12.4+)
- **Node.js**: v20 or higher
- **TypeScript**: 5.6.2 or compatible
- **Moyasar Account**: Required (test or production)

## Important Implementation Details

### Unified Provider Pattern

Unlike traditional payment plugins with separate providers, this plugin uses a **single unified provider** for all payment methods. This means:

- **One provider ID**: `moyasar` handles all payment methods
- **Frontend determines method**: Payment method is specified by `source.type` in the frontend
- **Shared configuration**: All methods share the same API key and webhook secret
- **Cleaner setup**: No need to configure 4 separate providers

This follows the Stripe pattern and is the recommended approach for multi-method payment gateways.

### Key Quirks & Behaviors

#### 1. Payment ID Handling
- Accepts payment ID from `data.id` (legacy) or `data.payment_id` (standard)
- Provides flexibility for different frontend implementations

#### 2. Cancel/Void Behavior
- **Can only void AUTHORIZED payments** (not yet captured)
- If payment is already `CAPTURED` or `PAID` → returns success (already complete)
- If payment already `VOIDED` → returns success (idempotent operation)
- This prevents errors when retrying cancellations

#### 3. Capture Error Handling
- If capture fails but payment is already `CAPTURED` → returns success
- Gracefully handles Moyasar API edge cases and network retries

#### 4. Refund Edge Cases
- Checks if refund already processed before throwing error
- Supports both full and partial refunds
- Payment status remains `CAPTURED` (refund is tracked separately)

#### 5. Status Mapping
- Both `paid` and `captured` Moyasar statuses map to Medusa's `CAPTURED` status
- `refunded` maps to `CAPTURED` (refund is separate event)
- Follows Medusa's unified payment model

#### 6. 3DS Routing
- Not all transactions require 3DS - Moyasar determines automatically
- If `transaction_url` not returned, 3DS was not needed
- Frontend should check for presence before redirecting

#### 7. STC Pay Limitations
- No tokenization support (unique transaction each time)
- No manual capture option (mobile notification-based)
- Asynchronous completion via customer STC Pay app notification

#### 8. Webhook Secret
- Optional if not set
- Only verified if `webhookSecret` is configured in options

#### 9. Currency Precision
- Uses BigNumber internally for accurate decimal math
- Prevents JavaScript floating-point precision errors
- Critical for financial accuracy

#### 10. Retry Logic
- Only retries **network** and **server** errors (5xx, timeouts)
- Does **NOT** retry authentication or validation errors
- Exponential backoff with jitter prevents thundering herd
- Configurable max attempts (default: 3)

### Performance Considerations

- **HTTP Client**: Single Axios instance per provider (connection pooling)
- **Currency Conversion**: Cached multipliers, no external API calls
- **Retries**: Average 1-5 second delay with backoff (depends on failure)
- **Webhook Processing**: Async, non-blocking
- **Memory**: Minimal - no payment caching, stateless design

### Security Best Practices

1. **API Keys**: Use environment variables, never commit to code
2. **Webhook Verification**: Always verify `secret_token` (enabled by default if configured)
3. **3DS Callback**: Use HTTPS only (required for production)
4. **Webhook Endpoint**: Public HTTPS endpoint (not localhost)
5. **PII Handling**: No cardholder data stored - Moyasar handles this
6. **Tokenization**: Frontend handles tokenization before sending to backend

## Advanced Usage

### Custom Error Handling

```typescript
import { MoyasarProviderService } from '@zan-shop/meduas-payment-moyasar'

try {
  const payment = await provider.capturePayment({
    payment_id: 'pay_123',
  })
} catch (error) {
  if (error.response?.status === 404) {
    console.log('Payment not found - likely expired')
  } else if (error.response?.status === 429) {
    console.log('Rate limited - automatic retry already attempted')
  } else if (error.code === 'ECONNREFUSED') {
    console.log('Network error - check connectivity')
  } else {
    console.log('Other error:', error.message)
  }
}
```

### Monitoring & Logging

```typescript
// Implement payment tracking
const trackPayment = async (payment: Payment) => {
  logger.info('Payment Event', {
    payment_id: payment.id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.data?.source?.type,
    timestamp: new Date().toISOString(),
  })
}
```

### Webhook Event Processing

```typescript
// In your webhook handler
const { action, data } = provider.getWebhookActionAndData(webhookData)

switch (action) {
  case 'SUCCESSFUL':
    // Mark order as paid
    break
  case 'AUTHORIZED':
    // Mark payment as authorized (awaiting capture)
    break
  case 'FAILED':
    // Cancel order or request alternative payment
    break
  case 'CANCELED':
    // Payment voided
    break
}
```

## Support & Resources

### Documentation
- [Moyasar Documentation](https://docs.moyasar.com/)
- [Moyasar API Reference](https://docs.moyasar.com/api/)
- [Medusa Documentation](https://docs.medusajs.com)

### Help
- **Moyasar Dashboard**: https://dashboard.moyasar.com/
- **Moyasar Status**: https://status.moyasar.com/
- **Medusa Discord**: https://discord.gg/medusajs
- **Issue Tracker**: https://github.com/zan-shop/medusa-payment-moyasar/issues

### Reporting Issues

Found a bug? Please report it:
1. Check existing issues first
2. Include Medusa and Node.js versions
3. Provide minimal reproducible example
4. Sanitize API keys and sensitive data

## License

MIT - See LICENSE file

## Credits

Developed by [Zan Shop](https://zan-shop.io/) for the Medusa community.

Moyasar is a payment service provider for the Middle East and North Africa region.

---

**Last Updated**: March 2025 | **Version**: 0.1.0
