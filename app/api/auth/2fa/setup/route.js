import { NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  getAdminTwoFactor,
  getAdminLoginChallenge,
  deleteAdminLoginChallenge,
  createAdminLoginChallenge,
} from "../../../../../lib/db";
import {
  generateTotpSecret,
  encryptSecret,
  buildOtpAuthUri,
} from "../../../../../lib/admin2fa";

const CHALLENGE_COOKIE = "avancy_admin_2fa_challenge";

export async function GET(req) {
  try {
    const challenge = req.cookies.get(
      CHALLENGE_COOKIE
    )?.value;

    const pending = await getAdminLoginChallenge(
      challenge
    );

    if (!pending || pending.purpose !== "SETUP") {
      return NextResponse.json(
        { error: "2FA setup session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const current = await getAdminTwoFactor();

    if (current.two_factor_enabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled." },
        { status: 400 }
      );
    }

    let secret = pending.pending_secret;

    /*
     * The secret belongs to this temporary setup challenge.
     * It is not active until the user proves possession of it
     * by entering a valid authenticator code.
     */
    if (!secret) {
      secret = generateTotpSecret();

      /*
       * Replace the current challenge with one carrying the
       * pending secret while preserving its purpose.
       */
      await deleteAdminLoginChallenge(challenge);

      const replacement = await createAdminLoginChallenge({
        email: pending.email,
        purpose: "SETUP",
        pendingSecret: secret,
      });

      const uri = buildOtpAuthUri(
        pending.email,
        secret
      );

      const qrCodeDataUrl = await QRCode.toDataURL(uri, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      const res = NextResponse.json({
        ok: true,
        qrCodeDataUrl,
        secret,
      });

      res.cookies.set(CHALLENGE_COOKIE, replacement, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10,
      });

      return res;
    }

    const uri = buildOtpAuthUri(
      pending.email,
      secret
    );

    const qrCodeDataUrl = await QRCode.toDataURL(uri, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    return NextResponse.json({
      ok: true,
      qrCodeDataUrl,
      secret,
    });
  } catch (error) {
    console.error("ADMIN_2FA_SETUP_ERROR", error);

    return NextResponse.json(
      { error: "Could not start two-factor setup." },
      { status: 500 }
    );
  }
}
