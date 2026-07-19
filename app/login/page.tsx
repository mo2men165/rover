"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/app-shell/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const URL_ERROR_MESSAGES: Record<string, string> = {
  "no-profile":
    "Your account isn't fully set up yet. Contact your System Administrator.",
  "invite-link-expired":
    "That invite link is no longer valid. Ask your System Administrator to resend it.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    urlError ? (URL_ERROR_MESSAGES[urlError] ?? null) : null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("That email and password combination didn't work.");
      setSubmitting(false);
      return;
    }

    router.push("/clients");
    router.refresh();
  }

  return (
    <AuthShell>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-xs font-medium text-ink-muted">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@res-va.com"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-ink-muted">
              Password
            </Label>
            <span className="text-xs font-medium text-brand-blue">
              Forgot password?
            </span>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}

        <Button type="submit" pulse disabled={submitting} className="mt-2 w-full">
          {submitting ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-ink-muted">
        ROVER is invite-only.
        <br />
        Contact your team lead or admin for access.
      </p>
    </AuthShell>
  );
}
