"use client";

import { useEffect, useState } from "react";
import AdminImageUpload from "./AdminImageUpload";

const MAX_IMAGES = 5;

function normalizeImages(value, primaryImage = "", primaryPublicId = "") {
  const source = Array.isArray(value) ? value : [];

  const cleaned = source
    .filter(Boolean)
    .map((item) => ({
      url: String(item?.url || item?.image || "").trim(),
      publicId: String(item?.publicId || item?.imagePublicId || "").trim(),
    }))
    .filter((item) => item.url);

  if (primaryImage && !cleaned.some((item) => item.url === primaryImage)) {
    cleaned.unshift({
      url: primaryImage,
      publicId: primaryPublicId,
    });
  }

  return cleaned.slice(0, MAX_IMAGES);
}

export default function AdminProductImages({
  images = [],
  primaryImage = "",
  primaryPublicId = "",
  onChange,
}) {
  const [items, setItems] = useState(() =>
    normalizeImages(images, primaryImage, primaryPublicId)
  );

  useEffect(() => {
    setItems(normalizeImages(images, primaryImage, primaryPublicId));
  }, [images, primaryImage, primaryPublicId]);

  function update(next) {
    const cleaned = next
      .filter(Boolean)
      .map((item) => ({
        url: String(item?.url || "").trim(),
        publicId: String(item?.publicId || "").trim(),
      }))
      .filter((item) => item.url)
      .slice(0, MAX_IMAGES);

    setItems(cleaned);

    const first = cleaned[0] || {
      url: "",
      publicId: "",
    };

    onChange?.({
      images: cleaned,
      image: first.url,
      imagePublicId: first.publicId,
    });
  }

  function setImage(index, value) {
    const next = [...items];

    while (next.length <= index) {
      next.push({
        url: "",
        publicId: "",
      });
    }

    next[index] = value;
    update(next);
  }

  function removeImage(index) {
    const next = [...items];
    next.splice(index, 1);
    update(next);
  }

  return (
    <div className="av-product-images-manager">
      <div className="av-product-images-grid">
        {Array.from({ length: MAX_IMAGES }).map((_, index) => {
          const item = items[index] || {
            url: "",
            publicId: "",
          };

          return (
            <div className="av-product-image-slot" key={index}>
              <div className="av-product-image-slot-head">
                <strong>
                  IMAGE {index + 1}
                  {index === 0 ? " / PRIMARY" : ""}
                </strong>

                {item.url ? (
                  <button
                    type="button"
                    className="av-product-image-remove"
                    onClick={() => removeImage(index)}
                  >
                    REMOVE
                  </button>
                ) : null}
              </div>

              <AdminImageUpload
                image={item.url}
                publicId={item.publicId}
                onChange={(value) => setImage(index, {
                  url: value.image || "",
                  publicId: value.imagePublicId || "",
                })}
              />
            </div>
          );
        })}
      </div>

      <p className="av-muted" style={{ marginTop: 10 }}>
        Add up to 5 product images. Image 1 is the primary image shown first.
      </p>
    </div>
  );
}
