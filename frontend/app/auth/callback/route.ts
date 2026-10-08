import { NextResponse } from "next/server";

import { resolveRedirectOrigin } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const appOrigin = resolveRedirectOrigin(url.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, appOrigin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=Could+not+sign+you+in.+Try+again.", appOrigin),
  );
}
