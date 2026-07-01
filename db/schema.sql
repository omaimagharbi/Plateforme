-- Schéma initial de la plateforme NEXUS.
-- À exécuter UNE FOIS dans l'éditeur SQL de votre fournisseur (Neon, Supabase...)
-- avant le premier lancement de l'application.

create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  type text not null check (type in ('particulier','entreprise')),
  display_name text not null,
  responsable text,
  taille text,
  telephone text,
  created_at timestamptz default now()
);

create table if not exists projects (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  nom text not null,
  budget numeric not null,
  duree integer not null,
  cycle text not null default 'hybride',
  pv integer not null default 30,
  ev integer not null default 20,
  risk_sector text,
  risks jsonb,
  elan jsonb,
  created_at timestamptz default now()
);

create table if not exists team_members (
  id serial primary key,
  project_id integer not null references projects(id) on delete cascade,
  nom text not null,
  role text not null,
  taux_horaire numeric not null,
  critical boolean default false,
  heures_semaine numeric default 0,
  heures_cumulees numeric default 0
);

create table if not exists invites (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

create index if not exists idx_projects_user on projects(user_id);
create index if not exists idx_team_project on team_members(project_id);
create index if not exists idx_invites_user on invites(user_id);
