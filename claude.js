import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import pool from "./db";

const SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "nexus_token";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

export function setSessionCookie(token) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

// Renvoie l'id de l'utilisateur connecté à partir du cookie, ou null.
export function getUserIdFromCookies() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const data = verifyToken(token);
  return data ? data.userId : null;
}

// Renvoie l'utilisateur connecté complet (sans le hash de mot de passe), ou null.
export async function getCurrentUser() {
  const userId = getUserIdFromCookies();
  if (!userId) return null;
  const result = await pool.query(
    `select id, email, type, display_name, responsable, taille, telephone
     from users where id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}
