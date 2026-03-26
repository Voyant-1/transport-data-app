"use client";

import { useState } from "react";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Image
            src="/images/Voyant_Logo_White1.png"
            alt="Voyant Logo"
            width={160}
            height={53}
            priority
          />
        </div>

        <h1 className="login-title">Reset Password</h1>

        {submitted ? (
          <>
            <p className="login-subtitle">
              If that email exists in our system, we have sent a reset link. Check your inbox.
            </p>
            <a href="/login" className="login-forgot-link" style={{ marginTop: "24px" }}>
              Back to Sign In
            </a>
          </>
        ) : (
          <>
            <p className="login-subtitle">
              Enter your email and we will send you a link to reset your password.
            </p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            <a href="/login" className="login-forgot-link">
              Back to Sign In
            </a>
          </>
        )}
      </div>
    </div>
  );
}
