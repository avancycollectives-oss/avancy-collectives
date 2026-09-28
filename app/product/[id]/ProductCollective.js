"use client";

import { useEffect, useState } from "react";

export default function ProductCollective({
  initialPhotos = [],
  productId,
  productName,
}) {
  const [photos, setPhotos] = useState(initialPhotos);

  useEffect(() => {
    let active = true;

    async function refreshPhotos() {
      try {
        const res = await fetch(
          `/api/collective?product=${encodeURIComponent(productId)}`,
          {
            cache: "no-store",
          }
        );

        if (!res.ok) return;

        const data = await res.json();

        if (active) {
          setPhotos(data.submissions || []);
        }
      } catch {
        // Keep the currently displayed approved photos if polling fails.
      }
    }

    const interval = setInterval(refreshPhotos, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [productId]);

  if (!photos.length) return null;

  return (
    <section className="product-collective">
      <div className="product-collective-head">
        <span>THE COLLECTIVE / REAL PEOPLE</span>
        <h2>CUSTOMERS WEAR AVANCY.</h2>
        <p>
          Approved photos from customers wearing this product.
        </p>
      </div>

      <div className="product-collective-grid">
        {photos.map((item) => (
          <article
            className="product-collective-card"
            key={item.id}
          >
            <div className="product-collective-photo">
              <img
                src={item.imageUrl}
                alt={`${item.customerName} wearing ${productName}`}
              />
            </div>
            <strong>{item.customerName}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
