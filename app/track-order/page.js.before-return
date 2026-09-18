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
    status === "CONFIRMED" &&
    (
      Boolean(shiprocketCourierStatus) ||
      Boolean(shiprocketPickupStatus) ||
      Boolean(order?.shiprocketAwbCode) ||
      Boolean(order?.shiprocketCourierName)
    );

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

      <SiteFooter />
    </main>
  );
}
