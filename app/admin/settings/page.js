"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to change password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Admin password changed successfully.");
    } catch (err) {
      setError(err?.message || "Unable to change password.");
    } finally {
      setSaving(false);
    }
  }

  const field = (
    label,
    value,
    setter,
    visible,
    setVisible,
    placeholder
  ) => (
    <label className="av-admin-password-field">
      <span>{label}</span>

      <div>
        <Lock size={16} aria-hidden="true" />

        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={placeholder}
          autoComplete="current-password"
          required
          disabled={saving}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          disabled={saving}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );

  return (
    <div className="admin-shell">
      <AdminSidebar />

      <main className="admin-main av-admin-settings">
        <div className="av-admin-settings-head">
          <div>
            <span>SECURITY / ADMIN ACCESS</span>

            <h1>
              CHANGE
              <br />
              <em>PASSWORD.</em>
            </h1>

            <p>
              Update the administrative password securely without using the
              terminal or deployment settings.
            </p>
          </div>

          <div className="av-admin-security-badge">
            <ShieldCheck size={28} />
            <span>SECURE ADMIN</span>
          </div>
        </div>

        <section className="av-admin-password-card">
          <div className="av-admin-password-card-head">
            <div>
              <span>ADMIN CREDENTIALS</span>
              <h2>Update your password</h2>
            </div>

            <span className="av-admin-password-status">
              ENCRYPTED
            </span>
          </div>

          <form onSubmit={submit}>
            {field(
              "CURRENT PASSWORD",
              currentPassword,
              setCurrentPassword,
              showCurrent,
              setShowCurrent,
              "Enter current password"
            )}

            {field(
              "NEW PASSWORD",
              newPassword,
              setNewPassword,
              showNew,
              setShowNew,
              "Minimum 12 characters"
            )}

            {field(
              "CONFIRM NEW PASSWORD",
              confirmPassword,
              setConfirmPassword,
              showConfirm,
              setShowConfirm,
              "Repeat new password"
            )}

            <p className="av-admin-password-hint">
              Use at least 12 characters. Your password is stored as a secure
              one-way hash and is never displayed.
            </p>

            {error && (
              <div className="av-admin-password-message error">
                {error}
              </div>
            )}

            {message && (
              <div className="av-admin-password-message success">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="av-admin-password-submit"
              disabled={saving}
            >
              {saving
                ? "UPDATING PASSWORD..."
                : "UPDATE ADMIN PASSWORD →"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
