"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

interface NavbarProps {
  activeLink?: string;
}

const NAV_LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/transport-data", label: "Carrier Search", key: "transport-data" },
  { href: "/carrier-safety", label: "Safety Check", key: "carrier-safety" },
  { href: "/lane-search", label: "Lane Search", key: "lane-search" },
  { href: "/lane-cleaning", label: "Lane Cleaning", key: "lane-cleaning" },
];

export default function Navbar({ activeLink }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cogOpen, setCogOpen] = useState(false);
  const cogRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  // Close cog dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cogRef.current && !cogRef.current.contains(e.target as Node)) {
        setCogOpen(false);
      }
    }
    if (cogOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [cogOpen]);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-logo">
        <Link href="/">
          <Image
            src="/images/Voyant_Logo_White1.png"
            alt="Voyant Logo - Go to home page"
            width={120}
            height={40}
            priority
          />
        </Link>
      </div>

      {/* Mobile toggle */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
      >
        ☰
      </button>

      <div className={`navbar-links ${mobileOpen ? "mobile-open" : ""}`}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={`nav-link ${activeLink === link.key ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Settings cog */}
      {session?.user && (
        <div className="navbar-cog-container" ref={cogRef}>
          <button
            className="navbar-cog-button"
            onClick={() => setCogOpen(!cogOpen)}
            aria-label="Settings menu"
            title="Settings"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>

          {cogOpen && (
            <div className="navbar-cog-dropdown">
              <div className="cog-dropdown-header">
                <span className="cog-dropdown-email">{session.user.email}</span>
              </div>
              <div className="cog-dropdown-divider" />
              {isAdmin && (
                <Link
                  href="/admin/users"
                  className="cog-dropdown-item"
                  onClick={() => setCogOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  User Management
                </Link>
              )}
              <button
                className="cog-dropdown-item cog-dropdown-signout"
                onClick={() => {
                  setCogOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
