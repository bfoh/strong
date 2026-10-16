'use client';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import PropertyImage from '@/components/ui/PropertyImage';
export type GalleryImage = { url: string; caption: string };
export default function PropertyGallery({ images, title, preview }: { images: GalleryImage[]; title: string; preview: boolean }) {
  const [index, setIndex] = useState(0), dialog = useRef<HTMLDialogElement>(null), touch = useRef<{ x: number; y: number } | null>(null);
  const item = images[index] || { url: '', caption: 'Property imagery forthcoming' };
  function move(direction: number) { if (images.length > 1) setIndex(i => (i + direction + images.length) % images.length); }
  function stage(expanded: boolean) {
    return <div className="gallery-stage" onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => {
      if (!touch.current) return;
      const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
      touch.current = null;
    }}><PropertyImage key={item.url} src={item.url} alt={item.caption} sizes={expanded ? '100vw' : '(max-width: 650px) 100vw, 90vw'} priority={!expanded}/>{images.length > 1 && <><button className="gallery-prev" aria-label="Previous image" onClick={() => move(-1)}><ChevronLeft size={20}/></button><button className="gallery-next" aria-label="Next image" onClick={() => move(1)}><ChevronRight size={20}/></button></>}{!expanded && images.length > 0 && <button className="gallery-expand" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog"><Maximize2 size={15}/> Explore gallery</button>}</div>;
  }
  function bar() {
    return <div className="gallery-bar"><p className="gallery-caption" aria-live="polite">{images.length > 0 ? `${String(index + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')} — ${item.caption}` : item.caption}{preview && ' · Supplied TV capture'}</p>{images.length > 1 && <div className="gallery-thumbnails" role="group" aria-label="Gallery images">{images.map((img, i) => <button key={img.url} className="gallery-thumbnail" aria-label={`View image ${i + 1}: ${img.caption}`} aria-current={index === i ? 'true' : undefined} onClick={() => setIndex(i)}><PropertyImage src={img.url} alt="" sizes="66px"/></button>)}</div>}</div>;
  }
  return <section className="property-gallery" aria-label={`${title} image gallery`}>{stage(false)}{bar()}<dialog ref={dialog} className="gallery-dialog" aria-label={`${title} fullscreen gallery`} onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); } }}><div className="gallery-dialog-top"><h2>{title}</h2><button className="icon-button" aria-label="Close gallery" onClick={() => dialog.current?.close()} autoFocus><X size={22}/></button></div>{stage(true)}{bar()}</dialog></section>;
}
