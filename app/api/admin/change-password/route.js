import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  changeAdminPassword,
  createSession,
  validSession,
  verifyAdminPassword,
} from "../../../../lib/auth";
import { deleteAllAdminSessions } from "../../../../lib/db";

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get("avancy_admin")?.value || "";

    if (!currentToken || !(await validSession(currentToken))) {
      return NextResponse.json(
        { error: "Your admin session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");
    const confirmPassword = String(body?.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "All password fields are required." },
        { status: 400 }
      );
    }

    if (!(await verifyAdminPassword(currentPassword))) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    if (newPassword.length < 12) {
      return NextResponse.json(
        { error: "New password must be at least 12 characters." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match." },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password." },
        { status: 400 }
      );
    }

    await changeAdminPassword(newPassword);

    await deleteAllAdminSessions();

    const token = await createSession();

    const res = NextResponse.json({
      ok: true,
      message: "Admin password changed successfully.",
    });

    res.cookies.set("avancy_admin", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return res;
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { error: "Unable to change admin password." },
      { status: 500 }
    );
  }
}
