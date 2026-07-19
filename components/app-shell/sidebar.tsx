"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Settings, LogOut } from "lucide-react";
import { useRole, ROLE_LABELS } from "@/components/app-shell/role-context";
import { NAV_BY_ROLE } from "@/lib/nav-config";
import { staggerIn, shineSweep, magneticHover } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Sidebar({ userName }: { userName: string }) {
  const { role } = useRole();
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV_BY_ROLE[role];
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Add-Client wizard replaces app chrome (Rover-Add-Client-Wizard.dc.html).
  const hideChrome = pathname?.startsWith("/clients/new");

  useEffect(() => {
    if (!navRef.current) return;
    staggerIn(navRef.current.querySelectorAll("[data-nav-item]"));
  }, [role]);

  useEffect(() => {
    if (!logoRef.current || collapsed) return;
    return magneticHover(logoRef.current, 0.2);
  }, [collapsed]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (hideChrome) return null;

  return (
    <aside
      className="relative z-[2] flex shrink-0 flex-col gap-[18px] overflow-hidden border-r border-white/[0.09] bg-white/[0.03] px-[14px] py-5 backdrop-blur-[24px] transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      style={{ width: collapsed ? "84px" : "248px" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 320px 260px at 20% 0%, oklch(74% 0.15 224 / .14), transparent 60%), radial-gradient(ellipse 280px 240px at 100% 90%, oklch(58% 0.14 270 / .1), transparent 60%)",
        }}
      />

      <div
        ref={logoRef}
        className={`relative flex items-center gap-2.5 px-1.5 py-1.5 ${collapsed ? "justify-center" : ""}`}
      >
        <Image
          src="/logo-mark.png"
          alt=""
          width={22}
          height={22}
          className="shrink-0 drop-shadow-[0_0_10px_oklch(72%_0.15_224/0.6)]"
        />
        {!collapsed && (
          <span className="font-heading text-[15.5px] font-bold tracking-tight text-ink not-italic">
            ROVER
          </span>
        )}
      </div>

      <nav ref={navRef} className="relative flex flex-col gap-[3px]">
        {items.map((item) => {
          const Icon = item.icon;
          if (!item.href) return null;
          const active = pathname?.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              data-nav-item
              title={collapsed ? item.label : undefined}
              onMouseEnter={(e) => {
                const shine = e.currentTarget.querySelector<HTMLElement>("[data-shine]");
                if (shine) shineSweep(shine);
              }}
              className={`shine-mask relative flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-200 ${collapsed ? "justify-center" : ""} ${
                active
                  ? "bg-[oklch(74%_0.15_224/0.14)] font-semibold text-ink"
                  : "text-ink-muted hover:bg-white/[0.05] hover:text-ink"
              }`}
            >
              <span data-shine aria-hidden className="shine-layer" />
              <Icon
                aria-hidden
                className="h-[18px] w-[18px] shrink-0"
                style={{
                  color: "var(--brand-blue)",
                  filter: "drop-shadow(0 0 3px oklch(72% 0.15 224 / .4))",
                }}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={`relative mt-1 flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-ink-faint transition-colors hover:bg-white/[0.06] ${collapsed ? "justify-center" : ""}`}
      >
        <span
          aria-hidden
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform duration-200"
          style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ‹
        </span>
        {!collapsed && <span>Collapse</span>}
      </button>

      <div className="relative mt-auto flex flex-col gap-2">
        <div
          className={`flex items-center gap-2.5 rounded-[12px] border border-white/[0.08] bg-white/[0.04] p-2.5 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(160deg,var(--brand-blue),var(--brand-blue-deep))] font-heading text-xs font-bold text-white not-italic">
            {initialsOf(userName)}
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-semibold text-ink">{userName}</p>
              <p className="truncate text-[11px] text-ink-faint">{ROLE_LABELS[role]}</p>
            </div>
          )}
        </div>
        <div className={`flex gap-1.5 ${collapsed ? "flex-col" : ""}`}>
          <button
            type="button"
            title="Account Settings"
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] px-2 py-2 text-[11.5px] font-semibold text-ink-faint transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            <Settings className="h-[15px] w-[15px] shrink-0" aria-hidden />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign Out"
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] px-2 py-2 text-[11.5px] font-semibold text-ink-faint transition-colors hover:bg-[oklch(64%_0.19_25/0.14)] hover:text-[oklch(76%_0.15_25)]"
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" aria-hidden />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
