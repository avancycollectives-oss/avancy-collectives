"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductArt from "./ProductArt";
import AddToCart from "./AddToCart";

export default function ProductCard({ product }) {
  const router = useRouter();

  function openProduct() {
    router.push(`/product/${product.id}`);
  }

  return (
    <article className="product-card">
      <div className="product-card-gallery-link">
        <ProductArt
          product={product}
          onImageClick={openProduct}
        />
      </div>

      <Link
        href={`/product/${product.id}`}
        className="product-card-info-link"
      >
        <div className="product-meta">
          <div className="product-meta-copy">
            <b>{product.name}</b>

            <small>
              {product.fit || "Streetwear"}
            </small>

            {product.description ? (
              <span className="product-card-description">
                {product.description}
              </span>
            ) : null}
          </div>

          <strong className="product-card-price">
            ₹{Number(product.price || 0).toLocaleString("en-IN")}
          </strong>
        </div>
      </Link>

      <AddToCart
        product={product}
        compact
        requireSizeSelection
      />
    </article>
  );
}
