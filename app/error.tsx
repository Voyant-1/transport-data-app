"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <h2>Something went wrong</h2>
      <p>{error.message || "An unexpected error occurred"}</p>
      <button onClick={reset} className="retry-button">
        Try Again
      </button>
    </div>
  );
}
