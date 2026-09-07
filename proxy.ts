import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasCompletedOnboarding } from "@/lib/onboarding";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll(values) { values.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname.startsWith("/api/auth");
  if (!user && !isPublic) { const target = request.nextUrl.clone(); target.pathname = "/auth"; target.searchParams.set("next", request.nextUrl.pathname); return NextResponse.redirect(target); }
  if (user && request.nextUrl.pathname === "/auth") return NextResponse.redirect(new URL("/", request.url));
  if (user && request.nextUrl.pathname.startsWith("/onboarding")) {
    const [{ data: settings }, { data: saved }] = await Promise.all([
      supabase.from("awaken_user_settings").select("onboarding_status").eq("user_id", user.id).maybeSingle(),
      supabase.from("awaken_states").select("state").eq("user_id", user.id).maybeSingle()
    ]);
    if (hasCompletedOnboarding(settings?.onboarding_status, saved?.state)) return NextResponse.redirect(new URL("/", request.url));
  }
  if (user && !isPublic && !request.nextUrl.pathname.startsWith("/onboarding") && !request.nextUrl.pathname.startsWith("/api/")) {
    const [{ data: settings }, { data: saved }] = await Promise.all([
      supabase.from("awaken_user_settings").select("onboarding_status").eq("user_id", user.id).maybeSingle(),
      supabase.from("awaken_states").select("state").eq("user_id", user.id).maybeSingle()
    ]);
    if (!hasCompletedOnboarding(settings?.onboarding_status, saved?.state)) return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)"] };
