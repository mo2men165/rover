import {
  LayoutGrid,
  Building2,
  MessageSquare,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Gauge,
  DollarSign,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/components/app-shell/role-context";

export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
};

const dashboard: NavItem = { label: "Dashboard", href: "/dashboard", icon: LayoutGrid };
const clients: NavItem = { label: "Clients", href: "/clients", icon: Building2 };
const interactions: NavItem = { label: "Interactions", href: "/interactions", icon: MessageSquare };
const complaints: NavItem = { label: "Complaints", href: "/complaints", icon: AlertTriangle };
const churn: NavItem = { label: "Churn", href: "/churn", icon: TrendingDown };
const upsells: NavItem = { label: "Upsells", href: "/upsells", icon: TrendingUp };
const stoplightReport: NavItem = { label: "Stoplight Report", href: "/stoplight", icon: Gauge };
const commissions: NavItem = { label: "Commissions", href: "/commissions", icon: DollarSign };
const admin: NavItem = { label: "Admin", href: "/users", icon: Shield };

const csrNav: NavItem[] = [
  dashboard,
  clients,
  interactions,
  complaints,
  churn,
  upsells,
  stoplightReport,
  commissions,
];

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  csr: csrNav,
  tl: csrNav,
  hod: csrNav,
  admin: [dashboard, clients, admin],
  sysadmin: [dashboard, clients, admin],
};
