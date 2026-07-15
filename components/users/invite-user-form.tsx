"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUser } from "@/lib/actions/invite-user";
import { ALL_ROLES, ROLE_LABELS, type Role } from "@/components/app-shell/role-context";

type FormState = {
  name: string;
  email: string;
  phone: string;
  role: Role;
  startDate: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  role: "csr",
  startDate: "",
};

export function InviteUserForm() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "review">("form");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setStep("review");
  }

  async function handleSendInvite() {
    setSending(true);
    setError(null);
    const result = await inviteUser({
      name: form.name,
      email: form.email,
      role: form.role,
      phone: form.phone || undefined,
      startDate: form.startDate || undefined,
    });
    setSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push("/users");
    router.refresh();
  }

  if (step === "review") {
    return (
      <div className="flex max-w-lg flex-col gap-6">
        <div>
          <h1 className="font-heading text-xl text-ink">Review invite</h1>
          <p className="text-sm text-ink-muted">
            Confirm the details below, then send the invite. This creates
            the account and emails {form.email || "the user"} a sign-in
            link — it can&apos;t be undone from here.
          </p>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border border-border bg-surface-raised p-4 text-sm">
          <dt className="text-ink-muted">Name</dt>
          <dd className="text-ink">{form.name}</dd>
          <dt className="text-ink-muted">Email</dt>
          <dd className="text-ink">{form.email}</dd>
          <dt className="text-ink-muted">Phone</dt>
          <dd className="text-ink">{form.phone || "—"}</dd>
          <dt className="text-ink-muted">Role</dt>
          <dd className="text-ink">{ROLE_LABELS[form.role]}</dd>
          <dt className="text-ink-muted">Start date</dt>
          <dd className="text-ink">{form.startDate || "—"}</dd>
        </dl>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("form")}
            disabled={sending}
          >
            Back
          </Button>
          <Button type="button" onClick={handleSendInvite} disabled={sending}>
            {sending ? "Sending…" : "Send Invite"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleReview} className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl text-ink">Invite user</h1>
        <p className="text-sm text-ink-muted">
          Fill in the details, then review before sending the invite.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          required
          value={form.role}
          onChange={(e) =>
            setForm((f) => ({ ...f, role: e.target.value as Role }))
          }
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {ALL_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="start-date">Start date (optional)</Label>
        <Input
          id="start-date"
          type="date"
          value={form.startDate}
          onChange={(e) =>
            setForm((f) => ({ ...f, startDate: e.target.value }))
          }
        />
      </div>

      <Button type="submit">Review</Button>
    </form>
  );
}
