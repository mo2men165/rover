-- Sprint 4 (Big Sprint Part 1): buy box, script selection, and pinned
-- notes for the POC client row; role + preferred contact method for
-- associates. Associates are not a new table -- they're modeled by the
-- existing clients.is_poc = false rows for a company, per explicit
-- instruction, so these new columns land directly on `clients`.

create type public.client_script as enum ('four_pillars', 'motivation_only');
create type public.contact_method as enum ('email', 'phone', 'text');

alter table public.clients
  add column buy_box jsonb,
  add column script public.client_script,
  add column pinned_notes text,
  add column role text,
  add column preferred_contact_method public.contact_method;

-- buy_box/script/pinned_notes are POC-only config -- mirrors the existing
-- clients_package_fields_require_poc_chk pattern from Sprint 3.
alter table public.clients
  add constraint clients_profile_fields_require_poc_chk
    check (
      is_poc or (
        buy_box is null
        and script is null
        and pinned_notes is null
      )
    );

-- role/preferred_contact_method are associate-only -- the POC's own title
-- is already captured via title_at_company, so these stay null on the POC
-- row (inverse of the check above).
alter table public.clients
  add constraint clients_associate_fields_require_non_poc_chk
    check (
      (not is_poc) or (
        role is null
        and preferred_contact_method is null
      )
    );
