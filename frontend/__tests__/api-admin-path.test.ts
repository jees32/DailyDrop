import { buildAdminListPath } from "@/lib/api";

describe("buildAdminListPath", () => {
  it("returns the base path when params are empty", () => {
    expect(buildAdminListPath("/api/v1/admin/orders", {})).toBe(
      "/api/v1/admin/orders",
    );
  });

  it("skips undefined and empty string params", () => {
    expect(
      buildAdminListPath("/api/v1/admin/stores", {
        q: "",
        limit: undefined,
        offset: 20,
      }),
    ).toBe("/api/v1/admin/stores?offset=20");
  });

  it("builds a relative query string for authFetch", () => {
    expect(
      buildAdminListPath("/api/v1/admin/users", {
        q: "kochi",
        role: "merchant",
        limit: 10,
        offset: 0,
      }),
    ).toBe("/api/v1/admin/users?q=kochi&role=merchant&limit=10&offset=0");
  });

  it("does not prepend the API host", () => {
    const path = buildAdminListPath("/api/v1/admin/orders", { q: "test" });
    expect(path.startsWith("http")).toBe(false);
  });
});
