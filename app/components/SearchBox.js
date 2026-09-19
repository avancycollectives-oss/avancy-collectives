"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export default function SearchBox({ products = [] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState(products);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("search-open");

    return () => {
      document.body.classList.remove("search-open");
    };
  }, [open]);

  useEffect(() => {
    if (
      open &&
      !remote.length
    ) {
      fetch("/api/products", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setRemote(d.products || []))
        .catch(() => {});
    }
  }, [open, remote.length]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
        setQ("");
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const source = remote.length ? remote : products;

  const hits = useMemo(() => {
    const term = q.trim().toLowerCase();

    if (!term) return [];

    return source
      .filter((p) =>
        `${p.name || ""} ${p.category || ""} ${p.color || ""} ${p.description || ""}`
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 8);
  }, [source, q]);

  function closeSearch() {
    setOpen(false);
    setQ("");
  }

  return (
    <>
      <button
        type="button"
        className="ac-icon"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Search Avancy"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeSearch();
            }
          }}
        >
          <div
            className="search-panel"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="search-head">
              <div>
                <span>AVANCY COLLECTIVES</span>
                <b>SEARCH AVANCY</b>
              </div>

              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
              >
                ×
              </button>
            </div>

            <div
              className="search-input-wrap"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                width: "100%",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "18px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "22px",
                  height: "22px",
                  zIndex: 20,
                  display: "block",
                  opacity: 1,
                  visibility: "visible",
                  pointerEvents: "none",
                  fill: "none",
                  stroke: "#E2F952",
                  strokeWidth: 2,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                }}
              >
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 5 5" />
              </svg>

              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tees, hoodies, graphics…"
                aria-label="Search products"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  paddingLeft: "56px",
                  paddingRight: q ? "52px" : "18px",
                  color: "#ffffff",
                  background: "#161616",
                  caretColor: "#E2F952",
                  WebkitTextFillColor: "#ffffff",
                  opacity: 1,
                }}
              />

              {q && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 30,
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {q && (
              <div className="search-results">
                {hits.length ? (
                  <>
                    <div className="search-result-count">
                      {hits.length} RESULT{hits.length === 1 ? "" : "S"}
                    </div>

                    {hits.map((p) => (
                      <Link
                        key={p.id}
                        href={`/product/${p.id}`}
                        onClick={closeSearch}
                      >
                        <span>
                          {p.image ? (
                            <img src={p.image} alt="" />
                          ) : (
                            <i>{p.art || "AVNC"}</i>
                          )}
                        </span>

                        <div>
                          <b>{p.name}</b>
                          <small>
                            {p.category || "COLLECTION"}
                            {p.color ? ` / ${p.color}` : ""}
                          </small>
                        </div>

                        <strong>
                          ₹{Number(p.price || 0).toLocaleString("en-IN")}
                        </strong>
                      </Link>
                    ))}
                  </>
                ) : (
                  <div className="search-no-results">
                    <b>NO MATCHES FOUND.</b>
                    <span>
                      Try another product name, colour or graphic.
                    </span>
                  </div>
                )}
              </div>
            )}

            {!q && (
              <div className="search-empty">
                <span>SEARCH THE COLLECTION</span>
                <p>
                  Find tees, graphics, colours and more from Avancy
                  Collectives.
                </p>
              </div>
            )}

            <div className="search-shortcuts">
              <Link href="/shop" onClick={closeSearch}>
                <span>01</span>
                SHOP ALL
                <b>→</b>
              </Link>

              <Link href="/create-yours" onClick={closeSearch}>
                <span>02</span>
                CREATE YOURS
                <b>→</b>
              </Link>
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
