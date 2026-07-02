export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "../../../../lib/db";
import { signToken, setSessionCookie } from "../../../../lib/auth";

export async function POST(req) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const result = await pool.query(
    `select id, email, password_hash, type, display_name, responsable, taille, telephone
     from users where email = $1`,
    [normalizedEmail]
  );
  const user = result.rows[0];

  if (!user) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  const token = signToken({ userId: user.id });
  setSessionCookie(token);

  delete user.password_hash;
  return NextResponse.json({ user });
}
