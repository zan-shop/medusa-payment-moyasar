/**
 * Moyasar Payment Provider Module
 * 
 * This module provides a unified payment provider service for Moyasar payment 
 * gateway integration with Medusa v2. It supports multiple payment methods:
 * 
 * - Credit Card (Visa, Mastercard, Mada, Amex)
 * - Apple Pay
 * - STC Pay
 * - Samsung Pay
 * 
 * The payment method is dynamically selected on the frontend using Moyasar.js
 * library which displays tabs for different payment methods in a single form.
 * 
 * This follows the Stripe pattern: one provider handles multiple payment methods.
 * 
 * @see https://docs.moyasar.com/api/
 */

import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { MoyasarProviderService } from "./services"

const services = [
  MoyasarProviderService,
]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})
