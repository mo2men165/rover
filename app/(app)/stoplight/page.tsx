import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoplightReport } from "@/components/stoplight/stoplight-report";
import { loadStoplight } from "@/lib/stoplight/load";
import { mondayOf, toDateString } from "@/lib/stoplight/week";

function parseWeekParam(raw: string | undefined): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return toDateString(mondayOf());
  }
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return toDateString(mondayOf());
  return toDateString(mondayOf(d));
}

export default async function StoplightPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (!role || !["csr", "tl", "hod", "admin", "sysadmin"].includes(role)) {
    redirect("/clients");
  }

  const params = await searchParams;
  const weekStart = parseWeekParam(params.week);

  const data = await loadStoplight({
    weekStart,
    viewerId: user.id,
    viewerRole: role,
  });

  return <StoplightReport data={data} />;
}
