"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addToDataPackage } from "@/lib/actions/add-to-data-package";
import { PACKAGE_TIER_LABELS, PACKAGE_TIER_PRICES } from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type PackageTier = Database["public"]["Enums"]["package_tier"];

const PACKAGE_TIERS: PackageTier[] = ["starter", "pro", "growth"];

function AddToDataPackageForm({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const router = useRouter();
  const [packageTier, setPackageTier] = useState<PackageTier>("starter");
  const [packageStartDate, setPackageStartDate] = useState("");
  const [packageEndDate, setPackageEndDate] = useState("");
  const [overridePrice, setOverridePrice] = useState(false);
  const [priceOverride, setPriceOverride] = useState(String(PACKAGE_TIER_PRICES.starter));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await addToDataPackage({
      clientId,
      packageTier,
      packageStartDate,
      packageEndDate: packageEndDate || undefined,
      packagePriceOverride: overridePrice ? Number(priceOverride) : undefined,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border border-border bg-surface-raised p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="package-tier">Package tier</Label>
        <select
          id="package-tier"
          value={packageTier}
          onChange={(e) => {
            const tier = e.target.value as PackageTier;
            setPackageTier(tier);
            setPriceOverride(String(PACKAGE_TIER_PRICES[tier]));
          }}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {PACKAGE_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {PACKAGE_TIER_LABELS[tier]} — ${PACKAGE_TIER_PRICES[tier]}/mo
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="package-start-date">Start date</Label>
          <Input
            id="package-start-date"
            type="date"
            required
            value={packageStartDate}
            onChange={(e) => setPackageStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="package-end-date">End date (optional)</Label>
          <Input
            id="package-end-date"
            type="date"
            value={packageEndDate}
            onChange={(e) => setPackageEndDate(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={overridePrice}
          onChange={(e) => setOverridePrice(e.target.checked)}
        />
        Override price (promo/discounted rate)
      </label>

      {overridePrice && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-override">Price ($/mo)</Label>
          <Input
            id="price-override"
            type="number"
            step="0.01"
            min={0}
            required
            value={priceOverride}
            onChange={(e) => setPriceOverride(e.target.value)}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Add to package"}
        </Button>
      </div>
    </form>
  );
}

export function AddToDataPackageToggle({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Add to Data Package
      </Button>
    );
  }

  return <AddToDataPackageForm clientId={clientId} onDone={() => setOpen(false)} />;
}
