export type HubSpotNoteResult =
  | { ok: true }
  | { ok: false; error: string };

// Best-effort HubSpot CRM note on a contact. Missing token or API errors
// must never fail the ROVER interaction insert — callers record the note.
export async function postHubSpotContactNote(input: {
  contactId: string;
  body: string;
}): Promise<HubSpotNoteResult> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return {
      ok: false,
      error: "Skipped: HUBSPOT_ACCESS_TOKEN is not configured.",
    };
  }

  try {
    const noteRes = await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          hs_timestamp: Date.now().toString(),
          hs_note_body: input.body,
        },
      }),
    });

    if (!noteRes.ok) {
      const text = await noteRes.text();
      return {
        ok: false,
        error: `HubSpot note create failed (${noteRes.status}): ${text.slice(0, 200)}`,
      };
    }

    const note = (await noteRes.json()) as { id?: string };
    if (!note.id) {
      return { ok: false, error: "HubSpot note create returned no id." };
    }

    const assocRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/notes/${note.id}/associations/contacts/${input.contactId}/note_to_contact`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!assocRes.ok) {
      const text = await assocRes.text();
      return {
        ok: false,
        error: `HubSpot note association failed (${assocRes.status}): ${text.slice(0, 200)}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown HubSpot error";
    return { ok: false, error: `HubSpot request failed: ${message}` };
  }
}
