"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  Building2,
  Users,
  MapPinned,
  PhoneCall,
  MessageSquareText,
  Database as DatabaseIcon,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListSelect } from "@/components/ui/list-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelectPills } from "@/components/clients/multi-select-pills";
import { TagInput } from "@/components/clients/tag-input";
import { createClientRecord } from "@/lib/actions/create-client";
import { staggerIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isValidUsPhone, toUsPhoneE164 } from "@/lib/phone/us";
import { LEAD_SOURCE_OPTIONS } from "@/lib/clients/lead-sources";
import {
  CLIENT_SCRIPT_LABELS,
  CONTACT_METHOD_LABELS,
  LIFECYCLE_STAGE_LABELS,
  PACKAGE_COMMITMENT_LABELS,
  PACKAGE_TIER_LABELS,
  PACKAGE_TIER_PRICES,
  PACKAGE_TIER_RECORDS,
  SKIP_TRACE_RATE_TIER_LABELS,
  SKIP_TRACING_SOURCE_LABELS,
  TEXTING_FUNNEL_LABELS,
  TEXTING_PACKAGE_LABELS,
} from "@/lib/supabase/labels";
import {
  PROPERTY_TYPE_OPTIONS,
  US_STATE_OPTIONS,
  deriveExclusions,
} from "@/lib/supabase/buy-box-options";
import type { Database } from "@/lib/supabase/database.types";
import type { Role } from "@/components/app-shell/role-context";

type TextingTier = Database["public"]["Enums"]["texting_tier"];
type TextingFunnel = Database["public"]["Enums"]["texting_funnel"];
type PackageTier = Database["public"]["Enums"]["package_tier"];
type PackageCommitment = Database["public"]["Enums"]["package_commitment"];
type ClientScript = Database["public"]["Enums"]["client_script"];
type ContactMethod = Database["public"]["Enums"]["contact_method"];
type LifecycleStage = Database["public"]["Enums"]["lifecycle_stage"];
type ProviderType = Database["public"]["Enums"]["provider_type"];
type SkipTraceRateTier = Database["public"]["Enums"]["skip_trace_rate_tier"];
type DataMode = "package" | "payg" | "legacy" | "self_provided";

type Csr = { id: string; name: string };

type AssociateDraft = {
  name: string;
  email: string;
  phone: string;
  role: string;
  preferredContactMethod: ContactMethod | "";
  hsObjectId: string;
};

const EMPTY_ASSOCIATE: AssociateDraft = {
  name: "",
  email: "",
  phone: "",
  role: "",
  preferredContactMethod: "",
  hsObjectId: "",
};

// Mirrors CreateClientInput["services"][number] in lib/actions/create-client.ts
// (kept local rather than imported since that file is "use server").
type ServiceInput =
  | { type: "cold_calling"; seatCount: number; name?: string; serviceStartDate?: string }
  | {
      type: "texting";
      textingTier: TextingTier;
      funnel?: TextingFunnel;
      serviceStartDate?: string;
      accountName?: string;
      accountEmail?: string;
    };

type DataPackageInput = {
  mode: DataMode;
  tier?: PackageTier;
  startDate?: string;
  priceOverride?: number;
  commitment?: PackageCommitment;
  dataSourceProviderName?: string;
  skipTracingType?: ProviderType;
  skipTraceProviderName?: string;
  skipTraceRateTier?: SkipTraceRateTier;
  skipTraceRate?: number;
  monthlySkipTraceExpected?: number;
};

const STEPS = [
  {
    key: "company",
    label: "Company & POC",
    hint: "Who we work with, and how they found us",
    title: "Company & Point of Contact",
    icon: Building2,
  },
  {
    key: "associates",
    label: "Associates",
    hint: "Other contacts at this account (optional)",
    title: "Associates",
    icon: Users,
  },
  {
    key: "buybox",
    label: "Buy Box",
    hint: "What properties this client wants to buy",
    title: "Buy Box",
    icon: MapPinned,
  },
  {
    key: "cold_calling",
    label: "Cold Calling",
    hint: "Outbound calling setup, if enabled",
    title: "Cold Calling",
    icon: PhoneCall,
  },
  {
    key: "texting",
    label: "Texting",
    hint: "SMS campaign setup, if enabled",
    title: "Texting",
    icon: MessageSquareText,
  },
  {
    key: "data",
    label: "Data & Skip Trace",
    hint: "Data package, PAYG, or legacy + skip tracing",
    title: "Data & Skip Trace",
    icon: DatabaseIcon,
  },
  {
    key: "review",
    label: "Review",
    hint: "Confirm everything before creating the client",
    title: "Review & Create",
    icon: ClipboardCheck,
  },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

type ReferralPitchOption = {
  id: string;
  label: string;
};

type ClientOption = {
  id: string;
  label: string;
};

/** Selectable card used for scripts, funnels, data modes, and toggle groups. */
function OptionTile({
  active,
  onClick,
  title,
  subtitle,
  className,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-[14px] border p-4 text-left transition-all duration-200",
        active
          ? "border-[oklch(74%_0.15_224/0.7)] bg-[linear-gradient(160deg,oklch(28%_0.04_224),oklch(20%_0.03_262))] shadow-[0_0_0_1px_oklch(74%_0.15_224/0.35),0_0_28px_-6px_oklch(74%_0.15_224/0.55)]"
          : "border-white/[0.12] bg-[linear-gradient(180deg,oklch(22%_0.018_262),oklch(17%_0.016_262))] hover:border-[oklch(74%_0.15_224/0.4)] hover:brightness-110",
        className
      )}
    >
      <span className={cn("font-heading text-sm", active ? "text-ink" : "text-ink-muted")}>
        {title}
      </span>
      {subtitle && <span className="text-xs text-ink-faint">{subtitle}</span>}
      {active && (
        <Check
          className="absolute right-3 top-3 h-4 w-4 text-[var(--brand-blue)]"
          aria-hidden
        />
      )}
    </button>
  );
}

/** iOS-style toggle switch used for the two service-enable gates. */
function ToggleRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-[14px] border border-white/[0.12] bg-[linear-gradient(180deg,oklch(22%_0.018_262),oklch(17%_0.016_262))] p-4 text-left transition-all hover:border-[oklch(74%_0.15_224/0.4)] hover:shadow-[0_0_24px_-10px_oklch(74%_0.15_224/0.35)]"
    >
      <div>
        <p className="font-heading text-sm text-ink">{label}</p>
        {description && <p className="mt-0.5 text-xs text-ink-faint">{description}</p>}
      </div>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-[3px] transition-colors",
          checked ? "bg-[oklch(74%_0.15_224)]" : "bg-white/15"
        )}
      >
        <span
          className={cn(
            "h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-[20px]" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

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
  const step = STEPS[stepIndex].key as StepKey;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Company & POC
  const [companyName, setCompanyName] = useState("");
  const [pocName, setPocName] = useState("");
  const [pocEmail, setPocEmail] = useState("");
  const [pocPhone, setPocPhone] = useState("");
  const [pocTitle, setPocTitle] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<ContactMethod | "">("");
  const [hsObjectId, setHsObjectId] = useState("");
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage | "">("");
  const [leadSource, setLeadSource] = useState("");
  const [assignedCsrId, setAssignedCsrId] = useState(callerRole === "csr" ? callerId : "");

  const [wasReferred, setWasReferred] = useState(false);
  const [referralId, setReferralId] = useState("");
  const [referredByClientId, setReferredByClientId] = useState("");

  // Step 2 — Associates
  const [associates, setAssociates] = useState<AssociateDraft[]>([]);
  const [associateDraft, setAssociateDraft] = useState<AssociateDraft>(EMPTY_ASSOCIATE);
  const [associateError, setAssociateError] = useState<string | null>(null);

  // Step 3 — Buy box
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [areaCodes, setAreaCodes] = useState<string[]>([]);
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [maxArv, setMaxArv] = useState("");
  const [zipStatsSheetLink, setZipStatsSheetLink] = useState("");

  // Step 4 — Cold calling
  const [enableColdCalling, setEnableColdCalling] = useState(false);
  const [seatCount, setSeatCount] = useState("1");
  const [campaignName, setCampaignName] = useState("");
  const [coldCallingStartDate, setColdCallingStartDate] = useState("");
  const [script, setScript] = useState<ClientScript | "">("");
  const [customScriptUrl, setCustomScriptUrl] = useState("");

  // Step 5 — Texting
  const [enableTexting, setEnableTexting] = useState(false);
  const [textingTier, setTextingTier] = useState<TextingTier>("50k");
  const [textingFunnel, setTextingFunnel] = useState<TextingFunnel | "">("");
  const [textingStartDate, setTextingStartDate] = useState("");
  const [textingAccountName, setTextingAccountName] = useState("");
  const [textingAccountEmail, setTextingAccountEmail] = useState("");

  // Step 6 — Data & skip trace
  const [dataMode, setDataMode] = useState<DataMode>("package");
  const [packageTier, setPackageTier] = useState<PackageTier>("starter");
  const [packageCommitment, setPackageCommitment] = useState<PackageCommitment | "">("");
  const [packageStartDate, setPackageStartDate] = useState("");
  const [packagePriceOverride, setPackagePriceOverride] = useState("");
  const [skipTracingType, setSkipTracingType] = useState<ProviderType | "">("");
  const [dataSourceProviderName, setDataSourceProviderName] = useState("");
  const [skipTraceProviderName, setSkipTraceProviderName] = useState("");
  const [skipTraceRateTier, setSkipTraceRateTier] = useState<SkipTraceRateTier | "">("");
  const [skipTraceRate, setSkipTraceRate] = useState("");
  const [monthlySkipTraceExpected, setMonthlySkipTraceExpected] = useState("");

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
  const exclusions = useMemo(() => deriveExclusions(propertyTypes), [propertyTypes]);

  const packageRecordsCap = PACKAGE_TIER_RECORDS[packageTier];
  const monthlySkipExceedsCap =
    dataMode === "package" &&
    monthlySkipTraceExpected !== "" &&
    Number(monthlySkipTraceExpected) > packageRecordsCap;

  const hasAtLeastOneService = enableColdCalling || enableTexting;

  const canContinue = useMemo(() => {
    switch (step) {
      case "company":
        return (
          companyName.trim() !== "" &&
          pocName.trim() !== "" &&
          assignedCsrId !== "" &&
          isValidUsPhone(pocPhone) &&
          (!wasReferred || Boolean(referralId) || Boolean(referredByClientId))
        );
      case "cold_calling":
        if (!enableColdCalling) return true;
        return (
          Number(seatCount) > 0 &&
          coldCallingStartDate !== "" &&
          script !== "" &&
          (script !== "custom" || customScriptUrl.trim() !== "")
        );
      case "texting":
        if (!enableTexting) return true;
        return textingFunnel !== "" && textingStartDate !== "";
      case "data": {
        if (dataMode === "package") {
          if (!(packageStartDate !== "" && packageCommitment !== "" && !monthlySkipExceedsCap)) {
            return false;
          }
        } else if (monthlySkipExceedsCap) {
          return false;
        }
        if (dataMode === "self_provided" && !dataSourceProviderName.trim()) return false;
        if (skipTracingType === "self_provided" && !skipTraceProviderName.trim()) return false;
        return true;
      }
      case "review":
        return hasAtLeastOneService;
      default:
        return true;
    }
  }, [
    step,
    companyName,
    pocName,
    assignedCsrId,
    pocPhone,
    wasReferred,
    referralId,
    referredByClientId,
    enableColdCalling,
    seatCount,
    coldCallingStartDate,
    script,
    customScriptUrl,
    enableTexting,
    textingFunnel,
    textingStartDate,
    dataMode,
    packageStartDate,
    packageCommitment,
    monthlySkipExceedsCap,
    dataSourceProviderName,
    skipTracingType,
    skipTraceProviderName,
    hasAtLeastOneService,
  ]);

  function goTo(index: number) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  }

  function addAssociateDraft() {
    if (!associateDraft.name.trim()) return;
    if (!isValidUsPhone(associateDraft.phone)) {
      setAssociateError("Enter a valid US phone number, or leave it blank.");
      return;
    }
    setAssociateError(null);
    setAssociates((prev) => [...prev, associateDraft]);
    setAssociateDraft(EMPTY_ASSOCIATE);
  }

  function removeAssociate(index: number) {
    setAssociates((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setSubmitting(true);
    setError(null);

    const services: ServiceInput[] = [];
    if (enableColdCalling) {
      services.push({
        type: "cold_calling",
        seatCount: Number(seatCount) || 1,
        name: campaignName || undefined,
        serviceStartDate: coldCallingStartDate || undefined,
      });
    }
    if (enableTexting) {
      services.push({
        type: "texting",
        textingTier,
        funnel: textingFunnel || undefined,
        serviceStartDate: textingStartDate || undefined,
        accountName: textingAccountName || undefined,
        accountEmail: textingAccountEmail || undefined,
      });
    }

    const dataPackage: DataPackageInput = {
      mode: dataMode,
      tier: dataMode === "package" ? packageTier : undefined,
      startDate: dataMode === "package" ? packageStartDate : undefined,
      priceOverride:
        dataMode === "package" && packagePriceOverride !== ""
          ? Number(packagePriceOverride)
          : undefined,
      commitment: dataMode === "package" ? packageCommitment || undefined : undefined,
      dataSourceProviderName:
        dataMode === "self_provided" ? dataSourceProviderName.trim() : undefined,
      skipTracingType: skipTracingType || undefined,
      skipTraceProviderName:
        skipTracingType === "self_provided" ? skipTraceProviderName.trim() : undefined,
      skipTraceRateTier: skipTraceRateTier || undefined,
      skipTraceRate:
        skipTraceRateTier === "custom" && skipTraceRate !== ""
          ? Number(skipTraceRate)
          : undefined,
      monthlySkipTraceExpected:
        monthlySkipTraceExpected !== "" ? Number(monthlySkipTraceExpected) : undefined,
    };

    const result = await createClientRecord({
      companyName,
      poc: {
        name: pocName,
        email: pocEmail || undefined,
        phone: toUsPhoneE164(pocPhone) || undefined,
        title: pocTitle || undefined,
        preferredContactMethod: preferredContactMethod || undefined,
        hsObjectId: hsObjectId || undefined,
        lifecycleStage: lifecycleStage || undefined,
        leadSource: leadSource || undefined,
        customScriptUrl:
          enableColdCalling && script === "custom" ? customScriptUrl || undefined : undefined,
      },
      assignedCsrId,
      associates: associates
        .filter((a) => a.name.trim())
        .map((a) => ({
          name: a.name,
          email: a.email || undefined,
          phone: toUsPhoneE164(a.phone) || undefined,
          role: a.role || undefined,
          preferredContactMethod: a.preferredContactMethod || undefined,
          hsObjectId: a.hsObjectId || undefined,
        })),
      buyBox: {
        property_types: propertyTypes,
        states,
        area_codes: areaCodes,
        zip_codes: zipCodes,
        max_arv: maxArv ? Number(maxArv) : null,
        exclusions: exclusions || null,
        zip_stats_sheet_link: zipStatsSheetLink || null,
      },
      script: enableColdCalling && script ? script : undefined,
      services,
      dataPackage,
      referralId: wasReferred && referralId ? referralId : undefined,
      referredByClientId:
        wasReferred && !referralId && referredByClientId ? referredByClientId : undefined,
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
    <div className="wizard-stage">
      <div className="wizard-column">
        <header className="wizard-header">
          <div className="wizard-header__brand">
            <Image
              src="/res-va-logo.png"
              alt="RES-VA"
              width={96}
              height={20}
              className="wizard-header__logo"
              priority
            />
            <span className="wizard-header__divider" aria-hidden />
            <h1 className="wizard-header__title">Add Client</h1>
          </div>
          <Link href="/clients" className="wizard-header__cancel">
            Cancel
          </Link>
        </header>

        <p className="wizard-lede">
          Walk through each step to set up the company, contacts, and services.
        </p>

        <nav className="wizard-steps" aria-label="Wizard steps">
          {STEPS.map((s, i) => {
            const isDone = i < stepIndex;
            const isActive = i === stepIndex;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => (isDone ? goTo(i) : undefined)}
                disabled={!isDone && !isActive}
                className={cn(
                  "wizard-step",
                  isActive && "wizard-step--active",
                  isDone && "wizard-step--done"
                )}
              >
                <span className="wizard-step__circle">
                  <Icon className="wizard-step__icon" aria-hidden />
                </span>
                <span className="wizard-step__label">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="wizard-bars" aria-hidden>
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "wizard-bars__seg",
                i < stepIndex && "wizard-bars__seg--done",
                i === stepIndex && "wizard-bars__seg--active"
              )}
            />
          ))}
        </div>

        <div
          ref={containerRef}
          key={step}
          className="wizard-card wizard-panel-enter"
        >
          <div className="wizard-card__head">
            <h2 className="wizard-card__title">{currentStepMeta.title}</h2>
            <p className="wizard-card__meta">
              Step {stepIndex + 1} of {STEPS.length} — {currentStepMeta.hint}
            </p>
          </div>

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
                  <Input
                    id="poc-name"
                    required
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <Label htmlFor="poc-phone">POC phone (US)</Label>
                    <Input
                      id="poc-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      aria-invalid={!isValidUsPhone(pocPhone)}
                      value={pocPhone}
                      onChange={(e) => setPocPhone(e.target.value)}
                    />
                    <FieldError
                      message={
                        !isValidUsPhone(pocPhone) ? "Enter a valid 10-digit US phone number." : undefined
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="poc-title">POC title</Label>
                  <Input
                    id="poc-title"
                    value={pocTitle}
                    onChange={(e) => setPocTitle(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label id="poc-contact-method-label">Preferred contact method</Label>
                  <div
                    className="wizard-seg"
                    role="group"
                    aria-labelledby="poc-contact-method-label"
                  >
                    {(["email", "phone", "text"] as ContactMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={cn(
                          "wizard-seg__btn",
                          preferredContactMethod === m && "wizard-seg__btn--active"
                        )}
                        aria-pressed={preferredContactMethod === m}
                        onClick={() =>
                          setPreferredContactMethod((prev) => (prev === m ? "" : m))
                        }
                      >
                        {CONTACT_METHOD_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lifecycle-stage">Lifecycle stage</Label>
                    <ListSelect
                      id="lifecycle-stage"
                      value={lifecycleStage}
                      onChange={(v) => setLifecycleStage(v as LifecycleStage | "")}
                      placeholder="Select…"
                      options={[
                        { value: "", label: "—" },
                        ...(Object.keys(LIFECYCLE_STAGE_LABELS) as LifecycleStage[]).map((s) => ({
                          value: s,
                          label: LIFECYCLE_STAGE_LABELS[s],
                        })),
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lead-source">Lead source</Label>
                    <SearchableSelect
                      id="lead-source"
                      options={LEAD_SOURCE_OPTIONS}
                      value={leadSource}
                      onChange={setLeadSource}
                      placeholder="Search lead sources…"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="hs-object-id">HubSpot object ID</Label>
                  <Input
                    id="hs-object-id"
                    value={hsObjectId}
                    onChange={(e) => setHsObjectId(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="assigned-csr">Assigned CSR</Label>
                  {callerRole === "csr" ? (
                    <Input id="assigned-csr" disabled value="You" />
                  ) : (
                    <ListSelect
                      id="assigned-csr"
                      required
                      value={assignedCsrId}
                      onChange={setAssignedCsrId}
                      placeholder="Select a CSR…"
                      options={csrs.map((csr) => ({ value: csr.id, label: csr.name }))}
                    />
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
                          <ListSelect
                            id="open-pitch"
                            value={referralId}
                            onChange={(v) => {
                              setReferralId(v);
                              if (v) setReferredByClientId("");
                            }}
                            placeholder="Create from referring client…"
                            options={[
                              { value: "", label: "Create from referring client…" },
                              ...openPitches.map((p) => ({ value: p.id, label: p.label })),
                            ]}
                          />
                        </div>
                      )}
                      {!referralId && (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="referred-by">Referring client</Label>
                          <ListSelect
                            id="referred-by"
                            required={wasReferred}
                            value={referredByClientId}
                            onChange={setReferredByClientId}
                            placeholder="Select referring client…"
                            options={referringClients.map((c) => ({
                              value: c.id,
                              label: c.label,
                            }))}
                          />
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
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Name</Label>
                    <Input
                      value={associateDraft.name}
                      onChange={(e) =>
                        setAssociateDraft((d) => ({ ...d, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Role</Label>
                    <Input
                      placeholder="Finance, Co-Investor…"
                      value={associateDraft.role}
                      onChange={(e) =>
                        setAssociateDraft((d) => ({ ...d, role: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={associateDraft.email}
                      onChange={(e) =>
                        setAssociateDraft((d) => ({ ...d, email: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Phone (US)</Label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={associateDraft.phone}
                      onChange={(e) =>
                        setAssociateDraft((d) => ({ ...d, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Preferred contact method</Label>
                    <ListSelect
                      value={associateDraft.preferredContactMethod}
                      onChange={(v) =>
                        setAssociateDraft((d) => ({
                          ...d,
                          preferredContactMethod: v as ContactMethod | "",
                        }))
                      }
                      placeholder="Select…"
                      options={[
                        { value: "", label: "—" },
                        ...(["email", "phone", "text"] as ContactMethod[]).map((m) => ({
                          value: m,
                          label: CONTACT_METHOD_LABELS[m],
                        })),
                      ]}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>HubSpot object ID</Label>
                    <Input
                      value={associateDraft.hsObjectId}
                      onChange={(e) =>
                        setAssociateDraft((d) => ({ ...d, hsObjectId: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <FieldError message={associateError ?? undefined} />
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Area codes</Label>
                    <TagInput
                      values={areaCodes}
                      onChange={setAreaCodes}
                      placeholder="e.g. 214, press Enter"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Zip codes</Label>
                    <TagInput
                      values={zipCodes}
                      onChange={setZipCodes}
                      placeholder="e.g. 75001, press Enter"
                    />
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
                  <Label htmlFor="zip-stats-sheet">Zip stats sheet link</Label>
                  <Input
                    id="zip-stats-sheet"
                    type="url"
                    placeholder="https://…"
                    value={zipStatsSheetLink}
                    onChange={(e) => setZipStatsSheetLink(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Exclusions</Label>
                  <p className="rounded-[11px] border border-white/[0.1] bg-black/10 px-3.5 py-[11px] text-sm text-ink-muted">
                    {exclusions || "None — every property type is selected."}
                  </p>
                  <p className="text-xs text-ink-faint">
                    Auto-derived from the property types not selected above.
                  </p>
                </div>
              </div>
            )}

            {step === "cold_calling" && (
              <div className="flex flex-col gap-5">
                <ToggleRow
                  checked={enableColdCalling}
                  onChange={setEnableColdCalling}
                  label="Enable cold calling"
                  description="Provision cold calling seats and a pitch script for this client."
                />
                {enableColdCalling && (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="seat-count">Seats</Label>
                        <Input
                          id="seat-count"
                          type="number"
                          min={1}
                          value={seatCount}
                          onChange={(e) => setSeatCount(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="campaign-name">Campaign name</Label>
                        <Input
                          id="campaign-name"
                          placeholder="Optional"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="cc-start-date">Service start date</Label>
                      <Input
                        id="cc-start-date"
                        type="date"
                        required
                        value={coldCallingStartDate}
                        onChange={(e) => setColdCallingStartDate(e.target.value)}
                      />
                      <FieldError
                        message={
                          coldCallingStartDate === ""
                            ? "A service start date is required."
                            : undefined
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Script</Label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {(["four_pillars", "motivation_only", "realtor", "custom"] as ClientScript[]).map(
                          (s) => (
                            <OptionTile
                              key={s}
                              active={script === s}
                              onClick={() => setScript(s)}
                              title={CLIENT_SCRIPT_LABELS[s]}
                            />
                          )
                        )}
                      </div>
                    </div>
                    {script === "custom" && (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="custom-script-url">Custom script URL</Label>
                        <Input
                          id="custom-script-url"
                          type="url"
                          required
                          placeholder="https://…"
                          value={customScriptUrl}
                          onChange={(e) => setCustomScriptUrl(e.target.value)}
                        />
                        <FieldError
                          message={
                            customScriptUrl.trim() === ""
                              ? "A URL is required for a custom script."
                              : undefined
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {step === "texting" && (
              <div className="flex flex-col gap-5">
                <ToggleRow
                  checked={enableTexting}
                  onChange={setEnableTexting}
                  label="Enable texting"
                  description="Provision a texting package and account for this client."
                />
                {enableTexting && (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label>Texting package</Label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {(["50k", "75k", "100k"] as TextingTier[]).map((t) => (
                          <OptionTile
                            key={t}
                            active={textingTier === t}
                            onClick={() => setTextingTier(t)}
                            title={TEXTING_PACKAGE_LABELS[t]}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Funnel</Label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {(["narrow", "medium", "wide"] as TextingFunnel[]).map((f) => (
                          <OptionTile
                            key={f}
                            active={textingFunnel === f}
                            onClick={() => setTextingFunnel(f)}
                            title={TEXTING_FUNNEL_LABELS[f]}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="texting-start-date">Service start date</Label>
                        <Input
                          id="texting-start-date"
                          type="date"
                          required
                          value={textingStartDate}
                          onChange={(e) => setTextingStartDate(e.target.value)}
                        />
                        <FieldError
                          message={
                            textingStartDate === ""
                              ? "A service start date is required."
                              : undefined
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="texting-account-name">Account name</Label>
                        <Input
                          id="texting-account-name"
                          placeholder="Optional"
                          value={textingAccountName}
                          onChange={(e) => setTextingAccountName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="texting-account-email">Account email</Label>
                      <Input
                        id="texting-account-email"
                        type="email"
                        placeholder="Optional"
                        value={textingAccountEmail}
                        onChange={(e) => setTextingAccountEmail(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-ink-faint">
                      Don&apos;t have account details yet? Leave them blank and ask the texting
                      department to provision the account after creation.
                    </p>
                  </>
                )}
              </div>
            )}

            {step === "data" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <Label>Data source</Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(
                      [
                        { mode: "package" as const, label: "Package" },
                        { mode: "payg" as const, label: "PAYG" },
                        { mode: "legacy" as const, label: "Legacy" },
                        { mode: "self_provided" as const, label: "Self-Provided" },
                      ]
                    ).map((opt) => (
                      <OptionTile
                        key={opt.mode}
                        active={dataMode === opt.mode}
                        onClick={() => {
                          setDataMode(opt.mode);
                          if (opt.mode !== "self_provided") setDataSourceProviderName("");
                        }}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>

                {dataMode === "self_provided" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="data-provider-name">Data provider name</Label>
                    <Input
                      id="data-provider-name"
                      value={dataSourceProviderName}
                      onChange={(e) => setDataSourceProviderName(e.target.value)}
                      placeholder="e.g. Property Radar, Batch Leads…"
                      required
                    />
                    <p className="text-xs text-ink-faint">
                      If the source isn&apos;t known, enter Unknown.
                    </p>
                  </div>
                )}

                {dataMode === "package" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Package tier</Label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {(["starter", "growth", "pro"] as PackageTier[]).map((t) => (
                          <OptionTile
                            key={t}
                            active={packageTier === t}
                            onClick={() => setPackageTier(t)}
                            title={PACKAGE_TIER_LABELS[t]}
                            subtitle={`$${PACKAGE_TIER_PRICES[t].toLocaleString()}/mo · ${PACKAGE_TIER_RECORDS[t].toLocaleString()} records`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Commitment</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["three_month", "six_month"] as PackageCommitment[]).map((c) => (
                          <OptionTile
                            key={c}
                            active={packageCommitment === c}
                            onClick={() => setPackageCommitment(c)}
                            title={PACKAGE_COMMITMENT_LABELS[c]}
                          />
                        ))}
                      </div>
                      <FieldError
                        message={packageCommitment === "" ? "A commitment term is required." : undefined}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="package-price-override">Price override (optional)</Label>
                        <Input
                          id="package-price-override"
                          type="number"
                          min={0}
                          placeholder={`$${PACKAGE_TIER_PRICES[packageTier].toLocaleString()}`}
                          value={packagePriceOverride}
                          onChange={(e) => setPackagePriceOverride(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4 border-t border-white/10 pt-5">
                  <Label>Skip tracing</Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                    {(["res", "self_provided"] as ProviderType[]).map((t) => (
                      <OptionTile
                        key={t}
                        active={skipTracingType === t}
                        onClick={() => {
                          setSkipTracingType(t);
                          if (t !== "self_provided") {
                            setSkipTraceProviderName("");
                          } else {
                            setSkipTraceRateTier("");
                            setSkipTraceRate("");
                          }
                        }}
                        title={SKIP_TRACING_SOURCE_LABELS[t]}
                      />
                    ))}
                  </div>
                  {skipTracingType === "self_provided" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="skip-provider-name">Skip-trace provider name</Label>
                      <Input
                        id="skip-provider-name"
                        value={skipTraceProviderName}
                        onChange={(e) => setSkipTraceProviderName(e.target.value)}
                        placeholder="e.g. Kind Skip, Deal Machine…"
                        required
                      />
                      <p className="text-xs text-ink-faint">
                        If the source isn&apos;t known, enter Unknown.
                      </p>
                    </div>
                  )}
{skipTracingType === "res" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="skip-rate-tier">Rate tier</Label>
                        <ListSelect
                          id="skip-rate-tier"
                          value={skipTraceRateTier}
                          onChange={(v) => setSkipTraceRateTier(v as SkipTraceRateTier | "")}
                          placeholder="Select…"
                          options={[
                            { value: "", label: "—" },
                            ...(Object.keys(SKIP_TRACE_RATE_TIER_LABELS) as SkipTraceRateTier[]).map(
                              (tier) => ({
                                value: tier,
                                label: SKIP_TRACE_RATE_TIER_LABELS[tier],
                              })
                            ),
                          ]}
                        />
                      </div>
                      {skipTraceRateTier === "custom" && (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="skip-rate-custom">Custom rate ($/record)</Label>
                          <Input
                            id="skip-rate-custom"
                            type="number"
                            min={0}
                            step="0.0001"
                            value={skipTraceRate}
                            onChange={(e) => setSkipTraceRate(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="monthly-skip-expected">Monthly skip trace expected</Label>
                    <Input
                      id="monthly-skip-expected"
                      type="number"
                      min={0}
                      max={dataMode === "package" ? packageRecordsCap : undefined}
                      value={monthlySkipTraceExpected}
                      onChange={(e) => setMonthlySkipTraceExpected(e.target.value)}
                    />
                    {dataMode === "package" && (
                      <p className="text-xs text-ink-faint">
                        Capped at {packageRecordsCap.toLocaleString()} records/mo for the{" "}
                        {PACKAGE_TIER_LABELS[packageTier]} package.
                      </p>
                    )}
                    <FieldError
                      message={
                        monthlySkipExceedsCap
                          ? `Exceeds the ${packageRecordsCap.toLocaleString()}-record package cap.`
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className="flex flex-col gap-5">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-ink-muted">Company</dt>
                  <dd className="text-ink">{companyName || "—"}</dd>
                  <dt className="text-ink-muted">POC</dt>
                  <dd className="text-ink">
                    {pocName}
                    {pocTitle ? ` — ${pocTitle}` : ""}
                  </dd>
                  <dt className="text-ink-muted">Lifecycle</dt>
                  <dd className="text-ink">
                    {lifecycleStage ? LIFECYCLE_STAGE_LABELS[lifecycleStage] : "—"}
                  </dd>
                  <dt className="text-ink-muted">Lead source</dt>
                  <dd className="text-ink">{leadSource || "—"}</dd>
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
                  <dt className="text-ink-muted">Cold calling</dt>
                  <dd className="text-ink">
                    {enableColdCalling
                      ? `${seatCount} seat(s) · ${script ? CLIENT_SCRIPT_LABELS[script] : "no script"}`
                      : "Not enabled"}
                  </dd>
                  <dt className="text-ink-muted">Texting</dt>
                  <dd className="text-ink">
                    {enableTexting
                      ? `${TEXTING_PACKAGE_LABELS[textingTier]}${
                          textingFunnel ? ` · ${TEXTING_FUNNEL_LABELS[textingFunnel]} funnel` : ""
                        }`
                      : "Not enabled"}
                  </dd>
                  <dt className="text-ink-muted">Data source</dt>
                  <dd className="text-ink">
                    {dataMode === "package"
                      ? `Package — ${PACKAGE_TIER_LABELS[packageTier]}${
                          packageCommitment ? ` · ${PACKAGE_COMMITMENT_LABELS[packageCommitment]}` : ""
                        }`
                      : dataMode === "payg"
                        ? "PAYG"
                        : dataMode === "legacy"
                          ? "Legacy"
                          : `Self-Provided — ${dataSourceProviderName.trim() || "—"}`}
                  </dd>
                  <dt className="text-ink-muted">Skip tracing</dt>
                  <dd className="text-ink">
                    {skipTracingType === "self_provided"
                      ? `Client — ${skipTraceProviderName.trim() || "—"}`
                      : skipTracingType
                        ? SKIP_TRACING_SOURCE_LABELS[skipTracingType]
                        : "—"}
                    {monthlySkipTraceExpected
                      ? ` · ${Number(monthlySkipTraceExpected).toLocaleString()} expected/mo`
                      : ""}
                  </dd>
                </dl>
                {!hasAtLeastOneService && (
                  <p role="alert" className="text-sm text-destructive">
                    Enable at least one of cold calling or texting before creating this client.
                  </p>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
        </div>

        <footer className="wizard-footer">
          <Button
            type="button"
            variant="outline"
            onClick={() => goTo(stepIndex - 1)}
            disabled={stepIndex === 0 || submitting}
            className={cn("wizard-btn wizard-btn--back", stepIndex === 0 && "invisible")}
          >
            ← Back
          </Button>
          <div className="wizard-footer__spacer" />
          {step === "review" ? (
            <Button
              type="button"
              onClick={handleCreate}
              disabled={submitting || !hasAtLeastOneService}
              className="wizard-btn wizard-btn--next"
            >
              {submitting ? "Creating…" : "Confirm & Create Client"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => goTo(stepIndex + 1)}
              disabled={!canContinue}
              className="wizard-btn wizard-btn--next"
            >
              Continue →
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}