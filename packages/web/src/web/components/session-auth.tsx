import { useState } from "react";
import { Loader2, LockKeyhole, ArrowRight } from "lucide-react";
import { authClient } from "../lib/auth";

export function SessionAuth() {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function google() {
    setBusy(true); setError("");
    try {
      const result = await authClient.managedAuth.signIn({ provider: "google" });
      if (result.error && result.error.code !== "POPUP_CLOSED") setError(result.error.message ?? "Sign-in failed");
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed"); }
    finally { setBusy(false); }
  }
  return <div className="max-w-lg mx-auto py-10">
    <LockKeyhole className="text-primary size-9 mb-6" />
    <h2 className="text-3xl font-bold">Your sessions, kept private.</h2>
    <p className="text-muted-foreground mt-3 mb-8">Sign in to keep your original projects, stems and mixes together. Only your account can access them.</p>
    <button disabled={busy} onClick={google} className="session-button secondary w-full">Continue with Google</button>
    <div className="flex items-center gap-4 my-6 text-xs text-muted-foreground"><div className="h-px bg-border flex-1" />OR USE EMAIL<div className="h-px bg-border flex-1" /></div>
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError("");
      const data = new FormData(e.currentTarget);
      try {
        const credentials = { email: String(data.get("email")), password: String(data.get("password")) };
        const result = signup
          ? await authClient.signUp.email({ ...credentials, name: String(data.get("name")) })
          : await authClient.signIn.email(credentials);
        if (result.error) setError(result.error.message ?? "Sign-in failed");
      } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed"); }
      finally { setBusy(false); }
    }}>
      {signup && <label className="session-label">Name<input aria-label="name" className="session-input" name="name" required autoComplete="name" /></label>}
      <label className="session-label">Email<input aria-label="email" className="session-input" name="email" type="email" required autoComplete="email" /></label>
      <label className="session-label">Password<input aria-label="password" className="session-input" name="password" type="password" minLength={8} required autoComplete={signup ? "new-password" : "current-password"} /></label>
      {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      <button disabled={busy} className="session-button w-full">{busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}{signup ? "Create account" : "Sign in"}</button>
    </form>
    <button onClick={() => { setSignup(!signup); setError(""); }} className="text-muted-foreground text-sm mt-5 hover:text-primary">{signup ? "Already have an account? Sign in" : "New here? Create an account"}</button>
  </div>;
}