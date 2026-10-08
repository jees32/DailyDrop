import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";

const mockAddItem = jest.fn();

jest.mock("../context/CartContext", () => ({
  useCart: () => ({ addItem: mockAddItem }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const inStockProduct: Product = {
  id: "prod-1",
  store_id: "store-1",
  name: "Tomatoes",
  description: "Fresh local tomatoes",
  price: "45.00",
  stock_count: 10,
  category: "Vegetables",
  image_url: "https://example.com/tomato.jpg",
  created_at: "2026-01-01T00:00:00Z",
};

describe("ProductCard", () => {
  beforeEach(() => {
    mockAddItem.mockReset();
  });

  it("renders product details and store link", () => {
    render(
      <ProductCard
        product={inStockProduct}
        storeName="Green Mart"
        storeHref="/stores/store-1"
      />,
    );

    expect(screen.getByRole("heading", { name: "Tomatoes" })).toBeInTheDocument();
    expect(screen.getByText("Vegetables")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Green Mart" })).toHaveAttribute(
      "href",
      "/stores/store-1",
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("calls addItem when Add is clicked", async () => {
    const user = userEvent.setup();
    mockAddItem.mockReturnValue("added");

    render(<ProductCard product={inStockProduct} />);

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mockAddItem).toHaveBeenCalledWith(inStockProduct);
  });

  it("disables Add and shows overlay when out of stock", () => {
    render(
      <ProductCard
        product={{ ...inStockProduct, stock_count: 0 }}
      />,
    );

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("shows replace-cart dialog on store conflict", async () => {
    const user = userEvent.setup();
    mockAddItem.mockReturnValue("store_conflict");

    render(
      <ProductCard product={inStockProduct} storeName="Green Mart" />,
    );

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Switch store?")).toBeInTheDocument();
    expect(
      screen.getByText(/replace your cart to add from Green Mart/i),
    ).toBeInTheDocument();
  });

  it("confirms cart replacement from the dialog", async () => {
    const user = userEvent.setup();
    mockAddItem
      .mockReturnValueOnce("store_conflict")
      .mockReturnValueOnce("added");

    render(<ProductCard product={inStockProduct} />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Replace cart" }));

    expect(mockAddItem).toHaveBeenLastCalledWith(inStockProduct, {
      replaceExisting: true,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
