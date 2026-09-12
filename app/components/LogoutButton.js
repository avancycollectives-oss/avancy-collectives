"use client";
import { useRouter } from 'next/navigation';
export default function LogoutButton({ admin = false }) {
  const router = useRouter();
  async function logout() {
    const endpoint = admin ? '/api/auth/logout' : '/api/account/logout';
    try { await fetch(endpoint, { method: 'POST', credentials: 'include' }); } finally { router.replace(admin ? '/admin/login' : '/shop'); router.refresh(); }
  }
  return <button type="button" onClick={logout}>LOG OUT →</button>;
}
