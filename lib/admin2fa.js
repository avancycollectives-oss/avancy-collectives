import crypto from "crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey() {
  const raw = process.env.ADMIN_2FA_ENCRYPTION_KEY || "";
  if (!raw) throw new Error("ADMIN_2FA_ENCRYPTION_KEY is missing.");
  return crypto.createHash("sha256").update(raw).digest();
}

export function generateTotpSecret() {
  const bytes = crypto.randomBytes(20);
  let bits = "";

  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let secret = "";

  for (let i = 0; i < bits.length; i += 5) {
    secret += BASE32[
      parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)
    ];
  }

  return secret;
}

function base32Decode(value) {
  const clean = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");

  let bits = "";

  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret.");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes = [];

  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

export function verifyTotp(secret, code, window = 1) {
  const normalized = String(code || "").replace(/\D/g, "");

  if (!/^\d{6}$/.test(normalized)) return false;

  let key;

  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }

  const counter = Math.floor(Date.now() / 1000 / 30);
  const expected = Number(normalized);

  for (let offset = -window; offset <= window; offset++) {
    const counterBuffer = Buffer.alloc(8);

    counterBuffer.writeBigUInt64BE(
      BigInt(counter + offset)
    );

    const digest = crypto
      .createHmac("sha1", key)
      .update(counterBuffer)
      .digest();

    const index = digest[digest.length - 1] & 0x0f;

    const binary =
      ((digest[index] & 0x7f) << 24) |
      (digest[index + 1] << 16) |
      (digest[index + 2] << 8) |
      digest[index + 3];

    if (binary % 1000000 === expected) {
      return true;
    }
  }

  return false;
}

export function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    encryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(String(secret), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptSecret(value) {
  const parts = String(value || "").split(":");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted 2FA secret.");
  }

  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const encrypted = Buffer.from(parts[3], "base64url");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    iv
  );

  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function buildOtpAuthUri(email, secret) {
  const issuer = "Avancy Collectives";

  return (
    `otpauth://totp/${encodeURIComponent(issuer)}:` +
    `${encodeURIComponent(email)}` +
    `?secret=${secret}` +
    `&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1&digits=6&period=30`
  );
}

function hashBackupCode(code) {
  return crypto
    .createHash("sha256")
    .update(
      String(code)
        .replace(/-/g, "")
        .toUpperCase()
    )
    .digest("hex");
}

export function generateBackupCodes(count = 10) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const plain = [];
  const hashes = [];

  for (let n = 0; n < count; n++) {
    let raw = "";

    for (let i = 0; i < 8; i++) {
      raw += alphabet[
        crypto.randomInt(0, alphabet.length)
      ];
    }

    const code =
      `${raw.slice(0, 4)}-${raw.slice(4)}`;

    plain.push(code);
    hashes.push(hashBackupCode(code));
  }

  return { plain, hashes };
}

export function backupCodeHash(code) {
  return hashBackupCode(code);
}
