"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDataList } from "@/lib/actions/create-data-list";
import { TEXTING_TIER_LABELS } from "@/lib/supabase/labels";
import type { Database } from "@/lib/supabase/database.types";

type ClientRow = { id: string; name: string; company_id: string };
type CampaignServiceRow = {
  id: string;
  company_id: string;
  type: Database["public"]["Enums"]["campaign_type"];
  name: string | null;
  texting_tier: Database["public"]["Enums"]["texting_tier"] | null;
};

function campaignServiceLabel(cs: CampaignServiceRow, clientName: string) {
  if (cs.type === "cold_calling") return cs.name ?? "Untitled campaign";
  return `${clientName} — Texting${cs.texting_tier ? ` (${TEXTING_TIER_LABELS[cs.texting_tier]})` : ""}`;
}

export function DataListEntryWizard({
  clients,
  campaignServices,
}: {
  clients: ClientRow[];
  campaignServices: CampaignServiceRow[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<"client" | "service" | "form">("client");
  const [query, setQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedService, setSelectedService] = useState<CampaignServiceRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listDate, setListDate] = useState("");
  const [recordsCount, setRecordsCount] = useState("");
  const [recordsAccepted, setRecordsAccepted] = useState("");
  const [duplicates, setDuplicates] = useState("");
  const [recordsSkipTraced, setRecordsSkipTraced] = useState("");
  const [skipTraceRate, setSkipTraceRate] = useState("0.07");

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 20);
    return clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20);
  }, [clients, query]);

  const servicesForCompany = useMemo(() => {
    if (!selectedClient) return [];
    return campaignServices.filter((cs) => cs.company_id === selectedClient.company_id);
  }, [campaignServices, selectedClient]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedService) return;

    const accepted = Number(recordsAccepted);
    const skipTraced = recordsSkipTraced ? Number(recordsSkipTraced) : undefined;
    if (skipTraced !== undefined && skipTraced > accepted) {
      setError("Records skip traced can't exceed records accepted.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await createDataList({
      campaignServiceId: selectedService.id,
      listDate,
      recordsCount: Number(recordsCount),
      recordsAccepted: accepted,
      duplicates: Number(duplicates),
      recordsSkipTraced: skipTraced,
      skipTraceRate: Number(skipTraceRate),
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/clients/${selectedClient!.company_id}`);
    router.refresh();
  }

  if (step === "client") {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <div>
          <h1 className="font-heading text-xl text-ink">New data list</h1>
          <p className="text-sm text-ink-muted">Search for the client by name.</p>
        </div>
        <Input
          autoFocus
          placeholder="Client name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="border border-border bg-surface-raised">
          {filteredClients.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">No matching clients.</p>
          ) : (
            filteredClients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedClient(c);
                  setSelectedService(null);
                  setStep("service");
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken"
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (step === "service") {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <div>
          <h1 className="font-heading text-xl text-ink">New data list</h1>
          <p className="text-sm text-ink-muted">
            Choose {selectedClient?.name}&apos;s campaign service.
          </p>
        </div>
        <div className="border border-border bg-surface-raised">
          {servicesForCompany.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">
              This client has no campaign services yet.
            </p>
          ) : (
            servicesForCompany.map((cs) => (
              <button
                key={cs.id}
                type="button"
                onClick={() => {
                  setSelectedService(cs);
                  setStep("form");
                }}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken"
              >
                {campaignServiceLabel(cs, selectedClient!.name)}
              </button>
            ))
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => setStep("client")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl text-ink">New data list</h1>
        <p className="text-sm text-ink-muted">
          {selectedClient?.name} —{" "}
          {selectedService && campaignServiceLabel(selectedService, selectedClient!.name)}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="list-date">List date</Label>
        <Input
          id="list-date"
          type="date"
          required
          value={listDate}
          onChange={(e) => setListDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="records-count">Records</Label>
          <Input
            id="records-count"
            type="number"
            min={0}
            required
            value={recordsCount}
            onChange={(e) => setRecordsCount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="records-accepted">Accepted</Label>
          <Input
            id="records-accepted"
            type="number"
            min={0}
            required
            value={recordsAccepted}
            onChange={(e) => setRecordsAccepted(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="duplicates">Duplicates</Label>
          <Input
            id="duplicates"
            type="number"
            min={0}
            required
            value={duplicates}
            onChange={(e) => setDuplicates(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="skip-traced">Skip traced (optional)</Label>
          <Input
            id="skip-traced"
            type="number"
            min={0}
            value={recordsSkipTraced}
            onChange={(e) => setRecordsSkipTraced(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="skip-trace-rate">Skip trace rate ($/record)</Label>
        <Input
          id="skip-trace-rate"
          type="number"
          step="0.0001"
          min={0}
          required
          value={skipTraceRate}
          onChange={(e) => setSkipTraceRate(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => setStep("service")} disabled={submitting}>
          Back
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Add list"}
        </Button>
      </div>
    </form>
  );
}
