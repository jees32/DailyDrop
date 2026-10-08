"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { Toaster } from "sonner";

import { AuthProvider } from "@/context/AuthContext";
import OnboardingRedirect from "@/components/OnboardingRedirect";
import { LocationProvider } from "@/context/LocationContext";
import LocationPrompt from "@/components/LocationPrompt";
import { store } from "@/store/index";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: false,
      },
    },
  });
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingRedirect>
          <LocationProvider>
            <LocationPrompt />
            <Provider store={store}>
              {children}
              <Toaster
                position="top-center"
                className="dailydrop-toaster-center"
                richColors
                closeButton
                duration={4500}
              />
            </Provider>
          </LocationProvider>
        </OnboardingRedirect>
      </AuthProvider>
    </QueryClientProvider>
  );
}
