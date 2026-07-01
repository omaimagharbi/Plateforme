import { NextResponse } from "next/server";
import pool from "../../../lib/db";
import { getUserIdFromCookies, getCurrentUser } from "../../../lib/auth";

export async function GET() {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const result = await pool.query(
    "select id, email, created_at from invites where user_id = $1 order by created_at desc",
    [userId]
  );
  return NextResponse.json({ invites: result.rows });
}

export async function POST(req) {
  const userId = getUserIdFromCookies();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const user = await getCurrentUser();
  if (user.type !== "entreprise") {
    return NextResponse.json(
      { error: "Seuls les comptes Entreprise peuvent inviter des collaborateurs." },
      { status: 403 }
    );
  }

  const { email } = await req.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  // NOTE : ceci enregistre l'invitation en base mais n'envoie pas d'email réel.
  // Pour un envoi réel, brancher un service comme Resend ou Postmark ici.
  const result = await pool.query(
    "insert into invites (user_id, email) values ($1, $2) returning id, email, created_at",
    [userId, email.toLowerCase().trim()]
  );

  return NextResponse.json({ invite: result.rows[0] });
}
