"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InvoiceButton from "./InvoiceButton";

const statuses = [
  "NEW",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED",
  "REFUNDED",
];

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function AdminOrdersClient({
  initialOrders = [],
}) {
  const [o, setO] = useState(initialOrders);
  const [q, setQ] = useState("");
  const [f, setF] = useState("ALL");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    setErr("");

    try {
      const r = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      const d = await r.json();

      if (!r.ok) {
        throw Error(d.error || "Refresh failed.");
      }

      setO(d.orders || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const i = setInterval(refresh, 15000);

    return () => clearInterval(i);
  }, []);

  const shown = useMemo(
    () =>
      o.filter((x) => {
        const hay =
          `${x.id} ${x.customer?.name || ""} ${
            x.customer?.email || ""
          }`.toLowerCase();

        return (
          (!q || hay.includes(q.toLowerCase())) &&
          (f === "ALL" ||
            String(x.orderStatus || "NEW").toUpperCase() === f)
        );
      }),
    [o, q, f]
  );

  async function update(id, status) {
    setSaving(id);
    setErr("");

    try {
      const r = await fetch(
        `/api/admin/orders/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderStatus: status,
          }),
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw Error(d.error || "Status update failed.");
      }

      setO((x) =>
        x.map((a) =>
          String(a.id) === String(id)
            ? {
                ...a,
                orderStatus: status,
                ...(d.order || {}),
              }
            : a
        )
      );
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving("");
    }
  }

  return (
    <div>
      <div className="order-toolbar">
        <input
          placeholder="Search order, customer or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          value={f}
          onChange={(e) => setF(e.target.value)}
        >
          <option>ALL</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <span>{shown.length} orders</span>

        <button
          className="refresh-btn admin-refresh"
          onClick={refresh}
          disabled={refreshing}
        >
          {refreshing ? "REFRESHING…" : "↻ REFRESH"}
        </button>
      </div>

      {err && <div className="order-error">{err}</div>}

      <div className="orders-list">
        {shown.length ? (
          shown.map((x) => (
            <article
              className="order-card-v51"
              key={x.id}
            >
              <div className="order-main">
                <div className="order-id">
                  #{x.id}
                </div>

                <div className="order-customer">
                  <strong>
                    {x.customer?.name || "Customer"}
                  </strong>

                  <span>
                    {x.customer?.email || "—"}
                  </span>

                  <span>
                    {x.customer?.phone || ""}
                  </span>
                </div>

                <div className="order-meta">
                  <span>
                    {new Date(
                      x.createdAt
                    ).toLocaleString("en-IN")}
                  </span>

                  <span>
                    {(x.items || []).reduce(
                      (n, i) =>
                        n + Number(i.qty || 1),
                      0
                    )}{" "}
                    items
                  </span>
                </div>

                <div className="order-total">
                  {money(x.total)}
                </div>
              </div>

              <div className="order-bottom">
                <span className="status-dot">
                  {x.orderStatus}
                </span>

                <span className="payment-pill">
                  PAYMENT / {x.paymentStatus}
                </span>

                <label>
                  STATUS{" "}
                  <select
                    disabled={saving === x.id}
                    value={String(
                      x.orderStatus || "NEW"
                    ).toUpperCase()}
                    onChange={(e) =>
                      update(
                        x.id,
                        e.target.value
                      )
                    }
                  >
                    {statuses.map((s) => (
                      <option key={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <InvoiceButton order={x} />

                <Link
                  href={`/admin/orders/${encodeURIComponent(
                    x.id
                  )}`}
                >
                  OPEN →
                </Link>
              </div>

              {x.returnStatus && (
                <div className="admin-return-request">
                  <div className="admin-return-head">
                    <strong>
                      RETURN REQUESTED
                    </strong>

                    <span>
                      {String(
                        x.returnStatus
                      ).toUpperCase()}
                    </span>
                  </div>

                  {x.returnRequestedAt && (
                    <small>
                      Requested:{" "}
                      {new Date(
                        x.returnRequestedAt
                      ).toLocaleString("en-IN")}
                    </small>
                  )}

                  {x.returnReason && (
                    <p>
                      <b>Reason:</b>{" "}
                      {x.returnReason}
                    </p>
                  )}
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="order-empty">
            No orders match your search.
          </div>
        )}
      </div>
    </div>
  );
}