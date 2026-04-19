import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="text-center">
        <h1 className="text-display font-bold text-ink mb-4">Pathway</h1>
        <p className="text-body text-ink-2 mb-6">First-gen student opportunity discovery.</p>
        <Link
          href="/pathway"
          className="inline-block bg-ucla-blue text-cream px-6 py-3 rounded-md text-body font-semibold hover:opacity-90 transition-opacity"
        >
          Go to /pathway
        </Link>
      </div>
    </div>
  );
}
