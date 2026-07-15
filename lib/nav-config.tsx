import {
  Building2,
  UsersRound,
  BarChart3,
  UserCog,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/components/app-shell/role-context";

export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
};

const clients: NavItem = { label: "Clients", href: "/clients", icon: Building2 };
const team: NavItem = { label: "Team", icon: UsersRound };
const reports: NavItem = { label: "Reports", icon: BarChart3 };
const users: NavItem = { label: "Users", icon: UserCog };
const settings: NavItem = { label: "Settings", icon: Settings };
const auditLog: NavItem = { label: "Audit Log", icon: ScrollText };

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  csr: [clients],
  tl: [clients, team],
  hod: [clients, team, reports],
  admin: [clients, users, settings],
  sysadmin: [clients, users, settings, auditLog],
};
