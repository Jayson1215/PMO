"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ maxWidth: "28rem", width: "100%", background: "#fff", borderRadius: "12px", padding: "2rem", textAlign: "center", boxShadow: "0 4px 6px rgba(0,0,0,.1)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111", marginBottom: "0.5rem" }}>
              Application Error
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
              {error?.message || "An unexpected error occurred."}
            </p>
            {error?.digest && (
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", fontFamily: "monospace", marginBottom: "1rem" }}>
                Digest: {error.digest}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <a
                href="/"
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1rem",
                  background: "#1e3a5f",
                  color: "#fff",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                Go to Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
