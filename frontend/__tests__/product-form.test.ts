import {
  emptyProductForm,
  parseProductForm,
  productFormFromProduct,
} from "@/lib/product-form";
import type { Product } from "@/lib/types";

const sampleProduct: Product = {
  id: "prod-1",
  store_id: "store-1",
  name: "Tomatoes",
  description: "Fresh local tomatoes",
  price: "45.00",
  stock_count: 12,
  category: "Vegetables",
  image_url: "https://example.com/tomato.jpg",
  created_at: "2026-01-01T00:00:00Z",
};

describe("emptyProductForm", () => {
  it("returns defaults for grocery", () => {
    expect(emptyProductForm()).toEqual({
      name: "",
      price: "",
      stock: "0",
      category: "Grocery",
      description: "",
      imageUrl: "",
    });
  });

  it("uses the provided default category", () => {
    expect(emptyProductForm("Fish").category).toBe("Fish");
  });
});

describe("productFormFromProduct", () => {
  it("maps API product fields into form state", () => {
    expect(productFormFromProduct(sampleProduct)).toEqual({
      name: "Tomatoes",
      price: "45.00",
      stock: "12",
      category: "Vegetables",
      description: "Fresh local tomatoes",
      imageUrl: "https://example.com/tomato.jpg",
    });
  });

  it("handles nullable description and image_url", () => {
    expect(
      productFormFromProduct({
        ...sampleProduct,
        description: null,
        image_url: null,
      }),
    ).toEqual({
      name: "Tomatoes",
      price: "45.00",
      stock: "12",
      category: "Vegetables",
      description: "",
      imageUrl: "",
    });
  });
});

  describe("parseProductForm", () => {
    it("parses valid form state into API payload", () => {
      const result = parseProductForm({
        name: "  Rice  ",
        price: "120.5",
        stock: "8",
        category: "Grocery",
        description: "  Basmati  ",
        imageUrl: " https://example.com/rice.jpg ",
      });

      expect(result.error).toBeUndefined();
      expect(result.payload).toEqual({
        name: "Rice",
        price: 120.5,
        stock_count: 8,
        category: "Grocery",
        description: "Basmati",
        image_url: "https://example.com/rice.jpg",
      });
    });

    it("omits optional empty strings", () => {
      const result = parseProductForm({
        ...emptyProductForm(),
        name: "Salt",
        price: "10",
        stock: "0",
      });

      expect(result.payload).toEqual({
        name: "Salt",
        price: 10,
        stock_count: 0,
        category: "Grocery",
        description: undefined,
        image_url: undefined,
      });
    });

  it("requires a product name", () => {
    expect(parseProductForm(emptyProductForm()).error).toBe(
      "Product name is required.",
    );
  });

  it("rejects invalid price", () => {
    const result = parseProductForm({
      ...emptyProductForm(),
      name: "Milk",
      price: "abc",
      stock: "1",
    });

    expect(result.error).toBe("Enter a valid price.");
  });

  it("rejects negative stock", () => {
    const result = parseProductForm({
      ...emptyProductForm(),
      name: "Milk",
      price: "20",
      stock: "-1",
    });

    expect(result.error).toBe("Stock must be zero or greater.");
  });
});
