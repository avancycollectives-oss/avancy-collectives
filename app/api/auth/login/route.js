import { NextResponse } from "next/server";
import {
  adminCredentials,
  verifyAdminPassword,
} from "../../../../lib/auth";
import {
  createAdminLoginChallenge,
  getAdminTwoFactor,
} from "../../../../lib/db";

const CHALLENGE_COOKIE = "avancy_admin_2fa_challenge";

function setChallengeCookie(res, token) {
  res.cookies.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const credentials = adminCredentials();

    if (!credentials.email || !password) {
      return NextResponse.json(
        { error: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    const validPassword = await verifyAdminPassword(password);

    if (
      String(email || "").trim().toLowerCase() !==
        String(credentials.email).trim().toLowerCase() ||
      !validPassword
    ) {
      return NextResponse.json(
        { error: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    const twoFactor = await getAdminTwoFactor();

    const purpose = twoFactor.two_factor_enabled
      ? "LOGIN"
      : "SETUP";

    const challenge = await createAdminLoginChallenge({
      email: credentials.email,
      purpose,
    });

    const res = NextResponse.json({
      ok: true,
      requires2FASetup: purpose === "SETUP",
      requires2FAVerification: purpose === "LOGIN",
    });

    setChallengeCookie(res, challenge);

    return res;
  } catch (e) {
    console.error("ADMIN_LOGIN_ERROR", e);

    return NextResponse.json(
      { error: "Login failed." },
      { status: 500 }
    );
  }
}
