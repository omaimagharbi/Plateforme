-- Migration NEXUS — Niveau 1 : WBS / tâches / dépendances / chemin critique.
-- À exécuter UNE FOIS dans l'éditeur SQL de votre fournisseur (Neon...),
-- en plus du schema.sql déjà exécuté précédemment.

create table if not exists tasks (
  id serial primary key,
  project_id integer not null references projects(id) on delete cascade,
  nom text not null,
  duree integer not null default 1,          -- durée en jours
  status text not null default 'todo'        -- 'todo' | 'in_progress' | 'done'
    check (status in ('todo','in_progress','done')),
  depends_on jsonb not null default '[]',     -- tableau d'ids de tâches prédécesseurs
  wbs_order serial,                            -- ordre d'affichage stable
  created_at timestamptz default now()
);

create index if not exists idx_tasks_project on tasks(project_id);
