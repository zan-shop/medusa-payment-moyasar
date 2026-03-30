/**
 * Moyasar Payment Provider Type Definitions
 */

/**
 * Configuration options for the Moyasar payment provider
 */
export interface MoyasarOptions {
  /**
   * Moyasar API key (publishable or secret key)
   * Format: pk_test_* or sk_test_* for test mode
   *         pk_live_* or sk_live_* for live mode
   */
  apiKey: string

  /**
   * Secret token for webhook verification
   * Set this in your Moyasar dashboard webhook configuration
   */
  webhookSecret?: string

  /**
   * Number of retry attempts for failed API calls
   * @default 3
   */
  retryAttempts?: number
}

/**
 * Moyasar payment status values
 */
export enum MoyasarPaymentStatus {
  INITIATED = "initiated",
  PAID = "paid",
  AUTHORIZED = "authorized",
  CAPTURED = "captured",
  FAILED = "failed",
  REFUNDED = "refunded",
  VOIDED = "voided",
  VERIFIED = "verified",
}

/**
 * Moyasar payment source types
 */
export enum MoyasarSourceType {
  CREDITCARD = "creditcard",
  TOKEN = "token",
  APPLEPAY = "applepay",
  SAMSUNGPAY = "samsungpay",
  STCPAY = "stcpay",
}

/**
 * Card company/scheme types
 */
export enum MoyasarCardCompany {
  MADA = "mada",
  VISA = "visa",
  MASTERCARD = "mastercard",
  AMEX = "amex",
}

/**
 * Moyasar webhook event types
 */
export enum MoyasarWebhookEvent {
  PAYMENT_PAID = "payment_paid",
  PAYMENT_FAILED = "payment_failed",
  PAYMENT_AUTHORIZED = "payment_authorized",
  PAYMENT_CAPTURED = "payment_captured",
  PAYMENT_REFUNDED = "payment_refunded",
  PAYMENT_VOIDED = "payment_voided",
  PAYMENT_VERIFIED = "payment_verified",
}

/**
 * Credit card source for payment creation
 */
export interface MoyasarCreditCardSource {
  type: MoyasarSourceType.CREDITCARD
  name: string
  number: string
  month: number
  year: number
  cvc: string
  manual?: boolean
  "3ds"?: boolean
  save_card?: boolean
  statement_descriptor?: string
}

/**
 * Token source for payment creation
 */
export interface MoyasarTokenSource {
  type: MoyasarSourceType.TOKEN
  token: string
  cvc?: string
  manual?: boolean
  "3ds"?: boolean
  statement_descriptor?: string
}

/**
 * Apple Pay source for payment creation
 */
export interface MoyasarApplePaySource {
  type: MoyasarSourceType.APPLEPAY
  token: string
  manual?: boolean
  save_card?: boolean
  statement_descriptor?: string
}

/**
 * Samsung Pay source for payment creation
 */
export interface MoyasarSamsungPaySource {
  type: MoyasarSourceType.SAMSUNGPAY
  token: string
  manual?: boolean
  save_card?: boolean
  statement_descriptor?: string
}

/**
 * STC Pay source for payment creation
 */
export interface MoyasarStcPaySource {
  type: MoyasarSourceType.STCPAY
  mobile: string
  branch?: string
  cashier?: string
}

/**
 * Union type of all payment sources
 */
export type MoyasarPaymentSource =
  | MoyasarCreditCardSource
  | MoyasarTokenSource
  | MoyasarApplePaySource
  | MoyasarSamsungPaySource
  | MoyasarStcPaySource

/**
 * Credit card response from Moyasar API
 */
export interface MoyasarCreditCardResponse {
  type: MoyasarSourceType.CREDITCARD
  company: MoyasarCardCompany
  name: string
  number: string // Masked format: "411111******1111"
  gateway_id: string
  token?: string
  message: string
  transaction_url?: string
  reference_number: string
  authorization_code?: string
  response_code?: string
}

/**
 * Apple Pay response from Moyasar API
 */
export interface MoyasarApplePayResponse {
  type: MoyasarSourceType.APPLEPAY
  company: MoyasarCardCompany
  number: string // Last 4 digits
  gateway_id: string
  reference_number: string
  message: string
  token?: string
  response_code?: string
  authorization_code?: string
}

/**
 * Samsung Pay response from Moyasar API
 */
export interface MoyasarSamsungPayResponse {
  type: MoyasarSourceType.SAMSUNGPAY
  company: MoyasarCardCompany
  number: string // Last 4 digits
  gateway_id: string
  reference_number: string
  message: string
  token?: string
  response_code?: string
  authorization_code?: string
}

/**
 * STC Pay response from Moyasar API
 */
export interface MoyasarStcPayResponse {
  type: MoyasarSourceType.STCPAY
  mobile: string
  reference_number: string
  transaction_url?: string
  message?: string
  branch?: string
  cashier?: string
}

/**
 * Union type of all payment source responses
 */
export type MoyasarPaymentSourceResponse =
  | MoyasarCreditCardResponse
  | MoyasarApplePayResponse
  | MoyasarSamsungPayResponse
  | MoyasarStcPayResponse

/**
 * Full payment object from Moyasar API
 */
export interface MoyasarPayment {
  id: string
  status: MoyasarPaymentStatus
  amount: number // Amount in smallest currency unit (e.g., 100 = 1.00 SAR)
  fee: number
  currency: string
  refunded: number
  refunded_at?: string
  captured: number
  captured_at?: string
  voided_at?: string
  description?: string
  amount_format: string
  fee_format: string
  refunded_format: string
  captured_format: string
  invoice_id?: string
  ip: string
  callback_url?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, string>
  source: MoyasarPaymentSourceResponse
}

/**
 * Payment creation request payload
 */
export interface CreatePaymentRequest {
  given_id?: string // For idempotency
  amount: number
  currency: string
  description?: string
  callback_url?: string
  source?: MoyasarPaymentSource
  metadata?: Record<string, string>
}

/**
 * Webhook payload structure
 */
export interface MoyasarWebhookPayload {
  id: string
  type: MoyasarWebhookEvent
  created_at: string
  secret_token: string
  account_name: string
  live: boolean
  data: MoyasarPayment
}

/**
 * Error response from Moyasar API
 */
export interface MoyasarErrorResponse {
  type: string // e.g., "invalid_request", "authentication_error", "api_error"
  message: string
  errors?: Record<string, string | string[]>
}

/**
 * Error handling result
 */
export interface HandledErrorType {
  retry: boolean
  data?: any
}

/**
 * Currency information for conversion
 */
export interface CurrencyInfo {
  code: string
  decimals: number
  multiplier: number
}
