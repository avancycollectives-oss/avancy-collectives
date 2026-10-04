import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { customerFromToken } from "../../../../../../lib/customerAuth";
import { requestOrderReturn } from "../../../../../../lib/db";
import { sendReturnRequestEmail } from "../../../../../../lib/email.js";

export async function POST(req, { params }) {
  try {
    const c = await cookies();
    const user = await customerFromToken(
      c.get("avancy_customer")?.value
    );

    if (!user) {
      return NextResponse.json(
        { error: "Not signed in." },
        { status: 401 }
      );
    }

    const { id } = await params;

    let body = {};
    try {
      body = await req.json();
    } catch {}

    const reason = String(body.reason || "").trim();

    const evidenceUrl = String(body.evidenceUrl || "").trim();

    if (!reason) {
      return NextResponse.json(
        { error: "Please provide a return reason." },
        { status: 400 }
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: "Return reason is too long." },
        { status: 400 }
      );
    }

    const order = await requestOrderReturn(
  id,
  user.email,
  reason,
  evidenceUrl
);

    if (!order) {
      return NextResponse.json(
        {
          error:
            "This order is not eligible for return. Returns are available only within 10 days of delivery.",
        },
        { status: 400 }
      );
    }

    /*
     * Email failure must never undo a successfully saved return request.
     */
    try {
      await sendReturnRequestEmail(order);
    } catch (emailError) {
      console.error(
        "RETURN_SUPPORT_EMAIL_ERROR",
        emailError
      );
    }

    return NextResponse.json({
      ok: true,
      order,
      message: "Return request submitted successfully.",
    });
  } catch (error) {
    console.error("RETURN_REQUEST_ERROR", error);

    return NextResponse.json(
      { error: "Could not submit return request." },
      { status: 500 }
    );
  }
}