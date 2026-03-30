import { MoyasarBase } from "../core/moyasar-base"

/**
 * Moyasar Payment Provider
 * 
 * Unified payment provider that handles all Moyasar payment methods:
 * - Credit Card (Visa, Mastercard, Mada, Amex)
 * - Apple Pay
 * - STC Pay
 * - Samsung Pay
 * 
 * The payment method is dynamically determined from the frontend by passing
 * the source.type in the payment session data. The Moyasar.js library on the
 * frontend displays a form with tabs for all enabled payment methods.
 * 
 * This follows the Stripe pattern where one provider handles multiple payment methods
 * rather than having separate providers for each method.
 * 
 * Identifier: "moyasar"
 * 
 * @see https://docs.moyasar.com/guides/card-payments/basic-integration
 */
export default class MoyasarProviderService extends MoyasarBase {
  static identifier = "moyasar"

  /**
   * Constructor
   * @param container - Medusa DI container
   * @param options - Moyasar configuration options
   */
  constructor(container: any, options: any) {
    // @ts-ignore - Required by Medusa's payment provider pattern
    super(container, options)
  }
}
