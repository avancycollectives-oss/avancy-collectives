"use client";

import { useEffect, useMemo, useState } from "react";

function normalizeImages(product) {
  const source = Array.isArray(product?.images)
    ? product.images
    : [];

  const images = source
    .map((item) => ({
      url: String(item?.url || item?.image || "").trim(),
      publicId: String(item?.publicId || item?.imagePublicId || "").trim(),
    }))
    .filter((item) => item.url);

  const primary = String(product?.image || "").trim();
  const primaryPublicId = String(product?.imagePublicId || "").trim();

  if (primary && !images.some((item) => item.url === primary)) {
    images.unshift({
      url: primary,
      publicId: primaryPublicId,
    });
  }

  return images.slice(0, 5);
}

export default function ProductArt({
  product,
  large = false,
  onImageClick,
}) {
  const images = useMemo(() => normalizeImages(product), [product]);

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState("next");
  const [touchStart, setTouchStart] = useState(null);
  const [touchMoved, setTouchMoved] = useState(false);

  useEffect(() => {
    setActive(0);
  }, [product?.id]);

  function goTo(index, dir = "next") {
    if (images.length <= 1) return;

    setDirection(dir);

    const next = (index + images.length) % images.length;
    setActive(next);
  }

  function nextImage() {
    goTo(active + 1, "next");
  }

  function previousImage() {
    goTo(active - 1, "prev");
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextImage();
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      previousImage();
    }

    if (
      onImageClick &&
      (e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      onImageClick();
    }
  }

  function handleTouchStart(e) {
    setTouchStart(e.changedTouches?.[0]?.clientX ?? null);
    setTouchMoved(false);
  }

  function handleTouchEnd(e) {
    if (touchStart === null) return;

    const end =
      e.changedTouches?.[0]?.clientX ?? touchStart;

    const distance = end - touchStart;

    if (Math.abs(distance) > 45 && images.length > 1) {
      setTouchMoved(true);

      if (distance < 0) {
        nextImage();
      } else {
        previousImage();
      }
    }

    setTouchStart(null);
  }

  function handleStageClick(e) {
    if (!onImageClick) return;

    if (touchMoved) {
      e.preventDefault();
      e.stopPropagation();
      setTouchMoved(false);
      return;
    }

    if (e.target.closest("button")) {
      return;
    }

    onImageClick();
  }

  const current = images[active];

  return (
    <div
      className={
        large
          ? "product-art product-art-large product-art-carousel"
          : "product-art product-art-carousel"
      }
      tabIndex={images.length > 1 || onImageClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={
        images.length > 1
          ? `Product image gallery with ${images.length} images`
          : "Product image"
      }
    >
      {current?.url ? (
        <div
          className="product-art-carousel-stage"
          onClick={handleStageClick}
        >
          <img
            key={`${current.url}-${active}`}
            src={current.url}
            alt={
              images.length > 1
                ? `${product?.name || "Avancy product"} — image ${active + 1} of ${images.length}`
                : product?.name || "Avancy product"
            }
            loading="eager"
            decoding="async"
            className={`product-art-carousel-image product-art-slide-${direction}`}
            draggable="false"
          />

          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="product-art-arrow product-art-arrow-left"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  previousImage();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Previous product image"
              >
                ←
              </button>

              <button
                type="button"
                className="product-art-arrow product-art-arrow-right"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nextImage();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Next product image"
              >
                →
              </button>

              <span className="product-art-counter">
                {active + 1} / {images.length}
              </span>
            </>
          ) : null}
        </div>
      ) : (
        <div
          className="art-fallback"
          onClick={onImageClick}
        >
          <span>{product?.art || "AVNC"}</span>
        </div>
      )}

      <span className="art-badge">
        {product?.category || "AVANCY"}
      </span>

      {images.length > 1 ? (
        <div
          className="product-art-thumbnails"
          aria-label="Product image thumbnails"
        >
          {images.map((item, index) => (
            <button
              type="button"
              key={`${item.url}-${index}`}
              className={`product-art-thumbnail ${
                index === active ? "is-active" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(
                  index,
                  index > active ? "next" : "prev"
                );
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`View product image ${index + 1}`}
              aria-current={
                index === active ? "true" : undefined
              }
            >
              <img
                src={item.url}
                alt=""
                loading="lazy"
                decoding="async"
                draggable="false"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
