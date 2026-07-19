"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/app-shell/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { activateCurrentUser } from "@/lib/actions/activate-user";

export default function SetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("Couldn't set your password. Try again.");
      setSubmitting(false);
      return;
    }

    await activateCurrentUser();

    router.push("/clients");
    router.refresh();
  }

  return (
    <AuthShell subtitle="Set your password">
      <p className="mb-6 -mt-2 text-center text-sm text-ink-muted">
        Choose a password to finish setting up your account.
      </p>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-sm text-ink">
            New password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword" className="text-sm text-ink">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}

        <Button type="submit" pulse disabled={submitting} className="mt-2 w-full">
          {submitting ? "Setting password…" : "Set password & continue"}
        </Button>
      </form>
    </AuthShell>
  );
}
