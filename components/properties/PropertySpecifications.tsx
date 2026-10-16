import type { PropertyDetail } from '@/lib/data';
export default function PropertySpecifications({ property: p }: { property: PropertyDetail }) {
  const f = p.features;
  const fields: [string, string | number | null | undefined][] = [['Property type', p.category.charAt(0).toUpperCase() + p.category.slice(1)], ...(p.category === 'residential' ? [['Bedrooms', p.beds && p.beds > 0 ? p.beds : null], ['Bathrooms', p.baths && p.baths > 0 ? p.baths : null]] as [string, string | number | null][] : []), ['Plot area', f?.plot_size_sqm && f.plot_size_sqm > 0 ? `${Number(f.plot_size_sqm).toLocaleString()} m²` : null], ['Floor area', f?.building_size_sqm && f.building_size_sqm > 0 ? `${Number(f.building_size_sqm).toLocaleString()} m²` : null], ['Tenure', f?.tenure]];
  const meaningful = fields.filter(([, value]) => value != null && value !== '');
  return <dl className="specifications">{meaningful.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
