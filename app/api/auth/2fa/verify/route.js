import { NextResponse } from "next/server";
import crypto from "crypto";

import {
  createSession,
} from "../../../../../lib/auth";

import {
  getAdminTwoFactor,
  getAdminLoginChallenge,
  incrementAdminLoginChallengeAttempts,
  deleteAdminLoginChallenge,
  setAdminTwoFactor,
} from "../../../../../lib/db";

import {
  verifyTotp,
  encryptSecret,
  decryptSecret,
} from "../../../../../lib/admin2fa";

const CHALLENGE_COOKIE = "avancy_admin_2fa_challenge";

function clearChallengeCookie(res) {
  res.cookies.set(CHALLENGE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function setAdminSession(res, token) {
  res.cookies.set("avancy_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

function generateBackupCodes(count = 10) {
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

    hashes.push(
      crypto
        .createHash("sha256")
        .update(raw)
        .digest("hex")
    );
  }

  return { plain, hashes };
}

export async function POST(req) {
  try {
    const challengeToken = req.cookies.get(
      CHALLENGE_COOKIE
    )?.value;

    const challenge =
      await getAdminLoginChallenge(
        challengeToken
      );

    if (!challenge) {
      return NextResponse.json(
        {
          error:
            "Your authentication session expired. Please sign in again.",
        },
        { status: 401 }
      );
    }

    if (Number(challenge.attempts || 0) >= 5) {
      await deleteAdminLoginChallenge(
        challengeToken
      );

      const res = NextResponse.json(
        {
          error:
            "Too many verification attempts. Please sign in again.",
        },
        { status: 429 }
      );

      clearChallengeCookie(res);

      return res;
    }

    let body = {};

    try {
      body = await req.json();
    } catch {}

    const code = String(body.code || "")
      .replace(/\s/g, "")
      .trim();

    if (!/^\d{6}$/.test(code)) {
      await incrementAdminLoginChallengeAttempts(
        challengeToken
      );

      return NextResponse.json(
        { error: "Enter the 6-digit authenticator code." },
        { status: 400 }
      );
    }

    const current = await getAdminTwoFactor();

    let secret = "";

    if (challenge.purpose === "SETUP") {
      secret = challenge.pending_secret || "";

      if (!secret) {
        return NextResponse.json(
          {
            error:
              "2FA setup is incomplete. Please sign in again.",
          },
          { status: 400 }
        );
      }
    } else {
      if (!current.two_factor_enabled) {
        return NextResponse.json(
          {
            error:
              "Two-factor authentication is not configured.",
          },
          { status: 400 }
        );
      }

      if (!current.two_factor_secret) {
        return NextResponse.json(
          {
            error:
              "Two-factor authentication is unavailable. Contact the site administrator.",
          },
          { status: 500 }
        );
      }

      try {
        secret = decryptSecret(
          current.two_factor_secret
        );
      } catch {
        return NextResponse.json(
          {
            error:
              "Two-factor authentication configuration is invalid.",
          },
          { status: 500 }
        );
      }
    }

    const valid = verifyTotp(secret, code);

    if (!valid) {
      const attempts =
        await incrementAdminLoginChallengeAttempts(
          challengeToken
        );

      return NextResponse.json(
        {
          error:
            attempts >= 5
              ? "Too many verification attempts. Please sign in again."
              : "Invalid authenticator code.",
        },
        {
          status: attempts >= 5 ? 429 : 401,
        }
      );
    }

    let backupCodes = null;

    if (challenge.purpose === "SETUP") {
      const generated =
        generateBackupCodes(10);

      await setAdminTwoFactor({
        enabled: true,
        secret: encryptSecret(secret),
        backupCodes: generated.hashes,
      });

      backupCodes = generated.plain;
    }

    await deleteAdminLoginChallenge(
      challengeToken
    );

    const token = await createSession();

    const res = NextResponse.json({
      ok: true,
      twoFactorEnabled: true,
      backupCodes,
    });

    clearChallengeCookie(res);
    setAdminSession(res, token);

    return res;
  } catch (error) {
    console.error(
      "ADMIN_2FA_VERIFY_ERROR",
      error
    );

    return NextResponse.json(
      { error: "Two-factor verification failed." },
      { status: 500 }
    );
  }
}
