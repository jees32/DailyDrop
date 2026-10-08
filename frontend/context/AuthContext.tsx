"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
    } from "react";

import { fetchAddresses, loadUserProfile } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { UserAddress, UserProfile } from "@/lib/types";
import { needsOnboarding as checkNeedsOnboarding } from "@/lib/user";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  addresses: UserAddress[];
  loading: boolean;
  needsOnboarding: boolean;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUserData = useCallback(
    async (accessToken?: string) => {
      const token = accessToken ?? session?.access_token;
      if (!token) {
        setProfile(null);
        setAddresses([]);
        return;
      }

      try {
        const syncedProfile = await loadUserProfile(token);
        setProfile(syncedProfile);

        if (syncedProfile.address_count > 0) {
          const userAddresses = await fetchAddresses(token);
          setAddresses(userAddresses);
        } else {
          setAddresses([]);
        }
      } catch {
        setProfile(null);
        setAddresses([]);
      }
    },
    [session?.access_token],
  );

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }

      setSession(data.session);
      if (data.session?.access_token) {
        await refreshUserData(data.session.access_token);
      }
      setLoading(false);
    }

    void initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.access_token) {
        await refreshUserData(nextSession.access_token);
      } else {
        setProfile(null);
        setAddresses([]);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshUserData, supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setAddresses([]);
  }, [supabase]);

  const needsOnboarding = checkNeedsOnboarding(profile);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      addresses,
      loading,
      needsOnboarding,
      refreshUserData,
      signOut,
    }),
    [
      session,
      profile,
      addresses,
      loading,
      needsOnboarding,
      refreshUserData,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
