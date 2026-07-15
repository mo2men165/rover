"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useRole } from "@/components/app-shell/role-context";
import { NAV_BY_ROLE } from "@/lib/nav-config";
import { staggerIn, shineSweep } from "@/lib/motion";

export function Sidebar() {
  const { role } = useRole();
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!navRef.current) return;
    staggerIn(navRef.current.querySelectorAll("[data-nav-item]"));
  }, [role]);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Image
          src="/logo-mark.png"
          alt=""
          width={22}
          height={22}
          className="drop-shadow-[0_0_8px_rgba(48,169,223,0.55)]"
        />
        <span className="font-heading text-lg italic text-ink">ROVER</span>
      </div>
      <nav ref={navRef} className="flex flex-col gap-0.5 p-3">
        {items.map((item) => {
          const Icon = item.icon;

          if (!item.href) {
            return (
              <div
                key={item.label}
                data-nav-item
                className="flex cursor-default items-center gap-3 rounded-[var(--radius-sm)] border-l-[3px] border-transparent px-3 py-2 text-sm text-ink-muted/50"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </div>
            );
          }

          const active = pathname?.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              data-nav-item
              onMouseEnter={(e) => {
                const shine = e.currentTarget.querySelector<HTMLElement>(
                  "[data-shine]"
                );
                if (shine) shineSweep(shine);
              }}
              className={`shine-mask flex items-center gap-3 rounded-[var(--radius-sm)] border-l-[3px] px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-ledger bg-surface-sunken font-medium text-ledger shadow-[inset_0_0_16px_rgba(48,169,223,0.12)]"
                  : "border-transparent text-ink hover:bg-surface-sunken hover:text-ledger"
              }`}
            >
              <span data-shine aria-hidden className="shine-layer" />
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
