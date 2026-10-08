import { Suspense } from "react";

import LoginForm from "@/components/LoginForm";

function LoginFallback() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-4 py-12">
      <p className="text-sm text-gray-500">Loading sign in…</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
