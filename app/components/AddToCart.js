"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddToCart({
  product,
  compact = false,
  requireSizeSelection = false,
}) {
  const availableSizes =
    Array.isArray(product?.sizes) && product.sizes.length
      ? product.sizes
      : ["S", "M", "L", "XL", "XXL"];

  const stock = product?.stock && typeof product.stock === "object"
    ? product.stock
    : {};

  function getStock(size) {
    const value = stock?.[size];

    if (value === undefined || value === null || value === "") {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }

  function isOutOfStock(size) {
    const value = getStock(size);

    return value !== null && value <= 0;
  }

  const firstAvailableSize =
    availableSizes.find((size) => !isOutOfStock(size)) || "";

  const [size, setSize] = useState(
    requireSizeSelection ? "" : firstAvailableSize
  );

  const [added, setAdded] = useState(false);
  const router = useRouter();

  const hasStockData =
    Object.keys(stock).length > 0;

  const allSizesOutOfStock =
    hasStockData &&
    availableSizes.length > 0 &&
    availableSizes.every((size) => isOutOfStock(size));

  const selectedOutOfStock =
    size ? isOutOfStock(size) : false;

  function add() {
    if (allSizesOutOfStock) {
      return;
    }

    if (requireSizeSelection && !size) {
      return;
    }

    if (!size || selectedOutOfStock) {
      return;
    }

    const c = JSON.parse(
      localStorage.getItem("avancy-cart") || "[]"
    );

    const key = `${product.id}-${size}`;

    const i = c.findIndex(
      (x) => x.key === key
    );

    if (i >= 0) {
      c[i].qty = Math.min(
        20,
        Number(c[i].qty || 0) + 1
      );
    } else {
      c.push({
        key,
        id: product.id,
        name: product.name,
        price: Number(product.price || 0),
        size,
        qty: 1,
        art: product.art,
        image: product.image,
      });
    }

    localStorage.setItem(
      "avancy-cart",
      JSON.stringify(c)
    );

    dispatchEvent(
      new Event("avancy-cart-updated")
    );

    setAdded(true);
  }

  return (
    <div className="product-buy">
      <label>SELECT SIZE</label>

      <div className="size-row">
        {availableSizes.map((s) => {
          const outOfStock = isOutOfStock(s);

          return (
            <button
              type="button"
              key={s}
              className={[
                size === s ? "selected" : "",
                outOfStock ? "is-out-of-stock" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={outOfStock}
              aria-disabled={outOfStock}
              onClick={() => {
                if (outOfStock) return;

                setSize(s);
                setAdded(false);
              }}
            >
              <span>{s}</span>
              {outOfStock ? (
                <small>OUT OF STOCK</small>
              ) : null}
            </button>
          );
        })}
      </div>

      {allSizesOutOfStock ? (
        <small className="size-required size-all-out">
          ALL SIZES ARE OUT OF STOCK
        </small>
      ) : requireSizeSelection && !size ? (
        <small className="size-required">
          SELECT A SIZE TO CONTINUE
        </small>
      ) : null}

      <button
        className={[
          "add-cart-btn",
          allSizesOutOfStock || selectedOutOfStock
            ? "is-stock-disabled"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          if (allSizesOutOfStock || selectedOutOfStock) {
            return;
          }

          if (added) {
            router.push("/cart");
            return;
          }

          add();
        }}
        disabled={
          allSizesOutOfStock ||
          selectedOutOfStock ||
          (!added &&
            requireSizeSelection &&
            !size)
        }
      >
        {allSizesOutOfStock
          ? "OUT OF STOCK"
          : added
            ? "GO TO CART"
            : "ADD TO CART"}{" "}
        <span>↗</span>
      </button>
    </div>
  );
}
