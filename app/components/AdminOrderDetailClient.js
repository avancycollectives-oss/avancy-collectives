"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

const returnStatuses = [
  "REQUESTED",
  "APPROVED",
  "PICKUP",
  "RECEIVED",
  "REFUNDED",
  "REJECTED",
];

export default function AdminOrderDetailClient({ order }) {
  const [status, setStatus] = useState(
    String(order.orderStatus || "NEW").toUpperCase()
  );

  const [returnStatus, setReturnStatus] = useState(
    String(order.returnStatus || "").toUpperCase()
  );

  const [saving, setSaving] = useState(false);
  const [savingReturn, setSavingReturn] = useState(false);
  const [savingRefund, setSavingRefund] = useState(false);
  const [refundStatus, setRefundStatus] = useState(
    String(order.refundStatus || "").toUpperCase()
  );
  const [refundId, setRefundId] = useState(
    String(order.refundId || "")
  );
  const [refundError, setRefundError] = useState(
    String(order.refundError || "")
  );
  const [error, setError] = useState("");

  const router = useRouter();

  async function update(v) {
    const previousStatus = status;
    setSaving(true);
    setError("");

    try {
      if (
        v === "CONFIRMED" &&
        !order.shiprocketOrderId &&
        !order.shiprocketShipmentId
      ) {
        const shiprocketResponse = await fetch(
          `/api/admin/orders/${encodeURIComponent(order.id)}/shiprocket`,
          {
            method: "POST",
          }
        );

        const shiprocketData = await shiprocketResponse.json();

        if (!shiprocketResponse.ok) {
          throw Error(
            shiprocketData.error ||
              "Unable to create the Shiprocket shipment."
          );
        }
      }

      const r = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderStatus: v,
          }),
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw Error(d.error || "Status update failed.");
      }

      setStatus(v);
      router.refresh();
    } catch (e) {
      setStatus(previousStatus);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateReturnStatus(v) {
    setReturnStatus(v);
    setSavingReturn(true);
    setError("");

    try {
      const r = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            returnStatus: v,
          }),
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw Error(
          d.error || "Return status update failed."
        );
      }

      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingReturn(false);
    }
  }

  async function initiateRefund() {
    setSavingRefund(true);
    setRefundError("");
    setError("");

    try {
      const r = await fetch(
        `/api/admin/orders/${encodeURIComponent(order.id)}/refund`,
        {
          method: "POST",
        }
      );

      const d = await r.json();

      if (!r.ok) {
        throw Error(
          d.error || "Refund initiation failed."
        );
      }

      setRefundStatus(
        String(d.refundStatus || "PENDING").toUpperCase()
      );

      setRefundId(
        String(d.refundId || "")
      );

      router.refresh();
    } catch (e) {
      setRefundError(e.message);
    } finally {
      setSavingRefund(false);
    }
  }

  return (
    <div className="admin-detail-wrap">
      <div className="detail-toolbar">
        <Link href="/admin/orders">
          ← MANAGE ORDERS
        </Link>

        <div>
          <InvoiceButton order={order} />

          <select
            disabled={saving}
            value={status}
            onChange={(e) => update(e.target.value)}
          >
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="order-error">
          {error}
        </div>
      )}

      <div className="admin-detail-grid">
        <section className="detail-panel">
          <div className="detail-label">
            ORDER
          </div>

          <h2>#{order.id}</h2>

          <p>
            {new Date(order.createdAt).toLocaleString(
              "en-IN"
            )}
          </p>

          <div className="detail-status-row">
            <span>{status}</span>
            <span>{order.paymentStatus}</span>
          </div>
        </section>

        <section className="detail-panel">
          <div className="detail-label">
            CUSTOMER
          </div>

          <h3>
            {order.customer?.name || "Customer"}
          </h3>

          <p>{order.customer?.email}</p>
          <p>{order.customer?.phone}</p>

          <p>
            {[
              order.customer?.address,
              order.customer?.city,
              order.customer?.state,
              order.customer?.pincode,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </section>
      </div>

      {order.returnStatus && (
        <section className="detail-panel admin-return-detail">
          <div className="detail-panel-head">
            <div>
              <div className="detail-label">
                RETURN MANAGEMENT
              </div>

              <h3>
                RETURN REQUEST
              </h3>
            </div>

            <strong>
              {String(
                order.returnStatus
              ).toUpperCase()}
            </strong>
          </div>

          <div className="return-detail-grid">
            <div>
              <span>REQUESTED</span>

              <p>
                {order.returnRequestedAt
                  ? new Date(
                      order.returnRequestedAt
                    ).toLocaleString("en-IN")
                  : "—"}
              </p>
            </div>

            <div>
              <span>DELIVERED</span>

              <p>
                {order.deliveredAt
                  ? new Date(
                      order.deliveredAt
                    ).toLocaleString("en-IN")
                  : "—"}
              </p>
            </div>
          </div>

          <div className="return-reason-box">
            <span>RETURN REASON</span>

            <p>
              {order.returnReason ||
                "No reason provided."}
            </p>
          </div>

          {order.returnEvidenceUrl && (
            <div className="return-evidence">
              <span>
                PRODUCT CONDITION / EVIDENCE
              </span>

              <a
                href={order.returnEvidenceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={order.returnEvidenceUrl}
                  alt="Return product evidence"
                />
              </a>

              <small>
                Click the image to open the full-size
                photo.
              </small>
            </div>
          )}

          <div className="return-status-control">
            <label>
              RETURN STATUS
            </label>

            <select
              disabled={savingReturn}
              value={returnStatus}
              onChange={(e) =>
                updateReturnStatus(
                  e.target.value
                )
              }
            >
              {returnStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            {savingReturn && (
              <span>
                SAVING…
              </span>
            )}
          </div>

          {order.paymentStatus === "PAID" &&
            order.orderStatus === "DELIVERED" &&
            returnStatus === "RECEIVED" && (
              <div className="refund-management">
                <div className="refund-management-head">
                  <div>
                    <span>ONLINE PAYMENT REFUND</span>
                    <strong>
                      ₹
                      {Number(
                        order.total || 0
                      ).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  {refundStatus && (
                    <b className={`refund-badge refund-${refundStatus.toLowerCase()}`}>
                      {refundStatus}
                    </b>
                  )}
                </div>

                <p>
                  Refund will be sent to the customer's
                  original payment method. Do not collect
                  bank or UPI details from the customer.
                </p>

                {refundId && (
                  <small>
                    Razorpay Refund ID: {refundId}
                  </small>
                )}

                {refundError && (
                  <div className="refund-error">
                    {refundError}
                  </div>
                )}

                {!refundStatus && (
                  <button
                    type="button"
                    className="initiate-refund-btn"
                    disabled={savingRefund}
                    onClick={initiateRefund}
                  >
                    {savingRefund
                      ? "INITIATING REFUND…"
                      : "INITIATE REFUND"}
                  </button>
                )}

                {refundStatus === "PENDING" && (
                  <div className="refund-pending">
                    REFUND INITIATED — WAITING FOR RAZORPAY
                    CONFIRMATION
                  </div>
                )}

                {refundStatus === "PROCESSED" && (
                  <div className="refund-processed">
                    REFUND PROCESSED SUCCESSFULLY
                  </div>
                )}
              </div>
            )}
        </section>
      )}

      <section className="detail-panel">
        <div className="detail-panel-head">
          <h3>ORDER ITEMS</h3>

          <strong>
            ₹
            {Number(
              order.total || 0
            ).toLocaleString("en-IN")}
          </strong>
        </div>

        <div className="detail-items">
          {(order.items || []).map(
            (item, i) => (
              <article
                key={`${item.id || item.name}-${i}`}
                className="detail-item"
              >
                <div className="detail-item-image">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                    />
                  ) : (
                    <b>
                      {item.art || "AVNC"}
                    </b>
                  )}
                </div>

                <div>
                  <strong>
                    {item.name}
                  </strong>

                  <p>
                    SIZE / {item.size || "—"} · QTY /{" "}
                    {item.qty || 1}
                  </p>

                  {item.custom && (
                    <div className="custom-design">
                      <b>
                        CUSTOM DESIGN
                      </b>

                      <span>
                        Garment:{" "}
                        {item.design?.garment ||
                          "—"}
                      </span>

                      <span>
                        Colour:{" "}
                        {item.design?.color ||
                          "—"}
                      </span>

                      <span>
                        Print text:{" "}
                        {item.design?.text ||
                          "—"}
                      </span>

                      <span>
                        Graphic mark:{" "}
                        {item.design?.art ||
                          "—"}
                      </span>

                      {item.design?.image && (
                        <img
                          src={
                            item.design.image
                          }
                          alt="Customer artwork"
                        />
                      )}
                    </div>
                  )}
                </div>

                <strong>
                  ₹
                  {(
                    Number(item.price || 0) *
                    Number(item.qty || 1)
                  ).toLocaleString("en-IN")}
                </strong>
              </article>
            )
          )}
        </div>
      </section>
    </div>
  );
}