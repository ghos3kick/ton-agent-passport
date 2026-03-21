'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ap-primary">
      <div className="text-center max-w-md px-6">
        <h2 className="text-2xl font-semibold text-ap-text mb-3">Something went wrong</h2>
        <p className="text-ap-text-secondary text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-ap-accent text-ap-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
