-- Migration NEXUS — Niveau 2 : historique EVM (courbe en S) + contrôle des changements.
-- À exécuter UNE FOIS dans l'éditeur SQL de votre fournisseur (Neon...),
-- en plus de schema.sql et migration_002_tasks.sql déjà exécutés.

create table if not exists evm_snapshots (
  id serial primary key,
  project_id integer not null references projects(id) on delete cascade,
  week_key text not null,           -- ex : "2026-W27", une entrée par semaine
  pv numeric not null,
  ev numeric not null,
  ac numeric not null,
  created_at timestamptz default now(),
  unique (project_id, week_key)
);

create table if not exists change_requests (
  id serial primary key,
  project_id integer not null references projects(id) on delete cascade,
  titre text not null,
  description text,
  impact_budget numeric not null default 0,   -- en euros, peut être négatif
  impact_duree integer not null default 0,     -- en semaines, peut être négatif
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  decided_at timestamptz
);

create index if not exists idx_evm_snapshots_project on evm_snapshots(project_id);
create index if not exists idx_change_requests_project on change_requests(project_id);
