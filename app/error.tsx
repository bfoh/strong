'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="error-state"><span className="eyebrow">A MOMENTARY INTERRUPTION</span><h2>The collection needs<br/><em>another moment.</em></h2><p>We couldn’t load this page. Please try again, or return to the collection.</p><button className="gold-btn" onClick={reset}>Try again ↗</button><Link className="text-link" href="/properties">Return to the collection</Link></main>;
}
