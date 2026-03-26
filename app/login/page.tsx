"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Suppress hydration warnings from browser extensions (Keeper, LastPass, etc.)
// that inject elements into form inputs
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [preAuthToken, setPreAuthToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password");
        setLoading(false);
        return;
      }

      if (!data.mfaRequired) {
        // No MFA, sign in directly
        const result = await signIn("credentials", {
          email,
          password,
          code: "",
          redirect: false,
        });

        if (result?.error) {
          setError("Sign in failed. Please try again.");
        } else {
          router.push("/");
          router.refresh();
        }
        setLoading(false);
        return;
      }

      // MFA required, show code input
      setPreAuthToken(data.preAuthToken || "");
      setStep("code");
      setLoading(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        code,
        preAuthToken,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes("INVALID_CODE")) {
          setError("Invalid or expired code. Please try again.");
        } else {
          setError("Verification failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  function handleBackToLogin() {
    setStep("credentials");
    setCode("");
    setError("");
    setLoading(false);
  }

  // When re-submitting credentials after going back, always clear old code
  function handleResendCode() {
    setCode("");
    setError("");
    handleCredentialsSubmit(new Event("submit") as unknown as React.FormEvent);
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

        <h1 className="login-title">Sign In</h1>
        <p className="login-subtitle">
          {step === "credentials"
            ? "Enter your credentials to continue"
            : "Check your email for a verification code"}
        </p>

        {error && <div className="login-error">{error}</div>}

        {step === "credentials" ? (
          <form onSubmit={handleCredentialsSubmit}>
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
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </button>
            <a href="/forgot-password" className="login-forgot-link">Forgot your password?</a>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit}>
            <div className="login-field">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                pattern="\d{6}"
                inputMode="numeric"
                style={{ textAlign: "center", letterSpacing: "4px", fontSize: "18px" }}
              />
            </div>
            <button type="submit" className="login-button" disabled={loading || code.length !== 6}>
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
            <button
              type="button"
              className="login-back-button"
              onClick={handleResendCode}
              disabled={loading}
            >
              Resend Code
            </button>
            <button
              type="button"
              className="login-back-button"
              onClick={handleBackToLogin}
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
