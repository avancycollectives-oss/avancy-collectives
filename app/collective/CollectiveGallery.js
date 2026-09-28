"use client";

import { useEffect, useState } from "react";

export default function CollectiveGallery({
  initialSubmissions = [],
  productId = "",
  selectedName = "",
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);

  useEffect(() => {
    let active = true;

    async function refreshGallery() {
      try {
        const query = productId
          ? `?product=${encodeURIComponent(productId)}`
          : "";

        const res = await fetch(`/api/collective${query}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();

        if (active) {
          setSubmissions(data.submissions || []);
        }
      } catch {
        // Keep the currently displayed approved photos if polling fails.
      }
    }

    const interval = setInterval(refreshGallery, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [productId]);

  return (
    <>
      {submissions.length ? (
        <div className="collective-grid">
          {submissions.map((item) => (
            <article className="collective-card" key={item.id}>
              <div className="collective-photo">
                <img
                  src={item.imageUrl}
                  alt={`${item.customerName} wearing Avancy`}
                />
              </div>

              <div className="collective-card-copy">
                <strong>{item.customerName}</strong>
                {item.productName ? (
                  <span>{item.productName}</span>
                ) : (
                  <span>AVANCY COLLECTIVES</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="collective-empty">
          <strong>THE WALL IS WAITING.</strong>
          <p>
            {selectedName
              ? `Be one of the first approved photos featured for ${selectedName}.`
              : "Be one of the first approved photos featured in The Collective."}
          </p>
        </div>
      )}
    </>
  );
}
