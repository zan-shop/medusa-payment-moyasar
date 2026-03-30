/**
 * Currency conversion utilities for Moyasar payments
 * 
 * Moyasar expects amounts in the smallest currency unit:
 * - 1.00 SAR = 100 (halalas)
 * - 1.00 KWD = 1000 (fils)
 * - 1 JPY = 1 (no decimal)
 */

import { BigNumber } from "@medusajs/framework/utils"
import type { BigNumberInput } from "@medusajs/framework/types"

/**
 * Currency multipliers for converting to smallest unit
 * Based on ISO 4217 standard decimal places
 */
const CURRENCY_MULTIPLIERS: Record<string, number> = {
  // Zero decimal currencies (no fractional unit)
  BIF: 1, // Burundian Franc
  CLP: 1, // Chilean Peso
  DJF: 1, // Djiboutian Franc
  GNF: 1, // Guinean Franc
  JPY: 1, // Japanese Yen
  KMF: 1, // Comorian Franc
  KRW: 1, // South Korean Won
  MGA: 1, // Malagasy Ariary
  PYG: 1, // Paraguayan Guaraní
  RWF: 1, // Rwandan Franc
  UGX: 1, // Ugandan Shilling
  VND: 1, // Vietnamese Đồng
  VUV: 1, // Vanuatu Vatu
  XAF: 1, // Central African CFA Franc
  XOF: 1, // West African CFA Franc
  XPF: 1, // CFP Franc

  // Three decimal currencies
  BHD: 1000, // Bahraini Dinar
  IQD: 1000, // Iraqi Dinar
  JOD: 1000, // Jordanian Dinar
  KWD: 1000, // Kuwaiti Dinar
  LYD: 1000, // Libyan Dinar
  OMR: 1000, // Omani Rial
  TND: 1000, // Tunisian Dinar

  // Two decimal currencies (default for most currencies including SAR, USD, EUR)
  // Not listed explicitly - will use default multiplier of 100
}

/**
 * Get the multiplier for converting a currency to its smallest unit
 * 
 * @param currency - ISO 4217 currency code (e.g., "SAR", "USD", "KWD")
 * @returns The multiplier to convert to smallest unit
 * 
 * @example
 * getCurrencyMultiplier("SAR") // returns 100 (2 decimals)
 * getCurrencyMultiplier("KWD") // returns 1000 (3 decimals)
 * getCurrencyMultiplier("JPY") // returns 1 (0 decimals)
 */
export function getCurrencyMultiplier(currency: string): number {
  const upperCurrency = currency.toUpperCase()
  return CURRENCY_MULTIPLIERS[upperCurrency] ?? 100 // Default to 2 decimals
}

/**
 * Get the number of decimal places for a currency
 * 
 * @param currency - ISO 4217 currency code
 * @returns Number of decimal places
 */
export function getCurrencyDecimals(currency: string): number {
  const multiplier = getCurrencyMultiplier(currency)
  return Math.log10(multiplier)
}

/**
 * Convert an amount to the smallest currency unit for Moyasar API
 * 
 * @param amount - The amount in standard currency units (e.g., 10.50 SAR)
 * @param currency - ISO 4217 currency code (e.g., "SAR")
 * @returns The amount in smallest currency unit (e.g., 1050 for 10.50 SAR)
 * 
 * @example
 * convertToSmallestUnit(10.50, "SAR") // returns 1050
 * convertToSmallestUnit(5.124, "KWD") // returns 5124
 * convertToSmallestUnit(1000, "JPY") // returns 1000
 */
export function convertToSmallestUnit(
  amount: BigNumberInput,
  currency: string
): number {
  const multiplier = getCurrencyMultiplier(currency)
  const bigAmount = new BigNumber(amount)
  
  // Multiply by the multiplier and round to nearest integer
  const result = bigAmount.numeric * multiplier
  const smallestUnit = Math.round(result)
  
  return smallestUnit
}

/**
 * Convert an amount from smallest currency unit to standard currency units
 * 
 * @param amount - The amount in smallest currency unit (e.g., 1050 for SAR)
 * @param currency - ISO 4217 currency code (e.g., "SAR")
 * @returns The amount in standard currency units (e.g., 10.50)
 * 
 * @example
 * convertFromSmallestUnit(1050, "SAR") // returns 10.50
 * convertFromSmallestUnit(5124, "KWD") // returns 5.124
 * convertFromSmallestUnit(1000, "JPY") // returns 1000
 */
export function convertFromSmallestUnit(
  amount: BigNumberInput,
  currency: string
): number {
  const multiplier = getCurrencyMultiplier(currency)
  const bigAmount = new BigNumber(amount)
  
  // Divide by the multiplier
  const standardUnit = bigAmount.numeric / multiplier
  
  return standardUnit
}

/**
 * Format an amount with currency symbol
 * 
 * @param amount - The amount in standard currency units
 * @param currency - ISO 4217 currency code
 * @returns Formatted string (e.g., "10.50 SAR")
 * 
 * @example
 * formatAmount(10.50, "SAR") // returns "10.50 SAR"
 * formatAmount(5.124, "KWD") // returns "5.124 KWD"
 */
export function formatAmount(amount: BigNumberInput, currency: string): string {
  const decimals = getCurrencyDecimals(currency)
  const bigAmount = new BigNumber(amount)
  return `${bigAmount.numeric.toFixed(decimals)} ${currency.toUpperCase()}`
}
