"use client";

import { useEffect, useState } from "react";

export default function CollectiveModeration() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/collective", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not load submissions.");
      }

      setItems(data.submissions || []);
    } catch (err) {
      setError(err?.message || "Could not load submissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function moderate(id, status) {
    setWorking(`${id}:${status}`);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/collective", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not update submission.");
      }

      setItems((current) =>
        current.map((item) =>
          item.id === id ? data.submission : item
        )
      );

      const action =
        status === "APPROVED"
          ? "APPROVED"
          : status === "REJECTED"
            ? "REJECTED"
            : "SET TO PENDING";

      setMessage(`SUBMISSION ${action} SUCCESSFULLY.`);
    } catch (err) {
      setError(err?.message || "Could not update submission.");
    } finally {
      setWorking("");
    }
  }

  return (
    <section className="collective-admin">
      <div className="collective-admin-head">
        <div>
          <span>CONTROL ROOM / THE COLLECTIVE</span>
          <h1>CUSTOMER PHOTOS.</h1>
          <p>
            Review customer submissions before anything becomes publicly
            visible.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading}>
          {loading ? "LOADING..." : "REFRESH"}
        </button>
      </div>

      {error ? <div className="av-admin-error">{error}</div> : null}
      {message ? (
        <div className="collective-admin-message">{message}</div>
      ) : null}

      {loading ? (
        <div className="collective-admin-empty">LOADING SUBMISSIONS...</div>
      ) : !items.length ? (
        <div className="collective-admin-empty">
          NO COLLECTIVE SUBMISSIONS YET.
        </div>
      ) : (
        <div className="collective-admin-grid">
          {items.map((item) => (
            <article className="collective-admin-card" key={item.id}>
              <div className="collective-admin-photo">
                <img
                  src={item.imageUrl}
                  alt={`Submission from ${item.customerName}`}
                />
              </div>

              <div className="collective-admin-info">
                <div className="collective-admin-row">
                  <strong>{item.customerName}</strong>
                  <span
                    className={`collective-status ${String(
                      item.status
                    ).toLowerCase()}`}
                  >
                    {item.status}
                  </span>
                </div>

                <p>
                  {item.productName
                    ? `PRODUCT PHOTO: ${item.productName}`
                    : "GENERAL PHOTO: AVANCY COLLECTIVES"}
                </p>

                <p>
                  WEBSITE CONSENT:{" "}
                  <b>{item.websiteConsent ? "YES" : "NO"}</b>
                </p>

                <p>
                  INSTAGRAM CONSENT:{" "}
                  <b>{item.instagramConsent ? "YES" : "NO"}</b>
                </p>

                <p>
                  SUBMITTED:{" "}
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleString("en-IN")
                    : "—"}
                </p>

                {item.rejectionReason ? (
                  <p>
                    REJECTION NOTE: <b>{item.rejectionReason}</b>
                  </p>
                ) : null}

                <div className="collective-admin-actions">
                  {item.status === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        disabled={working !== "" || !item.websiteConsent}
                        onClick={() => moderate(item.id, "APPROVED")}
                      >
                        {working === `${item.id}:APPROVED`
                          ? "APPROVING..."
                          : "APPROVE"}
                      </button>

                      <button
                        type="button"
                        className="reject"
                        disabled={working !== ""}
                        onClick={() => moderate(item.id, "REJECTED")}
                      >
                        {working === `${item.id}:REJECTED`
                          ? "REJECTING..."
                          : "REJECT"}
                      </button>
                    </>
                  ) : item.status === "APPROVED" ? (
                    <>
                      <button
                        type="button"
                        className="reject"
                        disabled={working !== ""}
                        onClick={() => moderate(item.id, "REJECTED")}
                      >
                        {working === `${item.id}:REJECTED`
                          ? "REJECTING..."
                          : "REJECT"}
                      </button>

                      <button
                        type="button"
                        className="reset"
                        disabled={working !== ""}
                        onClick={() => moderate(item.id, "PENDING")}
                      >
                        {working === `${item.id}:PENDING`
                          ? "SETTING PENDING..."
                          : "SET PENDING"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={working !== "" || !item.websiteConsent}
                        onClick={() => moderate(item.id, "APPROVED")}
                      >
                        {working === `${item.id}:APPROVED`
                          ? "APPROVING..."
                          : "APPROVE"}
                      </button>

                      <button
                        type="button"
                        className="reset"
                        disabled={working !== ""}
                        onClick={() => moderate(item.id, "PENDING")}
                      >
                        {working === `${item.id}:PENDING`
                          ? "SETTING PENDING..."
                          : "SET PENDING"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
