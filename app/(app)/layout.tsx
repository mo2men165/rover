import { redirect } from "next/navigation";
import { RoleProvider } from "@/components/app-shell/role-context";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
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
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar userName={profile.name} />
          <main className="flex-1 bg-paper p-6">{children}</main>
        </div>
      </div>
    </RoleProvider>
  );
}
