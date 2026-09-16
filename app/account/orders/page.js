"use client";

import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import { useEffect, useState } from "react";
import InvoiceButton from "../../components/InvoiceButton";

export default function Orders() {
  const [o, setO] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [returning, setReturning] = useState(null);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");

  async function load() {
    setRefreshing(true);

    try {
      const r = await fetch("/api/account/orders", {
        cache: "no-store",
      });

      const d = await r.json();

      setO(r.ok ? d.orders || [] : []);
    } catch {
      setO([]);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();

    const i = setInterval(load, 15000);

    return () => clearInterval(i);
  }, []);

  function returnEligible(order) {
    if (order.orderStatus !== "DELIVERED") return false;
    if (order.returnStatus) return false;
    if (!order.deliveredAt) return false;

    const delivered = new Date(order.deliveredAt).getTime();
    const now = Date.now();
    const tenDays = 10 * 24 * 60 * 60 * 1000;

    return now - delivered <= tenDays;
  }

  function openReturn(order) {
    setReturning(order);
    setReason("");
    setFile(null);
    setPreview("");
    setReturnError("");
  }

  function closeReturn() {
    if (uploading || submitting) return;

    setReturning(null);
    setReason("");
    setFile(null);
    setPreview("");
    setReturnError("");
  }

  function handleFileChange(e) {
    const selected = e.target.files?.[0];

    if (!selected) {
      setFile(null);
      setPreview("");
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowed.includes(selected.type)) {
      setReturnError(
        "Please choose a JPG, PNG, WEBP or GIF image."
      );
      e.target.value = "";
      setFile(null);
      setPreview("");
      return;
    }

    if (selected.size > 8 * 1024 * 1024) {
      setReturnError("Image must be 8 MB or smaller.");
      e.target.value = "";
      setFile(null);
      setPreview("");
      return;
    }

    setReturnError("");
    setFile(selected);

    const url = URL.createObjectURL(selected);
    setPreview(url);
  }

  async function submitReturn() {
    if (!returning) return;

    const cleanReason = reason.trim();

    if (!cleanReason) {
      setReturnError("Please provide a return reason.");
      return;
    }

    if (cleanReason.length > 500) {
      setReturnError(
        "Return reason must be 500 characters or less."
      );
      return;
    }

    setSubmitting(true);
    setReturnError("");

    try {
      let evidenceUrl = "";

      if (file) {
        setUploading(true);

        const form = new FormData();
        form.append("file", file);

        const uploadResponse = await fetch(
          `/api/account/orders/${encodeURIComponent(
            returning.id
          )}/return/upload`,
          {
            method: "POST",
            body: form,
          }
        );

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.error || "Could not upload the image."
          );
        }

        evidenceUrl = uploadData.url || "";

        setUploading(false);
      }

      const response = await fetch(
        `/api/account/orders/${encodeURIComponent(
          returning.id
        )}/return`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cleanReason,
            evidenceUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not submit return request."
        );
      }

      alert("Return request submitted successfully.");

      closeReturn();
      await load();
    } catch (error) {
      setUploading(false);

      setReturnError(
        error?.message ||
          "Could not submit return request."
      );
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <main className="account-page">
      <header>
        <Link href="/account">← ACCOUNT</Link>
        <Link href="/shop">SHOP →</Link>
      </header>

      <section>
        <div className="account-section-head">
          <div>
            <span>ORDER HISTORY</span>

            <h1>
              YOUR <em>ORDERS.</em>
            </h1>
          </div>

          <button
            className="refresh-btn"
            onClick={load}
            disabled={refreshing}
          >
            {refreshing
              ? "REFRESHING…"
              : "↻ REFRESH ORDERS"}
          </button>
        </div>

        {o === null ? (
          <p>Loading…</p>
        ) : !o.length ? (
          <div className="ac-empty">
            No orders yet.{" "}
            <Link href="/shop">SHOP →</Link>
          </div>
        ) : (
          <div className="account-orders-list">
            {o.map((x) => (
              <article
                className="account-order-card"
                key={x.id}
              >
                <div>
                  <span>ORDER</span>

                  <h2>{x.id}</h2>

                  <p>
                    {x.customer?.name} ·{" "}
                    {x.customer?.email}
                  </p>
                </div>

                <strong>
                  ₹
                  {Number(x.total || 0).toLocaleString(
                    "en-IN"
                  )}
                </strong>

                <span>
                  {x.orderStatus} / {x.paymentStatus}
                </span>

                <InvoiceButton order={x} />

                <Link
                  href={`/track-order?order=${encodeURIComponent(
                    x.id
                  )}&email=${encodeURIComponent(
                    x.customer?.email || ""
                  )}`}
                >
                  TRACK →
                </Link>

                {x.returnStatus ? (
                  <div className="customer-return-status">
                    <b>RETURN REQUEST</b>

                    <span>
                      {String(
                        x.returnStatus
                      ).toUpperCase()}
                    </span>

                    {x.returnRequestedAt && (
                      <small>
                        Requested{" "}
                        {new Date(
                          x.returnRequestedAt
                        ).toLocaleDateString("en-IN")}
                      </small>
                    )}
                  </div>
                ) : returnEligible(x) ? (
                  <button
                    type="button"
                    className="return-order-btn"
                    onClick={() => {
  console.log("RETURN BUTTON CLICKED", x.id);
  openReturn(x);
}}
                  >
                    RETURN ORDER
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />

      {returning && (
        <div
          className="return-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeReturn();
            }
          }}
        >
          <div
            className="return-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-title"
          >
            <div className="return-modal-head">
              <div>
                <span>
                  ORDER {returning.id}
                </span>

                <h2 id="return-title">
                  RETURN ORDER.
                </h2>
              </div>

              <button
                type="button"
                className="return-close"
                onClick={closeReturn}
                disabled={uploading || submitting}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="return-modal-intro">
              Returns are available within 10 days
              of delivery. Tell us why you would
              like to return this order.
            </p>

            <label className="return-field">
              <span>RETURN REASON</span>

              <textarea
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                maxLength={500}
                placeholder="Please describe the reason for your return…"
                rows={5}
                disabled={submitting}
              />

              <small>
                {reason.length}/500
              </small>
            </label>

            <div className="return-upload">
              <span>PHOTO EVIDENCE</span>

              <label
                htmlFor="return-evidence-file"
                className="return-file-btn"
              >
                {file
                  ? "CHANGE FILE"
                  : "CHOOSE FILE"}
              </label>

              <input
                id="return-evidence-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                disabled={submitting}
                hidden
              />

              {file && (
                <div className="return-file-name">
                  <strong>{file.name}</strong>

                  <span>
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </span>
                </div>
              )}

              {preview && (
                <div className="return-preview">
                  <img
                    src={preview}
                    alt="Return evidence preview"
                  />
                </div>
              )}

              <small>
                Optional. JPG, PNG, WEBP or GIF ·
                Maximum 8 MB
              </small>
            </div>

            {returnError && (
              <div className="return-form-error">
                {returnError}
              </div>
            )}

            <div className="return-modal-actions">
              <button
                type="button"
                className="return-cancel-btn"
                onClick={closeReturn}
                disabled={
                  uploading || submitting
                }
              >
                CANCEL
              </button>

              <button
                type="button"
                className="return-submit-btn"
                onClick={submitReturn}
                disabled={
                  uploading || submitting
                }
              >
                {uploading
                  ? "UPLOADING…"
                  : submitting
                  ? "SUBMITTING…"
                  : "SUBMIT RETURN REQUEST"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}