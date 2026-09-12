import { v2 as cloudinary } from "cloudinary";

let configured = false;

function getCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local.");
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export async function uploadImage(buffer, filename) {
  const cld = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cld.uploader.upload_stream({
      folder: "avancy/products",
      resource_type: "image",
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      context: { original_filename: filename || "product-image" },
    }, (error, result) => error ? reject(error) : resolve(result));
    stream.end(buffer);
  });
}

export async function deleteImage(publicId) {
  if (!publicId) return null;
  const cld = getCloudinary();
  return cld.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
