import Image from 'next/image';
import Link from '@/components/marketing/TrackedLink';
import { ArrowUpRight } from 'lucide-react';
import { brandAssets } from '@/lib/assets';

const categories = [
  { slug: 'land', title: 'Land', text: 'Find the right foundation for your next chapter.', asset: brandAssets.land },
  { slug: 'residential', title: 'Residential', text: 'Discover places designed for the way you want to live.', asset: brandAssets.residential },
  { slug: 'commercial', title: 'Commercial', text: 'Explore spaces that support business and investment.', asset: brandAssets.commercial },
] as const;

export default function CategoryShowcase() {
  return <section id="categories" className="categories" aria-labelledby="categories-title">
    <header className="section-head">
      <div>
        <p className="kicker" data-reveal>Property Categories</p>
        <h2 id="categories-title" className="display" data-reveal>Find Your <em>Opportunity.</em></h2>
      </div>
      <p className="section-aside" data-reveal>Three ways into the Strong Properties collection. Each opens the live catalogue, filtered to what is currently published.</p>
    </header>
    <ul className="category-list">
      {categories.map(item => <li key={item.slug} data-reveal>
        <Link className="category" href={`/properties?category=${item.slug}`}>
          <span className="category-media"><Image src={item.asset.src} alt={item.asset.alt} fill sizes="(max-width: 800px) 92vw, 31vw"/></span>
          <span className="category-body">
            <span className="category-title">{item.title}</span>
            <span className="category-text">{item.text}</span>
            <span className="category-cta">View {item.title.toLowerCase()} listings <ArrowUpRight size={16} aria-hidden="true"/></span>
          </span>
        </Link>
      </li>)}
    </ul>
    <p className="image-note">Category imagery is conceptual. Listings carry their own photography.</p>
  </section>;
}
