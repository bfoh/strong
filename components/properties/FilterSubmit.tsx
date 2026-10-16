'use client';
import { useFormStatus } from 'react-dom';
import { ArrowUpRight } from 'lucide-react';
export default function FilterSubmit() {
  const { pending } = useFormStatus();
  return <button className="gold-btn" type="submit" disabled={pending} aria-busy={pending}>{pending ? 'Finding your space…' : 'Find your space'}<ArrowUpRight size={16}/></button>;
}
