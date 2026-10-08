import {
  getUserDisplayName,
  getUserInitial,
  needsOnboarding,
} from "@/lib/user";
import type { UserProfile } from "@/lib/types";

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    email: "user@example.com",
    full_name: "Jane Doe",
    phone_number: null,
    role: "consumer",
    is_active: true,
    is_verified: true,
    address_count: 0,
    has_default_address: false,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getUserDisplayName", () => {
  it("prefers full_name when present", () => {
    expect(getUserDisplayName(profile())).toBe("Jane Doe");
  });

  it("falls back to profile email", () => {
    expect(
      getUserDisplayName(profile({ full_name: null, email: "a@b.com" })),
    ).toBe("a@b.com");
  });

  it("falls back to provided email when profile is null", () => {
    expect(getUserDisplayName(null, "fallback@example.com")).toBe(
      "fallback@example.com",
    );
  });

  it('returns "Account" when nothing else is available', () => {
    expect(getUserDisplayName(null)).toBe("Account");
  });
});

describe("getUserInitial", () => {
  it("returns uppercase first letter", () => {
    expect(getUserInitial("jane")).toBe("J");
  });

  it('returns "?" for empty input', () => {
    expect(getUserInitial("   ")).toBe("?");
  });
});

describe("needsOnboarding", () => {
  it("returns true when profile is missing", () => {
    expect(needsOnboarding(null)).toBe(true);
  });

  it("returns false when user has a default address", () => {
    expect(needsOnboarding(profile({ has_default_address: true }))).toBe(false);
  });

  it("returns false when user has at least one saved address", () => {
    expect(needsOnboarding(profile({ address_count: 1 }))).toBe(false);
  });

  it("returns true when user has no address and no full name", () => {
    expect(
      needsOnboarding(profile({ full_name: null, address_count: 0 })),
    ).toBe(true);
  });

  it("returns true when full name is only whitespace", () => {
    expect(
      needsOnboarding(profile({ full_name: "   ", address_count: 0 })),
    ).toBe(true);
  });
});
