import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../lib/auth";
import { uploadImage } from "../../../../lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req) {
  const c = await cookies();
  if (!(await validSession(c.get("avancy_admin")?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Choose an image first." }, { status: 400 });
    }

    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowed.has(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WEBP or GIF images are allowed." }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be 8 MB or smaller." }, { status: 400 });
    }

    const result = await uploadImage(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json({ error: error?.message || "Image upload failed." }, { status: 500 });
  }
}
