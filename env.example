// Calcule le chemin critique d'un ensemble de tâches (méthode CPM du PMBOK).
// tasks : [{ id, nom, duree, depends_on: [id, id, ...] }, ...]
// Renvoie les mêmes tâches enrichies de : es, ef, ls, lf, slack, critical
// ainsi que la durée totale du projet (makespan).
//
// Convention : dépendances de type Fin-à-Début (finish-to-start), la plus
// courante en gestion de projet. Une tâche ne peut démarrer qu'une fois
// tous ses prédécesseurs terminés.

export function computeCPM(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));

  // Ordre topologique (détecte aussi les cycles, qu'on ignore silencieusement
  // en les traitant comme "pas de dépendance" pour ne jamais planter l'UI).
  const visited = new Set();
  const order = [];
  const visiting = new Set();

  function visit(id) {
    if (visited.has(id) || !byId.has(id)) return;
    if (visiting.has(id)) return; // cycle détecté : on coupe ici
    visiting.add(id);
    const t = byId.get(id);
    (t.depends_on || []).forEach((depId) => visit(depId));
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }
  tasks.forEach((t) => visit(t.id));

  const es = {}, ef = {};
  // Passe avant : date de début / fin au plus tôt
  order.forEach((id) => {
    const t = byId.get(id);
    const preds = (t.depends_on || []).filter((d) => byId.has(d));
    const startEarliest = preds.length ? Math.max(...preds.map((p) => ef[p] ?? 0)) : 0;
    es[id] = startEarliest;
    ef[id] = startEarliest + Number(t.duree || 0);
  });

  const makespan = order.length ? Math.max(...order.map((id) => ef[id])) : 0;

  const ls = {}, lf = {};
  // Successeurs de chaque tâche (pour la passe arrière)
  const successors = {};
  order.forEach((id) => (successors[id] = []));
  order.forEach((id) => {
    const t = byId.get(id);
    (t.depends_on || []).forEach((depId) => {
      if (successors[depId]) successors[depId].push(id);
    });
  });

  // Passe arrière : date de début / fin au plus tard
  [...order].reverse().forEach((id) => {
    const succ = successors[id] || [];
    const finishLatest = succ.length ? Math.min(...succ.map((s) => ls[s] ?? makespan)) : makespan;
    lf[id] = finishLatest;
    ls[id] = finishLatest - Number(byId.get(id).duree || 0);
  });

  const result = tasks.map((t) => {
    const slack = (ls[t.id] ?? 0) - (es[t.id] ?? 0);
    return {
      ...t,
      es: es[t.id] ?? 0,
      ef: ef[t.id] ?? 0,
      ls: ls[t.id] ?? 0,
      lf: lf[t.id] ?? 0,
      slack,
      critical: slack === 0,
    };
  });

  return { tasks: result, makespan };
}
