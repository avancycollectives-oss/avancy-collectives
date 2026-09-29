import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../lib/auth";
import {
  getCollectiveSubmissions,
  updateCollectiveSubmissionStatus,
  deleteCollectiveSubmission,
  prepareCollectiveInstagramPublish,
  markCollectiveInstagramPublished,
  markCollectiveInstagramSkipped,
  markCollectiveInstagramFailed,
} from "../../../../lib/db";
import { deleteImage } from "../../../../lib/cloudinary";
import { publishCollectiveToInstagram } from "../../../../lib/instagram";

async function authorized() {
  const c = await cookies();
  return validSession(c.get("avancy_admin")?.value);
}

export async function GET() {
  try {
    if (!(await authorized())) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const id = String(body.id || "").trim();
    const status = String(body.status || "").trim().toUpperCase();
    const rejectionReason = String(
      body.rejectionReason || ""
    ).trim();

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
      const submissions = await getCollectiveSubmissions();

      const submission = submissions.find(
        (x) => x.id === id
      );

      if (!submission) {
        return NextResponse.json(
          { error: "Submission not found." },
          { status: 404 }
        );
      }

      if (!submission.websiteConsent) {
        return NextResponse.json(
          {
            error:
              "This submission does not have website consent.",
          },
          { status: 400 }
        );
      }
    }

    const updated =
      await updateCollectiveSubmissionStatus(
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

    let finalSubmission = updated;

    if (status === "APPROVED") {
      if (updated.instagramConsent) {
        const prepared =
          await prepareCollectiveInstagramPublish(id);

        if (prepared) {
          try {
            const published =
              await publishCollectiveToInstagram({
                imageUrl: prepared.imageUrl,
                productName: prepared.productName,
                postNumber: prepared.instagramPostNumber,
              });

            finalSubmission =
              await markCollectiveInstagramPublished(
                id,
                published.mediaId
              );
          } catch (instagramError) {
            console.error(
              "COLLECTIVE_INSTAGRAM_PUBLISH_ERROR",
              instagramError
            );

            finalSubmission =
              await markCollectiveInstagramFailed(
                id,
                instagramError?.message ||
                  "Instagram publishing failed."
              );
          }
        }
      } else {
        finalSubmission =
          await markCollectiveInstagramSkipped(id);
      }
    }

    return NextResponse.json({
      ok: true,
      submission: finalSubmission || updated,
    });
  } catch (error) {
    console.error("ADMIN_COLLECTIVE_PATCH_ERROR", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not update submission.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    if (!(await authorized())) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Submission ID is required." },
        { status: 400 }
      );
    }

    const submissions = await getCollectiveSubmissions();

    const submission = submissions.find(
      (item) => item.id === id
    );

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 }
      );
    }

    if (submission.imagePublicId) {
      try {
        await deleteImage(submission.imagePublicId);
      } catch (cloudinaryError) {
        console.error(
          "COLLECTIVE_CLOUDINARY_DELETE_ERROR",
          cloudinaryError?.message ||
            cloudinaryError
        );
      }
    }

    const deleted =
      await deleteCollectiveSubmission(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Submission could not be deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      deletedId: id,
    });
  } catch (error) {
    console.error(
      "ADMIN_COLLECTIVE_DELETE_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not delete Collective submission.",
      },
      { status: 500 }
    );
  }
}
