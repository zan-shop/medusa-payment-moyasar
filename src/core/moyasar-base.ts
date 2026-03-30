/**
 * Moyasar Payment Provider Base Class
 * 
 * Abstract base class that implements the AbstractPaymentProvider interface
 * for Moyasar payment gateway integration with Medusa.
 * 
 * Follows the Stripe implementation pattern for consistency.
 */

import { AbstractPaymentProvider, PaymentSessionStatus, PaymentActions } from "@medusajs/framework/utils"
import type {
  ProviderWebhookPayload,
  WebhookActionResult,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
} from "@medusajs/framework/types"
import axios, { AxiosInstance, AxiosError } from "axios"
import {
  convertToSmallestUnit,
  convertFromSmallestUnit,
} from "../utils/currency-converter"
import type {
  MoyasarOptions,
  MoyasarPayment,
  MoyasarPaymentStatus,
  MoyasarWebhookPayload,
  MoyasarWebhookEvent,
  MoyasarErrorResponse,
  HandledErrorType,
  CreatePaymentRequest,
} from "../types"

/**
 * Abstract base class for Moyasar payment providers
 * Subclasses must implement getSourceType() and getPaymentOptions()
 */
abstract class MoyasarBase<
  TOptions extends MoyasarOptions = MoyasarOptions
> extends AbstractPaymentProvider<TOptions> {
  static identifier = "moyasar-base"

  protected readonly options_: TOptions
  protected readonly moyasarClient_: AxiosInstance

  /**
   * Validate provider options
   */
  static validateOptions(options: MoyasarOptions): void {
    if (!options.apiKey) {
      throw new Error(
        "Required option `apiKey` is missing in Moyasar payment provider configuration"
      )
    }
  }

  protected constructor(
    cradle: Record<string, unknown>,
    options: TOptions
  ) {
    // @ts-ignore
    super(...arguments)

    this.options_ = options

    // Validate required options
    MoyasarBase.validateOptions(options)

    // Initialize Axios client with Moyasar API configuration
    this.moyasarClient_ = axios.create({
      baseURL: "https://api.moyasar.com/v1",
      auth: {
        username: options.apiKey,
        password: "", // Moyasar uses empty password
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    })
  }

  /**
   * Get the payment source type for this provider
   * Can be overridden by subclasses for default behavior
   */
  get sourceType(): string {
    return "creditcard" // Default to credit card
  }

  /**
   * Get payment-specific options for a given source type
   * @param sourceType - The payment method type (creditcard, applepay, stcpay, samsungpay)
   */
  /**
   * Get provider options
   */
  get options(): TOptions {
    return this.options_
  }

  /**
   * Build error with contextual information
   */
  protected buildError(message: string, error: any): Error {
    const moyasarError = error.response?.data as MoyasarErrorResponse | undefined
    
    let fullMessage = message
    if (moyasarError) {
      fullMessage += `: ${moyasarError.message}`
      if (moyasarError.errors) {
        const errorDetails = Object.entries(moyasarError.errors)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
          .join("; ")
        fullMessage += ` - ${errorDetails}`
      }
    } else if (error.message) {
      fullMessage += `: ${error.message}`
    }

    return new Error(fullMessage)
  }

  /**
   * Handle Moyasar-specific errors for retry logic
   */
  protected handleMoyasarError(error: any): HandledErrorType {
    if (!axios.isAxiosError(error)) {
      return { retry: false }
    }

    const axiosError = error as AxiosError<MoyasarErrorResponse>
    const errorType = axiosError.response?.data?.type

    switch (errorType) {
      case "invalid_request":
      case "authentication_error":
        // Client/auth errors - don't retry
        return { retry: false }
      
      case "api_error":
        // Server error - retry
        return { retry: true }
      
      default:
        // Network errors - retry
        return !axiosError.response ? { retry: true } : { retry: false }
    }
  }

  /**
   * Execute API call with exponential backoff retry logic
   */
  protected async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = this.options_.retryAttempts || 3,
    baseDelay: number = 1000,
    currentAttempt: number = 1
  ): Promise<T> {
    try {
      return await apiCall()
    } catch (error) {
      const handledError = this.handleMoyasarError(error)

      if (handledError.retry && currentAttempt <= maxRetries) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, currentAttempt - 1) * (0.5 + Math.random() * 0.5)
        await new Promise((resolve) => setTimeout(resolve, delay))
        
        return this.executeWithRetry(apiCall, maxRetries, baseDelay, currentAttempt + 1)
      }

      // Retries exhausted or shouldn't retry
      throw this.buildError(
        "An error occurred in Moyasar payment operation",
        error
      )
    }
  }

  /**
   * Map Moyasar payment status to Medusa payment session status
   */
  protected getStatus(payment: MoyasarPayment): {
    status: PaymentSessionStatus
    data: Record<string, unknown>
  } {
    const statusMap: Record<MoyasarPaymentStatus, PaymentSessionStatus> = {
      initiated: PaymentSessionStatus.PENDING,
      paid: PaymentSessionStatus.CAPTURED,
      authorized: PaymentSessionStatus.AUTHORIZED,
      captured: PaymentSessionStatus.CAPTURED,
      failed: PaymentSessionStatus.ERROR,
      voided: PaymentSessionStatus.CANCELED,
      refunded: PaymentSessionStatus.CAPTURED, // Refund tracked separately
      verified: PaymentSessionStatus.AUTHORIZED, // For tokenization
    }

    return {
      status: statusMap[payment.status] || PaymentSessionStatus.PENDING,
      data: payment as unknown as Record<string, unknown>,
    }
  }

  /**
   * Initiate a payment
   * 
   * Moyasar.js flow (Frontend creates payment):
   * 1. Create payment session in Medusa (this method)
   * 2. Frontend uses Moyasar.js to collect payment details and create payment
   * 3. Frontend gets Moyasar payment ID (e.g., pay_abc123)
   * 4. Frontend calls updatePaymentSessionWithPaymentId to store payment ID
   * 5. Backend verifies payment via authorizePayment/getPaymentStatus using payment_id
   * 
   * The session data stores:
   * - amount: in smallest currency unit
   * - currency: currency code
   * - description: for the payment
   * - callback_url: where Moyasar redirects after 3DS
   */
  async initiatePayment({
    currency_code,
    amount,
    data,
    context: _context,
  }: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amountInSmallestUnit = convertToSmallestUnit(amount, currency_code)

    const sessionData = {
      amount: amountInSmallestUnit,
      currency: currency_code.toUpperCase(),
      // Store original amount for validation when verifying payment
      amount_original: amount,
      amount_original_unit: amountInSmallestUnit,
    }

    return {
      id: "",
      status: PaymentSessionStatus.PENDING,
      data: {
        ...sessionData,
        provider_id: "moyasar",
      },
    }
  }

  /**
   * Authorize a payment (delegates to getPaymentStatus)
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return this.getPaymentStatus(input)
  }

  /**
   * Get payment status
   * 
   * The payment ID can come from:
   * 1. input.data.id - legacy/ 직접 created payments
   * 2. input.data.payment_id - payments created via frontend (Moyasar.js)
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    let paymentId = input?.data?.id as string | undefined
    
    if (!paymentId) {
      paymentId = input?.data?.payment_id as string | undefined
    }

    if (!paymentId) {
      throw this.buildError(
        "No payment ID provided while getting payment status",
        new Error("No payment ID provided")
      )
    }

    const payment = await this.executeWithRetry(() =>
      this.moyasarClient_.get<MoyasarPayment>(`/payments/${paymentId}`).then(res => res.data)
    )
    
    console.log('[Moyasar] Payment status from API:', payment.status)
    
    const statusResponse = this.getStatus(payment)

    return {
      status: statusResponse.status,
      data: {
        ...statusResponse.data,
        // Keep payment_id for reference
        payment_id: paymentId,
      },
    } as unknown as GetPaymentStatusOutput
  }

  /**
   * Cancel a payment (void)
   * 
   * Note: Can only void payments that are "authorized" but not yet "captured".
   * Already captured/paid payments cannot be voided - they must be refunded instead.
   */
  async cancelPayment({
    data,
    context,
  }: CancelPaymentInput): Promise<CancelPaymentOutput> {
    try {
      let paymentId = data?.id as string | undefined
      
      if (!paymentId) {
        paymentId = data?.payment_id as string | undefined
      }

      if (!paymentId) {
        return { data: data as Record<string, unknown> }
      }

      // Check current payment status first - can only void authorized payments
      const payment = await this.moyasarClient_.get<MoyasarPayment>(
        `/payments/${paymentId}`
      ).then(res => res.data)

      // If already captured/paid, we cannot void - payment is complete
      // Return success since the payment is already done
      if (payment.status === "captured" || payment.status === "paid") {
        console.log(`[Moyasar] Payment ${paymentId} already ${payment.status}, skipping void`)
        return { data: payment as unknown as Record<string, unknown> }
      }

      // If already voided, return success
      if (payment.status === "voided") {
        return { data: payment as unknown as Record<string, unknown> }
      }

      // Only void if authorized (not yet captured)
      const res = await this.executeWithRetry(() =>
        this.moyasarClient_.post<MoyasarPayment>(
          `/payments/${paymentId}/void`,
          {},
          {
            headers: context?.idempotency_key 
              ? { "Idempotency-Key": context.idempotency_key } 
              : {},
          }
        ).then(res => res.data)
      )
      
      return { data: res as unknown as Record<string, unknown> }
    } catch (error: any) {
      const handledError = this.handleMoyasarError(error)
      
      if (!handledError.retry) {
        let checkId = data?.id as string | undefined
        if (!checkId) {
          checkId = data?.payment_id as string | undefined
        }
        
        if (checkId) {
          try {
            const payment = await this.moyasarClient_.get<MoyasarPayment>(
              `/payments/${checkId}`
            ).then(res => res.data)
            
            if (payment.status === "voided") {
              return { data: payment as unknown as Record<string, unknown> }
            }
          } catch {
            // Ignore lookup error
          }
        }
      }

      throw this.buildError("An error occurred in cancelPayment", error)
    }
  }

  /**
   * Delete a payment (alias for cancelPayment)
   */
  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return await this.cancelPayment(input)
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment({
    data,
    context,
  }: CapturePaymentInput): Promise<CapturePaymentOutput> {
    let paymentId = data?.id as string | undefined
    
    if (!paymentId) {
      paymentId = data?.payment_id as string | undefined
    }

    try {
      const payment = await this.executeWithRetry(() =>
        this.moyasarClient_.post<MoyasarPayment>(
          `/payments/${paymentId}/capture`,
          {},
          {
            headers: context?.idempotency_key 
              ? { "Idempotency-Key": context.idempotency_key } 
              : {},
          }
        ).then(res => res.data)
      )
      
      return { data: payment as unknown as Record<string, unknown> }
    } catch (error: any) {
      const handledError = this.handleMoyasarError(error)
      
      if (!handledError.retry && paymentId) {
        try {
          const payment = await this.moyasarClient_.get<MoyasarPayment>(
            `/payments/${paymentId}`
          ).then(res => res.data)
          
          if (payment.status === "captured" || payment.status === "paid") {
            return { data: payment as unknown as Record<string, unknown> }
          }
        } catch {
          // Ignore lookup error
        }
      }

      throw this.buildError("An error occurred in capturePayment", error)
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment({
    data,
    amount,
    context,
  }: RefundPaymentInput): Promise<RefundPaymentOutput> {
    let paymentId = data?.id as string | undefined
    
    if (!paymentId) {
      paymentId = data?.payment_id as string | undefined
    }
    
    const currency = (data as any)?.currency as string

    const refundData = amount
      ? { amount: convertToSmallestUnit(amount, currency) }
      : {}

    try {
      const payment = await this.executeWithRetry(() =>
        this.moyasarClient_.post<MoyasarPayment>(
          `/payments/${paymentId}/refund`,
          refundData,
          {
            headers: context?.idempotency_key 
              ? { "Idempotency-Key": context.idempotency_key } 
              : {},
          }
        ).then(res => res.data)
      )
      
      return { data: payment as unknown as Record<string, unknown> }
    } catch (error: any) {
      const handledError = this.handleMoyasarError(error)
      
      if (!handledError.retry && paymentId) {
        try {
          const payment = await this.moyasarClient_.get<MoyasarPayment>(
            `/payments/${paymentId}`
          ).then(res => res.data)
          
          if (payment.status === "refunded") {
            return { data: payment as unknown as Record<string, unknown> }
          }
        } catch {
          // Ignore lookup error
        }
      }

      throw this.buildError("An error occurred in refundPayment", error)
    }
  }

  /**
   * Retrieve payment details
   */
  async retrievePayment({
    data,
  }: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const id = (data?.payment_id || data?.id) as string

    if (!id) {
      return { data: {} }
    }

    const payment = await this.moyasarClient_.get<MoyasarPayment>(
      `/payments/${id}`
    ).then(res => res.data)

    return { data: payment as unknown as Record<string, unknown> }
  }

  /**
   * Update payment
   */
  async updatePayment({
    data,
    context,
  }: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const id = (data?.payment_id || data?.id) as string

    if (!id) {
      return { data: {} }
    }

    const updateData: any = {}
    
    if ((data as any)?.description) {
      updateData.description = (data as any).description
    }
    
    if ((data as any)?.metadata) {
      updateData.metadata = (data as any).metadata
    }

    if (Object.keys(updateData).length > 0) {
      const payment = await this.moyasarClient_.patch<MoyasarPayment>(
        `/payments/${id}`,
        updateData
      ).then(res => res.data)

      return { data: payment as unknown as Record<string, unknown> }
    }

    // No updates, just return current state
    return this.retrievePayment({ data: { payment_id: id } })
  }

  /**
   * Handle webhook events from Moyasar
   */
  async getWebhookActionAndData(
    data: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    try {
      const webhookPayload = data.data as unknown as MoyasarWebhookPayload

      // Verify webhook authenticity
      if (this.options_.webhookSecret) {
        if (webhookPayload.secret_token !== this.options_.webhookSecret) {
          throw new Error("Invalid webhook signature")
        }
      }

      const payment = webhookPayload.data
      const eventType = webhookPayload.type

      const eventActionMap: Partial<Record<MoyasarWebhookEvent, PaymentActions>> = {
        payment_paid: PaymentActions.SUCCESSFUL,
        payment_failed: PaymentActions.FAILED,
        payment_authorized: PaymentActions.AUTHORIZED,
        payment_captured: PaymentActions.SUCCESSFUL,
        payment_voided: PaymentActions.CANCELED,
        payment_verified: PaymentActions.AUTHORIZED,
        payment_refunded: PaymentActions.NOT_SUPPORTED,
      }

      const action = eventActionMap[eventType] || PaymentActions.NOT_SUPPORTED

      const sessionId = payment.metadata?.session_id as string | undefined

      return {
        action,
        data: {
          session_id: sessionId || payment.id,
          amount: convertFromSmallestUnit(payment.amount, payment.currency),
        },
      }
    } catch (error) {
      throw this.buildError("Failed to process webhook", error)
    }
  }
}

export { MoyasarBase }
