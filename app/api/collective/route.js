import { NextResponse } from "next/server";
import {
  createCollectiveSubmission,
  getApprovedCollectiveSubmissions,
} from "../../../lib/db";
import { uploadCollectiveImage } from "../../../lib/cloudinary";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = String(searchParams.get("product") || "").trim();

    const submissions = await getApprovedCollectiveSubmissions(productId);

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("COLLECTIVE_GET_ERROR", error);
    return NextResponse.json(
      { error: "Could not load Collective photos." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const form = await req.formData();

    const customerName = String(form.get("customerName") || "").trim();
    const productId = String(form.get("productId") || "").trim();
    const websiteConsent = String(form.get("websiteConsent") || "") === "true";
    const instagramConsent = String(form.get("instagramConsent") || "") === "true";
    const file = form.get("file");

    if (!customerName) {
      return NextResponse.json(
        { error: "Please enter your name." },
        { status: 400 }
      );
    }

    if (customerName.length > 80) {
      return NextResponse.json(
        { error: "Name must be 80 characters or fewer." },
        { status: 400 }
      );
    }

    if (!websiteConsent) {
      return NextResponse.json(
        { error: "Website consent is required to submit your photo." },
        { status: 400 }
      );
    }

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Please select a photo." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Please upload a JPG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    if (Number(file.size || 0) > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Please use an image under 8 MB." },
        { status: 400 }
      );
    }

    let validProductId = null;

    if (productId) {
      const { getProduct } = await import("../../../lib/db");
      const product = await getProduct(productId);

      if (!product || product.active === false) {
        return NextResponse.json(
          { error: "The selected product is no longer available." },
          { status: 400 }
        );
      }

      validProductId = product.id;
    }

    const result = await uploadCollectiveImage(
      Buffer.from(await file.arrayBuffer()),
      file.name
    );

    const submission = await createCollectiveSubmission({
      customerName,
      productId: validProductId,
      imageUrl: result.secure_url || result.url,
      imagePublicId: result.public_id || "",
      websiteConsent,
      instagramConsent,
    });

    return NextResponse.json({
      ok: true,
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("COLLECTIVE_POST_ERROR", error);

    return NextResponse.json(
      { error: error?.message || "Could not submit your photo." },
      { status: 500 }
    );
  }
}
