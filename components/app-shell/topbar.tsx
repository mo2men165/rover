"use client";

import { useRole, ROLE_LABELS, ALL_ROLES } from "@/components/app-shell/role-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const { role, setRole } = useRole();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-surface px-6">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer rounded-[var(--radius-sm)] border-metallic px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ledger">
            Preview role:{" "}
            <span className="font-medium text-ink">{ROLE_LABELS[role]}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Preview as role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_ROLES.map((r) => (
                <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                  {ROLE_LABELS[r]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer rounded-full border-metallic">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[linear-gradient(135deg,var(--brand-blue),var(--brand-blue-deep))] text-xs text-white">
                JD
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Jane Doe</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Log out</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
