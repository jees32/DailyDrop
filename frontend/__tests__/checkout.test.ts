import {
  FREE_DELIVERY_MIN,
  formatPrice,
  getCheckoutTotals,
  lineTotal,
} from "@/lib/checkout";

describe("checkout helpers", () => {
  it("formats INR prices", () => {
    expect(formatPrice(199)).toMatch(/199/);
  });

  it("calculates line total from price string and quantity", () => {
    expect(lineTotal("45.00", 2)).toBe(90);
  });

  it("applies delivery fee below free-delivery threshold", () => {
    const totals = getCheckoutTotals([{ price: "50.00", quantity: 1 }]);

    expect(totals.subtotal).toBe(50);
    expect(totals.delivery).toBe(20);
    expect(totals.tax).toBeCloseTo(2.5);
    expect(totals.total).toBeCloseTo(72.5);
  });

  it("waives delivery at or above free-delivery minimum", () => {
    const totals = getCheckoutTotals([
      { price: String(FREE_DELIVERY_MIN), quantity: 1 },
    ]);

    expect(totals.delivery).toBe(0);
  });

  it("returns zero totals for an empty cart", () => {
    const totals = getCheckoutTotals([]);

    expect(totals.subtotal).toBe(0);
    expect(totals.delivery).toBe(0);
    expect(totals.total).toBe(0);
  });
});
