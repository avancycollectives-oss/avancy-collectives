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
        throw new Error(
          data?.error || "Could not load submissions."
        );
      }

      setItems(data.submissions || []);
    } catch (err) {
      setError(
        err?.message || "Could not load submissions."
      );
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
      const res = await fetch(
        "/api/admin/collective",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            status,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Could not update submission."
        );
      }

      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? data.submission
            : item
        )
      );

      const action =
        status === "APPROVED"
          ? "APPROVED"
          : status === "REJECTED"
            ? "REJECTED"
            : "SET TO PENDING";

      setMessage(
        `SUBMISSION ${action} SUCCESSFULLY.`
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not update submission."
      );
    } finally {
      setWorking("");
    }
  }

  async function retryInstagram(id) {
    setWorking(`${id}:INSTAGRAM_RETRY`);
    setError("");
    setMessage("");

    try {
      const res = await fetch(
        "/api/admin/collective",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            status: "APPROVED",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Could not retry Instagram publishing."
        );
      }

      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? data.submission
            : item
        )
      );

      if (data.submission?.instagramStatus === "PUBLISHED") {
        setMessage(
          "INSTAGRAM POST PUBLISHED SUCCESSFULLY."
        );
      } else if (data.submission?.instagramStatus === "FAILED") {
        setError(
          data.submission?.instagramError ||
            "Instagram publishing failed again."
        );
      } else {
        setMessage(
          "INSTAGRAM PUBLISHING UPDATED."
        );
      }
    } catch (err) {
      setError(
        err?.message ||
          "Could not retry Instagram publishing."
      );
    } finally {
      setWorking("");
    }
  }

  async function removeSubmission(item) {
    const confirmed = window.confirm(
      `DELETE THIS COLLECTIVE PHOTO?\n\n` +
      `${item.customerName || "This submission"}\n\n` +
      `The submission will be removed from the Admin page and the public Collective. ` +
      `The uploaded Cloudinary image will also be deleted.\n\n` +
      `THIS ACTION CANNOT BE UNDONE.`
    );

    if (!confirmed) {
      return;
    }

    setWorking(`${item.id}:DELETE`);
    setError("");
    setMessage("");

    try {
      const res = await fetch(
        "/api/admin/collective",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Could not delete submission."
        );
      }

      setItems((current) =>
        current.filter(
          (entry) => entry.id !== item.id
        )
      );

      setMessage(
        "COLLECTIVE SUBMISSION DELETED SUCCESSFULLY."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not delete submission."
      );
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

        <button
          type="button"
          onClick={load}
          disabled={loading || working !== ""}
        >
          {loading ? "LOADING..." : "REFRESH"}
        </button>
      </div>

      {error ? (
        <div className="av-admin-error">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="collective-admin-message">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="collective-admin-empty">
          LOADING SUBMISSIONS...
        </div>
      ) : !items.length ? (
        <div className="collective-admin-empty">
          NO COLLECTIVE SUBMISSIONS YET.
        </div>
      ) : (
        <div className="collective-admin-grid">
          {items.map((item) => (
            <article
              className="collective-admin-card"
              key={item.id}
            >
              <div className="collective-admin-photo">
                <img
                  src={item.imageUrl}
                  alt={`Submission from ${item.customerName}`}
                />
              </div>

              <div className="collective-admin-info">
                <div className="collective-admin-row">
                  <strong>
                    {item.customerName}
                  </strong>

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
                  <b>
                    {item.websiteConsent
                      ? "YES"
                      : "NO"}
                  </b>
                </p>

                <p>
                  INSTAGRAM CONSENT:{" "}
                  <b>
                    {item.instagramConsent
                      ? "YES"
                      : "NO"}
                  </b>
                </p>

                <p>
                  INSTAGRAM:{" "}
                  <b
                    className={`collective-instagram-status ${String(
                      item.instagramStatus || "NOT_REQUESTED"
                    ).toLowerCase()}`}
                  >
                    {item.instagramStatus || "NOT_REQUESTED"}
                  </b>
                  {item.instagramPostNumber != null ? (
                    <>
                      {" "}· POST #
                      {String(item.instagramPostNumber).padStart(
                        3,
                        "0"
                      )}
                    </>
                  ) : null}
                </p>

                {item.instagramPublishedAt ? (
                  <p>
                    INSTAGRAM PUBLISHED:{" "}
                    {new Date(
                      item.instagramPublishedAt
                    ).toLocaleString("en-IN")}
                  </p>
                ) : null}

                {item.instagramError ? (
                  <p>
                    INSTAGRAM ERROR:{" "}
                    <b>
                      {item.instagramError}
                    </b>
                  </p>
                ) : null}

                <p>
                  SUBMITTED:{" "}
                  {item.createdAt
                    ? new Date(
                        item.createdAt
                      ).toLocaleString("en-IN")
                    : "—"}
                </p>

                {item.rejectionReason ? (
                  <p>
                    REJECTION NOTE:{" "}
                    <b>
                      {item.rejectionReason}
                    </b>
                  </p>
                ) : null}

                <div className="collective-admin-actions">
                  {item.status === "PENDING" ? (
                    <>
                      <button
                        type="button"
                        disabled={
                          working !== "" ||
                          !item.websiteConsent
                        }
                        onClick={() =>
                          moderate(
                            item.id,
                            "APPROVED"
                          )
                        }
                      >
                        {working ===
                        `${item.id}:APPROVED`
                          ? "APPROVING..."
                          : "APPROVE"}
                      </button>

                      <button
                        type="button"
                        className="reject"
                        disabled={
                          working !== ""
                        }
                        onClick={() =>
                          moderate(
                            item.id,
                            "REJECTED"
                          )
                        }
                      >
                        {working ===
                        `${item.id}:REJECTED`
                          ? "REJECTING..."
                          : "REJECT"}
                      </button>
                    </>
                  ) : item.status === "APPROVED" ? (
                    <>
                      {item.instagramConsent &&
                      item.instagramStatus === "FAILED" ? (
                        <button
                          type="button"
                          disabled={working !== ""}
                          onClick={() =>
                            retryInstagram(item.id)
                          }
                        >
                          {working ===
                          `${item.id}:INSTAGRAM_RETRY`
                            ? "RETRYING INSTAGRAM..."
                            : "RETRY INSTAGRAM"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="reject"
                        disabled={
                          working !== ""
                        }
                        onClick={() =>
                          moderate(
                            item.id,
                            "REJECTED"
                          )
                        }
                      >
                        {working ===
                        `${item.id}:REJECTED`
                          ? "REJECTING..."
                          : "REJECT"}
                      </button>

                      <button
                        type="button"
                        className="reset"
                        disabled={
                          working !== ""
                        }
                        onClick={() =>
                          moderate(
                            item.id,
                            "PENDING"
                          )
                        }
                      >
                        {working ===
                        `${item.id}:PENDING`
                          ? "SETTING PENDING..."
                          : "SET PENDING"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={
                          working !== "" ||
                          !item.websiteConsent
                        }
                        onClick={() =>
                          moderate(
                            item.id,
                            "APPROVED"
                          )
                        }
                      >
                        {working ===
                        `${item.id}:APPROVED`
                          ? "APPROVING..."
                          : "APPROVE"}
                      </button>

                      <button
                        type="button"
                        className="reset"
                        disabled={
                          working !== ""
                        }
                        onClick={() =>
                          moderate(
                            item.id,
                            "PENDING"
                          )
                        }
                      >
                        {working ===
                        `${item.id}:PENDING`
                          ? "SETTING PENDING..."
                          : "SET PENDING"}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="delete"
                    disabled={working !== ""}
                    onClick={() =>
                      removeSubmission(item)
                    }
                  >
                    {working ===
                    `${item.id}:DELETE`
                      ? "DELETING..."
                      : "DELETE"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
