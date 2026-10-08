import type { UserProfile } from "@/lib/types";

export function getUserDisplayName(
  profile: UserProfile | null,
  fallbackEmail?: string | null,
): string {
  const name = profile?.full_name?.trim();
  if (name) {
    return name;
  }
  return profile?.email ?? fallbackEmail ?? "Account";
}

export function getUserInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }
  return trimmed.charAt(0).toUpperCase();
}

export function needsOnboarding(profile: UserProfile | null): boolean {
  if (!profile) {
    return true;
  }

  const hasSavedAddress =
    profile.has_default_address || profile.address_count > 0;

  // Address added via Account → Addresses may exist without full_name on the profile.
  if (hasSavedAddress) {
    return false;
  }

  if (!profile.full_name?.trim()) {
    return true;
  }

  return true;
}
