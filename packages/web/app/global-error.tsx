'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: '#0a0b0f', color: '#e8e8ed', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 12 }}>Something went wrong</h2>
            <p style={{ color: '#8a8a9a', fontSize: '0.875rem', marginBottom: 24 }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                background: '#00d4aa',
                color: '#0a0b0f',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
