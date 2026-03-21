import { Container } from '@/components/layout/Container';

export default function Loading() {
  return (
    <div>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-br from-ap-accent/20 via-ap-primary to-ap-primary py-24">
        <Container>
          <div className="max-w-2xl">
            <div className="w-20 h-20 rounded-2xl animate-shimmer mb-6" />
            <div className="h-12 w-80 rounded-lg animate-shimmer mb-4" />
            <div className="h-6 w-96 rounded animate-shimmer mb-8" />
            <div className="flex gap-4">
              <div className="h-12 w-44 rounded-lg animate-shimmer" />
              <div className="h-12 w-36 rounded-lg animate-shimmer" />
            </div>
          </div>
        </Container>
      </section>

      {/* Stats skeleton */}
      <section className="py-10 border-b border-ap-divider">
        <Container>
          <div className="h-5 w-32 rounded animate-shimmer mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-shimmer" />
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
