import { Suspense } from "react";

import OnboardingForm from "@/components/OnboardingForm";

function OnboardingFallback() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center justify-center px-4 py-12">
      <p className="text-sm text-gray-500">Loading profile setup…</p>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingForm />
    </Suspense>
  );
}
