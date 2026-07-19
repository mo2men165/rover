import { redirect } from "next/navigation";
import { RoleProvider } from "@/components/app-shell/role-context";
import { Sidebar } from "@/components/app-shell/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already redirects unauthenticated requests to /login; this
  // covers the edge case of an auth.users row with no matching
  // public.users profile yet (e.g. invite accepted but profile row
  // missing).
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <RoleProvider initialRole={profile.role}>
      <div className="gradient-mesh relative flex min-h-screen overflow-hidden">
        <div aria-hidden className="ambient-orb-1" />
        <div aria-hidden className="ambient-orb-2" />
        <Sidebar userName={profile.name} />
        <main className="relative z-[1] min-w-0 flex-1">{children}</main>
      </div>
    </RoleProvider>
  );
}
