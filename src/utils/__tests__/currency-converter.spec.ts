import {
  convertToSmallestUnit,
  convertFromSmallestUnit,
  getCurrencyMultiplier,
  getCurrencyDecimals,
  formatAmount,
} from "../currency-converter"

describe("Currency Converter Utilities", () => {
  describe("getCurrencyMultiplier", () => {
    it("should return 1 for zero-decimal currencies", () => {
      expect(getCurrencyMultiplier("JPY")).toBe(1)
      expect(getCurrencyMultiplier("KRW")).toBe(1)
      expect(getCurrencyMultiplier("VND")).toBe(1)
    })

    it("should return 1000 for three-decimal currencies", () => {
      expect(getCurrencyMultiplier("KWD")).toBe(1000)
      expect(getCurrencyMultiplier("BHD")).toBe(1000)
      expect(getCurrencyMultiplier("OMR")).toBe(1000)
    })

    it("should return 100 for two-decimal currencies (default)", () => {
      expect(getCurrencyMultiplier("SAR")).toBe(100)
      expect(getCurrencyMultiplier("USD")).toBe(100)
      expect(getCurrencyMultiplier("EUR")).toBe(100)
      expect(getCurrencyMultiplier("AED")).toBe(100)
    })

    it("should handle lowercase currency codes", () => {
      expect(getCurrencyMultiplier("sar")).toBe(100)
      expect(getCurrencyMultiplier("kwd")).toBe(1000)
      expect(getCurrencyMultiplier("jpy")).toBe(1)
    })
  })

  describe("getCurrencyDecimals", () => {
    it("should return correct decimal places", () => {
      expect(getCurrencyDecimals("JPY")).toBe(0)
      expect(getCurrencyDecimals("SAR")).toBe(2)
      expect(getCurrencyDecimals("KWD")).toBe(3)
    })
  })

  describe("convertToSmallestUnit", () => {
    it("should convert SAR correctly (2 decimals)", () => {
      expect(convertToSmallestUnit(10.5, "SAR")).toBe(1050)
      expect(convertToSmallestUnit(100.54, "SAR")).toBe(10054)
      expect(convertToSmallestUnit(1, "SAR")).toBe(100)
      expect(convertToSmallestUnit(0.01, "SAR")).toBe(1)
    })

    it("should convert KWD correctly (3 decimals)", () => {
      expect(convertToSmallestUnit(5.124, "KWD")).toBe(5124)
      expect(convertToSmallestUnit(1, "KWD")).toBe(1000)
      expect(convertToSmallestUnit(0.001, "KWD")).toBe(1)
    })

    it("should convert JPY correctly (0 decimals)", () => {
      expect(convertToSmallestUnit(1000, "JPY")).toBe(1000)
      expect(convertToSmallestUnit(50, "JPY")).toBe(50)
      expect(convertToSmallestUnit(1, "JPY")).toBe(1)
    })

    it("should round correctly for fractional results", () => {
      expect(convertToSmallestUnit(10.555, "SAR")).toBe(1056) // Rounds up
      expect(convertToSmallestUnit(10.554, "SAR")).toBe(1055) // Rounds down
    })

    it("should handle string inputs", () => {
      expect(convertToSmallestUnit("10.50", "SAR")).toBe(1050)
      expect(convertToSmallestUnit("5.124", "KWD")).toBe(5124)
    })
  })

  describe("convertFromSmallestUnit", () => {
    it("should convert from smallest unit for SAR (2 decimals)", () => {
      expect(convertFromSmallestUnit(1050, "SAR")).toBe(10.5)
      expect(convertFromSmallestUnit(10054, "SAR")).toBe(100.54)
      expect(convertFromSmallestUnit(100, "SAR")).toBe(1)
      expect(convertFromSmallestUnit(1, "SAR")).toBe(0.01)
    })

    it("should convert from smallest unit for KWD (3 decimals)", () => {
      expect(convertFromSmallestUnit(5124, "KWD")).toBe(5.124)
      expect(convertFromSmallestUnit(1000, "KWD")).toBe(1)
      expect(convertFromSmallestUnit(1, "KWD")).toBe(0.001)
    })

    it("should convert from smallest unit for JPY (0 decimals)", () => {
      expect(convertFromSmallestUnit(1000, "JPY")).toBe(1000)
      expect(convertFromSmallestUnit(50, "JPY")).toBe(50)
      expect(convertFromSmallestUnit(1, "JPY")).toBe(1)
    })
  })

  describe("formatAmount", () => {
    it("should format amounts with correct decimal places", () => {
      expect(formatAmount(10.5, "SAR")).toBe("10.50 SAR")
      expect(formatAmount(5.124, "KWD")).toBe("5.124 KWD")
      expect(formatAmount(1000, "JPY")).toBe("1000 JPY")
    })

    it("should handle uppercase currency codes", () => {
      expect(formatAmount(10.5, "sar")).toBe("10.50 SAR")
    })
  })

  describe("round-trip conversion", () => {
    it("should maintain precision in round-trip conversions", () => {
      const testCases = [
        { amount: 10.5, currency: "SAR" },
        { amount: 100.54, currency: "SAR" },
        { amount: 5.124, currency: "KWD" },
        { amount: 1000, currency: "JPY" },
        { amount: 999.999, currency: "KWD" },
      ]

      testCases.forEach(({ amount, currency }) => {
        const smallest = convertToSmallestUnit(amount, currency)
        const back = convertFromSmallestUnit(smallest, currency)
        // Allow small floating point differences
        expect(Math.abs(back - amount)).toBeLessThan(0.001)
      })
    })
  })
})
