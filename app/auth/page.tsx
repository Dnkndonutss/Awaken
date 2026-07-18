"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    localStorage.removeItem("awaken:onboarding-draft:v1");
    localStorage.removeItem("awaken:onboarding-operation:v1");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
      : mode === "reset"
        ? await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === "signin") window.location.assign("/");
    else if (mode === "signup" && "session" in result.data && result.data.session) window.location.assign("/onboarding");
    else setMessage(mode === "signup" ? "Check your email to verify your account. After verification, Awaken will start your setup." : "Password-reset email sent.");
  }

  return <main className="grid min-h-screen place-items-center bg-[#080b12] p-6 text-slate-100">
    <section className="w-full max-w-md rounded-xl border border-cyan-300/20 bg-[#0c111d] p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Welcome to</p><h1 className="mt-2 text-3xl font-semibold">Awaken</h1>
      <p className="mt-2 text-slate-400">{mode === "signin" ? "Sign in to continue your progression." : mode === "signup" ? "Create an account, verify your email, then build your personalized Awaken system." : "Reset your password."}</p>
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm">Email<input className="rounded border border-white/15 bg-black/20 p-3" name="email" type="email" autoComplete="email" required /></label>
        {mode !== "reset" && <label className="grid gap-1 text-sm"><span className="flex items-center justify-between"><span>Password</span><button className="text-cyan-200 hover:text-cyan-100" type="button" aria-controls="awaken-password" aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide password" : "Show password"}</button></span><input id="awaken-password" className="rounded border border-white/15 bg-black/20 p-3" name="password" type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /></label>}
        <button className="rounded bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50" disabled={busy}>{busy ? "Working…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</button>
      </form>
      {message && <p role="status" className="mt-4 text-sm text-amber-200">{message}</p>}
      <div className="mt-5 flex flex-wrap gap-3 text-sm text-cyan-200">
        <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account? Sign in" : "New to Awaken? Create account"}</button>
        <button onClick={() => setMode("reset")}>Forgot password?</button>
      </div>
    </section>
  </main>;
}
