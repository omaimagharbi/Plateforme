// Client minimal pour l'API REST Jira Cloud (v3), utilisé pour importer des tickets
// comme tâches WBS. Le domaine, l'email et le jeton API sont fournis à chaque import
// et utilisés uniquement pour cet appel : rien n'est jamais stocké côté serveur.

export async function fetchJiraIssues({ domain, email, apiToken, projectKey }) {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const jql = encodeURIComponent(`project = "${projectKey}" ORDER BY created ASC`);
  const url = `https://${cleanDomain}/rest/api/3/search?jql=${jql}&maxResults=100&fields=summary,timeoriginalestimate,issuelinks,status`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jira a répondu ${res.status} : ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const issues = data.issues || [];

  return issues.map((issue) => {
    const seconds = issue.fields.timeoriginalestimate;
    // 28800s = 8h = 1 jour ouvré. Si le ticket n'a pas d'estimation, on met 3 jours par défaut.
    const duree = seconds ? Math.max(1, Math.round(seconds / 28800)) : 3;

    // Convention standard Jira pour le type de lien "Blocks" : le champ inwardIssue porte
    // la description "is blocked by". Si l'instance Jira utilise un type de lien personnalisé,
    // les dépendances ne seront pas détectées mais les tickets seront quand même importés.
    const blockedByKeys = (issue.fields.issuelinks || [])
      .filter((l) => l.type?.inward === "is blocked by" && l.inwardIssue)
      .map((l) => l.inwardIssue.key);

    return {
      key: issue.key,
      nom: issue.fields.summary,
      duree,
      blockedByKeys,
    };
  });
}
