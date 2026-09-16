"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SearchBox from "./SearchBox";
import CartLink from "./CartLink";

export default function StoreHeader({ products = [] }) {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    fetch("/api/account/profile", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setUser(d?.customer || null);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const first =
    user?.name?.trim()?.split(/\s+/)[0] || "";

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="ac-nav">
        <Link
          href="/"
          className="ac-brand"
          onClick={closeMenu}
        >
          <strong>Avancy</strong>
          <span>Collectives</span>
        </Link>

        <nav className="ac-navlinks">
          <Link href="/shop">SHOP</Link>
          <Link href="/shop#drop-001">COLLECTIONS</Link>
          <Link href="/create-yours">CREATE YOURS</Link>
          <Link href="/#about">ABOUT</Link>
        </nav>

        <div className="ac-navicons">
          <SearchBox products={products} />

          <Link
            className="ac-account-link"
            href="/account"
            aria-label={
              user
                ? `Account — signed in as ${user.name}`
                : "Account"
            }
          >
            {user && (
              <span className="account-name">
                {first}
              </span>
            )}

            <span className="ac-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 21c.8-4.1 3.3-6 7.5-6s6.7 1.9 7.5 6" />
              </svg>
            </span>
          </Link>

          <Link
            className="ac-icon bag"
            href="/cart"
            aria-label="Shopping bag"
          >
            <svg viewBox="0 0 24 24">
              <path d="M5 8h14l-1 13H6L5 8Z" />
              <path d="M9 8a3 3 0 0 1 6 0" />
            </svg>
            <CartLink compact />
          </Link>

          <button
            type="button"
            className={`ac-mobile-menu-btn ${
              menuOpen ? "open" : ""
            }`}
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="ac-mobile-menu">
          <Link href="/shop" onClick={closeMenu}>
            <span>01</span>
            SHOP
          </Link>

          <Link
            href="/shop#drop-001"
            onClick={closeMenu}
          >
            <span>02</span>
            COLLECTIONS
          </Link>

          <Link
            href="/create-yours"
            onClick={closeMenu}
          >
            <span>03</span>
            CREATE YOURS
          </Link>

          <Link href="/#about" onClick={closeMenu}>
            <span>04</span>
            ABOUT
          </Link>

          <Link href="/track-order" onClick={closeMenu}>
            <span>05</span>
            TRACK ORDER
          </Link>

          <Link href="/account" onClick={closeMenu}>
            <span>06</span>
            MY ACCOUNT
          </Link>
        </div>
      )}
    </>
  );
}