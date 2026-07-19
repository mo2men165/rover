"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectPills } from "@/components/clients/multi-select-pills";
import { TagInput } from "@/components/clients/tag-input";
import { createClientRecord } from "@/lib/actions/create-client";
import { staggerIn } from "@/lib/motion";
import {
  CLIENT_SCRIPT_LABELS,
  CONTACT_METHOD_LABELS,
  PACKAGE_TIER_LABELS,
  PACKAGE_TIER_PRICES,
  TEXTING_TIER_LABELS,
} from "@/lib/supabase/labels";
import { PROPERTY_TYPE_OPTIONS, US_STATE_OPTIONS } from "@/lib/supabase/buy-box-options";
import type { Database } from "@/lib/supabase/database.types";
import type { Role } from "@/components/app-shell/role-context";

type TextingTier = Database["public"]["Enums"]["texting_tier"];
type PackageTier = Database["public"]["Enums"]["package_tier"];
type ClientScript = Database["public"]["Enums"]["client_script"];
type ContactMethod = Database["public"]["Enums"]["contact_method"];

type Csr = { id: string; name: string };

type AssociateDraft = {
  name: string;
  email: string;
  phone: string;
  role: string;
  preferredContactMethod: ContactMethod | "";
};

type ServiceDraft =
  | { type: "cold_calling"; seatCount: string }
  | { type: "texting"; textingTier: TextingTier };

const STEPS = [
  {
    key: "company",
    label: "Company & POC",
    hint: "Who we work with",
    title: "Company & POC",
    subtitle: "Tell us who this client is and who the main point of contact is.",
  },
  {
    key: "associates",
    label: "Associates",
    hint: "Who else is involved",
    title: "Associates",
    subtitle: "Add any other contacts at this company (optional).",
  },
  {
    key: "buybox",
    label: "Buy Box",
    hint: "What they want to buy",
    title: "Buy Box",
    subtitle: "Define their acquisition criteria.",
  },
  {
    key: "script",
    label: "Script",
    hint: "How CSRs should pitch",
    title: "Script",
    subtitle: "Choose how CSRs should pitch this client.",
  },
  {
    key: "services",
    label: "Services & Data",
    hint: "What they get",
    title: "Services & Data",
    subtitle: "Configure campaign services and data sourcing.",
  },
  {
    key: "review",
    label: "Review",
    hint: "Confirm & create",
    title: "Review & Create",
    subtitle: "Confirm everything looks right before creating the client.",
  },
] as const;

const EMPTY_ASSOCIATE: AssociateDraft = {
  name: "",
  email: "",
  phone: "",
  role: "",
  preferredContactMethod: "",
};

const nativeSelectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type ReferralPitchOption = {
  id: string;
  label: string;
};

type ClientOption = {
  id: string;
  label: string;
};

export function AddClientWizard({
  csrs,
  callerRole,
  callerId,
  openPitches = [],
  referringClients = [],
}: {
  csrs: Csr[];
  callerRole: Role;
  callerId: string;
  openPitches?: ReferralPitchOption[];
  referringClients?: ClientOption[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex].key;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocTitle, setPocTitle] = useState("");
  const [assignedCsrId, setAssignedCsrId] = useState(callerRole === "csr" ? callerId : "");

  const [associates, setAssociates] = useState<AssociateDraft[]>([]);
  const [associateDraft, setAssociateDraft] = useState<AssociateDraft>(EMPTY_ASSOCIATE);

  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [areaCodes, setAreaCodes] = useState<string[]>([]);
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [maxArv, setMaxArv] = useState("");
  const [exclusions, setExclusions] = useState("");

  const [script, setScript] = useState<ClientScript | "">("");

  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [seatCountDraft, setSeatCountDraft] = useState("1");
  const [textingTierDraft, setTextingTierDraft] = useState<TextingTier>("50k");

  const [dataPackageMode, setDataPackageMode] = useState<
    "package" | "legacy" | "self_provided"
  >("package");
  const [packageTier, setPackageTier] = useState<PackageTier>("starter");
  const [packageStartDate, setPackageStartDate] = useState("");
  const [packagePriceOverride, setPackagePriceOverride] = useState("");

  const [wasReferred, setWasReferred] = useState(false);
  const [referralId, setReferralId] = useState("");
  const [referredByClientId, setReferredByClientId] = useState("");

  useEffect(() => {
    if (containerRef.current) staggerIn([containerRef.current]);
  }, [step]);

  const stateOptions = useMemo(
    () => US_STATE_OPTIONS.map((s) => ({ value: s.code, label: `${s.code} — ${s.name}` })),
    []
  );
  const propertyTypeOptions = useMemo(
    () => PROPERTY_TYPE_OPTIONS.map((p) => ({ value: p, label: p })),
    []
  );

  const canContinue = useMemo(() => {
    switch (step) {
      case "company":
        return companyName.trim() !== "" && pocName.trim() !== "" && assignedCsrId !== "";
      case "script":
        return script !== "";
      case "services":
        return (
          services.length > 0 &&
          (dataPackageMode !== "package" || packageStartDate !== "")
        );
      default:
        return true;
    }
  }, [
    step,
    companyName,
    pocName,
    assignedCsrId,
    script,
    services,
    dataPackageMode,
    packageStartDate,
  ]);

  function goTo(index: number) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  }

  function addAssociateDraft() {
    if (!associateDraft.name.trim()) return;
    setAssociates((prev) => [...prev, associateDraft]);
    setAssociateDraft(EMPTY_ASSOCIATE);
  }

  function removeAssociate(index: number) {
    setAssociates((prev) => prev.filter((_, i) => i !== index));
  }

  function addColdCallingService() {
    const seatCount = Number(seatCountDraft);
    if (!seatCount || seatCount < 1) return;
    setServices((prev) => [...prev, { type: "cold_calling", seatCount: seatCountDraft }]);
    setSeatCountDraft("1");
  }

  function addTextingService() {
    setServices((prev) => [...prev, { type: "texting", textingTier: textingTierDraft }]);
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setSubmitting(true);
    setError(null);

    const result = await createClientRecord({
      companyName,
      poc: {
        name: pocName,
        email: pocEmail || undefined,
        phone: pocPhone || undefined,
        title: pocTitle || undefined,
      },
      assignedCsrId,
      associates: associates
        .filter((a) => a.name.trim())
        .map((a) => ({
          name: a.name,
          email: a.email || undefined,
          phone: a.phone || undefined,
          role: a.role || undefined,
          preferredContactMethod: a.preferredContactMethod || undefined,
        })),
      buyBox: {
        property_types: propertyTypes,
        states,
        area_codes: areaCodes,
        zip_codes: zipCodes,
        max_arv: maxArv ? Number(maxArv) : null,
        exclusions: exclusions || null,
      },
      script: script as ClientScript,
      services: services.map((s) =>
        s.type === "cold_calling"
          ? { type: "cold_calling" as const, seatCount: Number(s.seatCount) }
          : { type: "texting" as const, textingTier: s.textingTier }
      ),
      dataPackage:
        dataPackageMode === "package"
          ? {
              mode: "package",
              tier: packageTier,
              startDate: packageStartDate,
              priceOverride: packagePriceOverride ? Number(packagePriceOverride) : undefined,
            }
          : dataPackageMode === "legacy"
            ? { mode: "legacy" }
            : { mode: "self_provided" },
      referralId: wasReferred && referralId ? referralId : undefined,
      referredByClientId:
        wasReferred && !referralId && referredByClientId
          ? referredByClientId
          : undefined,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/clients/${result.companyId}`);
    router.refresh();
  }

  const currentStepMeta = STEPS[stepIndex];

  return (
    <div className="flex min-h-full">
      <aside className="flex w-[280px] shrink-0 flex-col gap-8 border-r border-white/[0.07] bg-white/[0.03] p-[36px_30px] backdrop-blur-[24px] backdrop-saturate-160">
        <Link
          href="/clients"
          className="flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          ← Cancel
        </Link>

        <div className="flex items-center gap-2">
          <Image
            src="/logo-mark.png"
            alt=""
            width={20}
            height={20}
            className="shrink-0 drop-shadow-[0_0_10px_oklch(72%_0.15_224/0.6)]"
          />
          <span className="font-heading text-sm font-bold tracking-tight text-ink not-italic">
            ROVER
          </span>
        </div>

        <div>
          <h2 className="font-heading text-lg text-ink">New Client</h2>
          <p className="text-sm text-ink-muted">A guided setup — six quick steps.</p>
        </div>

        <div className="flex flex-col">
          {STEPS.map((s, i) => {
            const isDone = i < stepIndex;
            const isActive = i === stepIndex;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      isActive || isDone
                        ? "bg-[linear-gradient(135deg,var(--brand-blue),var(--brand-blue-deep))] text-white"
                        : "border border-white/15 bg-white/[0.03] text-ink-faint"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-px flex-1 ${isDone ? "bg-[var(--brand-blue)]" : "bg-white/10"}`}
                      style={{ minHeight: "28px" }}
                      aria-hidden
                    />
                  )}
                </div>
                <div className={isLast ? "pb-0" : "pb-7"}>
                  <p
                    className={`text-sm font-medium ${
                      isActive || isDone ? "text-ink" : "text-ink-muted"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-xs text-ink-faint">{s.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="flex flex-1 justify-center px-10 pt-14">
        <div className="flex w-full max-w-[640px] flex-col gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-ledger uppercase">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <h1 className="font-heading text-[26px] text-ink">{currentStepMeta.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">{currentStepMeta.subtitle}</p>
          </div>

          <div ref={containerRef} className="glass-panel rounded-[20px] p-7">
        {step === "company" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name">Company name</Label>
              <Input
                id="company-name"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="poc-name">POC name</Label>
              <Input id="poc-name" required value={pocName} onChange={(e) => setPocName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="poc-email">POC email</Label>
                <Input
                  id="poc-email"
                  type="email"
                  value={pocEmail}
                  onChange={(e) => setPocEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="poc-phone">POC phone</Label>
                <Input
                  id="poc-phone"
                  type="tel"
                  value={pocPhone}
                  onChange={(e) => setPocPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="poc-title">POC title</Label>
              <Input id="poc-title" value={pocTitle} onChange={(e) => setPocTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assigned-csr">Assigned CSR</Label>
              {callerRole === "csr" ? (
                <Input id="assigned-csr" disabled value="You" />
              ) : (
                <select
                  id="assigned-csr"
                  required
                  value={assignedCsrId}
                  onChange={(e) => setAssignedCsrId(e.target.value)}
                  className={nativeSelectClass}
                >
                  <option value="" disabled>
                    Select a CSR…
                  </option>
                  {csrs.map((csr) => (
                    <option key={csr.id} value={csr.id}>
                      {csr.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={wasReferred}
                  onChange={(e) => {
                    setWasReferred(e.target.checked);
                    if (!e.target.checked) {
                      setReferralId("");
                      setReferredByClientId("");
                    }
                  }}
                  className="size-4 rounded border-white/20"
                />
                Referred by an existing client?
              </label>
              {wasReferred && (
                <div className="flex flex-col gap-3">
                  {openPitches.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="open-pitch">Link open pitch (optional)</Label>
                      <select
                        id="open-pitch"
                        value={referralId}
                        onChange={(e) => {
                          setReferralId(e.target.value);
                          if (e.target.value) setReferredByClientId("");
                        }}
                        className={nativeSelectClass}
                      >
                        <option value="">Create from referring client…</option>
                        {openPitches.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!referralId && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="referred-by">Referring client</Label>
                      <select
                        id="referred-by"
                        required={wasReferred}
                        value={referredByClientId}
                        onChange={(e) => setReferredByClientId(e.target.value)}
                        className={nativeSelectClass}
                      >
                        <option value="" disabled>
                          Select referring client…
                        </option>
                        {referringClients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "associates" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">
              Add any other contacts at this company (optional).
            </p>
            {associates.length > 0 && (
              <div className="glass-panel rounded-[var(--radius-lg)]">
                {associates.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="text-ink">
                      {a.name}
                      {a.role ? ` — ${a.role}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAssociate(i)}
                      className="text-ink-muted hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input
                  value={associateDraft.name}
                  onChange={(e) => setAssociateDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Input
                  placeholder="Finance, Co-Investor…"
                  value={associateDraft.role}
                  onChange={(e) => setAssociateDraft((d) => ({ ...d, role: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={associateDraft.email}
                  onChange={(e) => setAssociateDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={associateDraft.phone}
                  onChange={(e) => setAssociateDraft((d) => ({ ...d, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Preferred contact method</Label>
              <select
                value={associateDraft.preferredContactMethod}
                onChange={(e) =>
                  setAssociateDraft((d) => ({
                    ...d,
                    preferredContactMethod: e.target.value as ContactMethod | "",
                  }))
                }
                className={nativeSelectClass}
              >
                <option value="">—</option>
                {(["email", "phone", "text"] as ContactMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {CONTACT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="outline" onClick={addAssociateDraft}>
              + Add associate
            </Button>
          </div>
        )}

        {step === "buybox" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Property types</Label>
              <MultiSelectPills
                options={propertyTypeOptions}
                selected={propertyTypes}
                onChange={setPropertyTypes}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>States</Label>
              <div className="max-h-40 overflow-y-auto glass-panel rounded-[var(--radius-lg)] p-3">
                <MultiSelectPills options={stateOptions} selected={states} onChange={setStates} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Area codes</Label>
                <TagInput values={areaCodes} onChange={setAreaCodes} placeholder="e.g. 214, press Enter" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Zip codes</Label>
                <TagInput values={zipCodes} onChange={setZipCodes} placeholder="e.g. 75001, press Enter" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max-arv">Max ARV</Label>
              <Input
                id="max-arv"
                type="number"
                min={0}
                value={maxArv}
                onChange={(e) => setMaxArv(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exclusions">Exclusions</Label>
              <Textarea id="exclusions" value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
            </div>
          </div>
        )}

        {step === "script" && (
          <div className="grid grid-cols-2 gap-4">
            {(["four_pillars", "motivation_only"] as ClientScript[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScript(s)}
                aria-pressed={script === s}
                className={`flex flex-col gap-1 border p-4 text-left transition-colors ${
                  script === s
                    ? "border-ledger bg-ledger/10"
                    : "border-white/10 bg-white/[0.02] backdrop-blur-md hover:bg-white/[0.05] hover:border-[rgba(56,182,240,0.3)]"
                }`}
              >
                <span className="font-heading text-base text-ink">{CLIENT_SCRIPT_LABELS[s]}</span>
              </button>
            ))}
          </div>
        )}

        {step === "services" && (
          <div className="flex flex-col gap-6">
            {services.length > 0 && (
              <div className="glass-panel rounded-[var(--radius-lg)]">
                {services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="text-ink">
                      {s.type === "cold_calling"
                        ? `Cold Calling — ${s.seatCount} seat${Number(s.seatCount) === 1 ? "" : "s"}`
                        : `Texting — ${TEXTING_TIER_LABELS[s.textingTier]}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeService(i)}
                      className="text-ink-muted hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 glass-panel rounded-[var(--radius-lg)] p-3">
                <Label>Cold calling seats</Label>
                <Input
                  type="number"
                  min={1}
                  value={seatCountDraft}
                  onChange={(e) => setSeatCountDraft(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={addColdCallingService}>
                  + Add cold calling
                </Button>
              </div>
              <div className="flex flex-col gap-2 glass-panel rounded-[var(--radius-lg)] p-3">
                <Label>Texting tier</Label>
                <select
                  value={textingTierDraft}
                  onChange={(e) => setTextingTierDraft(e.target.value as TextingTier)}
                  className={nativeSelectClass}
                >
                  {(["50k", "75k", "100k"] as TextingTier[]).map((t) => (
                    <option key={t} value={t}>
                      {TEXTING_TIER_LABELS[t]}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" onClick={addTextingService}>
                  + Add texting
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Data source</Label>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { mode: "package" as const, label: "Package" },
                    { mode: "legacy" as const, label: "Legacy" },
                    { mode: "self_provided" as const, label: "Self-Provided" },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => setDataPackageMode(opt.mode)}
                    aria-pressed={dataPackageMode === opt.mode}
                    className={`border p-3 text-left text-sm transition-colors ${
                      dataPackageMode === opt.mode
                        ? "border-ledger bg-ledger/10 text-ink"
                        : "border-white/10 bg-white/[0.02] text-ink-muted backdrop-blur-md hover:bg-white/[0.05] hover:border-[rgba(56,182,240,0.3)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {dataPackageMode === "package" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="package-tier">Package tier</Label>
                    <select
                      id="package-tier"
                      value={packageTier}
                      onChange={(e) => setPackageTier(e.target.value as PackageTier)}
                      className={nativeSelectClass}
                    >
                      {(["starter", "pro", "growth"] as PackageTier[]).map((t) => (
                        <option key={t} value={t}>
                          {PACKAGE_TIER_LABELS[t]} — ${PACKAGE_TIER_PRICES[t].toLocaleString()}/mo
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="package-start">Start date</Label>
                    <Input
                      id="package-start"
                      type="date"
                      required
                      value={packageStartDate}
                      onChange={(e) => setPackageStartDate(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="package-price-override">Price override (optional)</Label>
                    <Input
                      id="package-price-override"
                      type="number"
                      min={0}
                      value={packagePriceOverride}
                      onChange={(e) => setPackagePriceOverride(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "review" && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-muted">Company</dt>
            <dd className="text-ink">{companyName}</dd>
            <dt className="text-ink-muted">POC</dt>
            <dd className="text-ink">
              {pocName}
              {pocTitle ? ` — ${pocTitle}` : ""}
            </dd>
            <dt className="text-ink-muted">Assigned CSR</dt>
            <dd className="text-ink">
              {callerRole === "csr" ? "You" : csrs.find((c) => c.id === assignedCsrId)?.name ?? "—"}
            </dd>
            <dt className="text-ink-muted">Associates</dt>
            <dd className="text-ink">
              {associates.length === 0 ? "None" : associates.map((a) => a.name).join(", ")}
            </dd>
            <dt className="text-ink-muted">Buy box</dt>
            <dd className="text-ink">
              {[
                propertyTypes.length ? `${propertyTypes.length} property type(s)` : null,
                states.length ? `${states.length} state(s)` : null,
                maxArv ? `Max ARV $${Number(maxArv).toLocaleString()}` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </dd>
            <dt className="text-ink-muted">Script</dt>
            <dd className="text-ink">{script ? CLIENT_SCRIPT_LABELS[script] : "—"}</dd>
            <dt className="text-ink-muted">Services</dt>
            <dd className="text-ink">
              {services
                .map((s) =>
                  s.type === "cold_calling"
                    ? `Cold Calling (${s.seatCount})`
                    : `Texting (${TEXTING_TIER_LABELS[s.textingTier]})`
                )
                .join(", ") || "—"}
            </dd>
            <dt className="text-ink-muted">Data source</dt>
            <dd className="text-ink">
              {dataPackageMode === "package"
                ? `Package — ${PACKAGE_TIER_LABELS[packageTier]}`
                : dataPackageMode === "legacy"
                  ? "Legacy"
                  : "Self-Provided"}
            </dd>
          </dl>
        )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0 || submitting}
              className={stepIndex === 0 ? "invisible" : undefined}
            >
              Back
            </Button>
            {step === "review" ? (
              <Button type="button" onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating…" : "Confirm & Create Client"}
              </Button>
            ) : (
              <Button type="button" onClick={() => goTo(stepIndex + 1)} disabled={!canContinue}>
                Continue →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
