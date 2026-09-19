"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InvoiceButton from "../components/InvoiceButton";
import SiteFooter from "../components/SiteFooter";

const avancySteps = ["NEW", "CONFIRMED"];

const shiprocketSteps = [
  "PICKUP_SCHEDULED",
  "OUT_FOR_PICKUP",
  "PICKED_UP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const terminal = new Set(["CANCELLED", "FAILED", "REFUNDED"]);

const pickupLabels = {
  TEST: "TEST",
  REQUESTED: "PICKUP REQUESTED",
  SCHEDULED: "PICKUP SCHEDULED",
  OUT_FOR_PICKUP: "OUT FOR PICKUP",
  PICKED_UP: "PICKED UP",
  CANCELLED: "PICKUP CANCELLED",
  EXCEPTION: "PICKUP EXCEPTION",
};

const courierLabels = {
  TEST: "TEST",
  AWB_ASSIGNED: "AWB ASSIGNED",
  PICKUP_SCHEDULED: "PICKUP SCHEDULED",
  OUT_FOR_PICKUP: "OUT FOR PICKUP",
  PICKED_UP: "PICKED UP",
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "IN TRANSIT",
  OUT_FOR_DELIVERY: "OUT FOR DELIVERY",
  DELIVERED: "DELIVERED",
  DELAYED: "DELAYED",
  CANCELLED: "CANCELLED",
};

function prettyStatus(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (x) => x.toUpperCase());
}

export default function TrackOrder() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [returning, setReturning] = useState(null);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");

  useEffect(() => {
    const u = new URLSearchParams(location.search);

    if (u.get("order")) setId(u.get("order"));
    if (u.get("email")) setEmail(u.get("email"));
  }, []);

  async function go(e) {
    e.preventDefault();

    setError("");
    setOrder(null);
    setLoading(true);

    try {
      const r = await fetch(
        `/api/track-order?order=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`,
        { cache: "no-store" }
      );

      const d = await r.json();

      if (!r.ok) {
        throw Error(d.error || "Order not found.");
      }

      setOrder(d.order);
    } catch (x) {
      setError(x.message);
    } finally {
      setLoading(false);
    }
  }

  function returnEligible(order) {
    if (order.orderStatus !== "DELIVERED") return false;

    const returnStatus = String(
      order.returnStatus || ""
    ).toUpperCase();

    /*
     * A rejected return may be resubmitted exactly once.
     * The backend also enforces this rule.
     */
    if (
      returnStatus === "REJECTED" &&
      Number(order.returnResubmissionCount || 0) === 0
    ) {
      return true;
    }

    if (returnStatus) return false;
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
            uploadData.error ||
              "Could not upload the image."
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
          data.error ||
            "Could not submit return request."
        );
      }

      alert("Return request submitted successfully.");

      closeReturn();

      setOrder((current) =>
        current
          ? {
              ...current,
              returnStatus: data.returnStatus || "REQUESTED",
              returnRequestedAt:
                data.returnRequestedAt ||
                new Date().toISOString(),
            }
          : current
      );
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

  const status = String(
    order?.orderStatus || "NEW"
  ).toUpperCase();

  const shiprocketCourierStatus = String(
    order?.shiprocketCourierStatus || ""
  ).toUpperCase();

  const shiprocketPickupStatus = String(
    order?.shiprocketPickupStatus || ""
  ).toUpperCase();

  const hasShiprocketTracking =
    Boolean(shiprocketCourierStatus) ||
    Boolean(shiprocketPickupStatus) ||
    Boolean(order?.shiprocketAwbCode) ||
    Boolean(order?.shiprocketCourierName) ||
    Boolean(order?.shiprocketShipmentId) ||
    Boolean(order?.shiprocketOrderId);

  const courierIndex =
    shiprocketSteps.indexOf(shiprocketCourierStatus);

  const custom = Boolean(
    order?.items?.some((x) => x.custom)
  );

  return (
    <main className="track-premium">
      <header>
        <Link href="/" className="mini-brand">
          AVANCY<span>COLLECTIVES™</span>
        </Link>

        <div>
          <Link href="/shop">SHOP</Link>
          <Link href="/account">ACCOUNT</Link>
        </div>
      </header>

      <section className="track-hero">
        <div className="track-card">
          <span>ORDER LOOKUP / LIVE</span>

          <h1>
            TRACK <em>YOUR ORDER.</em>
          </h1>

          <p>
            Enter the order number and checkout email.
            Your live fulfilment status appears below.
          </p>

          <form onSubmit={go}>
            <label>
              ORDER NUMBER
              <input
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </label>

            <label>
              CHECKOUT EMAIL
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <button disabled={loading}>
              {loading ? "CHECKING…" : "TRACK ORDER →"}
            </button>
          </form>

          {error && (
            <div className="track-error">
              {error}
            </div>
          )}
        </div>

        <div className="track-orbit">
          <div>
            AVANCY
            <br />
            <b>TRACK</b>
          </div>
        </div>
      </section>

      {order && (
        <section className="tracking-result">
          <div className="result-head">
            <div>
              <span>ORDER</span>
              <h2>#{order.id}</h2>
            </div>

            <strong>
              ₹{Number(order.total || 0).toLocaleString("en-IN")}
            </strong>
          </div>

          {terminal.has(status) ? (
            <div
              className={`terminal-status ${status.toLowerCase()}`}
            >
              <b>{status}</b>

              <p>
                {status === "CANCELLED"
                  ? "This order has been cancelled."
                  : status === "FAILED"
                    ? "The payment/order could not be completed."
                    : "This order has been refunded."}
              </p>
            </div>
          ) : hasShiprocketTracking ? (
            <div className="shiprocket-customer-tracking">
              <div className="shiprocket-customer-head">
                <div>
                  <span>DELIVERY TRACKING</span>
                  <h3>SHIPROCKET</h3>
                </div>

                <b>
                  {courierLabels[shiprocketCourierStatus] ||
                    prettyStatus(shiprocketCourierStatus) ||
                    "TRACKING ACTIVE"}
                </b>
              </div>

              <div className="shiprocket-customer-meta">
                <div>
                  <span>DELIVERY PARTNER</span>
                  <b>
                    {order.shiprocketCourierName || "SHIPROCKET"}
                  </b>
                </div>

                <div>
                  <span>AWB</span>
                  <b>
                    {order.shiprocketAwbCode || "—"}
                  </b>
                </div>

                <div>
                  <span>PICKUP</span>
                  <b>
                    {pickupLabels[shiprocketPickupStatus] ||
                      prettyStatus(shiprocketPickupStatus) ||
                      "—"}
                  </b>
                </div>

                <div>
                  <span>SHIPMENT</span>
                  <b>
                    {courierLabels[shiprocketCourierStatus] ||
                      prettyStatus(shiprocketCourierStatus) ||
                      "—"}
                  </b>
                </div>
              </div>

              <div className="shiprocket-progress">
                {shiprocketSteps.map((step, i) => {
                  const done =
                    courierIndex >= 0 &&
                    i <= courierIndex;

                  return (
                    <div
                      key={step}
                      className={done ? "done" : ""}
                    >
                      <i>{i + 1}</i>
                      <span>
                        {courierLabels[step] ||
                          prettyStatus(step)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="progress">
              {avancySteps.map((step, i) => {
                const currentIndex =
                  avancySteps.indexOf(status);

                return (
                  <div
                    key={step}
                    className={
                      i <= currentIndex ? "done" : ""
                    }
                  >
                    <i>{i + 1}</i>
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          )}

          {custom &&
            status === "PROCESSING" &&
            !hasShiprocketTracking && (
              <div className="custom-printing">
                <div className="printing-icon">✦</div>

                <div>
                  <span>CUSTOM ORDER</span>
                  <h3>YOUR ORDER IS BEING PRINTED.</h3>
                  <p>
                    It will be ready for delivery soon.
                  </p>
                </div>

                <b>PROCESSING</b>
              </div>
            )}

          <div className="tracking-actions">
            <InvoiceButton
              order={order}
              label="PRINT / SAVE INVOICE"
            />

            <Link href="/shop">
              SHOP AGAIN →
            </Link>

            {String(order.returnStatus || "").toUpperCase() ===
              "REJECTED" ? (
              <div className="customer-return-rejected">
                <div className="customer-return-status">
                  <b>RETURN REQUEST</b>

                  <span>REJECTED</span>

                  {order.returnRequestedAt && (
                    <small>
                      Requested{" "}
                      {new Date(
                        order.returnRequestedAt
                      ).toLocaleDateString("en-IN")}
                    </small>
                  )}
                </div>

                <div className="customer-return-reason">
                  <b>REJECTION REASON</b>
                  <p>
                    {order.returnRejectionReason ||
                      "Your return request was rejected. Please contact support for assistance."}
                  </p>
                </div>

                {Number(order.returnResubmissionCount || 0) ===
                0 ? (
                  <div className="customer-return-actions">
                    <button
                      type="button"
                      className="return-order-btn"
                      onClick={() => openReturn(order)}
                    >
                      RESUBMIT RETURN
                    </button>

                    <a
                      className="return-support-btn"
                      href={`mailto:avancycollectives@gmail.com?subject=${encodeURIComponent(
                        `Return Support — Order ${order.id}`
                      )}&body=${encodeURIComponent(
                        `Hello Avancy Collectives Support,

I need help with the return for order ${order.id}.

Thank you.`
                      )}`}
                    >
                      CONTACT SUPPORT
                    </a>
                  </div>
                ) : (
                  <div className="customer-return-closed">
                    <b>RETURN REQUEST CLOSED</b>

                    <p>
                      This return request has been rejected again.
                      Further resubmissions are not available.
                      Please contact support if you need further assistance.
                    </p>

                    <a
                      className="return-support-btn"
                      href={`mailto:avancycollectives@gmail.com?subject=${encodeURIComponent(
                        `Return Support — Order ${order.id}`
                      )}&body=${encodeURIComponent(
                        `Hello Avancy Collectives Support,

I need help with the closed return request for order ${order.id}.

Thank you.`
                      )}`}
                    >
                      CONTACT SUPPORT
                    </a>
                  </div>
                )}
              </div>
            ) : order.returnStatus ? (
              <div className="customer-return-status">
                <b>RETURN REQUEST</b>

                <span>
                  {String(order.returnStatus).toUpperCase()}
                </span>

                {order.returnRequestedAt && (
                  <small>
                    Requested{" "}
                    {new Date(
                      order.returnRequestedAt
                    ).toLocaleDateString("en-IN")}
                  </small>
                )}
              </div>
            ) : returnEligible(order) ? (
              <button
                type="button"
                className="return-order-btn"
                onClick={() => openReturn(order)}
              >
                RETURN ORDER
              </button>
            ) : null}
          </div>

          <div className="result-meta">
            <div>
              <span>PAYMENT</span>
              <b>{order.paymentStatus}</b>
            </div>

            <div>
              <span>PLACED</span>
              <b>
                {new Date(order.createdAt).toLocaleString(
                  "en-IN"
                )}
              </b>
            </div>

            <div>
              <span>CUSTOMER</span>
              <b>{order.customer?.name}</b>
            </div>
          </div>

          <div className="tracking-items">
            {(order.items || []).map((x, i) => (
              <div key={i}>
                <span>
                  {x.name} · {x.size} × {x.qty}
                  {x.custom ? " · CUSTOM PRINT" : ""}
                </span>

                <b>
                  ₹
                  {(
                    Number(x.price || 0) *
                    Number(x.qty || 1)
                  ).toLocaleString("en-IN")}
                </b>
              </div>
            ))}
          </div>
        </section>
      )}

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
            aria-labelledby="track-return-title"
          >
            <div className="return-modal-head">
              <div>
                <span>
                  ORDER {returning.id}
                </span>

                <h2 id="track-return-title">
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
              {String(returning.returnStatus || "").toUpperCase() ===
              "REJECTED"
                ? "Please update your return reason and resubmit your request. This is your final resubmission."
                : "Returns are available within 10 days of delivery. Tell us why you would like to return this order."}
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
                htmlFor="track-return-evidence-file"
                className="return-file-btn"
              >
                {file
                  ? "CHANGE FILE"
                  : "CHOOSE FILE"}
              </label>

              <input
                id="track-return-evidence-file"
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
                disabled={uploading || submitting}
              >
                CANCEL
              </button>

              <button
                type="button"
                className="return-submit-btn"
                onClick={submitReturn}
                disabled={uploading || submitting}
              >
                {uploading
                  ? "UPLOADING…"
                  : submitting
                  ? "SUBMITTING…"
                  : String(returning.returnStatus || "").toUpperCase() ===
                    "REJECTED"
                  ? "RESUBMIT RETURN REQUEST"
                  : "SUBMIT RETURN REQUEST"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
