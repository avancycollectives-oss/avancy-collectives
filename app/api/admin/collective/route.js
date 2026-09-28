import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../lib/auth";
import {
  getCollectiveSubmissions,
  updateCollectiveSubmissionStatus,
} from "../../../../lib/db";

async function authorized() {
  const c = await cookies();
  return validSession(c.get("avancy_admin")?.value);
}

export async function GET() {
  try {
    if (!(await authorized())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json({
      submissions: await getCollectiveSubmissions(),
    });
  } catch (error) {
    console.error("ADMIN_COLLECTIVE_GET_ERROR", error);
    return NextResponse.json(
      { error: "Could not load Collective submissions." },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    if (!(await authorized())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();

    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim().toUpperCase();
    const rejectionReason = String(body.rejectionReason || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Submission ID is required." },
        { status: 400 }
      );
    }

    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid submission status." },
        { status: 400 }
      );
    }

    if (status === "APPROVED") {
      // Website consent is mandatory for public display.
      const { getCollectiveSubmissions } = await import("../../../../lib/db");
      const submissions = await getCollectiveSubmissions();
      const submission = submissions.find((x) => x.id === id);

      if (!submission) {
        return NextResponse.json(
          { error: "Submission not found." },
          { status: 404 }
        );
      }

      if (!submission.websiteConsent) {
        return NextResponse.json(
          { error: "This submission does not have website consent." },
          { status: 400 }
        );
      }
    }

    const updated = await updateCollectiveSubmissionStatus(
      id,
      status,
      rejectionReason
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, submission: updated });
  } catch (error) {
    console.error("ADMIN_COLLECTIVE_PATCH_ERROR", error);
    return NextResponse.json(
      { error: error?.message || "Could not update submission." },
      { status: 500 }
    );
  }
}
