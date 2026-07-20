"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setMessage("This password-reset link is invalid or has expired. Request a new link from the sign-in page.");
      } else {
        setReady(true);
      }
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password.length < 8) return setMessage("Your new password must be at least 8 characters.");
    if (password !== confirmation) return setMessage("The passwords do not match.");

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      return setMessage(error.message);
    }

    await supabase.auth.signOut({ scope: "global" });
    setBusy(false);
    setComplete(true);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#080b12] p-6 text-slate-100">
      <section className="w-full max-w-md rounded-xl border border-cyan-300/20 bg-[#0c111d] p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Awaken account recovery</p>
        <h1 className="mt-2 text-3xl font-semibold">Choose a new password</h1>
        {complete ? (
          <div className="mt-5 grid gap-4">
            <p className="text-emerald-200" role="status">Your password has been updated. Sign in again with your new password.</p>
            <a className="rounded bg-cyan-300 px-4 py-3 text-center font-semibold text-slate-950" href="/auth">Return to sign in</a>
          </div>
        ) : (
          <>
            <p className="mt-2 text-slate-400">Enter your new password below. For your security, you’ll sign in again after it is changed.</p>
            {ready ? (
              <form className="mt-6 grid gap-4" onSubmit={submit}>
                <label className="grid gap-1 text-sm">
                  New password
                  <input className="rounded border border-white/15 bg-black/20 p-3" minLength={8} name="password" autoComplete="new-password" required type="password" />
                </label>
                <label className="grid gap-1 text-sm">
                  Confirm new password
                  <input className="rounded border border-white/15 bg-black/20 p-3" minLength={8} name="confirmation" autoComplete="new-password" required type="password" />
                </label>
                <button className="rounded bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50" disabled={busy}>
                  {busy ? "Updating…" : "Update password"}
                </button>
              </form>
            ) : null}
            {message ? <p className="mt-4 text-sm text-amber-200" role="alert">{message}</p> : null}
            {!ready ? <a className="mt-5 inline-block text-sm text-cyan-200" href="/auth">Return to sign in</a> : null}
          </>
        )}
      </section>
    </main>
  );
}
