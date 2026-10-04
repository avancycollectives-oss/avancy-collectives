import crypto from "crypto";
import {
  createSession as dbCreateSession,
  validSession as dbValidSession,
  deleteSession as dbDeleteSession,
  getAdminPasswordHash,
  setAdminPasswordHash,
  getAdminTwoFactor,
  setAdminTwoFactor,
} from "./db";

function hash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function adminCredentials() {
  return {
    email: process.env.ADMIN_EMAIL || "admin@avancycollectives.com",
    password: process.env.ADMIN_PASSWORD || "",
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const key = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });

  return {
    salt,
    hash: key.toString("hex"),
  };
}

function verifyHash(password, stored) {
  if (!stored || typeof stored !== "string") return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, salt, expectedHex] = parts;

  try {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });

    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}


export async function getAdmin2FAState() {
  const state = await getAdminTwoFactor();

  return {
    enabled: Boolean(state.two_factor_enabled),
    secret: state.two_factor_secret || "",
    backupCodes: Array.isArray(state.two_factor_backup_codes)
      ? state.two_factor_backup_codes
      : [],
  };
}

export async function saveAdmin2FA({
  enabled = false,
  secret = "",
  backupCodes = [],
}) {
  await setAdminTwoFactor({
    enabled,
    secret,
    backupCodes,
  });
}

export async function verifyAdminPassword(password) {
  const storedHash = await getAdminPasswordHash();

  if (storedHash) {
    return verifyHash(password, storedHash);
  }

  const configuredPassword = adminCredentials().password;

  if (!configuredPassword || !password) return false;

  const a = Buffer.from(configuredPassword);
  const b = Buffer.from(password);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function changeAdminPassword(password) {
  const { salt, hash: passwordHash } = hashPassword(password);

  await setAdminPasswordHash(
    `scrypt$16384$8$1$${salt}$${passwordHash}`
  );
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
