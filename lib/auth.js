import crypto from "crypto";
import { createSession as dbCreateSession, validSession as dbValidSession, deleteSession as dbDeleteSession } from "./db";

function hash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function adminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL || "admin@avancycollectives.com",
    password: process.env.ADMIN_PASSWORD || ""
  };
}

export async function createSession() {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8);
  await dbCreateSession(hash(token), expiresAt);
  return token;
}

export async function validSession(token) {
  return dbValidSession(token ? hash(token) : "");
}

export async function deleteSession(token) {
  if (token) await dbDeleteSession(hash(token));
}
