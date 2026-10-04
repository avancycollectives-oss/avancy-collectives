"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ admin = false }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const endpoint = admin
      ? "/api/auth/logout"
      : "/api/account/logout";

    try {
      await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace(admin ? "/admin/login" : "/shop");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className="av-admin-logout-button"
      onClick={logout}
      disabled={loggingOut}
      aria-busy={loggingOut}
    >
      <LogOut size={16} strokeWidth={2} aria-hidden="true" />
      <span>{loggingOut ? "LOGGING OUT..." : "LOG OUT"}</span>
    </button>
  );
}
