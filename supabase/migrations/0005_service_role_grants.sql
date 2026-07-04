-- ============================================================
-- Wedding Carnival — service_role grants
-- ============================================================
-- The admin panel writes with the SECRET key, which maps to the
-- `service_role` Postgres role. Because "Automatically expose new
-- tables" is OFF, service_role did NOT receive grants on our tables
-- either (symptom: "42501 permission denied for table weddings" from
-- the admin server actions). Grant it full access to everything in
-- public, now and going forward.

grant usage on schema public to service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Future tables/sequences created later are auto-granted to service_role,
-- so we won't hit this again when adding tables.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
