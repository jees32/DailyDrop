import {
  ORDER_DETAIL_POLL_MS,
  queryErrorMessage,
  queryKeys,
  STAFF_ORDERS_POLL_MS,
} from "../lib/query";

describe("query helpers", () => {
  it("polls staff dashboards faster than the customer order page", () => {
    expect(STAFF_ORDERS_POLL_MS).toBe(8_000);
    expect(ORDER_DETAIL_POLL_MS).toBe(20_000);
  });

  it("keeps order query keys stable without storing the JWT", () => {
    expect(queryKeys.merchantOrders("user-1")).toEqual([
      "merchant-orders",
      "user-1",
    ]);
    expect(queryKeys.deliveryOrders("user-1")).toEqual([
      "delivery-orders",
      "user-1",
    ]);
    expect(queryKeys.adminOrdersRoot("user-1")).toEqual([
      "admin-orders",
      "user-1",
    ]);
    expect(
      queryKeys.adminOrders("user-1", {
        q: "moolan",
        filter: "active",
        offset: 20,
      }),
    ).toEqual([
      "admin-orders",
      "user-1",
      { q: "moolan", filter: "active", offset: 20 },
    ]);
    expect(queryKeys.orderDetail("order-1")).toEqual(["order", "order-1"]);
  });

  it("returns null when there is no query error", () => {
    expect(queryErrorMessage(null, "fallback")).toBeNull();
    expect(queryErrorMessage(undefined, "fallback")).toBeNull();
  });

  it("prefers Error.message over the fallback", () => {
    expect(queryErrorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(queryErrorMessage("weird", "fallback")).toBe("fallback");
  });
});
