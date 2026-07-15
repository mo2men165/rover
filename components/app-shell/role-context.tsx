"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "csr" | "tl" | "hod" | "admin" | "sysadmin";

export const ROLE_LABELS: Record<Role, string> = {
  csr: "CSR",
  tl: "Team Lead",
  hod: "Head of Department",
  admin: "Admin",
  sysadmin: "System Administrator",
};

export const ALL_ROLES: Role[] = ["csr", "tl", "hod", "admin", "sysadmin"];

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("csr");
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
