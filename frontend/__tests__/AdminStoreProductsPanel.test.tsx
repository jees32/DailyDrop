import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminStoreProductsPanel from "@/components/AdminStoreProductsPanel";
import {
  createAdminProduct,
  fetchAdminStoreProducts,
  updateAdminProduct,
} from "@/lib/api";
import type { AdminStoreSummary, Product } from "@/lib/types";

jest.mock("../lib/api", () => ({
  fetchAdminStoreProducts: jest.fn(),
  createAdminProduct: jest.fn(),
  updateAdminProduct: jest.fn(),
}));

const mockFetch = fetchAdminStoreProducts as jest.MockedFunction<
  typeof fetchAdminStoreProducts
>;
const mockCreate = createAdminProduct as jest.MockedFunction<
  typeof createAdminProduct
>;
const mockUpdate = updateAdminProduct as jest.MockedFunction<
  typeof updateAdminProduct
>;

const store: AdminStoreSummary = {
  id: "store-1",
  store_name: "Green Mart",
  town: "Kochi",
  is_active: true,
  merchant_id: "merchant-1",
  merchant_email: "merchant@example.com",
  merchant_name: "Merchant One",
  product_count: 1,
  created_at: "2026-01-01T00:00:00Z",
};

const products: Product[] = [
  {
    id: "prod-1",
    store_id: "store-1",
    name: "Tomatoes",
    description: "Fresh",
    price: "45.00",
    stock_count: 10,
    category: "Vegetables",
    image_url: "https://example.com/tomato.jpg",
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("AdminStoreProductsPanel", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockFetch.mockResolvedValue(products);
  });

  it("loads and displays store products", async () => {
    render(
      <AdminStoreProductsPanel
        store={store}
        accessToken="token"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText("Tomatoes")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("token", "store-1");
    expect(screen.getByText(/Products — Green Mart/i)).toBeInTheDocument();
  });

  it("shows an error when product loading fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network down"));

    render(
      <AdminStoreProductsPanel
        store={store}
        accessToken="token"
        onClose={jest.fn()}
      />,
    );

    expect(await screen.findByText("Network down")).toBeInTheDocument();
  });

  it("shows validation error when price is missing on submit", async () => {
    const user = userEvent.setup();

    render(
      <AdminStoreProductsPanel
        store={store}
        accessToken="token"
        onClose={jest.fn()}
      />,
    );

    await screen.findByText("Tomatoes");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    await user.type(screen.getByPlaceholderText("Fresh milk 1L"), "Salt");
    fireEvent.submit(screen.getByText("New product").closest("form")!);

    expect(await screen.findByText("Enter a valid price.")).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a product on valid submit", async () => {
    const user = userEvent.setup();
    const onUpdated = jest.fn();
    mockCreate.mockResolvedValue({
      ...products[0],
      id: "prod-2",
      name: "Rice",
    });

    render(
      <AdminStoreProductsPanel
        store={store}
        accessToken="token"
        onClose={jest.fn()}
        onUpdated={onUpdated}
      />,
    );

    await screen.findByText("Tomatoes");
    await user.click(screen.getByRole("button", { name: /add product/i }));

    await user.type(screen.getByPlaceholderText("Fresh milk 1L"), "Rice");
    await user.type(screen.getByPlaceholderText("45"), "120");
    await user.click(screen.getByRole("button", { name: "Add product" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        "token",
        "store-1",
        expect.objectContaining({
          name: "Rice",
          price: 120,
        }),
      );
    });
    expect(onUpdated).toHaveBeenCalled();
  });

  it("opens edit form and updates a product", async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue({ ...products[0], name: "Cherry Tomatoes" });

    render(
      <AdminStoreProductsPanel
        store={store}
        accessToken="token"
        onClose={jest.fn()}
      />,
    );

    await screen.findByText("Tomatoes");
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    expect(screen.getByText("Edit product")).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue("Tomatoes");
    await user.clear(nameInput);
    await user.type(nameInput, "Cherry Tomatoes");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "token",
        "store-1",
        "prod-1",
        expect.objectContaining({ name: "Cherry Tomatoes" }),
      );
    });
  });
});
