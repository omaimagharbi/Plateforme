import { NextResponse } from "next/server";
import { getUserIdFromCookies } from "../../../lib/auth";
import { callClaude } from "../../../lib/claude";

const SYSTEM_PROMPT = `Tu es le moteur IA "Entraînement PMP" de la plateforme NEXUS. Génère 5 questions à choix multiples de niveau examen de certification PMP (PMI), variées dans les domaines du PMBOK (intégration, périmètre, délais, coûts, qualité, ressources, communication, risques, achats, parties prenantes, agile/hybride).
Réponds STRICTEMENT en JSON valide, sans aucun texte avant/après, sans balises markdown, au format exact :
{"questions":[{"question":"texte de la question","options":["option A","option B","option C","option D"],"correctIndex":0,"explanation":"explication courte de la bonne réponse, citant le concept PMBOK concerné"}]}
Les questions doivent être au niveau réel de l'examen PMP (scénarios de mise en situation, pas de simples définitions), avec exactement 4 options et une seule bonne réponse (correctIndex entre 0 et 3).`;

export async function POST(req) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { domain } = await req.json().catch(() => ({}));
  const userPrompt = domain
    ? `Génère les 5 questions en te concentrant sur le domaine : ${domain}.`
    : `Génère 5 questions couvrant des domaines variés du PMBOK.`;

  try {
    const data = await callClaude(SYSTEM_PROMPT, userPrompt);
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("Réponse IA vide.");
    }
    return NextResponse.json({ questions: data.questions });
  } catch (e) {
    return NextResponse.json({ error: "La génération a échoué. Réessayez." }, { status: 502 });
  }
}
