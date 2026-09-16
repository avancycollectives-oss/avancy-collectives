import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { customerFromToken } from "../../../../../../../lib/customerAuth";
import { uploadImage } from "../../../../../../../lib/cloudinary";

export const runtime = "nodejs";

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

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "Choose an image first." },
        { status: 400 }
      );
    }

    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    if (!allowed.has(file.type)) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG, WEBP or GIF images are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be 8 MB or smaller." },
        { status: 400 }
      );
    }

    const result = await uploadImage(
      Buffer.from(await file.arrayBuffer()),
      `return-${id}-${file.name}`
    );

    return NextResponse.json({
      ok: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    console.error("RETURN_UPLOAD_ERROR", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Return evidence upload failed.",
      },
      { status: 500 }
    );
  }
}