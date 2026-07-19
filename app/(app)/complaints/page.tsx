import { createClient } from "@/lib/supabase/server";
import {
  ComplaintTracker,
  type ComplaintListItem,
} from "@/components/complaints/complaint-tracker";

export default async function ComplaintsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("complaints")
    .select(
      `
      id,
      client_id,
      category,
      description,
      validity,
      status,
      resolution_notes,
      opened_at,
      resolved_at,
      client:clients!complaints_client_id_fkey(
        name,
        company:companies!clients_company_id_fkey(name)
      ),
      logger:users!complaints_logged_by_fkey(name),
      follow_ups:follow_up_tasks!follow_up_tasks_complaint_id_fkey(
        description,
        due_date,
        completed
      )
    `
    )
    .order("opened_at", { ascending: false })
    .limit(100);

  const complaints: ComplaintListItem[] = (rows ?? []).map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client;
    const company = client
      ? Array.isArray(client.company)
        ? client.company[0]
        : client.company
      : null;
    const logger = Array.isArray(row.logger) ? row.logger[0] : row.logger;
    const followUps = Array.isArray(row.follow_ups)
      ? row.follow_ups
      : row.follow_ups
        ? [row.follow_ups]
        : [];
    const followUp = followUps[0] ?? null;

    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client?.name ?? "Unknown",
      companyName: company?.name ?? "—",
      category: row.category,
      description: row.description,
      validity: row.validity,
      status: row.status,
      resolutionNotes: row.resolution_notes,
      openedAt: row.opened_at,
      resolvedAt: row.resolved_at,
      loggedByName: logger?.name ?? "Unknown",
      followUpDescription: followUp?.description ?? null,
      followUpDueDate: followUp?.due_date ?? null,
      followUpCompleted: followUp?.completed ?? false,
    };
  });

  return <ComplaintTracker initialComplaints={complaints} />;
}
