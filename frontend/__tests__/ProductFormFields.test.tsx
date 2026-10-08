import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import ProductFormFields from "@/components/ProductFormFields";
import { emptyProductForm, type ProductFormState } from "@/lib/product-form";

function renderForm(
  value: ProductFormState,
  onChange: jest.Mock,
  idPrefix = "product",
) {
  return render(
    <ProductFormFields value={value} onChange={onChange} idPrefix={idPrefix} />,
  );
}

describe("ProductFormFields", () => {
  it("renders current form values", () => {
    renderForm(
      {
        name: "Tomatoes",
        price: "45",
        stock: "10",
        category: "Vegetables",
        description: "Fresh local",
        imageUrl: "https://example.com/tomato.jpg",
      },
      jest.fn(),
    );

    expect(screen.getByDisplayValue("Tomatoes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("45")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Fresh local")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://example.com/tomato.jpg"),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("Vegetables");
  });

  it("calls onChange when the name field is edited", () => {
    const onChange = jest.fn();
    renderForm(emptyProductForm(), onChange);

    fireEvent.change(screen.getByPlaceholderText("Fresh milk 1L"), {
      target: { value: "Milk" },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Milk" }),
    );
  });

  it("updates the displayed name when parent state changes", async () => {
    const user = userEvent.setup();

    function StatefulForm() {
      const [value, setValue] = useState(emptyProductForm());
      return <ProductFormFields value={value} onChange={setValue} />;
    }

    render(<StatefulForm />);

    const nameInput = screen.getByPlaceholderText("Fresh milk 1L");
    await user.type(nameInput, "Milk");

    expect(nameInput).toHaveValue("Milk");
  });

  it("calls onChange when category is changed", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    renderForm(emptyProductForm(), onChange);

    await user.selectOptions(screen.getByRole("combobox"), "Fish");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ category: "Fish" }),
    );
  });

  it("uses idPrefix on input ids", () => {
    renderForm(emptyProductForm(), jest.fn(), "admin-edit");

    expect(document.getElementById("admin-edit-name")).toBeInTheDocument();
    expect(document.getElementById("admin-edit-price")).toBeInTheDocument();
    expect(document.getElementById("admin-edit-category")).toBeInTheDocument();
  });
});
