import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "../../../../lib/db";
import { signToken, setSessionCookie } from "../../../../lib/auth";

export async function POST(req) {
  const body = await req.json();
  const { email, password, type, displayName, responsable, taille, telephone } = body;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 6 caractères." },
      { status: 400 }
    );
  }
  if (!["particulier", "entreprise"].includes(type)) {
    return NextResponse.json({ error: "Type de compte invalide." }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "Nom manquant." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await pool.query("select id from users where email = $1", [normalizedEmail]);
  if (existing.rows.length) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `insert into users (email, password_hash, type, display_name, responsable, taille, telephone)
     values ($1, $2, $3, $4, $5, $6, $7)
     returning id, email, type, display_name, responsable, taille, telephone`,
    [normalizedEmail, passwordHash, type, displayName, responsable || null, taille || null, telephone || null]
  );

  const user = result.rows[0];
  const token = signToken({ userId: user.id });
  setSessionCookie(token);

  return NextResponse.json({ user });
}
