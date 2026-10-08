import { render, screen } from "@testing-library/react";

import ProductImage from "@/components/ProductImage";

describe("ProductImage", () => {
  it("renders a native img with src and alt", () => {
    render(
      <ProductImage
        src="https://example.com/product.jpg"
        alt="Fresh milk"
      />,
    );

    const img = screen.getByRole("img", { name: "Fresh milk" });
    expect(img).toHaveAttribute("src", "https://example.com/product.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("applies fill layout classes when fill is true", () => {
    render(
      <ProductImage
        src="https://example.com/product.jpg"
        alt="Tomatoes"
        fill
      />,
    );

    expect(screen.getByRole("img")).toHaveClass("absolute", "inset-0");
  });

  it("merges custom className", () => {
    render(
      <ProductImage
        src="https://example.com/product.jpg"
        alt="Rice"
        className="rounded-xl"
      />,
    );

    expect(screen.getByRole("img")).toHaveClass("rounded-xl");
  });
});
