import { toast } from "sonner";

import { formatOrderNumber } from "@/lib/order";
import {
  toastOrderCancelled,
  toastOrderError,
  toastOrderPlaced,
} from "@/lib/toast";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const orderId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("order toasts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("announces a placed order with the DD- number", () => {
    toastOrderPlaced(orderId);
    expect(toast.success).toHaveBeenCalledWith(
      `Order #${formatOrderNumber(orderId)} placed`,
      expect.objectContaining({
        description: "The store will accept it shortly.",
      }),
    );
  });

  it("announces a cancelled order", () => {
    toastOrderCancelled(orderId);
    expect(toast.success).toHaveBeenCalledWith(
      `Order #${formatOrderNumber(orderId)} cancelled`,
      expect.objectContaining({ description: "This cannot be undone." }),
    );
  });

  it("shows API errors", () => {
    toastOrderError("Stock changed");
    expect(toast.error).toHaveBeenCalledWith("Stock changed");
  });
});
