'use client';
import { useState } from 'react';
import LeadForm from './LeadForm';
import type { ViewingOption } from '@/lib/server';

export default function ViewingRequest({ options, initial }: { options: ViewingOption[]; initial?: string }) {
  const [id, setId] = useState(options.find(o => o.slug === initial)?.id || '');
  const selected = options.find(o => o.id === id);
  return <div className="viewing-request">
    <div className="viewing-picker">
      <label htmlFor="viewing-property">Which property would you like to see?</label>
      <select id="viewing-property" value={id} onChange={event => setId(event.target.value)}>
        <option value="">Select a published property</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.title} — {o.location}</option>)}
      </select>
      {selected && <p className="viewing-selected"><span>{selected.category}</span> {selected.title}, {selected.location} · <a href={`/properties/${selected.slug}`}>View property details</a></p>}
    </div>
    {selected ? <LeadForm key={selected.id} propertyId={selected.id}/> : <p className="viewing-hint">Choose a property above to request a viewing or send an enquiry about it.</p>}
  </div>;
}
