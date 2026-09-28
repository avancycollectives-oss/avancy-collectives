"use client";

import { useState } from "react";

export default function CollectiveForm({ products = [], selectedProduct = "" }) {
  const [name, setName] = useState("");
  const [photoType, setPhotoType] = useState(
    selectedProduct ? "PRODUCT" : "GENERAL"
  );
  const [product, setProduct] = useState(selectedProduct);
  const [file, setFile] = useState(null);
  const [websiteConsent, setWebsiteConsent] = useState(false);
  const [instagramConsent, setInstagramConsent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!file) {
      setError("Please select a photo.");
      return;
    }

    if (!websiteConsent) {
      setError(
        "Please give permission for your photo to appear on the Avancy website."
      );
      return;
    }

    if (photoType === "PRODUCT" && !product) {
      setError("Please select the Avancy product shown in your photo.");
      return;
    }

    const form = new FormData();

    form.set("customerName", name.trim());
    form.set("productId", photoType === "PRODUCT" ? product : "");
    form.set("websiteConsent", String(websiteConsent));
    form.set("instagramConsent", String(instagramConsent));
    form.set("file", file);

    setLoading(true);

    try {
      const res = await fetch("/api/collective", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not submit your photo.");
      }

      setSuccess(true);
      setName("");
      setFile(null);
      setWebsiteConsent(false);
      setInstagramConsent(false);

      const input = document.getElementById("collective-photo");
      if (input) input.value = "";
    } catch (err) {
      setError(err?.message || "Could not submit your photo.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="collective-success">
        <span>PHOTO RECEIVED ✓</span>
        <h3>YOU'RE IN THE QUEUE.</h3>
        <p>
          Your photo has been uploaded successfully and your consent has been
          recorded.
        </p>
        <small>
          Your submission is now waiting for Avancy admin approval. If
          approved, it will appear in The Collective on our website.
        </small>
        <button type="button" onClick={() => setSuccess(false)}>
          SUBMIT ANOTHER PHOTO →
        </button>
      </div>
    );
  }

  return (
    <form className="collective-form" onSubmit={submit}>
      <label>
        YOUR NAME
        <input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
      </label>

      <label>
        PHOTO TYPE
        <select
          value={photoType}
          onChange={(e) => {
            const value = e.target.value;
            setPhotoType(value);

            if (value === "GENERAL") {
              setProduct("");
            }
          }}
        >
          <option value="GENERAL">GENERAL AVANCY PHOTO</option>
          <option value="PRODUCT">PRODUCT PHOTO</option>
        </select>

        <small className="collective-field-help">
          General photo = an Avancy moment not tied to one product. Product
          photo = you wearing or showing a specific Avancy product.
        </small>
      </label>

      {photoType === "PRODUCT" ? (
        <label>
          SELECT PRODUCT
          <select
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          >
            <option value="">CHOOSE THE PRODUCT</option>
            {products.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        YOUR PHOTO
        <input
          id="collective-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <small>JPG, PNG or WebP / MAX 8 MB</small>
      </label>

      <label className="collective-check">
        <input
          type="checkbox"
          checked={websiteConsent}
          onChange={(e) => setWebsiteConsent(e.target.checked)}
        />
        <span>
          I give Avancy Collectives permission to display this photo on the
          Avancy website as part of The Collective.
        </span>
      </label>

      <label className="collective-check">
        <input
          type="checkbox"
          checked={instagramConsent}
          onChange={(e) => setInstagramConsent(e.target.checked)}
        />
        <span>
          I give Avancy Collectives permission to use this same photo on its
          official Instagram page in the future.
        </span>
      </label>

      {error ? <div className="collective-error">{error}</div> : null}

      <button
        className="collective-submit-btn"
        type="submit"
        disabled={loading}
      >
        {loading ? "UPLOADING..." : "SUBMIT TO THE COLLECTIVE →"}
      </button>

      <p className="collective-note">
        Your photo will not appear publicly until it has been reviewed and
        approved by Avancy.
      </p>
    </form>
  );
}
