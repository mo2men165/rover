"use server";

import { createClient } from "@/lib/supabase/server";

export type ClientSearchHit = {
  id: string;
  name: string;
  email: string | null;
  companyName: string;
  isPoc: boolean;
};

// Searchable client picker for quick-log. Returns contacts the caller can
// see (RLS) — CSR: assigned companies only; elevated: all.
export async function searchClientsForLog(
  query: string
): Promise<ClientSearchHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, is_poc, company:companies!inner(name)")
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
    .order("name")
    .limit(12);

  if (error || !data) return [];

  return data.map((row) => {
    const company = Array.isArray(row.company) ? row.company[0] : row.company;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      companyName: company?.name ?? "—",
      isPoc: row.is_poc,
    };
  });
}
