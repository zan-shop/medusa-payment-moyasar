# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-03-25

### Added

- Initial release of Moyasar payment provider for Medusa v2
- Support for Credit Card payments (Visa, Mastercard, Mada, American Express)
- Support for Apple Pay
- Support for STC Pay (Saudi digital wallet)
- Support for Samsung Pay
- 3D Secure (3DS) authentication for card payments
- Two-step payment flow (authorize then capture)
- Payment tokenization for saved cards
- Webhook support for automatic payment status updates
- Multi-currency support (SAR, KWD, BHD, AED, and more)
- Idempotency support for reliable payment processing
- Comprehensive error handling with automatic retry logic
- Full TypeScript support with complete type definitions
- Currency conversion utilities for 23+ currencies
- Complete test suite for currency utilities

### Features

- **Payment Methods**:
  - Credit Card (identifier: `moyasar`)
  - Apple Pay (identifier: `moyasar-applepay`)
  - STC Pay (identifier: `moyasar-stcpay`)
  - Samsung Pay (identifier: `moyasar-samsungpay`)

- **Payment Operations**:
  - Initiate payment
  - Authorize payment
  - Capture payment
  - Cancel/void payment
  - Refund payment (full and partial)
  - Retrieve payment status
  - Update payment

- **Security**:
  - 3DS redirect flow
  - Webhook signature verification
  - Idempotency keys
  - Secure token-based payments

- **Developer Experience**:
  - Complete TypeScript types
  - Comprehensive documentation
  - Test API credentials provided
  - 16 passing unit tests
  - Follows official Stripe provider pattern

[0.1.0]: https://github.com/zan-shop/medusa-payment-moyasar/releases/tag/v0.1.0
