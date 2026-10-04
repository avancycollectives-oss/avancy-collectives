"use client";

import { useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productSearchText(product) {
  const values = [
    product?.name,
    product?.category,
    product?.color,
    product?.description,
    product?.fit,
    product?.type,
    product?.sku,
    product?.slug,
    product?.art,
    product?.tags,
    product?.keywords,
    product?.collection,
  ];

  if (Array.isArray(product?.tags)) {
    values.push(product.tags.join(" "));
  }

  if (Array.isArray(product?.keywords)) {
    values.push(product.keywords.join(" "));
  }

  if (Array.isArray(product?.sizes)) {
    values.push(product.sizes.join(" "));
  }

  return normalize(values.filter(Boolean).join(" "));
}

function matchesSearch(product, query) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = productSearchText(product);

  const terms = normalizedQuery
    .split(/\s+/)
    .filter(Boolean);

  return terms.every((term) => haystack.includes(term));
}

export default function ShopGrid({ products = [] }) {
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    return products.filter((product) => matchesSearch(product, q));
  }, [products, q]);

  return (
    <>
      <div className="shop-search">
        <svg
          className="shop-search-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "18px",
            top: "50%",
            width: "21px",
            height: "21px",
            transform: "translateY(-50%)",
            display: "block",
            zIndex: 10,
            pointerEvents: "none",
            fill: "none",
            stroke: "#777777",
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }}
        >
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products, colours, graphics…"
          aria-label="Search products"
          style={{
            width: "100%",
            boxSizing: "border-box",
            paddingLeft: "54px",
            paddingRight: "18px",
            color: "#ffffff",
            background: "#161616",
            caretColor: "#E2F952",
            WebkitTextFillColor: "#ffffff",
          }}
        />
      </div>

      {shown.length ? (
        <div className="ac-product-grid">
          {shown.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      ) : (
        <div className="ac-empty">
          <strong>NO MATCHING PRODUCTS.</strong>
          <span>
            Try another product name, colour, graphic or category.
          </span>
        </div>
      )}
    </>
  );
}
