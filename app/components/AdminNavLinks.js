"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNavLinks() {
  const pathname = usePathname() || "";

  const active = (href, exact = false) => {
    const isActive = exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

    return isActive ? "admin-nav-active" : "";
  };

  return (
    <>
      <Link href="/admin" className={active("/admin", true)}>
        DASHBOARD
      </Link>

      <Link href="/admin/products" className={active("/admin/products")}>
        PRODUCTS
      </Link>

      <Link href="/admin/products/new" className={active("/admin/products/new")}>
        + NEW PRODUCT
      </Link>

      <Link href="/admin/orders" className={active("/admin/orders")}>
        ORDERS
      </Link>

      <Link href="/admin/collective" className={active("/admin/collective")}>
        THE COLLECTIVE
      </Link>

      <Link href="/admin/settings" className={active("/admin/settings")}>
        SECURITY
      </Link>
    </>
  );
}
